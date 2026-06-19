import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const CARD = '#161B22';
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
      setError(error.message);
    } else {
      router.replace('/');
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ThemedText style={styles.backText}>← Back</ThemedText>
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoSection}>
              <ThemedText style={styles.logoText}>PXF</ThemedText>
              <ThemedText style={styles.logoSub}>HOCKEY</ThemedText>
            </View>

            <ThemedText style={styles.title}>Welcome back</ThemedText>
            <ThemedText style={styles.subtitle}>Sign in to your account</ThemedText>

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

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <ThemedText style={styles.primaryBtnText}>SIGN IN</ThemedText>}
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
  content: { paddingHorizontal: 24, paddingBottom: 40 },

  backBtn: { paddingTop: 12, paddingBottom: 24 },
  backText: { fontSize: 16, color: TEAL, fontWeight: '600' },

  logoSection: { marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: '900', color: TEAL, letterSpacing: 4, lineHeight: 46 },
  logoSub: { fontSize: 12, fontWeight: '700', color: GREEN, letterSpacing: 6 },

  title: { fontSize: 28, fontWeight: '800', color: TEXT, marginBottom: 8 },
  subtitle: { fontSize: 15, color: TEXT_MUTED, marginBottom: 36 },

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

  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 1 },

  linkText: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center' },
  linkHighlight: { color: GREEN, fontWeight: '700' },
});
