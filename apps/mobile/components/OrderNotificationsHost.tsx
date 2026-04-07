import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  ANNOUNCEMENTS_BANNER_QUERY_KEY,
  useMyOrdersRealtime,
  type MyOrdersRealtimeEvent,
} from "@wokthai/shared";
import { clearAnnouncementDismissalForId } from "../lib/announcementDismiss";

const ANDROID_ORDER_CHANNEL = "order-status";
const ANDROID_ANNOUNCEMENTS_CHANNEL = "announcements";

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
  const queryClient = useQueryClient();
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
        await Notifications.setNotificationChannelAsync(ANDROID_ANNOUNCEMENTS_CHANNEL, {
          name: "Annonces",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
    })();

    const handleNotificationOpen = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === "announcement" && typeof data.announcementId === "string") {
        void clearAnnouncementDismissalForId(data.announcementId);
        void queryClient.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_BANNER_QUERY_KEY] });
        router.replace("/(tabs)");
        return;
      }
      const orderId = data?.orderId;
      if (typeof orderId === "string") {
        router.push(`/order/${orderId}`);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationOpen);

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router, queryClient]);

  return null;
}
