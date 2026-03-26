import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import {
  useMyOrdersRealtime,
  type MyOrdersRealtimeEvent,
} from "@wokthai/shared";

const ANDROID_ORDER_CHANNEL = "order-status";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivering: "En cours de livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function notificationBody(event: MyOrdersRealtimeEvent): string | null {
  const label = STATUS_LABEL[event.status] ?? event.status;
  if (event.eventType === "INSERT") {
    return `Nouvelle commande · ${label}`;
  }
  if (event.eventType === "UPDATE") {
    return `Statut de la commande · ${label}`;
  }
  if (event.eventType === "DELETE") {
    return null;
  }
  return null;
}

async function presentOrderNotification(event: MyOrdersRealtimeEvent) {
  const body = notificationBody(event);
  if (!body) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "WokThai",
      body,
      data: { orderId: event.orderId },
      sound: true,
    },
    trigger: null,
  });
}

/**
 * Écoute le Realtime des commandes du client, demande l’autorisation notifications
 * et affiche une alerte locale à chaque nouveau statut (app ouverte ou en arrière-plan si le canal reste actif).
 */
export function OrderNotificationsHost() {
  const router = useRouter();
  const handlerSet = useRef(false);

  const onEvent = useCallback((event: MyOrdersRealtimeEvent) => {
    if (Platform.OS === "web") return;
    void presentOrderNotification(event);
  }, []);

  useMyOrdersRealtime(Platform.OS === "web" ? undefined : { onEvent });

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!handlerSet.current) {
      handlerSet.current = true;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }

    let cancelled = false;
    void (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (cancelled) return;
      if (existing !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(ANDROID_ORDER_CHANNEL, {
          name: "Suivi des commandes",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.orderId;
      if (typeof orderId === "string") {
        router.push(`/order/${orderId}`);
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router]);

  return null;
}
