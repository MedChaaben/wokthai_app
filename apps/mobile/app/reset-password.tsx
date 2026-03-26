import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSupabase } from '@wokthai/shared';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { wt } from '../lib/theme';

export default function ResetPasswordScreen() {
  const supabase = useSupabase();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setCanReset(Boolean(session));
      setChecking(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setCanReset(true);
        setChecking(false);
      }
    });

    void checkSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function onSubmit() {
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Confirmation', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      Alert.alert('Mot de passe mis à jour', 'Vous pouvez vous connecter avec le nouveau mot de passe.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Réessayez plus tard.';
      Alert.alert('Échec', msg);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  if (!canReset) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Lien invalide ou expiré</Text>
        <Text style={styles.sub}>
          Ouvrez le lien reçu par email sur cet appareil, ou demandez un nouveau lien depuis la connexion → Mot de
          passe oublié.
        </Text>
        <WtButton title="Retour à la connexion" variant="ghost" onPress={() => router.replace('/login')} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Nouveau mot de passe</Text>
      <Text style={styles.sub}>Choisissez un mot de passe sécurisé pour votre compte.</Text>
      <WtCard style={styles.card}>
        <Text style={styles.label}>Nouveau mot de passe</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={wt.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          style={styles.input}
        />
        <Text style={styles.label}>Confirmer</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={wt.placeholder}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          style={styles.input}
        />
        <WtButton title="Enregistrer" loading={loading} onPress={() => void onSubmit()} />
      </WtCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, paddingTop: 24, backgroundColor: wt.bg },
  title: { fontSize: 24, fontWeight: '800', color: wt.text },
  sub: { marginTop: 8, marginBottom: 20, color: wt.textMuted, fontSize: 15, lineHeight: 22 },
  card: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: wt.text },
  input: {
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: wt.surface,
    color: wt.text,
  },
  muted: { fontSize: 15, color: wt.textMuted },
});
