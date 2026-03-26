import { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSupabase, useMyUserProfile } from '@wokthai/shared';
import { WtButton } from '../../components/WtButton';
import { WtCard } from '../../components/WtCard';
import { wt } from '../../lib/theme';

export default function AccountScreen() {
  const router = useRouter();
  const supabase = useSupabase();
  const { profile, isLoading, save, isSaving } = useMyUserProfile();
  const [email, setEmail] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

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

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  function errorMessage(e: unknown): string {
    if (e && typeof e === 'object') {
      const o = e as { message?: string; details?: string; hint?: string };
      const parts = [o.message, o.details, o.hint].filter(Boolean);
      if (parts.length) return parts.join('\n');
    }
    if (e instanceof Error) return e.message;
    return 'Impossible d’enregistrer le profil.';
  }

  async function onSave() {
    try {
      await save({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        email: email?.trim().toLowerCase() ?? null,
      });
      Alert.alert('Profil enregistré', 'Vos informations ont été mises à jour.');
    } catch (e: unknown) {
      Alert.alert('Erreur', errorMessage(e));
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <WtCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Mes informations</Text>
          <Text style={styles.sectionHint}>
            Utilisées pour vos commandes et la livraison. Vous pouvez les modifier à tout moment.
          </Text>

          <Text style={styles.label}>Prénom</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Votre prénom"
            placeholderTextColor={wt.placeholder}
            autoCapitalize="words"
            style={styles.input}
          />

          <Text style={styles.label}>Nom</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Votre nom"
            placeholderTextColor={wt.placeholder}
            autoCapitalize="words"
            style={styles.input}
          />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+216 … ou 00…"
            placeholderTextColor={wt.placeholder}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Email</Text>
          <Text style={styles.emailReadonly}>{email ?? '—'}</Text>
          <Text style={styles.emailNote}>Adresse utilisée pour la connexion.</Text>
        </WtCard>

        <WtButton title="Enregistrer le profil" loading={isSaving} onPress={() => void onSave()} />

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: wt.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  screen: { padding: 16, paddingBottom: 40, gap: 12 },
  formCard: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: wt.text },
  sectionHint: { fontSize: 13, color: wt.textMuted, lineHeight: 18, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: wt.text, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: wt.surface,
    color: wt.text,
  },
  emailReadonly: {
    fontSize: 16,
    color: wt.textMuted,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  emailNote: { fontSize: 12, color: wt.textSecondary, marginTop: -4, marginBottom: 4 },
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
