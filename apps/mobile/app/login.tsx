import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSupabase } from '@wokthai/shared';
import { safeAuthRedirectPath } from '../lib/authRedirect';
import { BrandLogo } from '../components/BrandLogo';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { wt } from '../lib/theme';

type Mode = 'signin' | 'signup';

/** Supabase peut renvoyer un succès « brouillé » : `identities: []` = email déjà enregistré (email confirmations activées). */
function signupResponseIndicatesExistingEmail(user: { identities?: unknown[] | null } | null): boolean {
  if (!user) return false;
  return user.identities?.length === 0;
}

function authErrorIndicatesExistingEmail(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const code = 'code' in e && typeof (e as { code: unknown }).code === 'string' ? (e as { code: string }).code : '';
  if (code === 'user_already_exists') return true;
  const msg =
    'message' in e && typeof (e as { message: unknown }).message === 'string'
      ? (e as { message: string }).message.toLowerCase()
      : '';
  return (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists') ||
    msg.includes('email address is already registered') ||
    msg.includes('email already registered')
  );
}

export default function LoginScreen() {
  const supabase = useSupabase();
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string | string[]; mode?: string | string[] }>();
  const redirectRaw = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  const afterAuthPath = useMemo(() => safeAuthRedirectPath(redirectRaw), [redirectRaw]);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  /** Inscription avec « confirmation email » activée côté Supabase : pas de session tant que le mail n’est pas validé. */
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const emailRedirectTo = Linking.createURL('login');

  function alertCompteEmailDejaUtilise(trimmedEmail: string) {
    Alert.alert(
      'Compte existant',
      'Un compte existe déjà avec cette adresse email. Connectez-vous avec votre mot de passe, ou réinitialisez-le si besoin.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser le mot de passe',
          onPress: () =>
            router.push({ pathname: '/forgot-password', params: { email: trimmedEmail } } as never),
        },
        { text: 'Se connecter', onPress: () => setMode('signin') },
      ],
    );
  }

  useEffect(() => {
    const m = Array.isArray(params.mode) ? params.mode[0] : params.mode;
    if (m === 'signup') setMode('signup');
  }, [params.mode]);

  useEffect(() => {
    if (mode === 'signin') {
      setPasswordConfirm('');
      setPasswordConfirmVisible(false);
    }
  }, [mode]);

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
    if (password !== passwordConfirm) {
      Alert.alert('Confirmation', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo },
      });
      if (error) {
        if (authErrorIndicatesExistingEmail(error)) {
          alertCompteEmailDejaUtilise(trimmed);
          return;
        }
        throw error;
      }
      const user = data.user;
      if (signupResponseIndicatesExistingEmail(user)) {
        alertCompteEmailDejaUtilise(trimmed);
        return;
      }
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
        <View style={styles.passwordRow}>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={wt.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            autoComplete={mode === 'signin' ? 'password' : 'new-password'}
            style={styles.passwordInput}
          />
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <Ionicons
              name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={wt.textMuted}
            />
          </Pressable>
        </View>
        {mode === 'signup' ? (
          <>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.passwordRow}>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={wt.placeholder}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry={!passwordConfirmVisible}
                autoComplete="new-password"
                style={styles.passwordInput}
              />
              <Pressable
                onPress={() => setPasswordConfirmVisible((v) => !v)}
                style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}
                accessibilityRole="button"
                accessibilityLabel={
                  passwordConfirmVisible ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'
                }
              >
                <Ionicons
                  name={passwordConfirmVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color={wt.textMuted}
                />
              </Pressable>
            </View>
          </>
        ) : null}
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 10,
    backgroundColor: wt.surface,
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    fontSize: 16,
    color: wt.text,
  },
  passwordToggle: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordTogglePressed: { opacity: 0.65 },
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
