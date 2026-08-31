import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AREA_LABEL, fetchSession, type Question, type Resposta } from '../../shared/api/client';
import { FimSessao } from './FimSessao';
import { border, palettes, radius, space, TOUCH_TARGET, type } from '../../shared/ui-kit/tokens';
import { RichText } from './RichText';

const AREA = 'CH';
const TAMANHO = 10;

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function SessaoScreen() {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [decorrido, setDecorrido] = useState(0);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const inicio = useRef(Date.now());

  useEffect(() => {
    fetchSession(AREA, TAMANHO)
      .then(setQuestions)
      .catch((e: Error) => setErro(e.message));
  }, []);

  // Cronômetro discreto do design: conta o tempo da questão, zera na virada.
  useEffect(() => {
    if (escolha) return;
    const id = setInterval(() => setDecorrido(Date.now() - inicio.current), 1000);
    return () => clearInterval(id);
  }, [escolha]);

  const proxima = useCallback(() => {
    setEscolha(null);
    setDecorrido(0);
    inicio.current = Date.now();
    setIndice((i) => i + 1);
  }, []);

  const responder = useCallback((question: Question, letra: string) => {
    setEscolha(letra);
    setRespostas((anteriores) => [
      ...anteriores,
      {
        questionId: question.id,
        escolha: letra,
        correta: question.alternatives.some((a) => a.correct && a.id === letra),
        tempoMs: Date.now() - inicio.current,
      },
    ]);
  }, []);

  const recomecar = useCallback(() => {
    setQuestions(null);
    setRespostas([]);
    setIndice(0);
    setEscolha(null);
    setDecorrido(0);
    inicio.current = Date.now();
    fetchSession(AREA, TAMANHO)
      .then(setQuestions)
      .catch((e: Error) => setErro(e.message));
  }, []);

  if (erro) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: p.bg }]}>
        <Text style={[type.heading, { color: p.text, textAlign: 'center' }]}>
          Sem internet.{'\n'}Tudo salvo aqui — sincronizamos depois.
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
    return <FimSessao respostas={respostas} area={AREA} onRepetir={recomecar} />;
  }

  const correta = question.alternatives.find((a) => a.correct);
  const acertou = escolha !== null && escolha === correta?.id;
  const meta = [
    question.metadata.year ? `ENEM ${question.metadata.year}` : null,
    question.metadata.area ? AREA_LABEL[question.metadata.area] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top', 'bottom']}>
      <View style={styles.topo}>
        <Pressable hitSlop={12} style={styles.iconeSair}>
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
        {!escolha && (
          <Text style={[type.micro, { color: p.textMuted }]}>{formatTime(decorrido)}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        {escolha !== null && (
          <View
            style={[
              styles.chip,
              {
                backgroundColor: acertou ? p.successSubtle : p.dangerSubtle,
                borderColor: acertou ? p.success : p.danger,
              },
            ]}>
            <Text style={[type.label, { color: acertou ? p.successText : p.dangerText }]}>
              {acertou
                ? 'Boa! Essa você domina.'
                : `Quase. A certa era a ${correta?.id} — o comentário explica.`}
            </Text>
          </View>
        )}

        {!!meta && <Text style={[type.micro, { color: p.textMuted }]}>{meta}</Text>}

        {question.supports.map((s, i) => (
          <View key={i} style={{ marginTop: space.lg }}>
            <RichText content={s} />
          </View>
        ))}

        <View style={{ marginTop: space.xl }}>
          <RichText content={question.stem} />
        </View>

        <View style={{ marginTop: space.xl, gap: escolha ? space.sm : space.md }}>
          {question.alternatives.map((alt) => {
            const escolhida = escolha === alt.id;
            const revelada = escolha !== null;
            const destacar = revelada && (alt.correct || escolhida);

            const cor = alt.correct ? p.success : p.danger;
            return (
              <Pressable
                key={alt.id}
                testID={`alternativa-${alt.id}`}
                disabled={revelada}
                // Toque direto responde: sem botão de confirmar.
                onPress={() => responder(question, alt.id)}
                style={({ pressed }) => [
                  styles.alternativa,
                  {
                    backgroundColor: destacar
                      ? alt.correct
                        ? p.successSubtle
                        : p.dangerSubtle
                      : p.surface,
                    borderColor: destacar ? cor : pressed ? p.primary : p.border,
                    borderWidth: destacar ? border.strong : border.normal,
                    // Alternativas descartadas somem pro fundo, não desaparecem.
                    opacity: revelada && !destacar ? 0.6 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.letra,
                    { backgroundColor: destacar ? cor : p.surfaceAlt },
                  ]}>
                  <Text
                    style={[
                      type.label,
                      { color: destacar ? p.onPrimary : p.textSecondary },
                    ]}>
                    {alt.id}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <RichText content={alt.content} variant="alternative" />
                </View>
              </Pressable>
            );
          })}
        </View>

        {escolha !== null && (
          <View
            style={[
              styles.gabarito,
              question.explanation
                ? { backgroundColor: p.surface, borderColor: p.border }
                : // Sem comentário: cartão tracejado com o gabarito oficial.
                  // Nunca uma tela vazia.
                  { borderColor: p.border, borderStyle: 'dashed' },
            ]}>
            <Text style={[type.heading, { color: p.text, marginBottom: space.sm }]}>
              Gabarito comentado
            </Text>
            {question.explanation ? (
              <RichText content={question.explanation} />
            ) : (
              <Text style={[type.body, { color: p.textSecondary }]}>
                Esta questão ainda não tem comentário. O gabarito oficial é a alternativa{' '}
                {correta?.id}.
              </Text>
            )}
          </View>
        )}

        <Pressable hitSlop={8} style={styles.reportar}>
          <Text style={[type.caption, { color: p.textMuted }]}>⚑ Reportar problema</Text>
        </Pressable>
      </ScrollView>

      {/* O rodapé só existe depois da resposta. */}
      {escolha !== null && (
        <View style={[styles.rodape, { borderTopColor: p.border, backgroundColor: p.bg }]}>
          <Pressable
            onPress={proxima}
            style={({ pressed }) => [
              styles.botao,
              { backgroundColor: pressed ? p.primaryPressed : p.primary },
            ]}>
            <Text style={[type.label, { color: p.onPrimary }]}>
              {indice + 1 === questions.length ? 'Ver resultado' : 'Próxima'}
            </Text>
          </Pressable>
        </View>
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
  chip: {
    borderWidth: border.normal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.lg,
  },
  alternativa: {
    flexDirection: 'row',
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.lg,
    minHeight: TOUCH_TARGET,
  },
  letra: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
