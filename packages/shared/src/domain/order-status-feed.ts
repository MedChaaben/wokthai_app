import type { OrderStatus, OrderStatusEventRow, OrderType } from '../types';

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Libellé d’une ligne d’activité (historique statut + heure).
 * Le dernier événement d’une commande encore en cours utilise « depuis » pour les étapes longues.
 */
export function formatOrderStatusEventMessage(
  event: OrderStatusEventRow,
  ctx: {
    index: number;
    eventsLength: number;
    orderStatus: OrderStatus;
    orderType: OrderType;
  }
): string {
  const t = formatClock(event.created_at);
  const isLast = ctx.index === ctx.eventsLength - 1;
  const terminal = ctx.orderStatus === 'delivered' || ctx.orderStatus === 'cancelled';
  const ongoing = isLast && !terminal;

  switch (event.status) {
    case 'pending':
      return `Commande reçue à ${t}`;
    case 'confirmed':
      return `Commande acceptée à ${t}`;
    case 'preparing':
      return ongoing ? `En préparation depuis ${t}` : `En préparation à ${t}`;
    case 'ready':
      return `Prête à ${t}`;
    case 'delivering':
      if (ctx.orderType === 'pickup') {
        return ongoing ? `Retrait en cours depuis ${t}` : `Prête à retirer à ${t}`;
      }
      return ongoing ? `En route depuis ${t}` : `En route à ${t}`;
    case 'delivered':
      return ctx.orderType === 'pickup' ? `Retirée à ${t}` : `Livrée à ${t}`;
    case 'cancelled':
      return `Annulée à ${t}`;
    default:
      return `${String(event.status)} · ${t}`;
  }
}
