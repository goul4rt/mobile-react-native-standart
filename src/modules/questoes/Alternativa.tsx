import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { Alternative } from '../../shared/api/client';
import { border, palettes, radius, space, TOUCH_TARGET, type } from '../../shared/ui-kit/tokens';
import { RichText } from './RichText';

export type EstadoAlternativa = 'neutra' | 'selecionada' | 'correta' | 'errada' | 'descartada';

function cores(estado: EstadoAlternativa, p: (typeof palettes)['dark']) {
  switch (estado) {
    case 'selecionada':
      return { fundo: p.primarySubtle, borda: p.primary, letra: p.primary, textoLetra: p.onPrimary };
    case 'correta':
      return { fundo: p.successSubtle, borda: p.success, letra: p.success, textoLetra: p.onPrimary };
    case 'errada':
      return { fundo: p.dangerSubtle, borda: p.danger, letra: p.danger, textoLetra: p.onPrimary };
    default:
      return { fundo: p.surface, borda: p.border, letra: p.surfaceAlt, textoLetra: p.textSecondary };
  }
}

export function Alternativa({
  alternativa,
  estado,
  onPress,
}: {
  alternativa: Alternative;
  estado: EstadoAlternativa;
  onPress: () => void;
}) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  const c = cores(estado, p);

  const escala = useRef(new Animated.Value(1)).current;
  const revelacao = useRef(new Animated.Value(0)).current;
  const revelada = estado === 'correta' || estado === 'errada';

  // Feedback do gabarito entra num pulso curto — 150ms, sem confete.
  useEffect(() => {
    Animated.timing(revelacao, {
      toValue: revelada ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [revelada, revelacao]);

  const pulso = revelacao.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.02, 1] });

  const animar = (para: number) =>
    Animated.spring(escala, {
      toValue: para,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale: revelada ? pulso : escala }] }}>
      <Pressable
        testID={`alternativa-${alternativa.id}`}
        onPress={onPress}
        onPressIn={() => animar(0.98)}
        onPressOut={() => animar(1)}
        accessibilityRole="radio"
        accessibilityState={{ selected: estado === 'selecionada' || revelada }}
        accessibilityLabel={`Alternativa ${alternativa.id}`}
        style={[
          styles.alternativa,
          {
            backgroundColor: c.fundo,
            borderColor: c.borda,
            borderWidth: estado === 'neutra' ? border.normal : border.strong,
            // Descartada recua pro fundo em vez de sumir: o aluno ainda lê.
            opacity: estado === 'descartada' ? 0.6 : 1,
          },
        ]}>
        <View style={[styles.letra, { backgroundColor: c.letra }]}>
          <Text style={[type.label, { color: c.textoLetra }]}>{alternativa.id}</Text>
        </View>
        <View style={styles.corpo}>
          <RichText content={alternativa.content} variant="alternative" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  corpo: { flex: 1 },
});
