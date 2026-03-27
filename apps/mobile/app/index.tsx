import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useSupabase } from '@wokthai/shared';
import { parseSupabaseAuthCallback, routeAfterAuthCallback } from '../lib/parseAuthCallbackUrl';
import { supabaseReady } from '../lib/supabase';
import { wt } from '../lib/theme';

type BootState = 'loading' | 'navigated' | 'redirect_tabs';

export default function Index() {
  const supabase = useSupabase();
  const router = useRouter();
  const [boot, setBoot] = useState<BootState>('loading');

  useEffect(() => {
    if (!supabaseReady) return;
    let mounted = true;

    async function init() {
      const url = await Linking.getInitialURL();
      if (url) {
        const tokens = parseSupabaseAuthCallback(url);
        if (tokens) {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
          if (!mounted) return;
          if (!error) {
            router.replace(routeAfterAuthCallback(tokens.type));
            setBoot('navigated');
            return;
          }
        }
      }
      if (!mounted) return;
      setBoot('redirect_tabs');
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  if (!supabaseReady) return null;
  if (boot === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={wt.accent} />
      </View>
    );
  }
  if (boot === 'navigated') return null;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
});
