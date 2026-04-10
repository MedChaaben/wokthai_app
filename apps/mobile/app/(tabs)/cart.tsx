import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useProducts,
  useUpsellConfig,
  useSupabase,
  insertAnalyticsEvent,
  type UpsellKind,
} from '@wokthai/shared';
import { getAnalyticsDeviceId } from '../../lib/analyticsDeviceId';
import { WtButton } from '../../components/WtButton';
import { WtCard } from '../../components/WtCard';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

export default function CartTabScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { lines, subtotal, setQuantity, removeLine, addLine } = useCart();
  const supabase = useSupabase();
  const products = useProducts({ onlyAvailable: false });
  const upsellConfig = useUpsellConfig();
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [lastUpsellCartKey, setLastUpsellCartKey] = useState<string | null>(null);

  const cartFingerprint = useMemo(
    () =>
      lines
        .map((l) => `${l.lineKey}:${l.quantity}`)
        .sort()
        .join('|'),
    [lines]
  );

  const upsellCandidates = useMemo(() => {
    const categoriesByKind = upsellConfig.data?.categoriesByKind;
    const suggestions = upsellConfig.data?.suggestions ?? [];
    if (!categoriesByKind) return [];

    const byProductId = new Map((products.data ?? []).map((p) => [p.id, p]));
    const cartCategoryIds = new Set<string>();
    for (const line of lines) {
      const p = byProductId.get(line.productId);
      if (p) cartCategoryIds.add(p.category_id);
    }

    const kinds: UpsellKind[] = ['drink', 'starter'];
    const out: (typeof suggestions)[number][] = [];
    for (const kind of kinds) {
      const kindCategoryIds = categoriesByKind[kind] ?? [];
      if (kindCategoryIds.length === 0) continue;
      const hasKindInCart = kindCategoryIds.some((cid) => cartCategoryIds.has(cid));
      if (hasKindInCart) continue;
      for (const s of suggestions) {
        if (s.kind === kind && s.is_active && s.product.is_available) out.push(s);
      }
    }
    return out;
  }, [upsellConfig.data, products.data, lines]);

  const upsellNames = useMemo(() => upsellCandidates.map((s) => s.product.name), [upsellCandidates]);
  const upsellIntro = useMemo(() => {
    if (upsellNames.length === 0) return '';
    if (upsellNames.length === 1) {
      return `Pour completer votre commande, envie d'ajouter ${upsellNames[0]} ?`;
    }
    if (upsellNames.length === 2) {
      return `Pour completer votre commande, envie d'ajouter ${upsellNames[0]} ou ${upsellNames[1]} ?`;
    }
    return `Pour completer votre commande, envie d'ajouter ${upsellNames.slice(0, 2).join(', ')}... ?`;
  }, [upsellNames]);

  useEffect(() => {
    if (upsellOpen && upsellCandidates.length === 0) {
      setUpsellOpen(false);
    }
  }, [upsellOpen, upsellCandidates.length]);

  useEffect(() => {
    if (!upsellOpen || upsellCandidates.length === 0) return;
    void (async () => {
      const device_id = await getAnalyticsDeviceId();
      await insertAnalyticsEvent(supabase, {
        event_name: 'upsell_view',
        metadata: {
          candidate_count: upsellCandidates.length,
          ...(device_id ? { device_id } : {}),
        },
      });
    })();
  }, [supabase, upsellOpen, upsellCandidates.length]);

  function goCheckout() {
    if (upsellCandidates.length > 0 && lastUpsellCartKey !== cartFingerprint) {
      setLastUpsellCartKey(cartFingerprint);
      setUpsellOpen(true);
      return;
    }
    router.push('/checkout');
  }

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
        <View style={styles.headerBlock}>
          <Text style={styles.headerEyebrow}>Votre commande</Text>
          <Text style={styles.headerTitle}>Panier</Text>
          <Text style={styles.headerSub}>
            {articleCount} article{articleCount > 1 ? 's' : ''} · vérifiez puis finalisez en toute sérénité.
          </Text>
        </View>
        {lines.map((l) => (
          <WtCard key={l.lineKey} style={styles.row}>
            <View style={styles.rowMain}>
              {l.image_url ? (
                <Image source={{ uri: l.image_url }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Text style={styles.thumbPlaceholderText}>Photo</Text>
                </View>
              )}
              <View style={styles.rowContent}>
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
                <View style={styles.metaRow}>
                  <Text style={styles.metaUnit}>{l.unitPrice.toFixed(2)} TND / unité</Text>
                  <Text style={styles.metaTotal}>{(l.unitPrice * l.quantity).toFixed(2)} TND</Text>
                </View>
                <View style={styles.qtyRow}>
                  <Pressable
                    onPress={() => setQuantity(l.lineKey, l.quantity - 1)}
                    style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer un ${l.name}`}
                    hitSlop={10}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qty}>{l.quantity}</Text>
                  </View>
                  <Pressable
                    onPress={() => setQuantity(l.lineKey, l.quantity + 1)}
                    style={({ pressed }) => [
                      styles.qtyBtn,
                      styles.qtyBtnPlus,
                      pressed && styles.qtyBtnPlusPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Ajouter un ${l.name}`}
                    hitSlop={10}
                  >
                    <Text style={[styles.qtyBtnText, styles.qtyBtnPlusText]}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </WtCard>
        ))}
      </ScrollView>

      <View style={[styles.checkoutDock, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Sous-total</Text>
          <Text style={styles.totalValue}>{subtotal.toFixed(2)} TND</Text>
        </View>
        <WtButton title="Commander" onPress={() => void goCheckout()} />
        <Text style={styles.dockHint}>Livraison ou retrait au choix à l’étape suivante.</Text>
      </View>

      <Modal visible={upsellOpen} transparent animationType="slide" onRequestClose={() => setUpsellOpen(false)}>
        <View style={styles.upsellOverlay}>
          <View style={styles.upsellSheet}>
            <View style={styles.upsellHeader}>
              <Text style={styles.upsellTitle}>Une petite suggestion</Text>
              <Pressable onPress={() => setUpsellOpen(false)} hitSlop={10} style={styles.upsellCloseBtn}>
                <Text style={styles.upsellCloseBtnText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.upsellSub}>{upsellIntro}</Text>
            <ScrollView
              style={{ maxHeight: Math.min(windowHeight * 0.45, 420), marginTop: 10 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
              showsVerticalScrollIndicator={upsellCandidates.length > 3}
            >
              {upsellCandidates.map((s) => (
                <View key={s.id} style={styles.upsellItem}>
                  {s.product.image_url ? (
                    <Image source={{ uri: s.product.image_url }} style={styles.upsellThumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.upsellThumbPlaceholder}>
                      <Text style={styles.upsellThumbPlaceholderText}>Photo</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upsellName}>{s.product.name}</Text>
                    <Text style={styles.upsellPrice}>{Number(s.product.price).toFixed(2)} TND</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      const unitPrice = Number(s.product.price);
                      if (!Number.isFinite(unitPrice)) return;
                      const optionSummary =
                        s.kind === 'drink'
                          ? ['Suggestion boisson']
                          : ['Suggestion entree'];
                      // Ajout rapide sans personnalisation: produit suggere uniquement.
                      addLine({
                        productId: s.product.id,
                        name: s.product.name,
                        unitPrice,
                        quantity: 1,
                        selectedOptions: [],
                        optionSummary,
                        image_url: s.product.image_url,
                        fromUpsell: true,
                      });
                      void (async () => {
                        const device_id = await getAnalyticsDeviceId();
                        await insertAnalyticsEvent(supabase, {
                          event_name: 'upsell_add',
                          metadata: {
                            product_id: s.product.id,
                            price: unitPrice,
                            kind: s.kind,
                            ...(device_id ? { device_id } : {}),
                          },
                        });
                      })();
                    }}
                    style={styles.upsellAddBtn}
                  >
                    <Text style={styles.upsellAddBtnText}>+ Ajouter</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <View style={{ marginTop: 14, gap: 8 }}>
              <Pressable
                onPress={() => {
                  setUpsellOpen(false);
                  router.push('/checkout');
                }}
                style={({ pressed }) => [styles.upsellContinueBtn, pressed && styles.upsellContinueBtnPressed]}
              >
                <Text style={styles.upsellContinueBtnText}>Non merci, continuer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.bg },
  scrollView: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 12, gap: 12 },
  headerBlock: {
    padding: 14,
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 14,
    backgroundColor: wt.bgElevated,
    marginBottom: 2,
  },
  headerEyebrow: {
    fontSize: 12,
    color: wt.accentLight,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: { marginTop: 4, fontSize: 28, color: wt.text, fontWeight: '800' },
  headerSub: { marginTop: 4, fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  row: { gap: 0, borderRadius: 16, borderColor: wt.borderStrong, backgroundColor: wt.bgElevated },
  rowMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: wt.surfaceMuted,
  },
  thumbPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: wt.surfaceMuted,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: { fontSize: 11, color: wt.textMuted, fontWeight: '600' },
  rowContent: { flex: 1, minWidth: 0, gap: 7 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 17, fontWeight: '700', color: wt.text, flex: 1, lineHeight: 22 },
  opts: { fontSize: 12, color: wt.textMuted },
  remove: { color: wt.error, fontWeight: '600', fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaUnit: { color: wt.textSecondary, fontSize: 12 },
  metaTotal: { color: wt.text, fontSize: 15, fontWeight: '700' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 0,
    borderRadius: 999,
    backgroundColor: wt.surfaceMuted,
    padding: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnPlus: {
    backgroundColor: wt.accent,
    borderColor: wt.accent,
  },
  qtyBtnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  qtyBtnPlusPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: wt.accentLight, lineHeight: 22 },
  qtyBtnPlusText: { color: wt.bg },
  qtyBadge: {
    minWidth: 50,
    paddingHorizontal: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  qty: { fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'center', color: wt.text },
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
  upsellOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'flex-end',
  },
  upsellSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: wt.bgElevated,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: wt.border,
  },
  upsellHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upsellTitle: { fontSize: 20, fontWeight: '800', color: wt.text },
  upsellSub: { marginTop: 6, fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  upsellCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wt.surface,
  },
  upsellCloseBtnText: { fontSize: 24, lineHeight: 24, color: wt.textSecondary },
  upsellItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 12,
    padding: 10,
  },
  upsellThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: wt.surfaceMuted,
  },
  upsellThumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: wt.surfaceMuted,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellThumbPlaceholderText: { fontSize: 10, color: wt.textMuted, fontWeight: '600' },
  upsellName: { fontSize: 15, fontWeight: '700', color: wt.text },
  upsellPrice: { marginTop: 2, fontSize: 13, color: wt.textMuted },
  upsellAddBtn: {
    backgroundColor: wt.accentMuted,
    borderWidth: 1,
    borderColor: wt.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  upsellAddBtnText: { color: wt.accentLight, fontWeight: '700', fontSize: 13 },
  upsellContinueBtn: {
    borderWidth: 1,
    borderColor: wt.borderStrong,
    backgroundColor: wt.surface,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  upsellContinueBtnPressed: { opacity: 0.85 },
  upsellContinueBtnText: { color: wt.textSecondary, fontSize: 14, fontWeight: '700' },
});
