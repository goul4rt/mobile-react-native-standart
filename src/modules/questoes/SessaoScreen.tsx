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
  MOTIVOS_REPORTE,
  reportarProblema,
  uuid,
  type Question,
  type Resposta,
} from '../../shared/api/client';
import { border, radius, space, TOUCH_TARGET } from '../../shared/ui-kit/tokens';
import { Alternativa, type EstadoAlternativa } from './Alternativa';
import { FimSessao } from './FimSessao';
import { useTema } from '../../shared/ui-kit/PreferenciasContext';
import { RichText } from './RichText';
import { rotuloArea, t } from '../../shared/i18n';

const TAMANHO = 10;

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Entra deslizando de baixo, sem estourar na tela. */
function Entrada({ children, style }: { children: React.ReactNode; style?: object }) {
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

export function SessaoScreen({ area, onSair }: { area: string; onSair: () => void }) {
  const { p, type, idioma } = useTema();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  /** Escolha marcada, ainda não enviada — dá pra trocar de ideia. */
  const [selecionada, setSelecionada] = useState<string | null>(null);
  /** Escolha confirmada: só aqui o gabarito aparece. */
  const [escolha, setEscolha] = useState<string | null>(null);
  const [decorrido, setDecorrido] = useState(0);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const inicio = useRef(Date.now());
  // A prova traz as duas línguas; o aluno vê a que escolheu no perfil.
  const idiomas = useMemo(() => ['pt', idioma === 'ingles' ? 'en' : 'es'], [idioma]);
  const rolagem = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const posicaoFeedback = useRef(0);

  useEffect(() => {
    fetchSession(area, TAMANHO, idiomas)
      .then(setQuestions)
      .catch((e: Error) => setErro(e.message));
  }, [area, idiomas]);

  // Cronômetro discreto do design: conta o tempo da questão, para ao responder.
  useEffect(() => {
    if (escolha) return;
    const id = setInterval(() => setDecorrido(Date.now() - inicio.current), 1000);
    return () => clearInterval(id);
  }, [escolha]);

  const responder = useCallback(
    (question: Question) => {
      if (!selecionada) return;
      setEscolha(selecionada);
      // Leva o aluno até o resultado: ele pode ter respondido com a lista
      // rolada, e o feedback fica fora de vista.
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
      t('sessao.reportarTitulo'),
      t('sessao.reportarPergunta'),
      [
        ...MOTIVOS_REPORTE.map((m) => ({
          text: m.rotulo,
          onPress: () => {
            // Otimista: agradece na hora. Uma falha de rede aqui não é problema
            // do aluno, e o reporte não vale uma tela de erro.
            reportarProblema(question.id, m.chave).catch(() => {});
            Alert.alert(t('sessao.reportarObrigado'), t('sessao.reportarConfirmacao'));
          },
        })),
        { text: t('comum.cancelar'), style: 'cancel' as const },
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
    fetchSession(area, TAMANHO, idiomas)
      .then(setQuestions)
      .catch((e: Error) => setErro(e.message));
  }, [area, idiomas]);

  if (erro) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: p.bg }]}>
        <Text style={[type.heading, { color: p.text, textAlign: 'center' }]}>
          {t('comum.semInternet')}
        </Text>
        <Text style={[type.caption, { color: p.textMuted, marginTop: space.md }]}>{erro}</Text>
      </SafeAreaView>
    );
  }

  if (!questions) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: p.bg }]}>
        <ActivityIndicator color={p.primary} />
      </SafeAreaView>
    );
  }

  const question = questions[indice];
  if (!question) {
    return <FimSessao respostas={respostas} area={area} onRepetir={recomecar} onSair={onSair} />;
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

  const estadoDa = (id: string, isCorrect: boolean): EstadoAlternativa => {
    if (!respondida) return selecionada === id ? 'selecionada' : 'neutra';
    if (isCorrect) return 'correta';
    if (escolha === id) return 'errada';
    return 'descartada';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top', 'bottom']}>
      <View style={styles.topo}>
        <Pressable hitSlop={12} onPress={onSair} testID="sair" style={styles.iconeSair}>
          <Text style={[type.label, { color: p.textSecondary }]}>✕</Text>
        </Pressable>
        <View style={[styles.trilho, { backgroundColor: p.surfaceAlt }]}>
          <View
            style={[
              styles.progresso,
              { backgroundColor: p.primary, width: `${((indice + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={[type.micro, { color: p.textSecondary }]}>
          {indice + 1}/{questions.length}
        </Text>
        {!respondida && (
          <Text style={[type.micro, { color: p.textMuted }]}>{formatTime(decorrido)}</Text>
        )}
      </View>

      <ScrollView
        ref={rolagem}
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}>
        {!!meta && <Text style={[type.micro, { color: p.textMuted }]}>{meta}</Text>}

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
            <Alternativa
              key={alt.id}
              alternativa={alt}
              estado={estadoDa(alt.id, alt.correct)}
              // Tocar só marca; quem responde é o botão do rodapé.
              onPress={() => !respondida && setSelecionada(alt.id)}
            />
          ))}
        </View>

        {respondida && (
          // O feedback nasce onde o dedo estava — logo abaixo das alternativas,
          // não no topo da rolagem.
          <View
            style={styles.feedback}
            onLayout={(e) => (posicaoFeedback.current = e.nativeEvent.layout.y)}>
            <Entrada
              style={[
                styles.chip,
                {
                  backgroundColor: acertou ? p.successSubtle : p.dangerSubtle,
                  borderColor: acertou ? p.success : p.danger,
                },
              ]}>
              <Text style={[type.label, { color: acertou ? p.successText : p.dangerText }]}>
                {acertou ? t('sessao.acertou') : t('sessao.errou', { letra: correta?.id })}
              </Text>
            </Entrada>

            {question.explanation ? (
              <Entrada style={[styles.gabarito, { backgroundColor: p.surface, borderColor: p.border }]}>
                <Text style={[type.heading, { color: p.text, marginBottom: space.sm }]}>
                  Gabarito comentado
                </Text>
                <RichText content={question.explanation} />
              </Entrada>
            ) : (
              // Sem comentário não vale um cartão com título prometendo o que
              // não existe: uma linha discreta basta, a correta já está em verde.
              <Text style={[type.caption, { color: p.textMuted, marginTop: space.md }]}>
                {t('sessao.semComentario')}
              </Text>
            )}
          </View>
        )}

        <Pressable
          hitSlop={8}
          testID="reportar"
          onPress={() => reportar(question)}
          accessibilityRole="button"
          style={styles.reportar}>
          <Text style={[type.caption, { color: p.textMuted }]}>{t('sessao.reportar')}</Text>
        </Pressable>
      </ScrollView>

      {/* O rodapé só existe quando há o que fazer nele. */}
      {(selecionada !== null || respondida) && (
        <Entrada style={[styles.rodape, { borderTopColor: p.border, backgroundColor: p.bg }]}>
          <Pressable
            testID={respondida ? 'proxima' : 'responder'}
            onPress={() => (respondida ? proxima() : responder(question))}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.botao,
              { backgroundColor: pressed ? p.primaryPressed : p.primary },
            ]}>
            <Text style={[type.label, { color: p.onPrimary }]}>
              {!respondida
                ? t('sessao.responder')
                : indice + 1 === questions.length
                  ? t('sessao.verResultado')
                  : t('sessao.proxima')}
            </Text>
          </Pressable>
        </Entrada>
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
  // Respiro entre a última alternativa e o resultado: colado, os dois blocos
  // viram um só e o olho não separa a resposta do retorno.
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
  botao: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
