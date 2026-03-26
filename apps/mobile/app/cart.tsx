import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { useCart } from '../contexts/CartContext';
import { wt } from '../lib/theme';

export default function CartScreen() {
  const router = useRouter();
  const { lines, subtotal, setQuantity, removeLine } = useCart();

  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Panier vide</Text>
        <WtButton title="Parcourir le menu" onPress={() => router.replace('/menu')} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {lines.map((l) => (
        <WtCard key={l.lineKey} style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.name}>{l.name}</Text>
            <Pressable onPress={() => removeLine(l.lineKey)}>
              <Text style={styles.remove}>Retirer</Text>
            </Pressable>
          </View>
          {l.optionSummary && l.optionSummary.length > 0 ? (
            <Text style={styles.opts} numberOfLines={4}>
              {l.optionSummary.join(' · ')}
            </Text>
          ) : null}
          <Text style={styles.meta}>
            {l.unitPrice.toFixed(2)} TND × {l.quantity} = {(l.unitPrice * l.quantity).toFixed(2)} TND
          </Text>
          <View style={styles.qtyRow}>
            <Pressable
              onPress={() => setQuantity(l.lineKey, l.quantity - 1)}
              style={styles.qtyBtn}
              accessibilityRole="button"
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qty}>{l.quantity}</Text>
            <Pressable
              onPress={() => setQuantity(l.lineKey, l.quantity + 1)}
              style={styles.qtyBtn}
              accessibilityRole="button"
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        </WtCard>
      ))}
      <View style={styles.footer}>
        <Text style={styles.total}>Sous-total : {subtotal.toFixed(2)} TND</Text>
        <WtButton title="Commander" onPress={() => router.push('/checkout')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: wt.bg },
  empty: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: wt.bg },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: wt.textMuted },
  row: { gap: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: wt.text, flex: 1 },
  opts: { fontSize: 12, color: wt.textMuted },
  remove: { color: wt.error, fontWeight: '600' },
  meta: { color: wt.textMuted, fontSize: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: wt.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: wt.text },
  qty: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center', color: wt.text },
  footer: { marginTop: 8, gap: 12 },
  total: { fontSize: 18, fontWeight: '800', color: wt.text },
});
