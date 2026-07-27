import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  loading?: boolean;
};

export function PrimaryButton({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? theme.accent : theme.backgroundElement;
  const fg = isPrimary ? theme.accentText : variant === 'danger' ? theme.danger : theme.text;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText style={[styles.label, { color: fg }]}>{title}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
  },
});
