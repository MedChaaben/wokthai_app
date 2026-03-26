import { View, StyleSheet, type ViewProps } from 'react-native';
import { wt } from '../lib/theme';

export function WtCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: wt.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: wt.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
