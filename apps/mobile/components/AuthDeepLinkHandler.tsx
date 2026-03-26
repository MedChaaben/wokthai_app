import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useSupabase } from '@wokthai/shared';
import { parseSupabaseAuthCallback, routeAfterAuthCallback } from '../lib/parseAuthCallbackUrl';

/**
 * Liens email Supabase (confirmation de compte, réinit. mot de passe) : session + bon écran.
 */
export function AuthDeepLinkHandler() {
  const supabase = useSupabase();
  const router = useRouter();

  useEffect(() => {
    /** Ouverture à chaud : l’URL initiale au cold start est gérée dans `app/index.tsx`. */
    async function handle(url: string) {
      const tokens = parseSupabaseAuthCallback(url);
      if (!tokens) return;
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) return;
      router.replace(routeAfterAuthCallback(tokens.type));
    }

    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => sub.remove();
  }, [supabase, router]);

  return null;
}
