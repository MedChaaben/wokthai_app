import type { Json } from '../types/database';
import type { WokthaiSupabaseClient } from '../supabase/client';
import type { AnalyticsEventName } from '../domain/analytics-events';

export type InsertAnalyticsEventInput = {
  event_name: AnalyticsEventName;
  /** Données libres (product_id, price, device_id, etc.). */
  metadata?: Record<string, Json>;
  /** null = invité ; sinon doit correspondre au client connecté (RLS). */
  user_id?: string | null;
};

/**
 * Enregistre un événement analytics. Ne lance pas : les erreurs réseau ne doivent pas bloquer l’UI.
 */
export async function insertAnalyticsEvent(
  client: WokthaiSupabaseClient,
  input: InsertAnalyticsEventInput
): Promise<void> {
  const { data: sess } = await client.auth.getSession();
  const resolvedUserId =
    input.user_id !== undefined ? input.user_id : (sess.session?.user?.id ?? null);
  const metadata = (input.metadata ?? {}) as Json;
  const { error } = await client.from('events').insert({
    event_name: input.event_name,
    metadata,
    user_id: resolvedUserId,
  });
  if (error) {
    console.warn('[analytics]', input.event_name, error.message);
  }
}
