import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const displayName = user?.user_metadata?.full_name || user?.email || 'Athlete';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          <View style={styles.header}>
            <ThemedText style={styles.title}>Profile</ThemedText>
          </View>

          {user ? (
            <>
              {/* Avatar */}
              <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>{initials}</ThemedText>
                </View>
                <ThemedText style={styles.name}>{displayName}</ThemedText>
                <ThemedText style={styles.email}>{user.email}</ThemedText>
              </View>

              {/* Menu */}
              <View style={styles.divider} />
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity key={item.label} style={styles.menuRow}>
                  <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
                  <ThemedText style={styles.chevron}>›</ThemedText>
                </TouchableOpacity>
              ))}

              <View style={styles.divider} />
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Logged out state */}
              <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>?</ThemedText>
                </View>
                <ThemedText style={styles.name}>Guest</ThemedText>
                <ThemedText style={styles.email}>Sign in to access your profile</ThemedText>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/sign-in')}>
                <ThemedText style={styles.primaryBtnText}>SIGN IN</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth/sign-up')}>
                <ThemedText style={styles.secondaryBtnText}>Create Account</ThemedText>
              </TouchableOpacity>

              <View style={styles.divider} />
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity key={item.label} style={styles.menuRow}>
                  <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
                  <ThemedText style={styles.chevron}>›</ThemedText>
                </TouchableOpacity>
              ))}
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const MENU_ITEMS = [
  { label: 'Membership' },
  { label: 'Favorites' },
  { label: 'Settings' },
  { label: 'About PXF Hockey' },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 100 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: TEXT, lineHeight: 38 },

  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A3D28', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: '800', color: GREEN },
  name: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 4 },
  email: { fontSize: 14, color: TEXT_MUTED },

  primaryBtn: { marginHorizontal: 20, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 1 },

  secondaryBtn: { marginHorizontal: 20, backgroundColor: '#161B22', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#21262D' },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: TEXT },

  divider: { height: 1, backgroundColor: '#161B22', marginVertical: 8 },

  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#161B22' },
  menuLabel: { fontSize: 16, color: TEXT },
  chevron: { fontSize: 20, color: TEXT_MUTED },

  signOutBtn: { marginHorizontal: 20, marginTop: 16, paddingVertical: 16, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#FF4444' },
});
