import { useEffect, useRef } from 'react';
import { insertAnalyticsEvent, useSupabase } from '@wokthai/shared';
import { getAnalyticsDeviceId } from '../lib/analyticsDeviceId';

/** Un seul `app_open` par lancement de l’app (session JS). */
export function AnalyticsBootstrap() {
  const client = useSupabase();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void (async () => {
      const device_id = await getAnalyticsDeviceId();
      await insertAnalyticsEvent(client, {
        event_name: 'app_open',
        metadata: device_id ? { device_id } : {},
      });
    })();
  }, [client]);

  return null;
}
