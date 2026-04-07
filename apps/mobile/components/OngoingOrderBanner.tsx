import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import {
  isOngoingOrderStatus,
  useOrders,
  useSupabase,
  type OrderRow,
} from '@wokthai/shared';
import { useAppTopBanner } from '../contexts/AppTopBannerContext';
import { wt } from '../lib/theme';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivering: 'En cours de livraison',
};

function useSession(): Session | null {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return session;
}

function pickLatestOngoing(orders: OrderRow[] | undefined): OrderRow | null {
  if (!orders?.length) return null;
  const ongoing = orders.filter((o) => isOngoingOrderStatus(o.status));
  if (ongoing.length === 0) return null;
  ongoing.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return ongoing[0] ?? null;
}

/**
 * Bannière persistante sous la zone sûre : commande « en cours » la plus récente, lien vers le suivi.
 */
export function OngoingOrderBanner() {
  const session = useSession();
  const orders = useOrders({ mode: 'customer', enabled: Boolean(session) });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { announcementVisible, setOngoingOrderVisible } = useAppTopBanner();

  const order = useMemo(() => pickLatestOngoing(orders.data), [orders.data]);

  useEffect(() => {
    setOngoingOrderVisible(Boolean(order));
  }, [order, setOngoingOrderVisible]);

  if (!order) return null;

  const statusLabel = STATUS_LABEL[order.status] ?? order.status;

  const paddingTop = announcementVisible ? 0 : Math.max(insets.top, 6);

  return (
    <View
      style={[
        styles.outer,
        {
          paddingTop,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Commande en cours, ${statusLabel}. Ouvrir le suivi.`}
        onPress={() => router.push(`/order/${order.id}`)}
        style={({ pressed }) => [styles.inner, pressed && styles.pressed]}
      >
        <View style={styles.textBlock}>
          <Text style={styles.kicker}>Commande en cours</Text>
          <Text style={styles.status}>{statusLabel}</Text>
          <Text style={styles.hint}>Appuyer pour le suivi détaillé</Text>
        </View>
        <Text style={styles.chevron} accessible={false}>
          ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: wt.accentMuted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wt.accentBorder,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 12,
  },
  pressed: {
    opacity: 0.88,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: wt.accentLight,
    marginBottom: 2,
  },
  status: {
    fontSize: 16,
    fontWeight: '700',
    color: wt.text,
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
    color: wt.textMuted,
  },
  chevron: {
    fontSize: 26,
    fontWeight: '300',
    color: wt.accentLight,
    lineHeight: 28,
  },
});
