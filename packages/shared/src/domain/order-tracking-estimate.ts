import type { OrderDetailRow, OrderStatus, OrderType } from '../types';

/** Durées moyennes par étape (minutes), hors préparation (voir magasin) et hors « pending ». */
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

export type OrderTrackingEstimateInput = Pick<
  OrderDetailRow,
  'status' | 'created_at' | 'order_status_events' | 'type' | 'stores'
>;

function parseTime(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/**
 * Durée « en cuisine » : temps préparation magasin + charge cuisine (minutes supplémentaires).
 */
export function getPreparingDurationMinutes(order: OrderTrackingEstimateInput): number {
  const prep = order.stores?.prep_time_minutes ?? ORDER_STAGE_MINUTES.preparing;
  const extra = order.stores?.kitchen_load_extra_minutes ?? 0;
  const base = Math.max(5, Math.min(120, prep));
  const load = Math.max(0, Math.min(60, extra));
  return base + load;
}

function deliveringMinutes(orderType: OrderType): number {
  return orderType === 'pickup' ? DELIVERING_MINUTES_PICKUP : ORDER_STAGE_MINUTES.delivering;
}

function stageMinutes(status: OrderStatus, order: OrderTrackingEstimateInput): number {
  if (status === 'delivered' || status === 'cancelled') return 0;
  if (status === 'preparing') return getPreparingDurationMinutes(order);
  if (status === 'delivering') return deliveringMinutes(order.type);
  return ORDER_STAGE_MINUTES[status as keyof typeof ORDER_STAGE_MINUTES];
}

function nextSegmentEndPct(status: OrderStatus): number {
  const i = FLOW.indexOf(status as (typeof FLOW)[number]);
  if (i < 0) return 100;
  if (i >= FLOW.length - 1) return 100;
  const next = FLOW[i + 1];
  return SEGMENT_START_PCT[next];
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

/** Instant de première validation par le restaurant (pour référence retard). */
export function getOrderConfirmedAtMs(order: OrderTrackingEstimateInput): number | null {
  const events = order.order_status_events ?? [];
  const confirmed = [...events]
    .filter((e) => e.status === 'confirmed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
  if (!confirmed) return null;
  const t = new Date(confirmed.created_at).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * ETA théorique au moment de la confirmation (référence pour « +5 min de retard »).
 */
export function getReferenceEtaAtConfirmation(
  order: OrderTrackingEstimateInput,
  confirmedAtMs: number
): Date {
  const iso = new Date(confirmedAtMs).toISOString();
  const synthetic: OrderTrackingEstimateInput = {
    ...order,
    status: 'confirmed',
    order_status_events: [{ status: 'confirmed', created_at: iso }],
  };
  const result = getEstimatedRemainingTime(synthetic, confirmedAtMs);
  if (result.mode === 'ongoing') {
    return result.estimatedArrival;
  }
  return new Date(confirmedAtMs);
}

export type EstimatedRemainingTimeResult =
  | { mode: 'pending' }
  | { mode: 'terminal'; remainingMinutes: 0; estimatedArrival: Date }
  | { mode: 'ongoing'; remainingMinutes: number; estimatedArrival: Date };

/**
 * Temps restant total et ETA, à partir du statut courant et du temps écoulé dans cette étape.
 * « pending » : pas de chiffre (afficher un libellé côté UI).
 */
export function getEstimatedRemainingTime(
  order: OrderTrackingEstimateInput,
  nowMs: number = Date.now()
): EstimatedRemainingTimeResult {
  if (order.status === 'pending') {
    return { mode: 'pending' };
  }
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return { mode: 'terminal', remainingMinutes: 0, estimatedArrival: new Date(nowMs) };
  }

  const idx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  if (idx < 0) {
    return { mode: 'terminal', remainingMinutes: 0, estimatedArrival: new Date(nowMs) };
  }

  const entered = getCurrentStatusEnteredAt(order);
  const elapsedMin = Math.max(0, (nowMs - entered) / 60_000);

  let remaining = 0;
  const currentDur = stageMinutes(order.status, order);
  remaining += Math.max(0, currentDur - elapsedMin);

  for (let j = idx + 1; j < FLOW.length; j++) {
    remaining += stageMinutes(FLOW[j], order);
  }

  const remainingMinutes = Math.max(0, Math.ceil(remaining));
  return {
    mode: 'ongoing',
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
  if (order.status === 'pending') return 0;

  const idx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  if (idx < 0) return 0;

  const startPct = SEGMENT_START_PCT[order.status];
  const endPct = nextSegmentEndPct(order.status);
  const dur = stageMinutes(order.status, order);
  const entered = getCurrentStatusEnteredAt(order);
  const elapsedMin = Math.max(0, (nowMs - entered) / 60_000);
  const frac = dur <= 0 ? 1 : Math.min(1, elapsedMin / dur);
  const p = startPct + (endPct - startPct) * frac;
  return Math.min(100, Math.max(0, p));
}
