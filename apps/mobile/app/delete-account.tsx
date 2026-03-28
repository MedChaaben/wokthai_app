import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { deleteAccountErrorMessage, deleteMyAccount, useSupabase } from '@wokthai/shared';
import { wt } from '../lib/theme';

const REDIRECT_LOGIN = `/login?redirect=${encodeURIComponent('/delete-account')}` as const;

export default function DeleteAccountScreen() {
  const supabase = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  /** null = chargement ; false = redirection login ; true = session OK (sans écoute signOut → évite conflit après suppression). */
  const [gate, setGate] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace(REDIRECT_LOGIN as never);
        setGate(false);
        return;
      }
      setGate(true);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  async function performDelete() {
    setLoading(true);
    try {
      await deleteMyAccount(supabase);
      await supabase.auth.signOut();
      Alert.alert('Compte supprimé', 'Votre compte et vos données personnelles ont été supprimés.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/account' as never) },
      ]);
    } catch (e: unknown) {
      Alert.alert('Suppression impossible', deleteAccountErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Supprimer définitivement votre compte ?',
      'Vous perdrez l’accès à l’application avec cet email. Vos commandes passées restent dans le système du restaurant à des fins comptables, sans lien avec votre identité. Cette action ne peut pas être annulée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer mon compte',
          style: 'destructive',
          onPress: () => void performDelete(),
        },
      ],
    );
  }

  if (gate !== true) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Supprimer mon compte</Text>
      <Text style={styles.body}>
        Vous pouvez demander la suppression de votre compte et des données associées (profil, adresses enregistrées,
        identifiants de connexion).
      </Text>
      <Text style={styles.body}>
        L’historique de vos commandes peut être conservé côté restaurant sans données personnelles identifiables
        (obligation comptable ou suivi interne).
      </Text>
      <Text style={styles.warning}>
        Cette action est irréversible. Vous devrez créer un nouveau compte si vous souhaitez utiliser à nouveau
        l’application avec le même email.
      </Text>

      <Pressable
        onPress={() => (loading ? undefined : confirmDelete())}
        style={({ pressed }) => [styles.dangerBtn, pressed && !loading && styles.dangerBtnPressed]}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Supprimer définitivement mon compte"
      >
        {loading ? (
          <ActivityIndicator color={wt.white} />
        ) : (
          <Text style={styles.dangerBtnText}>Supprimer mon compte</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: wt.bg },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  title: { fontSize: 20, fontWeight: '800', color: wt.text, marginBottom: 4 },
  body: { fontSize: 15, color: wt.textMuted, lineHeight: 22 },
  warning: {
    fontSize: 14,
    fontWeight: '600',
    color: wt.error,
    lineHeight: 20,
    marginTop: 4,
  },
  dangerBtn: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: wt.errorStrong,
  },
  dangerBtnPressed: { opacity: 0.9 },
  dangerBtnText: { fontSize: 16, fontWeight: '700', color: wt.white },
});
