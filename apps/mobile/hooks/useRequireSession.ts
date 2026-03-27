import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSupabase } from '@wokthai/shared';

/**
 * Redirige vers `/login?redirect=…` si pas de session. Retourne `true` quand la session est OK.
 */
export function useRequireSession(redirectPath: string): boolean {
  const supabase = useSupabase();
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function goLogin() {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}` as never);
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        goLogin();
        return;
      }
      setOk(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setOk(false);
        goLogin();
      } else {
        setOk(true);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, router, redirectPath]);

  return ok;
}
