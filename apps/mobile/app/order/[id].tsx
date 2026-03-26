import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useOrder, useOrderRealtime } from '@wokthai/shared';
import { WtCard } from '../../components/WtCard';
import { wt } from '../../lib/theme';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivering: 'En cours de livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

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

function fmtTimelineTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useOrder(id);
  useOrderRealtime(id);

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
  const statusEvents = data.order_status_events ?? [{ status: data.status, created_at: data.created_at }];

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <WtCard>
        <Text style={styles.title}>Commande</Text>
        <Text style={styles.orderTime}>{fmtOrderDateTime(data.created_at)}</Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Statut : </Text>
          <Text style={styles.value}>{STATUS_LABEL[data.status] ?? data.status}</Text>
        </Text>
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

      <Text style={styles.sectionTitle}>Suivi du statut</Text>
      <WtCard>
        <View style={styles.timeline}>
          {statusEvents.map((ev, i) => {
            const isLast = i === statusEvents.length - 1;
            return (
              <View key={`${ev.created_at}-${ev.status}-${i}`} style={styles.timelineRow}>
                <View style={styles.timelineTrack}>
                  <View style={[styles.timelineDot, isLast && styles.timelineDotCurrent]} />
                  {!isLast ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={[styles.timelineBody, isLast && styles.timelineBodyLast]}>
                  <Text style={styles.timelineLabel}>{STATUS_LABEL[ev.status] ?? ev.status}</Text>
                  <Text style={styles.timelineMeta}>{fmtTimelineTime(ev.created_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </WtCard>

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
            <Text style={styles.muted}>Magasin non renseigné</Text>
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
                <Text style={styles.lineName}>{name}</Text>
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

      <Text style={styles.hint}>Mise à jour en temps réel lorsque le restaurant change le statut.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 32, backgroundColor: wt.bg, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  errorTitle: { fontSize: 16, fontWeight: '600', color: wt.text },
  title: { fontSize: 20, fontWeight: '800', color: wt.text },
  orderTime: { marginTop: 6, fontSize: 15, color: wt.textMuted, fontWeight: '600' },
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
  lineName: { flex: 1, fontSize: 16, fontWeight: '700', color: wt.text },
  linePrice: { fontSize: 16, fontWeight: '800', color: wt.accentLight },
  lineQty: { marginTop: 4, fontSize: 13, color: wt.textMuted },
  opts: { marginTop: 8, gap: 4 },
  optItem: { fontSize: 13, color: wt.textMuted },
  hint: { fontSize: 13, color: wt.textSecondary, paddingHorizontal: 4, marginTop: 8 },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
  timelineTrack: {
    width: 22,
    marginRight: 12,
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: wt.border,
    borderWidth: 2,
    borderColor: wt.textMuted,
  },
  timelineDotCurrent: {
    backgroundColor: wt.accentMuted,
    borderColor: wt.accentLight,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 10,
    marginTop: 4,
    backgroundColor: wt.border,
    borderRadius: 1,
  },
  timelineBody: { flex: 1, paddingBottom: 18 },
  timelineBodyLast: { paddingBottom: 0 },
  timelineLabel: { fontSize: 16, fontWeight: '700', color: wt.text },
  timelineMeta: { marginTop: 4, fontSize: 13, color: wt.textMuted },
});
