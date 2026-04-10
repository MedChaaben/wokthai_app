/** Liste figée des événements analytics (éviter l’explosion de noms). */
export const ANALYTICS_EVENT_NAMES = [
  'app_open',
  'view_product',
  'add_to_cart',
  'checkout_start',
  'order_completed',
  'upsell_view',
  'upsell_add',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export function isAnalyticsEventName(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(name);
}
