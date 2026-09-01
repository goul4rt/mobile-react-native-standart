import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { usePreferences } from '../preferences/PreferencesContext';
import { border, CONTROL_HEIGHT, PLAIN_CONTROL_HEIGHT, radius, space, TOUCH_TARGET } from './tokens';

/** Screen, Card and Button: the shapes every screen repeats. */

export function Screen({
  children,
  scroll = false,
  keyboardAware = false,
  edges = ['top'],
  contentStyle,
}: {
  children: React.ReactNode;
  /** Content taller than the screen: wraps in a ScrollView with default padding. */
  scroll?: boolean;
  /**
   * Form screens. Without `automaticallyAdjustKeyboardInsets` the keyboard covers
   * the submit button and there is no way to submit without closing it by hand.
   */
  keyboardAware?: boolean;
  edges?: readonly Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { palette } = usePreferences();

  let corpo: React.ReactNode;
  if (scroll || keyboardAware) {
    corpo = (
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={keyboardAware}>
        {children}
      </ScrollView>
    );
  } else {
    corpo = <View style={[styles.fill, contentStyle]}>{children}</View>;
  }

  if (keyboardAware) {
    corpo = (
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {corpo}
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: palette.bg }]} edges={edges}>
      {corpo}
    </SafeAreaView>
  );
}

/**
 * Full-screen state: connection error, empty list, loading. Used to be copied
 * across Home, Stats and Session.
 */
export function Centered({ children }: { children: React.ReactNode }) {
  const { palette } = usePreferences();
  return (
    <SafeAreaView style={[styles.fill, styles.centered, { backgroundColor: palette.bg }]} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

/** Back arrow for stacked screens. */
export function BackButton({ onPress, testID = 'back' }: { onPress: () => void; testID?: string }) {
  const { palette, type } = usePreferences();
  return (
    <Pressable hitSlop={12} onPress={onPress} testID={testID} accessibilityRole="button" style={styles.back}>
      <Text style={[type.label, { color: palette.textSecondary }]}>←</Text>
    </Pressable>
  );
}

/** Raised by border, not shadow: entry-level Android renders shadows poorly. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette } = usePreferences();
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, style]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  testID,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  /** `plain` is a text button; `outline` has a border and no fill. */
  variant?: 'primary' | 'plain' | 'outline';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, type } = usePreferences();
  const inativo = disabled || busy;

  if (variant === 'plain') {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={inativo}
        accessibilityRole="button"
        accessibilityState={{ disabled: inativo }}
        style={({ pressed }) => [styles.plain, { opacity: pressed ? 0.6 : 1 }, style]}>
        <Text style={[type.label, { color: palette.textSecondary }]}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === 'outline') {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={inativo}
        accessibilityRole="button"
        accessibilityState={{ disabled: inativo }}
        style={({ pressed }) => [
          styles.button,
          styles.outline,
          { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
          style,
        ]}>
        <Text style={[type.label, { color: palette.textSecondary }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: inativo ? palette.surfaceAlt : pressed ? palette.primaryPressed : palette.primary },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={palette.onPrimary} />
      ) : (
        <Text style={[type.label, { color: inativo ? palette.textMuted : palette.onPrimary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: space.xxl, gap: space.md, paddingBottom: space.section },
  card: {
    borderRadius: radius.lg,
    borderWidth: border.normal,
    padding: space.lg,
  },
  button: {
    height: CONTROL_HEIGHT,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  outline: { borderWidth: border.normal },
  back: { width: TOUCH_TARGET, height: TOUCH_TARGET, justifyContent: 'center' },
  plain: {
    height: PLAIN_CONTROL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
