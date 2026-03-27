import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSupabase } from '@wokthai/shared';
import { safeAuthRedirectPath } from '../lib/authRedirect';
import { BrandLogo } from '../components/BrandLogo';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { wt } from '../lib/theme';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const supabase = useSupabase();
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string | string[]; mode?: string | string[] }>();
  const redirectRaw = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  const afterAuthPath = useMemo(() => safeAuthRedirectPath(redirectRaw), [redirectRaw]);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  /** Inscription avec « confirmation email » activée côté Supabase : pas de session tant que le mail n’est pas validé. */
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const emailRedirectTo = Linking.createURL('login');

  useEffect(() => {
    const m = Array.isArray(params.mode) ? params.mode[0] : params.mode;
    if (m === 'signup') setMode('signup');
  }, [params.mode]);

  async function syncUserRow(userId: string, userEmail: string | undefined) {
    await supabase.from('users').upsert({
      id: userId,
      email: userEmail ? userEmail.trim().toLowerCase() : null,
    });
  }

  async function onSignIn() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email requis', 'Indiquez votre adresse email.');
      return;
    }
    if (!password) {
      Alert.alert('Mot de passe requis', 'Saisissez votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) throw error;
      const user = data.user;
      if (user) await syncUserRow(user.id, user.email ?? trimmed);
      setPendingVerificationEmail(null);
      router.replace(afterAuthPath as never);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Réessayez plus tard.';
      Alert.alert('Connexion impossible', msg);
    } finally {
      setLoading(false);
    }
  }

  async function onSignUp() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email requis', 'Indiquez votre adresse email.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Au moins 6 caractères (règle Supabase par défaut).');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      const user = data.user;
      if (user) await syncUserRow(user.id, user.email ?? trimmed);
      if (data.session) {
        setPendingVerificationEmail(null);
        router.replace(afterAuthPath as never);
      } else {
        setPendingVerificationEmail(trimmed);
        Alert.alert(
          'Confirmez votre email',
          `Un message devrait arriver sur ${trimmed}. Vérifiez les spams, puis utilisez « Renvoyer l’email » si besoin.`,
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Réessayez plus tard.';
      Alert.alert('Inscription impossible', msg);
    } finally {
      setLoading(false);
    }
  }

  async function onResendConfirmation() {
    const target = pendingVerificationEmail ?? email.trim();
    if (!target) {
      Alert.alert('Email', 'Indiquez l’adresse utilisée à l’inscription.');
      return;
    }
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: target,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      Alert.alert('Email renvoyé', `Vérifiez la boîte ${target} et les spams.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Réessayez plus tard.';
      Alert.alert('Envoi impossible', msg);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandLogo variant="hero" style={styles.logoWrap} />
      <Text style={styles.sub}>Restaurant asiatique - Marsa & Ennasr</Text>
      <WtCard style={styles.card}>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode('signin')} style={[styles.modeBtn, mode === 'signin' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>Connexion</Text>
          </Pressable>
          <Pressable onPress={() => setMode('signup')} style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>Créer un compte</Text>
          </Pressable>
        </View>
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
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={wt.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signin' ? 'password' : 'new-password'}
          style={styles.input}
        />
        <WtButton
          title={mode === 'signin' ? 'Se connecter' : "S'inscrire"}
          loading={loading}
          onPress={mode === 'signin' ? onSignIn : onSignUp}
        />
        {mode === 'signin' ? (
          <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgot}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </Pressable>
        ) : null}
      </WtCard>
      {pendingVerificationEmail ? (
        <View style={styles.verifyBox}>
          <Text style={styles.verifyTitle}>Email de confirmation</Text>
          <Text style={styles.verifyText}>
            Vérifiez aussi les courriers indésirables. Vous pouvez renvoyer le lien ci‑dessous.
          </Text>
          <WtButton
            title="Renvoyer l’email de confirmation"
            loading={resendLoading}
            variant="ghost"
            onPress={() => void onResendConfirmation()}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: wt.bg },
  logoWrap: { marginBottom: 8, alignSelf: 'center' },
  sub: { marginBottom: 24, color: wt.textMuted, fontSize: 15, textAlign: 'center' },
  card: { gap: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: wt.surfaceMuted,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: wt.accentMuted },
  modeText: { fontSize: 14, fontWeight: '600', color: wt.textMuted },
  modeTextActive: { color: wt.accentLight },
  forgot: { marginTop: 4, alignItems: 'center', paddingVertical: 8 },
  forgotText: { fontSize: 15, fontWeight: '600', color: wt.accentLight },
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
  verifyBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.border,
    gap: 10,
  },
  verifyTitle: { fontSize: 15, fontWeight: '700', color: wt.text },
  verifyText: { fontSize: 13, color: wt.textMuted, lineHeight: 20 },
});
