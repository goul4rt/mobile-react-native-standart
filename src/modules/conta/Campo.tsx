import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { border, palettes, radius, space, TOUCH_TARGET, type } from '../../shared/ui-kit/tokens';

export function Campo({
  rotulo,
  erro,
  segredo,
  ...props
}: React.ComponentProps<typeof TextInput> & { rotulo: string; erro?: string; segredo?: boolean }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  const [focado, setFocado] = useState(false);
  const [revelado, setRevelado] = useState(false);

  return (
    <View style={{ gap: space.xs }}>
      <Text style={[type.caption, { color: p.textSecondary }]}>{rotulo}</Text>
      <View
        style={[
          styles.caixa,
          {
            backgroundColor: p.surface,
            borderColor: erro ? p.danger : focado ? p.primary : p.border,
            borderWidth: erro || focado ? border.strong : border.normal,
          },
        ]}>
        <TextInput
          {...props}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          secureTextEntry={segredo && !revelado}
          placeholderTextColor={p.textMuted}
          style={[type.body, styles.input, { color: p.text }]}
        />
        {segredo && (
          <Pressable hitSlop={8} onPress={() => setRevelado((v) => !v)}>
            <Text style={[type.caption, { color: p.textSecondary }]}>
              {revelado ? 'ocultar' : 'mostrar'}
            </Text>
          </Pressable>
        )}
      </View>
      {!!erro && <Text style={[type.caption, { color: p.dangerText }]}>{erro}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: TOUCH_TARGET + 4,
  },
  input: { flex: 1, paddingVertical: space.md },
});
