import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { wt } from '../lib/theme';
import { SupabaseProvider } from '@wokthai/shared';
import { AuthDeepLinkHandler } from '../components/AuthDeepLinkHandler';
import { OngoingOrderBanner } from '../components/OngoingOrderBanner';
import { OrderNotificationsHost } from '../components/OrderNotificationsHost';
import { CartProvider } from '../contexts/CartContext';
import { getSupabase, supabaseReady } from '../lib/supabase';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const supabaseClient = useMemo(() => {
    if (!supabaseReady) return null;
    return getSupabase();
  }, []);

  if (!supabaseClient) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.title}>Configuration Supabase</Text>
        <Text style={styles.body}>
          Définissez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env.local à la racine du
          monorepo ou dans apps/mobile/.env — puis redémarrez Expo (clear cache si besoin : npx expo start -c).
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider client={supabaseClient}>
        <SafeAreaProvider>
          <CartProvider>
            <StatusBar style="light" />
            <OrderNotificationsHost />
            <AuthDeepLinkHandler />
            <View style={styles.root}>
              <OngoingOrderBanner />
              <View style={styles.stackWrap}>
                <Stack
                  screenOptions={{
                    headerStyle: { backgroundColor: wt.bgElevated },
                    headerTintColor: wt.accentLight,
                    headerTitleStyle: { fontWeight: '700', color: wt.text },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: wt.bg },
                  }}
                >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Retour' }} />
                  <Stack.Screen name="login" options={{ title: 'Connexion' }} />
                  <Stack.Screen name="forgot-password" options={{ title: 'Mot de passe oublié' }} />
                  <Stack.Screen name="reset-password" options={{ title: 'Nouveau mot de passe' }} />
                  <Stack.Screen name="orders" options={{ title: 'Mes commandes' }} />
                  <Stack.Screen name="addresses" options={{ title: 'Mes adresses' }} />
                  <Stack.Screen name="profile" options={{ title: 'Mon profil' }} />
                  <Stack.Screen name="cgu" options={{ title: 'Conditions générales' }} />
                  <Stack.Screen name="product/[id]" options={{ title: 'Produit' }} />
                  <Stack.Screen name="checkout" options={{ title: 'Commande' }} />
                  <Stack.Screen name="order/[id]" options={{ title: 'Suivi' }} />
                </Stack>
              </View>
            </View>
          </CartProvider>
        </SafeAreaProvider>
      </SupabaseProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: wt.bg },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: wt.text },
  body: { fontSize: 15, color: wt.textMuted, lineHeight: 22 },
  root: { flex: 1, backgroundColor: wt.bg },
  stackWrap: { flex: 1, minHeight: 0 },
});
