import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useColorScheme, type ViewProps } from 'react-native';

// A faint accent tint at the top easing into the base background. Kept subtle
// so content/cards stay readable in both light and dark.
const GRADIENTS = {
  light: ['#FFD9CB', '#FFEDE6', '#FFFFFF'] as const,
  // Visibly warm ember at the top easing to black (was too near-black before).
  dark: ['#5A2A16', '#241310', '#000000'] as const,
};

/**
 * Full-screen container with a soft vertical gradient behind its children.
 * Drop-in replacement for the top-level <ThemedView> on a screen.
 */
export function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <View style={[styles.fill, style]} {...rest}>
      <LinearGradient
        colors={GRADIENTS[scheme]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
