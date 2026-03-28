import { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useSupabase, useMyUserProfile } from '@wokthai/shared';
import { WtButton } from '../../components/WtButton';
import { WtCard } from '../../components/WtCard';
import { wt } from '../../lib/theme';

const ACCOUNT_REDIRECT = '/(tabs)/account';

function displayName(first: string | null | undefined, last: string | null | undefined, email: string | null) {
  const n = [first?.trim(), last?.trim()].filter(Boolean).join(' ');
  if (n) return n;
  if (email) return email.split('@')[0] ?? email;
  return 'Mon compte';
}

function initials(first: string | null | undefined, last: string | null | undefined, email: string | null) {
  const f = first?.trim()[0];
  const l = last?.trim()[0];
  if (f && l) return (f + l).toUpperCase();
  if (f) return f.toUpperCase();
  if (email?.trim()[0]) return email.trim()[0].toUpperCase();
  return '?';
}

type MenuItemProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
};

function MenuRow({ icon, title, subtitle, onPress, isLast }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !isLast && styles.menuRowBorder, pressed && styles.menuRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={styles.menuIcon} accessible={false}>
        {icon}
      </Text>
      <View style={styles.menuTextCol}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.menuSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const supabase = useSupabase();
  const { profile, isLoading } = useMyUserProfile();
  const [email, setEmail] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setEmail(data.session?.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setEmail(next?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const name = useMemo(
    () => displayName(profile?.first_name, profile?.last_name, email),
    [profile?.first_name, profile?.last_name, email]
  );
  const avatar = useMemo(
    () => initials(profile?.first_name, profile?.last_name, email),
    [profile?.first_name, profile?.last_name, email]
  );

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/(tabs)');
  }

  if (session === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  if (!session) {
    const q = encodeURIComponent(ACCOUNT_REDIRECT);
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled" bounces>
          <WtCard style={styles.guestCard}>
            <Text style={styles.guestTitle}>Mode invité</Text>
            <Text style={styles.guestBody}>
              Parcourez le menu et remplissez votre panier. Pour commander, connectez-vous ou créez un compte.
            </Text>
            <WtButton
              title="Se connecter"
              onPress={() => router.push(`/login?redirect=${q}` as never)}
            />
            <WtButton
              title="Créer un compte"
              variant="ghost"
              onPress={() => router.push(`/login?mode=signup&redirect=${q}` as never)}
            />
            <Text style={styles.guestLegal}>
              <Text style={styles.guestLegalMuted}>En utilisant l’app, vous acceptez les </Text>
              <Text style={styles.guestLegalLink} onPress={() => router.push('/cgu')}>
                conditions générales d’utilisation
              </Text>
              <Text style={styles.guestLegalMuted}>.</Text>
            </Text>
          </WtCard>
        </ScrollView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        bounces
      >
        <WtCard>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatar}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.identityName} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.identityEmail} numberOfLines={1}>
                {email ?? '—'}
              </Text>
            </View>
          </View>
        </WtCard>

        <Text style={styles.sectionHeading}>Accès rapide</Text>
        <WtCard style={styles.menuCard}>
          <MenuRow
            icon="📋"
            title="Mes commandes"
            subtitle="Historique et suivi"
            onPress={() => router.push('/orders')}
          />
          <MenuRow
            icon="📍"
            title="Mes adresses"
            subtitle="Livraison et points sur la carte"
            onPress={() => router.push('/addresses')}
          />
          <MenuRow
            icon="👤"
            title="Mon profil"
            subtitle="Nom, téléphone, email"
            onPress={() => router.push('/profile')}
          />
          <MenuRow
            icon="📜"
            title="Conditions générales"
            subtitle="Utilisation de l’application"
            onPress={() => router.push('/cgu')}
            isLast
          />
        </WtCard>

        <View style={styles.spacer} />

        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>Déconnexion</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.bg },
  guestCard: { gap: 14, paddingVertical: 8 },
  guestTitle: { fontSize: 20, fontWeight: '800', color: wt.text },
  guestBody: { fontSize: 15, color: wt.textMuted, lineHeight: 22 },
  guestLegal: { fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  guestLegalMuted: { color: wt.textSecondary },
  guestLegalLink: { color: wt.accentLight, fontWeight: '600' },
  scroll: { flex: 1 },
  screen: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
    gap: 8,
    backgroundColor: wt.bg,
  },
  spacer: { flexGrow: 1, minHeight: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: wt.accentMuted,
    borderWidth: 2,
    borderColor: wt.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: wt.accentLight },
  identityText: { flex: 1, minWidth: 0 },
  identityName: { fontSize: 20, fontWeight: '800', color: wt.text, marginBottom: 4 },
  identityEmail: { fontSize: 14, color: wt.textMuted },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: wt.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: wt.border },
  menuRowPressed: { backgroundColor: wt.surfaceMuted },
  menuIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  menuTextCol: { flex: 1, minWidth: 0 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: wt.text },
  menuSubtitle: { fontSize: 13, color: wt.textMuted, marginTop: 2, lineHeight: 18 },
  menuChevron: { fontSize: 22, color: wt.accentLight, fontWeight: '300', marginLeft: 4 },
  signOutBtn: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wt.borderStrong,
    backgroundColor: wt.surface,
  },
  signOutPressed: { opacity: 0.88, backgroundColor: wt.surfaceMuted },
  signOutText: { fontSize: 16, fontWeight: '700', color: wt.accentLight },
});
