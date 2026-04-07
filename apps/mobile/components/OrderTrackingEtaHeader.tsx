import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getEstimatedRemainingTime,
  getPreparingDurationMinutes,
  ORDER_STAGE_MINUTES,
  type OrderTrackingEstimateInput,
} from '@wokthai/shared';
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
  const { line, subline } = useMemo(() => {
    if (order.status === 'delivered') {
      return { line: 'Commande livrée', subline: null as string | null };
    }
    if (order.status === 'cancelled') {
      return { line: 'Commande annulée', subline: null as string | null };
    }

    const eta = getEstimatedRemainingTime(order, nowMs);

    if (eta.mode === 'pending') {
      const delivering =
        order.type === 'delivery' ? ORDER_STAGE_MINUTES.delivering : 5;
      const afterConfirm =
        ORDER_STAGE_MINUTES.confirmed +
        getPreparingDurationMinutes(order) +
        ORDER_STAGE_MINUTES.ready +
        delivering;
      const low = Math.max(15, afterConfirm - 8);
      const high = afterConfirm + 12;
      return {
        line: 'Temps estimé après confirmation',
        subline: `En général entre ${low} et ${high} min une fois le restaurant validé`,
      };
    }

    if (eta.mode !== 'ongoing') {
      return { line: '—', subline: null };
    }

    const { remainingMinutes, estimatedArrival } = eta;

    if (remainingMinutes <= 0) {
      return {
        line: order.type === 'delivery' ? 'Livraison imminente' : 'Retrait imminent',
        subline: null,
      };
    }

    if (remainingMinutes <= MINUTES_CAP) {
      const unit = remainingMinutes <= 1 ? 'minute' : 'minutes';
      return {
        line:
          order.type === 'delivery'
            ? `Arrivée dans ${remainingMinutes} ${unit}`
            : `Prêt dans ${remainingMinutes} ${unit}`,
        subline: null,
      };
    }

    return {
      line:
        order.type === 'delivery'
          ? `Arrivée estimée à ${formatEtaTime(estimatedArrival)}`
          : `Prêt vers ${formatEtaTime(estimatedArrival)}`,
      subline: null,
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
      {subline ? <Text style={styles.sub}>{subline}</Text> : null}
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
  sub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: wt.textMuted,
    lineHeight: 20,
  },
});
