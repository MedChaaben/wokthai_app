import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useOrders, isOngoingOrderStatus, type OrderRow } from '@wokthai/shared';
import { WtCard } from '../components/WtCard';
import { useRequireSession } from '../hooks/useRequireSession';
import { wt } from '../lib/theme';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivering: 'En cours de livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

function fmtDateTime24(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function shortId(id: string): string {
  return id.slice(-4).toUpperCase();
}

export default function MyOrdersScreen() {
  const sessionOk = useRequireSession('/orders');
  const router = useRouter();
  const orders = useOrders({ mode: 'customer', enabled: sessionOk });
  const refetchOrders = orders.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchOrders();
    }, [refetchOrders])
  );

  const { ongoing, history } = useMemo(() => {
    const all = orders.data ?? [];
    const ongoingList: OrderRow[] = [];
    const historyList: OrderRow[] = [];
    for (const o of all) {
      if (isOngoingOrderStatus(o.status)) ongoingList.push(o);
      else historyList.push(o);
    }
    const byDate = (a: OrderRow, b: OrderRow) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    ongoingList.sort(byDate);
    historyList.sort(byDate);
    return { ongoing: ongoingList, history: historyList };
  }, [orders.data]);

  if (!sessionOk) {
    return (
      <View style={styles.authWait}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  function renderItem({ item }: { item: OrderRow }) {
    const isDelivered = item.status === 'delivered';
    const isCancelled = item.status === 'cancelled';
    const statusTone = isDelivered
      ? styles.statusDelivered
      : isCancelled
      ? styles.statusCancelled
      : styles.statusOngoing;

    return (
      <Pressable onPress={() => router.push(`/order/${item.id}`)} style={({ pressed }) => pressed && styles.cardPressed}>
        <WtCard style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={[styles.statusBadge, statusTone]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            <Text style={styles.date}>{fmtDateTime24(item.created_at)}</Text>
          </View>

          <Text style={styles.meta}>{item.type === 'delivery' ? 'Livraison' : 'À emporter'}</Text>
          <Text style={styles.orderRef}>Réf. {shortId(item.id)}</Text>

          <View style={styles.rowBottom}>
            <Text style={styles.total}>{Number(item.total_price).toFixed(2)} TND</Text>
            <Text style={styles.ctaHint}>Voir le détail ›</Text>
          </View>
        </WtCard>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      {orders.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={wt.accent} size="large" />
      ) : orders.error ? (
        <Text style={styles.error}>
          {orders.error instanceof Error ? orders.error.message : 'Erreur de chargement'}
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={orders.isRefetching}
              onRefresh={() => void orders.refetch()}
              tintColor={wt.accent}
              colors={[wt.accent]}
            />
          }
        >
          {ongoing.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Commandes en cours ({ongoing.length})</Text>
              {ongoing.map((item) => (
                <View key={item.id}>{renderItem({ item })}</View>
              ))}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>
            {ongoing.length > 0 ? 'Historique des commandes' : 'Mes commandes'}
            {history.length > 0 ? ` (${history.length})` : ''}
          </Text>
          {history.length > 0 ? (
            history.map((item) => <View key={item.id}>{renderItem({ item })}</View>)
          ) : (
            <Text style={styles.empty}>
              {ongoing.length > 0
                ? 'Aucune commande dans l’historique pour le moment.'
                : 'Aucune commande pour le moment. Passez votre premiere commande depuis le menu.'}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  authWait: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  screen: { flex: 1, backgroundColor: wt.bg },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  sectionTitle: { marginTop: 4, marginBottom: 8, fontSize: 16, fontWeight: '800', color: wt.text },
  card: { marginBottom: 4 },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusBadge: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  statusOngoing: { color: wt.accentLight, backgroundColor: wt.accentMuted, borderWidth: 1, borderColor: wt.accentBorder },
  statusDelivered: { color: '#34d399', backgroundColor: '#07251d', borderWidth: 1, borderColor: '#0f5132' },
  statusCancelled: { color: wt.error, backgroundColor: '#2b1010', borderWidth: 1, borderColor: '#4b1d1d' },
  date: { fontSize: 12, color: wt.textSecondary, fontWeight: '600' },
  meta: { marginTop: 10, fontSize: 14, color: wt.textMuted },
  orderRef: { marginTop: 3, fontSize: 12, color: wt.textSecondary },
  rowBottom: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontSize: 17, fontWeight: '800', color: wt.text },
  ctaHint: { fontSize: 13, color: wt.accentLight, fontWeight: '700' },
  error: { padding: 24, color: wt.errorStrong },
  empty: { textAlign: 'center', color: wt.textMuted, paddingVertical: 32, paddingHorizontal: 16, fontSize: 15 },
});
