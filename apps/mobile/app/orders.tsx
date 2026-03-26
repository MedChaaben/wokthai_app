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
import { useOrders, useMyOrdersRealtime, isOngoingOrderStatus, type OrderRow } from '@wokthai/shared';
import { WtCard } from '../components/WtCard';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

type Tab = 'ongoing' | 'history';

export default function MyOrdersScreen() {
  const router = useRouter();
  const orders = useOrders({ mode: 'customer' });
  useMyOrdersRealtime();
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

  function renderItem({ item }: { item: OrderRow }) {
    return (
      <Pressable onPress={() => router.push(`/order/${item.id}`)}>
        <WtCard style={styles.card}>
          <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          <Text style={styles.meta}>
            {item.type === 'delivery' ? 'Livraison' : 'À emporter'} ·{' '}
            {new Date(item.created_at).toLocaleString('fr-TN')}
          </Text>
          <Text style={styles.total}>{Number(item.total_price).toFixed(2)} TND</Text>
          <Text style={styles.mono} numberOfLines={1}>
            {item.id}
          </Text>
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

      {orders.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#ea580c" size="large" />
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
            <RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />
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
  screen: { flex: 1, backgroundColor: '#fafaf9' },
  segment: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  segBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segActive: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  segText: { fontWeight: '600', color: '#44403c', fontSize: 13, textAlign: 'center' },
  segTextActive: { color: '#c2410c' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 40, gap: 10 },
  card: { marginBottom: 4 },
  status: { fontSize: 17, fontWeight: '800', color: '#1c1917' },
  meta: { marginTop: 6, fontSize: 14, color: '#57534e' },
  total: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#ea580c' },
  mono: { marginTop: 6, fontSize: 11, color: '#a8a29e' },
  error: { padding: 24, color: '#b91c1c' },
  empty: { textAlign: 'center', color: '#78716c', paddingVertical: 32, paddingHorizontal: 16, fontSize: 15 },
});
