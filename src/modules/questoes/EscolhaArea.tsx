import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTaxonomy, type AreaResumo } from '../../shared/api/client';
import { border, palettes, radius, space, type } from '../../shared/ui-kit/tokens';

/**
 * A lista vem da taxonomia do acervo, não de uma constante: o filtro só oferece
 * o que existe pra responder, com a contagem real.
 */
export function EscolhaArea({ onEscolher }: { onEscolher: (area: string) => void }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;

  const [areas, setAreas] = useState<AreaResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setErro(null);
    setAreas(null);
    fetchTaxonomy()
      .then(setAreas)
      .catch((e: Error) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: p.bg }]} edges={['top', 'bottom']}>
      <View style={styles.conteudo}>
        <Text style={[type.display, { color: p.text }]}>O que você quer estudar hoje?</Text>
        <Text style={[type.caption, { color: p.textMuted }]}>Dá pra mudar quando quiser.</Text>

        {erro && (
          <View style={{ marginTop: space.xl, gap: space.lg }}>
            <Text style={[type.body, { color: p.textSecondary }]}>
              Sem internet. Tudo salvo aqui — sincronizamos depois.
            </Text>
            {/* Sem isto o aluno fica preso: só fechando e reabrindo o app. */}
            <Pressable
              testID="tentar-de-novo"
              onPress={carregar}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.botao,
                { backgroundColor: pressed ? p.primaryPressed : p.primary },
              ]}>
              <Text style={[type.label, { color: p.onPrimary }]}>Tentar de novo</Text>
            </Pressable>
          </View>
        )}

        {!areas && !erro && <ActivityIndicator color={p.primary} style={{ marginTop: space.section }} />}

        <View style={{ gap: space.md, marginTop: space.xl }}>
          {areas?.map((area) => (
            <Pressable
              key={area.code}
              testID={`area-${area.code}`}
              onPress={() => onEscolher(area.code)}
              style={({ pressed }) => [
                styles.cartao,
                {
                  backgroundColor: p.surface,
                  borderColor: pressed ? p.primary : p.border,
                },
              ]}>
              <Text style={[type.heading, { color: p.text }]}>{area.label}</Text>
              <Text style={[type.caption, { color: p.textMuted }]}>
                {area.total} {area.total === 1 ? 'questão' : 'questões'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flex: 1, padding: space.xxl, justifyContent: 'center' },
  botao: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartao: {
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.xs,
  },
});
