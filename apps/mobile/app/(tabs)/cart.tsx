import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WtButton } from '../../components/WtButton';
import { WtCard } from '../../components/WtCard';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

export default function CartTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lines, subtotal, setQuantity, removeLine } = useCart();

  const articleCount = lines.reduce((s, l) => s + l.quantity, 0);

  if (lines.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.emptyEmoji} accessible={false}>
          🛒
        </Text>
        <Text style={styles.emptyTitle}>Votre panier est vide</Text>
        <Text style={styles.emptySub}>Ajoutez des plats depuis le menu pour passer commande.</Text>
        <WtButton title="Parcourir le menu" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.listHint}>
          {articleCount} article{articleCount > 1 ? 's' : ''} · vérifiez les quantités puis commandez.
        </Text>
        {lines.map((l) => (
          <WtCard key={l.lineKey} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.name}>{l.name}</Text>
              <Pressable onPress={() => removeLine(l.lineKey)} hitSlop={8}>
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
      </ScrollView>

      <View style={[styles.checkoutDock, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Sous-total</Text>
          <Text style={styles.totalValue}>{subtotal.toFixed(2)} TND</Text>
        </View>
        <WtButton title="Commander" onPress={() => router.push('/checkout')} />
        <Text style={styles.dockHint}>Livraison ou retrait au choix à l’étape suivante.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.bg },
  scrollView: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 12, gap: 12 },
  listHint: {
    fontSize: 13,
    color: wt.textMuted,
    marginBottom: 4,
    lineHeight: 18,
  },
  row: { gap: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: wt.text, flex: 1 },
  opts: { fontSize: 12, color: wt.textMuted },
  remove: { color: wt.error, fontWeight: '600', fontSize: 14 },
  meta: { color: wt.textMuted, fontSize: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: wt.accentMuted,
    borderWidth: 1,
    borderColor: wt.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 22, fontWeight: '700', color: wt.accentLight },
  qty: { fontSize: 17, fontWeight: '800', minWidth: 28, textAlign: 'center', color: wt.text },
  checkoutDock: {
    borderTopWidth: 2,
    borderTopColor: wt.accent,
    backgroundColor: wt.bgElevated,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: wt.textMuted },
  totalValue: { fontSize: 22, fontWeight: '800', color: wt.text },
  dockHint: { fontSize: 12, color: wt.textSecondary, textAlign: 'center', lineHeight: 16 },
  emptyRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: wt.bg,
  },
  emptyEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: wt.text },
  emptySub: { fontSize: 15, color: wt.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
});
