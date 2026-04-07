import { useSupabase } from '@wokthai/shared';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Enregistre le jeton Expo Push sur `public.users` pour les utilisateurs connectés (notifications globales).
 */
export function ExpoPushTokenRegistrar() {
  const supabase = useSupabase();
  const lastWrittenRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    const syncToken = async (userId: string | null) => {
      if (!userId) {
        lastWrittenRef.current = null;
        return;
      }
      const { status } = await Notifications.getPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      const projectId =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
      if (!projectId) return;

      let token: string;
      try {
        const res = await Notifications.getExpoPushTokenAsync({ projectId });
        token = res.data;
      } catch {
        return;
      }

      if (cancelled || !token) return;
      if (lastWrittenRef.current === token) return;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('users')
        .update({ expo_push_token: token, expo_push_token_updated_at: now })
        .eq('id', userId);

      if (!cancelled && !error) {
        lastWrittenRef.current = token;
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void syncToken(session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncToken(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
}
