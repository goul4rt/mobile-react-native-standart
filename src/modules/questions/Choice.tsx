import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Alternative } from '../../shared/api/client';
import { border, radius, space, TOUCH_TARGET, type Palette } from '../../shared/ui-kit/tokens';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { RichText } from '../../shared/rich-text/RichText';

export type EstadoChoice = 'neutra' | 'selecionada' | 'correta' | 'errada' | 'descartada';

function cores(estado: EstadoChoice, palette: Palette) {
  switch (estado) {
    case 'selecionada':
      return { fundo: palette.primarySubtle, borda: palette.primary, letra: palette.primary, textoLetra: palette.onPrimary };
    case 'correta':
      return { fundo: palette.successSubtle, borda: palette.success, letra: palette.success, textoLetra: palette.onPrimary };
    case 'errada':
      return { fundo: palette.dangerSubtle, borda: palette.danger, letra: palette.danger, textoLetra: palette.onPrimary };
    default:
      return { fundo: palette.surface, borda: palette.border, letra: palette.surfaceAlt, textoLetra: palette.textSecondary };
  }
}

export function Choice({
  alternativa,
  estado,
  onPress,
}: {
  alternativa: Alternative;
  estado: EstadoChoice;
  onPress: () => void;
}) {
  const { palette, type } = usePreferences();
  const c = cores(estado, palette);

  const escala = useRef(new Animated.Value(1)).current;
  const revelacao = useRef(new Animated.Value(0)).current;
  const revelada = estado === 'correta' || estado === 'errada';

  // A 150ms pulse, no confetti.
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
        accessibilityLabel={`Choice ${alternativa.id}`}
        style={[
          styles.alternativa,
          {
            backgroundColor: c.fundo,
            borderColor: c.borda,
            borderWidth: estado === 'neutra' ? border.normal : border.strong,
            // A discarded choice recedes instead of disappearing: it stays readable.
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
