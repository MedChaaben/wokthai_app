import type { OrderDetailRow, OrderStatus, OrderType } from '../types';

/** Durées moyennes par étape (minutes), hors « pending » (file d’attente validation). */
export const ORDER_STAGE_MINUTES: Record<
  'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering',
  number
> = {
  pending: 5,
  confirmed: 2,
  preparing: 10,
  ready: 5,
  /** Livraison : plus long ; retrait : courte phase finale. */
  delivering: 15,
};

const DELIVERING_MINUTES_PICKUP = 5;

const FLOW: Array<'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering'> = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivering',
];

/** Progression au début de chaque segment (alignée sur la spec produit). */
const SEGMENT_START_PCT: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 10,
  preparing: 40,
  ready: 70,
  delivering: 90,
  delivered: 100,
  cancelled: 0,
};

function stageMinutes(status: OrderStatus, orderType: OrderType): number {
  if (status === 'delivering' && orderType === 'pickup') return DELIVERING_MINUTES_PICKUP;
  if (status === 'delivered' || status === 'cancelled') return 0;
  return ORDER_STAGE_MINUTES[status];
}

function nextSegmentEndPct(status: OrderStatus): number {
  const i = FLOW.indexOf(status as (typeof FLOW)[number]);
  if (i < 0) return 100;
  if (i >= FLOW.length - 1) return 100;
  const next = FLOW[i + 1];
  return SEGMENT_START_PCT[next];
}

export type OrderTrackingEstimateInput = Pick<
  OrderDetailRow,
  'status' | 'created_at' | 'order_status_events' | 'type'
>;

function parseTime(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/**
 * Heure d’entrée dans le statut actuel (dernier événement de timeline correspondant, sinon création).
 */
export function getCurrentStatusEnteredAt(order: OrderTrackingEstimateInput): number {
  const events = order.order_status_events ?? [];
  const matches = events.filter((e) => e.status === order.status);
  let best = -Infinity;
  for (const e of matches) {
    const t = parseTime(e.created_at);
    if (!Number.isNaN(t) && t > best) best = t;
  }
  if (best > 0) return best;
  const created = parseTime(order.created_at);
  return Number.isNaN(created) ? Date.now() : created;
}

export type EstimatedRemainingTimeResult = {
  /** Minutes restantes (arrondi supérieur, min 0). */
  remainingMinutes: number;
  /** Date / heure d’arrivée ou de fin estimée. */
  estimatedArrival: Date;
};

/**
 * Temps restant total et ETA, à partir du statut courant et du temps écoulé dans cette étape.
 * Ne utilise pas le GPS ; les durées sont des moyennes « fake live ».
 */
export function getEstimatedRemainingTime(
  order: OrderTrackingEstimateInput,
  nowMs: number = Date.now()
): EstimatedRemainingTimeResult {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return { remainingMinutes: 0, estimatedArrival: new Date(nowMs) };
  }

  const idx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  if (idx < 0) {
    return { remainingMinutes: 0, estimatedArrival: new Date(nowMs) };
  }

  const entered = getCurrentStatusEnteredAt(order);
  const elapsedMin = Math.max(0, (nowMs - entered) / 60_000);

  let remaining = 0;
  const currentDur = stageMinutes(order.status, order.type);
  remaining += Math.max(0, currentDur - elapsedMin);

  for (let j = idx + 1; j < FLOW.length; j++) {
    remaining += stageMinutes(FLOW[j], order.type);
  }

  const remainingMinutes = Math.max(0, Math.ceil(remaining));
  return {
    remainingMinutes,
    estimatedArrival: new Date(nowMs + remainingMinutes * 60_000),
  };
}

/**
 * Progression 0–100 % pour la barre (segment courant interpolé selon le temps écoulé).
 */
export function getOrderTrackingProgress(
  order: OrderTrackingEstimateInput,
  nowMs: number = Date.now()
): number {
  if (order.status === 'delivered') return 100;
  if (order.status === 'cancelled') return 0;

  const idx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  if (idx < 0) return 0;

  const startPct = SEGMENT_START_PCT[order.status];
  const endPct = nextSegmentEndPct(order.status);
  const dur = stageMinutes(order.status, order.type);
  const entered = getCurrentStatusEnteredAt(order);
  const elapsedMin = Math.max(0, (nowMs - entered) / 60_000);
  const frac = dur <= 0 ? 1 : Math.min(1, elapsedMin / dur);
  const p = startPct + (endPct - startPct) * frac;
  return Math.min(100, Math.max(0, p));
}
