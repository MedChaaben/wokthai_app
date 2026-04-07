import { useOrder, useOrderRealtime, getOrderTrackingProgress, useProducts } from '@wokthai/shared';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OrderProgress } from '../../components/OrderProgress';
import { OrderTrackingEtaHeader } from '../../components/OrderTrackingEtaHeader';
import { OrderTrackingTimeline } from '../../components/OrderTrackingTimeline';
import { WtCard } from '../../components/WtCard';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

const TICK_MS = 30_000;

const REVIEW_URL = process.env.EXPO_PUBLIC_STORE_REVIEW_URL?.trim();

function fmtMoney(n: string | number): string {
  return Number(n).toFixed(2);
}

function fmtOrderDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const orderId = Array.isArray(id) ? id[0] : id;
  const { data, isLoading, error } = useOrder(orderId);
  useOrderRealtime(orderId);
  const products = useProducts({ onlyAvailable: false });
  const { clear, addLine } = useCart();

  const scrollRef = useRef<ScrollView>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [timelineBlockY, setTimelineBlockY] = useState(0);
  const [reorderReport, setReorderReport] = useState<{
    replaced: Array<{ from: string; to: string }>;
    missing: string[];
    addedCount: number;
  } | null>(null);

  useEffect(() => {
    const idTimer = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(idTimer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
    }, [])
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={wt.accent} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Commande introuvable</Text>
      </View>
    );
  }

  const items = data.order_items ?? [];
  const progress = getOrderTrackingProgress(data, nowMs);
  const isDelivered = data.status === 'delivered';
  const isCancelled = data.status === 'cancelled';

  function onTimelineWrapperLayout(e: LayoutChangeEvent) {
    setTimelineBlockY(e.nativeEvent.layout.y);
  }

  function openReview() {
    if (REVIEW_URL) {
      void Linking.openURL(REVIEW_URL);
      return;
    }
    Alert.alert(
      'Merci !',
      'Votre avis nous aide à nous améliorer. Le lien vers la page d’avis sera bientôt disponible dans l’application.'
    );
  }

  function handleReorder() {
    if (!data) return;
    if (products.isLoading) {
      Alert.alert('Un instant', 'Chargement du catalogue en cours, réessayez dans un moment.');
      return;
    }
    const allProducts = products.data ?? [];
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    const availableByCategory = new Map<string, typeof allProducts>();
    for (const p of allProducts) {
      if (!p.is_available) continue;
      const arr = availableByCategory.get(p.category_id) ?? [];
      arr.push(p);
      availableByCategory.set(p.category_id, arr);
    }
    for (const arr of availableByCategory.values()) {
      arr.sort((a, b) => a.position - b.position);
    }

    const replaced: Array<{ from: string; to: string }> = [];
    const missing: string[] = [];
    let addedCount = 0;

    clear();
    for (const line of data.order_items ?? []) {
      const original = byId.get(line.product_id);
      const originalName = line.products?.name ?? original?.name ?? 'Article';
      const qty = Math.max(1, line.quantity);
      let target = original;

      if (!target || !target.is_available) {
        const sameCat = target ? availableByCategory.get(target.category_id) ?? [] : [];
        target = sameCat[0];
        if (target) {
          replaced.push({ from: originalName, to: target.name });
        } else {
          missing.push(originalName);
          continue;
        }
      }

      const unitPrice = Number(target.price);
      if (!Number.isFinite(unitPrice)) {
        missing.push(originalName);
        continue;
      }

      addLine({
        productId: target.id,
        name: target.name,
        unitPrice,
        quantity: qty,
        selectedOptions: [],
        optionSummary:
          target.id === line.product_id
            ? undefined
            : [`Remplace depuis "${originalName}"`],
        image_url: target.image_url,
      });
      addedCount += qty;
    }

    setReorderReport({ replaced, missing, addedCount });
  }

  return (
    <>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.stickyHeader}>
        <OrderTrackingEtaHeader order={data} nowMs={nowMs} />
      </View>

      {!isCancelled && !isDelivered ? (
        <WtCard style={styles.progressCard}>
          <OrderProgress progress={progress} />
        </WtCard>
      ) : null}

      {!isDelivered ? (
        <>
          <Text style={styles.sectionTitle}>Étapes</Text>
          <View onLayout={onTimelineWrapperLayout}>
            <WtCard>
              <OrderTrackingTimeline
                status={data.status}
                orderType={data.type}
                scrollViewRef={scrollRef}
                timelineBlockY={timelineBlockY}
              />
            </WtCard>
          </View>
        </>
      ) : null}

      {isDelivered ? (
        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed]}
            onPress={handleReorder}
          >
            <Text style={styles.ctaPrimaryText}>Commander à nouveau</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaPressed]}
            onPress={openReview}
          >
            <Text style={styles.ctaSecondaryText}>Laisser un avis</Text>
          </Pressable>
        </View>
      ) : null}

      <WtCard>
        <Text style={styles.title}>Détails</Text>
        <Text style={styles.orderTime}>{fmtOrderDateTime(data.created_at)}</Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Type : </Text>
          <Text style={styles.value}>{data.type === 'delivery' ? 'Livraison' : 'À emporter'}</Text>
        </Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Paiement : </Text>
          <Text style={styles.value}>
            {data.payment_status === 'paid_on_delivery' ? 'À la livraison' : 'Non payé'}
          </Text>
        </Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Total : </Text>
          <Text style={styles.value}>{fmtMoney(data.total_price)} TND</Text>
        </Text>
      </WtCard>

      {data.delivery_notes ? (
        <>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <WtCard>
            <Text style={styles.notes}>{data.delivery_notes}</Text>
          </WtCard>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Articles</Text>
      {items.length === 0 ? (
        <WtCard>
          <Text style={styles.muted}>Aucune ligne enregistrée.</Text>
        </WtCard>
      ) : (
        items.map((line) => {
          const name = line.products?.name ?? 'Produit';
          const lineTotal = Number(line.unit_price) * line.quantity;
          const opts = line.order_item_options ?? [];
          return (
            <WtCard key={line.id} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <View style={styles.lineTitleWrap}>
                  {line.products?.image_url ? (
                    <Image
                      source={{ uri: line.products.image_url }}
                      style={styles.lineThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.lineThumbPlaceholder} />
                  )}
                  <Text style={styles.lineName}>{name}</Text>
                </View>
                <Text style={styles.linePrice}>{fmtMoney(lineTotal)} TND</Text>
              </View>
              <Text style={styles.lineQty}>
                {line.quantity} × {fmtMoney(line.unit_price)} TND
              </Text>
              {opts.length > 0 ? (
                <View style={styles.opts}>
                  {opts.map((o, i) => {
                    const mod = Number(o.price_modifier);
                    const extra =
                      mod !== 0 ? (mod > 0 ? ` (+${fmtMoney(mod)} TND)` : ` (${fmtMoney(mod)} TND)`) : '';
                    return (
                      <Text key={`${line.id}-opt-${i}`} style={styles.optItem}>
                        · {o.option_name}
                        {extra}
                      </Text>
                    );
                  })}
                </View>
              ) : null}
            </WtCard>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Lieu</Text>
      <WtCard>
        {data.type === 'pickup' ? (
          data.stores ? (
            <>
              <Text style={styles.placeKind}>Retrait au magasin</Text>
              <Text style={styles.placeName}>{data.stores.name}</Text>
              <Text style={styles.placeAddr}>
                {data.stores.address}
                {'\n'}
                {data.stores.city}
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>Restaurant non renseigné</Text>
          )
        ) : data.addresses ? (
          <>
            <Text style={styles.placeKind}>Adresse de livraison</Text>
            <Text style={styles.placeName}>{data.addresses.label}</Text>
            <Text style={styles.placeAddr}>
              {data.addresses.address}
              {'\n'}
              {data.addresses.city}
            </Text>
            {data.addresses.instructions ? (
              <Text style={styles.instructions}>Note : {data.addresses.instructions}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.muted}>Adresse non disponible</Text>
        )}
      </WtCard>

        {!isCancelled ? (
          <Text style={styles.hint}>Mise à jour automatique lorsque le restaurant avance la commande.</Text>
        ) : null}
      </ScrollView>
      <Modal
        visible={reorderReport != null}
        transparent
        animationType="slide"
        onRequestClose={() => setReorderReport(null)}
      >
        <View style={styles.infoOverlay}>
          <View style={styles.infoSheet}>
            <Text style={styles.infoTitle}>Panier pre-rempli</Text>
            <Text style={styles.infoSub}>
              {reorderReport?.addedCount ?? 0} article{(reorderReport?.addedCount ?? 0) > 1 ? 's' : ''} ajoute
              {reorderReport?.replaced.length || reorderReport?.missing.length ? 's' : ''}.
            </Text>
            {reorderReport && (reorderReport.replaced.length > 0 || reorderReport.missing.length > 0) ? (
              <View style={styles.infoList}>
                {reorderReport.replaced.map((r, i) => (
                  <Text key={`rep-${i}`} style={styles.infoItem}>
                    • {r.from} indisponible, remplace par {r.to}
                  </Text>
                ))}
                {reorderReport.missing.map((name, i) => (
                  <Text key={`mis-${i}`} style={styles.infoItem}>
                    • {name} non disponible actuellement
                  </Text>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={() => {
                setReorderReport(null);
                router.push('/(tabs)/cart');
              }}
              style={({ pressed }) => [styles.infoBtn, pressed && styles.ctaPressed]}
            >
              <Text style={styles.infoBtnText}>Voir mon panier</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 32, backgroundColor: wt.bg, gap: 10 },
  stickyHeader: {
    backgroundColor: wt.bg,
    paddingBottom: 4,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  errorTitle: { fontSize: 16, fontWeight: '600', color: wt.text },
  progressCard: { paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '800', color: wt.text },
  orderTime: { marginTop: 6, fontSize: 14, color: wt.textMuted, fontWeight: '600' },
  row: { marginTop: 10, fontSize: 15 },
  label: { color: wt.textMuted, fontWeight: '600' },
  value: { color: wt.text, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: wt.text,
    marginTop: 6,
    marginBottom: 2,
  },
  placeKind: { fontSize: 13, fontWeight: '700', color: wt.accentLight, textTransform: 'uppercase' },
  placeName: { marginTop: 8, fontSize: 17, fontWeight: '800', color: wt.text },
  placeAddr: { marginTop: 6, fontSize: 15, color: wt.textMuted, lineHeight: 22 },
  instructions: { marginTop: 10, fontSize: 14, color: wt.textMuted, fontStyle: 'italic' },
  notes: { fontSize: 15, color: wt.textMuted, lineHeight: 22 },
  muted: { fontSize: 14, color: wt.textMuted },
  lineCard: { marginBottom: 8 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  lineTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: wt.surface },
  lineThumbPlaceholder: { width: 36, height: 36, borderRadius: 8, backgroundColor: wt.surfaceMuted },
  lineName: { flex: 1, fontSize: 16, fontWeight: '700', color: wt.text },
  linePrice: { fontSize: 16, fontWeight: '800', color: wt.accentLight },
  lineQty: { marginTop: 4, fontSize: 13, color: wt.textMuted },
  opts: { marginTop: 8, gap: 4 },
  optItem: { fontSize: 13, color: wt.textMuted },
  hint: { fontSize: 13, color: wt.textSecondary, paddingHorizontal: 4, marginTop: 8 },
  ctaRow: { gap: 10, marginTop: 4 },
  ctaPrimary: {
    backgroundColor: wt.accent,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: wt.white, fontSize: 16, fontWeight: '800' },
  ctaSecondary: {
    backgroundColor: wt.surface,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: wt.borderStrong,
  },
  ctaSecondaryText: { color: wt.text, fontSize: 16, fontWeight: '700' },
  ctaPressed: { opacity: 0.88 },
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  infoSheet: {
    backgroundColor: wt.bgElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: wt.border,
  },
  infoTitle: { fontSize: 18, fontWeight: '800', color: wt.text },
  infoSub: { marginTop: 6, fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  infoList: { marginTop: 10, gap: 6 },
  infoItem: { fontSize: 13, color: wt.textSecondary, lineHeight: 18 },
  infoBtn: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: wt.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: { color: wt.bg, fontWeight: '800', fontSize: 15 },
});
