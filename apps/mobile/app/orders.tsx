import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
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

type Tab = 'ongoing' | 'history';

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
  const [tab, setTab] = useState<Tab>('ongoing');

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

  const list = tab === 'ongoing' ? ongoing : history;

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
      <View style={styles.segment}>
        <Pressable
          onPress={() => setTab('ongoing')}
          style={[styles.segBtn, tab === 'ongoing' && styles.segActive]}
        >
          <Text style={[styles.segText, tab === 'ongoing' && styles.segTextActive]}>
            En cours ({ongoing.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          style={[styles.segBtn, tab === 'history' && styles.segActive]}
        >
          <Text style={[styles.segText, tab === 'history' && styles.segTextActive]}>
            Historique ({history.length})
          </Text>
        </Pressable>
      </View>
      {tab === 'history' ? (
        <Text style={styles.historyIntro}>
          Vos commandes passées, classées de la plus récente à la plus ancienne.
        </Text>
      ) : null}

      {orders.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={wt.accent} size="large" />
      ) : orders.error ? (
        <Text style={styles.error}>
          {orders.error instanceof Error ? orders.error.message : 'Erreur de chargement'}
        </Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={orders.isRefetching}
              onRefresh={() => void orders.refetch()}
              tintColor={wt.accent}
              colors={[wt.accent]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'ongoing'
                ? 'Aucune commande en cours. Passez une commande depuis le menu.'
                : 'Aucune commande passée pour le moment.'}
            </Text>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  authWait: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  screen: { flex: 1, backgroundColor: wt.bg },
  segment: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  segBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    backgroundColor: wt.surface,
  },
  segActive: { borderColor: wt.accent, backgroundColor: wt.accentMuted },
  segText: { fontWeight: '600', color: wt.textMuted, fontSize: 13, textAlign: 'center' },
  segTextActive: { color: wt.accentLight },
  list: { padding: 16, paddingTop: 8, paddingBottom: 40, gap: 10 },
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
  historyIntro: { paddingHorizontal: 16, paddingBottom: 2, color: wt.textSecondary, fontSize: 13 },
  empty: { textAlign: 'center', color: wt.textMuted, paddingVertical: 32, paddingHorizontal: 16, fontSize: 15 },
});
