import { StyleSheet, Text, View } from 'react-native';
import type { OrderDetailRow } from '@wokthai/shared';
import { formatOrderStatusEventMessage } from '@wokthai/shared';
import { wt } from '../lib/theme';

type Props = {
  order: OrderDetailRow;
};

export function OrderStatusEventFeed({ order }: Props) {
  const events = order.order_status_events ?? [];
  if (events.length === 0) return null;

  const terminal = order.status === 'delivered' || order.status === 'cancelled';

  return (
    <View style={styles.wrap}>
      {events.map((e, index) => {
        const isLast = index === events.length - 1;
        const live = isLast && !terminal;
        return (
          <View
            key={`${e.created_at}-${index}`}
            style={[styles.row, index > 0 && styles.rowSpaced]}
          >
            <View style={[styles.dot, live && styles.dotLive]} />
            <Text style={[styles.line, live && styles.lineLive]}>
              {formatOrderStatusEventMessage(e, {
                index,
                eventsLength: events.length,
                orderStatus: order.status,
                orderType: order.type,
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowSpaced: { marginTop: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: wt.accentMuted,
    borderWidth: 1,
    borderColor: wt.accentBorder,
  },
  dotLive: {
    backgroundColor: wt.accentLight,
    borderColor: wt.accentLight,
  },
  line: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: wt.textSecondary,
    lineHeight: 22,
  },
  lineLive: {
    color: wt.text,
    fontWeight: '700',
  },
});
