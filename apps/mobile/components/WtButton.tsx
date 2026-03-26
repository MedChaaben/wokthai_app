import {
  Pressable,
  Text,
  type PressableProps,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { wt } from '../lib/theme';

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
};

export function WtButton({ title, loading, variant = 'primary', disabled, style, ...rest }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.ghost,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? wt.white : wt.accentLight} />
      ) : (
        <Text style={[styles.text, variant === 'ghost' ? styles.textGhost : null] as TextStyle[]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: { backgroundColor: wt.accent },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: wt.borderStrong },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
  text: { color: wt.white, fontSize: 16, fontWeight: '600' },
  textGhost: { color: wt.text },
});
