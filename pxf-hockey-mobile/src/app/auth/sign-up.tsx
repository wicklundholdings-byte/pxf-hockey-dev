import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const GREEN = '#3DFF8F';
const TEAL = '#00C4B4';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const INPUT_BG = '#161B22';
const BORDER = '#21262D';

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignUp() {
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <ThemedText style={{ fontSize: 48, marginBottom: 24 }}>🏒</ThemedText>
        <ThemedText style={{ fontSize: 24, fontWeight: '800', color: TEXT, marginBottom: 12, textAlign: 'center' }}>You're in!</ThemedText>
        <ThemedText style={{ fontSize: 15, color: TEXT_MUTED, textAlign: 'center', marginBottom: 40, lineHeight: 22 }}>
          Check your email to confirm your account, then sign in.
        </ThemedText>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth/sign-in')}>
          <ThemedText style={styles.primaryBtnText}>GO TO SIGN IN</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ThemedText style={styles.backText}>← Back</ThemedText>
            </TouchableOpacity>

            <View style={styles.logoSection}>
              <ThemedText style={styles.logoText}>PXF</ThemedText>
              <ThemedText style={styles.logoSub}>HOCKEY</ThemedText>
            </View>

            <ThemedText style={styles.title}>Create account</ThemedText>
            <ThemedText style={styles.subtitle}>Start your training journey</ThemedText>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>FULL NAME</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={TEXT_MUTED}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCorrect={false}
                />
              </View>

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
                  placeholder="Min. 6 characters"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSignUp} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <ThemedText style={styles.primaryBtnText}>CREATE ACCOUNT</ThemedText>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/auth/sign-in')}>
                <ThemedText style={styles.linkText}>Already have an account? <ThemedText style={styles.linkHighlight}>Sign in</ThemedText></ThemedText>
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
