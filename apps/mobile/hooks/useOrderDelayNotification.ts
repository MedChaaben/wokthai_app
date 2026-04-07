import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  getOrderConfirmedAtMs,
  getReferenceEtaAtConfirmation,
  isOngoingOrderStatus,
  type OrderDetailRow,
} from '@wokthai/shared';

const DELAY_SLACK_MINUTES = 5;

/**
 * Une fois l’heure de référence (validation) + marge dépassée, notif locale « léger retard ».
 */
export function useOrderDelayNotification(order: OrderDetailRow | null | undefined, nowMs: number) {
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [order?.id]);

  useEffect(() => {
    if (Platform.OS === 'web' || !order) return;
    if (order.status === 'pending' || order.status === 'delivered' || order.status === 'cancelled') {
      return;
    }

    const confirmedAt = getOrderConfirmedAtMs(order);
    if (confirmedAt == null) return;

    const referenceEnd = getReferenceEtaAtConfirmation(order, confirmedAt).getTime();
    const lateMs = referenceEnd + DELAY_SLACK_MINUTES * 60_000;
    if (nowMs < lateMs) return;
    if (!isOngoingOrderStatus(order.status)) return;
    if (firedRef.current) return;

    firedRef.current = true;

    void (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'WokThai',
          body: `Votre commande prend un peu de retard (environ +${DELAY_SLACK_MINUTES} min).`,
          data: { orderId: order.id },
          sound: true,
        },
        trigger: null,
      });
    })();
  }, [order, nowMs]);
}
