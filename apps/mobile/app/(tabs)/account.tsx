import { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSupabase } from '@wokthai/shared';
import { WtCard } from '../../components/WtCard';
import { wt } from '../../lib/theme';

export default function AccountScreen() {
  const router = useRouter();
  const supabase = useSupabase();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <WtCard style={styles.profileCard}>
        <Text style={styles.sectionLabel}>Email</Text>
        <Text style={styles.email}>{email ?? '—'}</Text>
      </WtCard>

      <Pressable onPress={() => router.push('/orders')} style={styles.press}>
        <WtCard style={styles.linkRow}>
          <Text style={styles.linkText}>Mes commandes</Text>
          <Text style={styles.chevron}>›</Text>
        </WtCard>
      </Pressable>

      <Pressable onPress={() => router.push('/addresses')} style={styles.press}>
        <WtCard style={styles.linkRow}>
          <Text style={styles.linkText}>Mes adresses</Text>
          <Text style={styles.chevron}>›</Text>
        </WtCard>
      </Pressable>

      <Pressable onPress={() => void signOut()} style={styles.signOutWrap} accessibilityRole="button">
        <Text style={styles.signOutText}>Déconnexion</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 12, backgroundColor: wt.bg },
  profileCard: { gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: wt.textMuted, textTransform: 'uppercase' },
  email: { fontSize: 17, fontWeight: '700', color: wt.text },
  press: { marginBottom: 0 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: { fontSize: 16, fontWeight: '600', color: wt.text },
  chevron: { fontSize: 22, color: wt.accentLight, fontWeight: '300' },
  signOutWrap: { marginTop: 16, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontSize: 16, fontWeight: '600', color: wt.accentLight },
});
