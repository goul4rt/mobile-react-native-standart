import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { border, radius, space, TOUCH_TARGET } from '../../shared/ui-kit/tokens';

/**
 * The vocabulary of a settings list: a group, a read-only row, an inline option
 * picker and a tappable action. None of these know anything about accounts,
 * which is why they live apart from the screens that arrange them.
 */

/** Rounded container that clips its rows, so dividers reach both edges. */
export function SettingsGroup({ children }: { children: React.ReactNode }) {
  const { palette } = usePreferences();
  return (
    <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {children}
    </View>
  );
}

/** Label on the left, read-only value on the right. */
export function SettingsRow({ label, value }: { label: string; value: string }) {
  const { palette, type } = usePreferences();
  return (
    <View style={styles.row}>
      <Text style={[type.body, { color: palette.text }]}>{label}</Text>
      <Text style={[type.caption, { color: palette.textMuted, flexShrink: 1 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function SettingsDivider() {
  const { palette } = usePreferences();
  return <View style={{ height: 1, backgroundColor: palette.border }} />;
}

/** Row that navigates somewhere else. */
export function SettingsLink({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const { palette, type } = usePreferences();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" style={styles.row}>
      <Text style={[type.body, { color: palette.text }]}>{label}</Text>
      <Text style={[type.body, { color: palette.textMuted }]}>→</Text>
    </Pressable>
  );
}

/**
 * Inline option picker. `sizes` exists for the text-scale row, where each option
 * is the letter A rendered at the size it selects.
 */
export function SettingsOptions<T extends string>({
  label,
  value,
  options,
  onChoose,
  testIDPrefix,
  sizes,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChoose: (v: T) => void;
  testIDPrefix: string;
  sizes?: number[];
}) {
  const { palette, type } = usePreferences();
  return (
    <View style={styles.row}>
      <Text style={[type.body, { color: palette.text, flex: 1 }]}>{label}</Text>
      <View style={styles.options}>
        {options.map(([key, text], i) => (
          <Pressable
            key={key}
            testID={`${testIDPrefix}-${key}`}
            onPress={() => onChoose(key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === key }}
            hitSlop={6}
            style={styles.option}>
            <Text
              style={[
                type.caption,
                {
                  color: value === key ? palette.primary : palette.textMuted,
                  fontFamily: value === key ? 'Lexend-SemiBold' : type.caption.fontFamily,
                  ...(sizes ? { fontSize: sizes[i] } : {}),
                },
              ]}>
              {text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Standalone action with a description. `danger` colors the destructive ones. */
export function SettingsAction({
  title,
  description,
  onPress,
  testID,
  danger,
  disabled,
}: {
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { palette, type } = usePreferences();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: palette.surface,
          borderColor: pressed ? (danger ? palette.danger : palette.primary) : palette.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <Text style={[type.heading, { color: danger ? palette.dangerText : palette.text }]}>
        {title}
      </Text>
      <Text style={[type.caption, { color: palette.textMuted }]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: border.normal,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: TOUCH_TARGET + 8,
  },
  options: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  option: { minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  action: {
    borderWidth: border.normal,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
    minHeight: TOUCH_TARGET,
  },
});
