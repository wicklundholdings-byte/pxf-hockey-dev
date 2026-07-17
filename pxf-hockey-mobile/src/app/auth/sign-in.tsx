import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const GREEN = '#3DFF8F';
const TEAL = '#00C4B4';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const INPUT_BG = '#161B22';
const BORDER = '#21262D';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('Invalid login') || msg.includes('invalid_grant') || msg.includes('Email not confirmed')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('rate limit') || msg.includes('500') || msg.includes('internal server')) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setError('Sign in failed. Please check your details and try again.');
      }
    }
    // Routing is handled by _layout.tsx after auth state change
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={styles.logoSection}>
              <GradientText style={styles.logoText} colors={[TEAL, GREEN]}>PXF</GradientText>
              <ThemedText style={styles.logoSub}>HOCKEY</ThemedText>
            </View>

            <ThemedText style={styles.title}>Welcome back</ThemedText>
            <ThemedText style={styles.subtitle}>Sign in to continue.</ThemedText>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>EMAIL</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>PASSWORD</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <TouchableOpacity onPress={handleSignIn} disabled={loading} style={styles.btnWrapper}>
                <LinearGradient
                  colors={[TEAL, GREEN]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {loading
                    ? <ActivityIndicator color="#000" />
                    : <ThemedText style={styles.primaryBtnText}>SIGN IN</ThemedText>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/auth/forgot-password' as any)}>
                <ThemedText style={styles.linkText}>
                  Forgot password? <ThemedText style={styles.linkHighlight}>Reset it</ThemedText>
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
                <ThemedText style={styles.linkText}>Don't have an account? <ThemedText style={styles.linkHighlight}>Sign up</ThemedText></ThemedText>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  logoSection: { alignItems: 'center', marginTop: 48, marginBottom: 36 },
  logoText: { fontSize: 40, fontWeight: '800', letterSpacing: 4, lineHeight: 48 },
  logoSub: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 8, marginTop: 2 },

  title: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 6, textAlign: 'center', lineHeight: 32 },
  subtitle: { fontSize: 15, color: TEXT_MUTED, marginBottom: 36, textAlign: 'center' },

  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2 },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: TEXT,
  },

  errorText: { fontSize: 14, color: '#FF4444', textAlign: 'center' },

  btnWrapper: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  primaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 1 },

  linkText: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center' },
  linkHighlight: { color: GREEN, fontWeight: '700' },
});
