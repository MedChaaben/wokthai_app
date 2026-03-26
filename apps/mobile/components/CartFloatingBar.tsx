import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCart } from '../contexts/CartContext';
import { wt } from '../lib/theme';

/**
 * Bandeau en bas de l’écran Menu quand le panier contient des articles (au-dessus de la tab bar).
 */
export function CartFloatingBar() {
  const router = useRouter();
  const { lines, subtotal } = useCart();

  const count = lines.reduce((s, l) => s + l.quantity, 0);
  if (count === 0) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => router.push('/(tabs)/cart')}
        style={({ pressed }) => [styles.inner, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Panier, ${count} articles, ${subtotal.toFixed(2)} dinars. Ouvrir le panier.`}
      >
        <View style={styles.left}>
          <Text style={styles.icon} accessible={false}>
            🛒
          </Text>
          <View>
            <Text style={styles.title}>Votre panier</Text>
            <Text style={styles.meta}>
              {count} article{count > 1 ? 's' : ''} · {subtotal.toFixed(2)} TND
            </Text>
          </View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Voir</Text>
          <Text style={styles.ctaChevron}>›</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 2,
    borderTopColor: wt.accent,
    backgroundColor: wt.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: wt.accentMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: wt.accentBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.92 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  icon: { fontSize: 26 },
  title: { fontSize: 16, fontWeight: '800', color: wt.text },
  meta: { fontSize: 13, color: wt.accentLight, marginTop: 2, fontWeight: '600' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { fontSize: 15, fontWeight: '800', color: wt.accentLight },
  ctaChevron: { fontSize: 22, color: wt.accentLight, fontWeight: '300' },
});
