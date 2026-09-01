import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { border, radius, space, TOUCH_TARGET } from '../../shared/ui-kit/tokens';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';

export function Field({
  label,
  error,
  secret,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; error?: string; secret?: boolean }) {
  const { palette, type } = usePreferences();
  const [focado, setFocado] = useState(false);
  const [revelado, setRevelado] = useState(false);

  return (
    <View style={{ gap: space.xs }}>
      <Text style={[type.caption, { color: palette.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.caixa,
          {
            backgroundColor: palette.surface,
            borderColor: error ? palette.danger : focado ? palette.primary : palette.border,
            borderWidth: error || focado ? border.strong : border.normal,
          },
        ]}>
        <TextInput
          {...props}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          secureTextEntry={secret && !revelado}
          placeholderTextColor={palette.textMuted}
          style={[type.body, styles.input, { color: palette.text }]}
        />
        {secret && (
          <Pressable hitSlop={8} onPress={() => setRevelado((v) => !v)}>
            <Text style={[type.caption, { color: palette.textSecondary }]}>
              {revelado ? t('login.hide') : t('login.show')}
            </Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={[type.caption, { color: palette.dangerText }]}>{error}</Text>}
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
