import React from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palettes, radius, space, type } from '../../shared/ui-kit/tokens';

export function Abertura({
  onCriarConta,
  onEntrar,
}: {
  onCriarConta: () => void;
  onEntrar: () => void;
}) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: p.bg }]} edges={['top', 'bottom']}>
      <View style={styles.conteudo}>
        <View style={[styles.marca, { backgroundColor: p.primary }]}>
          <Text style={[type.display, { color: p.onPrimary }]}>G</Text>
        </View>
        <Text style={[type.display, { color: p.text, marginTop: space.xl }]}>Gabarita</Text>
        <Text style={[type.body, { color: p.textSecondary, marginTop: space.sm }]}>
          Estude por questões do ENEM. Uma de cada vez.
        </Text>
      </View>

      <View style={styles.acoes}>
        <Pressable
          testID="criar-conta"
          onPress={onCriarConta}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.botao,
            { backgroundColor: pressed ? p.primaryPressed : p.primary },
          ]}>
          <Text style={[type.label, { color: p.onPrimary }]}>Criar conta</Text>
        </Pressable>

        <Pressable
          testID="ja-tenho-conta"
          onPress={onEntrar}
          accessibilityRole="button"
          style={styles.botaoPlano}>
          <Text style={[type.label, { color: p.textSecondary }]}>Já tenho conta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flex: 1, justifyContent: 'center', padding: space.xxl },
  marca: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acoes: { padding: space.xxl, gap: space.md },
  botao: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPlano: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
