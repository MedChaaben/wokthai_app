import type { OrderStatus } from '../types';

/** Statuts considérés comme « en cours » côté client. */
export const ONGOING_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
];

export function isOngoingOrderStatus(status: OrderStatus): boolean {
  return ONGOING_ORDER_STATUSES.includes(status);
}
