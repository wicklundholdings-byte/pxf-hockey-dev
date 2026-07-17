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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  async function handleReset() {
    if (!password || !confirm) {
      setError('Please fill in both fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
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
        <ThemedText style={{ fontSize: 48, lineHeight: 58, marginBottom: 24 }}>🔐</ThemedText>
        <ThemedText style={{ fontSize: 24, fontWeight: '800', color: TEXT, marginBottom: 12, textAlign: 'center', lineHeight: 30 }}>
          Password updated!
        </ThemedText>
        <ThemedText style={{ fontSize: 15, color: MUTED, textAlign: 'center', marginBottom: 40, lineHeight: 22 }}>
          Your password has been changed. Sign in with your new password.
        </ThemedText>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth/sign-in')}>
          <ThemedText style={styles.primaryBtnText}>SIGN IN</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            <View style={styles.logoSection}>
              <ThemedText style={styles.logoText}>PXF</ThemedText>
              <ThemedText style={styles.logoSub}>HOCKEY</ThemedText>
            </View>

            <ThemedText style={styles.title}>New password</ThemedText>
            <ThemedText style={styles.subtitle}>Choose a strong password for your account.</ThemedText>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>NEW PASSWORD</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>CONFIRM PASSWORD</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor={MUTED}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                />
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleReset} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <ThemedText style={styles.primaryBtnText}>UPDATE PASSWORD</ThemedText>
                }
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

  logoSection: { marginTop: 60, marginBottom: 48 },
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
});
