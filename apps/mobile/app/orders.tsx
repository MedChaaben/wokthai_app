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
    return (
      <Pressable onPress={() => router.push(`/order/${item.id}`)}>
        <WtCard style={styles.card}>
          <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          <Text style={styles.meta}>
            {item.type === 'delivery' ? 'Livraison' : 'À emporter'} ·{' '}
            {new Date(item.created_at).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </Text>
          <Text style={styles.total}>{Number(item.total_price).toFixed(2)} TND</Text>
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
  status: { fontSize: 17, fontWeight: '800', color: wt.text },
  meta: { marginTop: 6, fontSize: 14, color: wt.textMuted },
  total: { marginTop: 8, fontSize: 16, fontWeight: '700', color: wt.accentLight },
  error: { padding: 24, color: wt.errorStrong },
  empty: { textAlign: 'center', color: wt.textMuted, paddingVertical: 32, paddingHorizontal: 16, fontSize: 15 },
});
