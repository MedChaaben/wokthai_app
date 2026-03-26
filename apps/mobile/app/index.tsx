import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useSupabase } from '@wokthai/shared';
import { parseSupabaseAuthCallback, routeAfterAuthCallback } from '../lib/parseAuthCallbackUrl';
import { supabaseReady } from '../lib/supabase';
import { wt } from '../lib/theme';

export default function Index() {
  const supabase = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

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
            setLoading(false);
            return;
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(Boolean(data.session));
      setLoading(false);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (!supabaseReady) return null;
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={wt.accent} />
      </View>
    );
  }
  if (!hasSession) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
});
