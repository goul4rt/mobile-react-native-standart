import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchSession,
  REPORT_REASONS,
  reportarProblema,
  uuid,
  type Question,
  type Resposta,
} from '../../shared/api/client';
import { border, radius, space, TOUCH_TARGET } from '../../shared/ui-kit/tokens';
import { Choice, type EstadoChoice } from './Choice';
import { SessionSummary } from './SessionSummary';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { RichText } from '../../shared/rich-text/RichText';
import { rotuloArea, t } from '../../shared/i18n';
import { Button } from '../../shared/ui-kit/primitives';

const TAMANHO = 10;

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Slides in from below, without bursting onto the screen. */
function FadeIn({ children, style }: { children: React.ReactNode; style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

export function SessionScreen({ area, onSair }: { area: string; onSair: () => void }) {
  const { palette, type, examLanguage } = usePreferences();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  /** Marked but not submitted: there is still room to change your mind. */
  const [selecionada, setSelecionada] = useState<string | null>(null);
  /** Confirmed choice: only here does the answer key appear. */
  const [escolha, setEscolha] = useState<string | null>(null);
  const [decorrido, setDecorrido] = useState(0);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const inicio = useRef(Date.now());
  // The exam carries both languages; the student sees the one picked in Profile.
  const linguas = useMemo(() => ['pt', examLanguage], [examLanguage]);
  const rolagem = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const posicaoFeedback = useRef(0);

  useEffect(() => {
    fetchSession(area, TAMANHO, linguas)
      .then(setQuestions)
      .catch((e: Error) => setError(e.message));
  }, [area, linguas]);

  useEffect(() => {
    if (escolha) return;
    const id = setInterval(() => setDecorrido(Date.now() - inicio.current), 1000);
    return () => clearInterval(id);
  }, [escolha]);

  const responder = useCallback(
    (question: Question) => {
      if (!selecionada) return;
      setEscolha(selecionada);
      // They may have answered with the list scrolled, leaving feedback out of sight.
      requestAnimationFrame(() =>
        rolagem.current?.scrollTo({ y: Math.max(posicaoFeedback.current - 80, 0), animated: true }),
      );
      setRespostas((anteriores) => [
        ...anteriores,
        {
          clientId: uuid(),
          questionId: question.id,
          escolha: selecionada,
          correta: question.alternatives.some((a) => a.correct && a.id === selecionada),
          tempoMs: Date.now() - inicio.current,
        },
      ]);
    },
    [selecionada],
  );

  const proxima = useCallback(() => {
    setSelecionada(null);
    setEscolha(null);
    setDecorrido(0);
    inicio.current = Date.now();
    setIndice((i) => i + 1);
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const reportar = useCallback((question: Question) => {
    Alert.alert(
      t('session.reportTitle'),
      t('session.reportQuestion'),
      [
        ...REPORT_REASONS.map((m) => ({
          text: t(`session.${m.label}`),
          onPress: () => {
            // Thanks them immediately: a network failure here is not worth an error screen.
            reportarProblema(question.id, m.key).catch(() => {});
            Alert.alert(t('session.reportThanks'), t('session.reportConfirm'));
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  }, []);

  const recomecar = useCallback(() => {
    setQuestions(null);
    setRespostas([]);
    setIndice(0);
    setSelecionada(null);
    setEscolha(null);
    setDecorrido(0);
    inicio.current = Date.now();
    fetchSession(area, TAMANHO, linguas)
      .then(setQuestions)
      .catch((e: Error) => setError(e.message));
  }, [area, linguas]);

  if (error) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={[type.heading, { color: palette.text, textAlign: 'center' }]}>
          {t('common.offline')}
        </Text>
        <Text style={[type.caption, { color: palette.textMuted, marginTop: space.md }]}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!questions) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  const question = questions[indice];
  if (!question) {
    return <SessionSummary answers={respostas} area={area} onRepeat={recomecar} onLeave={onSair} />;
  }

  const correta = question.alternatives.find((a) => a.correct);
  const respondida = escolha !== null;
  const acertou = respondida && escolha === correta?.id;
  const meta = [
    question.metadata.year ? `ENEM ${question.metadata.year}` : null,
    question.metadata.area ? rotuloArea(question.metadata.area) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const estadoDa = (id: string, isCorrect: boolean): EstadoChoice => {
    if (!respondida) return selecionada === id ? 'selecionada' : 'neutra';
    if (isCorrect) return 'correta';
    if (escolha === id) return 'errada';
    return 'descartada';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top', 'bottom']}>
      <View style={styles.topo}>
        <Pressable hitSlop={12} onPress={onSair} testID="close-session" style={styles.iconeSair}>
          <Text style={[type.label, { color: palette.textSecondary }]}>✕</Text>
        </Pressable>
        <View style={[styles.trilho, { backgroundColor: palette.surfaceAlt }]}>
          <View
            style={[
              styles.progresso,
              { backgroundColor: palette.primary, width: `${((indice + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={[type.micro, { color: palette.textSecondary }]}>
          {indice + 1}/{questions.length}
        </Text>
        {!respondida && (
          <Text style={[type.micro, { color: palette.textMuted }]}>{formatTime(decorrido)}</Text>
        )}
      </View>

      <ScrollView
        ref={rolagem}
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}>
        {!!meta && <Text style={[type.micro, { color: palette.textMuted }]}>{meta}</Text>}

        {question.supports.map((s, i) => (
          <View key={i} style={{ marginTop: space.lg }}>
            <RichText content={s} />
          </View>
        ))}

        <View style={{ marginTop: space.xl }}>
          <RichText content={question.stem} />
        </View>

        <View
          accessibilityRole="radiogroup"
          style={{ marginTop: space.xl, gap: respondida ? space.sm : space.md }}>
          {question.alternatives.map((alt) => (
            <Choice
              key={alt.id}
              alternativa={alt}
              estado={estadoDa(alt.id, alt.correct)}
              // Tapping only marks it; the footer button is what answers.
              onPress={() => !respondida && setSelecionada(alt.id)}
            />
          ))}
        </View>

        {respondida && (
          // Feedback appears where the finger was, not at the top of the scroll.
          <View
            style={styles.feedback}
            onLayout={(e) => (posicaoFeedback.current = e.nativeEvent.layout.y)}>
            <FadeIn
              style={[
                styles.chip,
                {
                  backgroundColor: acertou ? palette.successSubtle : palette.dangerSubtle,
                  borderColor: acertou ? palette.success : palette.danger,
                },
              ]}>
              <Text style={[type.label, { color: acertou ? palette.successText : palette.dangerText }]}>
                {acertou ? t('session.gotItRight') : t('session.gotItWrong', { letter: correta?.id })}
              </Text>
            </FadeIn>

            {question.explanation ? (
              <FadeIn style={[styles.gabarito, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[type.heading, { color: palette.text, marginBottom: space.sm }]}>
                  {t('session.answerExplained')}
                </Text>
                <RichText content={question.explanation} />
              </FadeIn>
            ) : (
              // With no explanation, a card would promise what is not there.
              <Text style={[type.caption, { color: palette.textMuted, marginTop: space.md }]}>
                {t('session.noExplanation')}
              </Text>
            )}
          </View>
        )}

        <Pressable
          hitSlop={8}
          testID="report"
          onPress={() => reportar(question)}
          accessibilityRole="button"
          style={styles.reportar}>
          <Text style={[type.caption, { color: palette.textMuted }]}>{t('session.report')}</Text>
        </Pressable>
      </ScrollView>

      {(selecionada !== null || respondida) && (
        <FadeIn style={[styles.rodape, { borderTopColor: palette.border, backgroundColor: palette.bg }]}>
          <Button
            testID={respondida ? 'next' : 'answer'}
            onPress={() => (respondida ? proxima() : responder(question))}
            label={
              !respondida
                ? t('session.answer')
                : indice + 1 === questions.length
                  ? t('session.seeResults')
                  : t('session.next')
            }
          />
        </FadeIn>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
  },
  iconeSair: { minWidth: TOUCH_TARGET / 2 },
  trilho: { flex: 1, height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  progresso: { height: '100%', borderRadius: radius.pill },
  conteudo: { paddingHorizontal: space.xxl, paddingBottom: space.section },
  // Touching, the answer and the feedback read as a single block.
  feedback: { marginTop: space.section },
  chip: {
    borderWidth: border.normal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  gabarito: {
    marginTop: space.xl,
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  reportar: { marginTop: space.xl, alignSelf: 'flex-start' },
  rodape: { borderTopWidth: 1, padding: space.lg, paddingHorizontal: space.xxl },
});
