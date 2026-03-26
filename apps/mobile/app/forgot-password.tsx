import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useSupabase } from '@wokthai/shared';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { wt } from '../lib/theme';

export default function ForgotPasswordScreen() {
  const supabase = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSend() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email requis', 'Indiquez l’adresse utilisée pour votre compte.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
      Alert.alert(
        'Email envoyé',
        'Si un compte existe pour cette adresse, vous recevrez un lien pour choisir un nouveau mot de passe. Ouvrez-le sur cet appareil pour revenir dans l’app.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Réessayez plus tard.';
      Alert.alert('Envoi impossible', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Mot de passe oublié</Text>
      <Text style={styles.sub}>
        Saisissez votre email : nous vous enverrons un lien pour définir un nouveau mot de passe.
      </Text>
      <WtCard style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="vous@exemple.com"
          placeholderTextColor={wt.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          style={styles.input}
        />
        <WtButton title="Envoyer le lien" loading={loading} onPress={() => void onSend()} />
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Retour à la connexion</Text>
        </Pressable>
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
  back: { paddingVertical: 8, alignItems: 'center' },
  backText: { fontSize: 15, fontWeight: '600', color: wt.accentLight },
});
