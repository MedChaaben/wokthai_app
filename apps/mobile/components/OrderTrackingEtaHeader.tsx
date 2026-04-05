import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getEstimatedRemainingTime, type OrderTrackingEstimateInput } from '@wokthai/shared';
import { wt } from '../lib/theme';

/** Au-delà : afficher l’heure estimée plutôt que les minutes. */
const MINUTES_CAP = 50;

type Props = {
  order: OrderTrackingEstimateInput;
  /** Horloge pilotée par l’écran parent (setInterval) pour rester alignée avec la barre. */
  nowMs: number;
};

function formatEtaTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function OrderTrackingEtaHeader({ order, nowMs }: Props) {
  const { line } = useMemo(() => {
    if (order.status === 'delivered') {
      return { line: 'Commande livrée' };
    }
    if (order.status === 'cancelled') {
      return { line: 'Commande annulée' };
    }

    const { remainingMinutes, estimatedArrival } = getEstimatedRemainingTime(order, nowMs);

    if (remainingMinutes <= 0) {
      return {
        line: order.type === 'delivery' ? 'Livraison imminente' : 'Retrait imminent',
      };
    }

    if (remainingMinutes <= MINUTES_CAP) {
      const unit = remainingMinutes <= 1 ? 'minute' : 'minutes';
      return {
        line:
          order.type === 'delivery'
            ? `Arrivée dans ${remainingMinutes} ${unit}`
            : `Prêt dans ${remainingMinutes} ${unit}`,
      };
    }

    return {
      line:
        order.type === 'delivery'
          ? `Arrivée estimée à ${formatEtaTime(estimatedArrival)}`
          : `Prêt vers ${formatEtaTime(estimatedArrival)}`,
    };
  }, [order, nowMs]);

  if (order.status === 'cancelled') {
    return (
      <View style={[styles.box, styles.boxMuted]}>
        <Text style={styles.title}>{line}</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: wt.bg,
  },
  boxMuted: { opacity: 0.85 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: wt.text,
    letterSpacing: -0.3,
  },
});
