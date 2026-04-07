import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { OrderStatus, OrderType } from '@wokthai/shared';
import { wt } from '../lib/theme';

/** Livraison : étape « En route » entre prête et livrée. À emporter : pas d’étape intermédiaire (évite « Prête » + « Prête à être retirée »). */
const STEPS_DELIVERY: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivering',
  'delivered',
];

const STEPS_PICKUP: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
];

function stepsForOrder(orderType: OrderType): OrderStatus[] {
  return orderType === 'delivery' ? STEPS_DELIVERY : STEPS_PICKUP;
}

function labelForStep(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Commande reçue';
    case 'confirmed':
      return 'Validée par le restaurant';
    case 'preparing':
      return 'En cuisine 🍳';
    case 'ready':
      return 'Prête';
    case 'delivering':
      return 'En route 🚴';
    case 'delivered':
      return 'Livrée';
    case 'cancelled':
      return 'Annulée';
    default:
      return status;
  }
}

function statusOrderIndex(status: OrderStatus, orderType: OrderType): number {
  const steps = stepsForOrder(orderType);
  if (orderType === 'pickup' && status === 'delivering') {
    return steps.indexOf('ready');
  }
  const i = steps.indexOf(status);
  return i >= 0 ? i : -1;
}

type Props = {
  status: OrderStatus;
  orderType: OrderType;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  /** Offset Y du bloc timeline dans le contenu du ScrollView (pour scroll auto). */
  timelineBlockY: number;
};

function PulseDot({ active }: { active: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <Animated.View style={[styles.dotOuter, active && { transform: [{ scale: pulse }] }]}>
      <View style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />
    </Animated.View>
  );
}

export function OrderTrackingTimeline({
  status,
  orderType,
  scrollViewRef,
  timelineBlockY,
}: Props) {
  const steps = stepsForOrder(orderType);
  const activeIndex = statusOrderIndex(status, orderType);
  const stepYRef = useRef<number[]>([]);
  const cancelled = status === 'cancelled';

  useEffect(() => {
    if (cancelled || !scrollViewRef?.current || activeIndex < 0) return;
    const y = stepYRef.current[activeIndex];
    if (y === undefined) return;
    const target = Math.max(0, timelineBlockY + y - 24);
    scrollViewRef.current.scrollTo({ y: target, animated: true });
  }, [activeIndex, cancelled, scrollViewRef, timelineBlockY, status]);

  if (cancelled) {
    return (
      <View style={styles.cancelledBox}>
        <Text style={styles.cancelledText}>Cette commande a été annulée.</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {steps.map((step, i) => {
        const stepIndex = i;
        const done = activeIndex > stepIndex;
        const active = activeIndex === stepIndex;
        const isLast = i === steps.length - 1;

        return (
          <View
            key={step}
            style={styles.row}
            onLayout={(e: LayoutChangeEvent) => {
              stepYRef.current[stepIndex] = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.track}>
              <PulseDot active={active && status !== 'delivered'} />
              {!isLast ? <View style={[styles.line, done && styles.lineDone]} /> : null}
            </View>
            <View style={[styles.body, !isLast && styles.bodySpaced]}>
              <View style={styles.bodyText}>
                <Text style={[styles.label, done && styles.labelDone, active && styles.labelActive]}>
                  {labelForStep(step)}
                </Text>
                {active && status !== 'delivered' ? (
                  <Text style={styles.sub}>Étape en cours</Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  track: {
    width: 28,
    marginRight: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  dotOuter: { alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  dotInactive: {
    backgroundColor: wt.surfaceMuted,
    borderColor: wt.textMuted,
  },
  dotActive: {
    backgroundColor: wt.accentMuted,
    borderColor: wt.accentLight,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 12,
    marginTop: 4,
    backgroundColor: wt.border,
    borderRadius: 1,
  },
  lineDone: { backgroundColor: wt.accentBorder },
  body: { flex: 1 },
  bodySpaced: { paddingBottom: 16 },
  bodyText: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700', color: wt.textMuted },
  labelDone: { color: wt.textSecondary },
  labelActive: { color: wt.text, fontSize: 17 },
  sub: { marginTop: 4, fontSize: 13, fontWeight: '600', color: wt.accentLight },
  cancelledBox: { paddingVertical: 8 },
  cancelledText: { fontSize: 15, color: wt.textMuted, fontWeight: '600' },
});
