import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG       = '#0D1117';
const TEAL     = '#00C4B4';
const GREEN    = '#3DFF8F';
const TEXT     = '#FFFFFF';
const MUTED    = '#8B949E';
const INPUT_BG = '#161B22';
const BORDER   = '#21262D';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'pxfhockeymobile://auth/reset-password',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <ThemedText style={{ fontSize: 48, lineHeight: 58, marginBottom: 24 }}>📬</ThemedText>
        <ThemedText style={{ fontSize: 24, fontWeight: '800', color: TEXT, marginBottom: 12, textAlign: 'center', lineHeight: 30 }}>
          Check your email
        </ThemedText>
        <ThemedText style={{ fontSize: 15, color: MUTED, textAlign: 'center', marginBottom: 40, lineHeight: 22 }}>
          We sent a password reset link to{'\n'}
          <ThemedText style={{ color: TEXT, fontWeight: '600' }}>{email}</ThemedText>
        </ThemedText>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth/sign-in')}>
          <ThemedText style={styles.primaryBtnText}>BACK TO SIGN IN</ThemedText>
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

            <ThemedText style={styles.title}>Reset password</ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your email and we'll send you a reset link.
            </ThemedText>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>EMAIL</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={MUTED}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSend} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <ThemedText style={styles.primaryBtnText}>SEND RESET LINK</ThemedText>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/auth/sign-in')}>
                <ThemedText style={styles.linkText}>
                  Remembered it? <ThemedText style={styles.linkHighlight}>Sign in</ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  safe:  { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },

  backBtn:  { paddingTop: 12, paddingBottom: 24 },
  backText: { fontSize: 16, color: TEAL, fontWeight: '600' },

  logoSection: { marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: '800', color: TEAL, letterSpacing: 4, lineHeight: 46 },
  logoSub:  { fontSize: 12, fontWeight: '700', color: GREEN, letterSpacing: 6 },

  title:    { fontSize: 28, fontWeight: '800', color: TEXT, marginBottom: 8, lineHeight: 34 },
  subtitle: { fontSize: 15, color: MUTED, marginBottom: 36 },

  form:       { gap: 20 },
  inputGroup: { gap: 8 },
  label:      { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2 },
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

  linkText:      { fontSize: 14, color: MUTED, textAlign: 'center' },
  linkHighlight: { color: GREEN, fontWeight: '700' },
});
