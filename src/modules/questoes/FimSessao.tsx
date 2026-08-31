import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPopulation, type Resposta } from '../../shared/api/client';
import { border, palettes, radius, space, type } from '../../shared/ui-kit/tokens';

function formatTime(ms: number) {
  const total = Math.round(ms / 1000);
  return total >= 60 ? `${Math.floor(total / 60)}min ${total % 60}s` : `${total}s`;
}

function Metrica({ valor, rotulo, cor }: { valor: string; rotulo: string; cor: string }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  return (
    <View style={styles.metrica}>
      <Text style={[type.title, { color: cor }]}>{valor}</Text>
      <Text style={[type.caption, { color: p.textMuted }]}>{rotulo}</Text>
    </View>
  );
}

export function FimSessao({
  respostas,
  area,
  onRepetir,
  onSair,
}: {
  respostas: Resposta[];
  area: string;
  onRepetir: () => void;
  onSair: () => void;
}) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;

  const acertos = respostas.filter((r) => r.correta).length;
  const erros = respostas.length - acertos;
  const tempo = respostas.reduce((soma, r) => soma + r.tempoMs, 0);
  const minhaTaxa = respostas.length > 0 ? acertos / respostas.length : 0;

  // A comparação com a população só aparece com amostra suficiente. Sem ela, o
  // cartão explica a ausência em vez de mostrar um número frágil.
  const [media, setMedia] = useState<{ accuracy: number; users: number } | null>(null);
  useEffect(() => {
    fetchPopulation(area)
      .then(setMedia)
      .catch(() => setMedia(null));
  }, [area]);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: p.bg }]} edges={['top', 'bottom']}>
      <View style={styles.conteudo}>
        <Text style={[type.display, { color: p.text }]}>Fim da sessão</Text>

        <View style={[styles.cartao, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Metrica valor={String(acertos)} rotulo="acertos" cor={p.successText} />
          <Metrica valor={String(erros)} rotulo="erros" cor={erros > 0 ? p.dangerText : p.textMuted} />
          <Metrica valor={formatTime(tempo)} rotulo="tempo" cor={p.text} />
        </View>

        {media ? (
          <View style={[styles.cartao, styles.comparacao, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Text style={[type.heading, { color: p.text }]}>Você e os outros</Text>
            <View style={styles.linha}>
              <Text style={[type.body, { color: p.textSecondary }]}>Você</Text>
              <Text style={[type.label, { color: p.text }]}>{Math.round(minhaTaxa * 100)}%</Text>
            </View>
            <View style={styles.linha}>
              <Text style={[type.body, { color: p.textSecondary }]}>Média</Text>
              <Text style={[type.label, { color: p.text }]}>{Math.round(media.accuracy * 100)}%</Text>
            </View>
            <Text style={[type.micro, { color: p.textMuted }]}>
              Base de {media.users} {media.users === 1 ? 'pessoa' : 'pessoas'}.
            </Text>
          </View>
        ) : (
          <View style={[styles.cartao, styles.comparacao, { borderColor: p.border, borderStyle: 'dashed' }]}>
            <Text style={[type.body, { color: p.textSecondary }]}>
              Ainda faltam respostas de outros alunos pra comparar.
            </Text>
          </View>
        )}

        <Pressable
          onPress={onRepetir}
          testID="mais-dez"
          style={({ pressed }) => [
            styles.botao,
            { backgroundColor: pressed ? p.primaryPressed : p.primary },
          ]}>
          <Text style={[type.label, { color: p.onPrimary }]}>Mais 10 questões</Text>
        </Pressable>

        <Pressable onPress={onSair} testID="trocar-area" style={styles.botaoPlano}>
          <Text style={[type.label, { color: p.textSecondary }]}>Escolher outra área</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flex: 1, padding: space.xxl, gap: space.xl, justifyContent: 'center' },
  cartao: {
    flexDirection: 'row',
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.xl,
  },
  comparacao: { flexDirection: 'column', gap: space.sm },
  metrica: { flex: 1, alignItems: 'center', gap: space.xs },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botaoPlano: { height: 44, alignItems: 'center', justifyContent: 'center' },
  botao: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
