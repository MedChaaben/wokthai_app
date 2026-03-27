import { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import {
  useSupabase,
  useMyUserProfile,
  phoneStorageToDisplay,
  canonicalizePhoneDisplayInput,
} from '@wokthai/shared';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { useRequireSession } from '../hooks/useRequireSession';
import { wt } from '../lib/theme';

export default function ProfileScreen() {
  const sessionOk = useRequireSession('/profile');
  const supabase = useSupabase();
  const { profile, isLoading, save, isSaving } = useMyUserProfile();
  const [email, setEmail] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);

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
    if (!editing) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setPhone(phoneStorageToDisplay(profile.phone));
    }
  }, [profile, editing]);

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
      setEditing(false);
    } catch (e: unknown) {
      Alert.alert('Erreur', errorMessage(e));
    }
  }

  function cancelEdit() {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setPhone(phoneStorageToDisplay(profile.phone));
    }
    setEditing(false);
  }

  if (!sessionOk || isLoading) {
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
        <Text style={styles.lead}>
          Ces informations servent pour vos commandes et la livraison. Touchez « Modifier » pour les mettre à
          jour.
        </Text>

        <WtCard style={styles.formCard}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Votre prénom"
            placeholderTextColor={wt.placeholder}
            autoCapitalize="words"
            editable={editing}
            style={[styles.input, !editing && styles.inputReadonly]}
          />

          <Text style={styles.label}>Nom</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Votre nom"
            placeholderTextColor={wt.placeholder}
            autoCapitalize="words"
            editable={editing}
            style={[styles.input, !editing && styles.inputReadonly]}
          />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            onBlur={() => {
              if (editing) setPhone((p) => canonicalizePhoneDisplayInput(p));
            }}
            placeholder="12 34 56 78"
            placeholderTextColor={wt.placeholder}
            keyboardType={editing ? 'default' : 'phone-pad'}
            editable={editing}
            style={[styles.input, !editing && styles.inputReadonly]}
          />
          {editing ? (
            <Text style={styles.phoneHint}>Hors Tunisie, commencez par + et l’indicatif du pays.</Text>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <Text style={styles.emailReadonly}>{email ?? '—'}</Text>
          <Text style={styles.emailNote}>Utilisé pour la connexion (non modifiable ici).</Text>
        </WtCard>

        {editing ? (
          <>
            <WtButton title="Enregistrer" loading={isSaving} onPress={() => void onSave()} />
            <WtButton title="Annuler" variant="ghost" disabled={isSaving} onPress={cancelEdit} />
          </>
        ) : (
          <WtButton title="Modifier" onPress={() => setEditing(true)} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: wt.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  screen: { padding: 16, paddingBottom: 40, gap: 12 },
  lead: { fontSize: 14, color: wt.textMuted, lineHeight: 20, marginBottom: 4 },
  formCard: { gap: 10 },
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
  inputReadonly: {
    backgroundColor: wt.surfaceMuted,
    color: wt.textMuted,
    borderColor: wt.border,
  },
  emailReadonly: {
    fontSize: 16,
    color: wt.textMuted,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  emailNote: { fontSize: 12, color: wt.textSecondary, marginTop: -4, marginBottom: 4 },
  phoneHint: {
    fontSize: 12,
    color: wt.textMuted,
    lineHeight: 17,
    marginTop: 6,
    opacity: 0.85,
  },
});
