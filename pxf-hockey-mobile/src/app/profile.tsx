import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

const BG = '#0D1117';
const CARD = '#161B22';
const GREEN = '#3DFF8F';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';

export default function ProfileScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Profile</ThemedText>
        </View>

        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>A</ThemedText>
        </View>
        <ThemedText style={styles.name}>Athlete</ThemedText>
        <ThemedText style={styles.email}>Sign in to access your profile</ThemedText>

        <TouchableOpacity style={styles.signInButton}>
          <ThemedText style={styles.signInText}>Sign In</ThemedText>
        </TouchableOpacity>

        <View style={styles.divider} />

        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuRow}>
            <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </TouchableOpacity>
        ))}
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
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: TEXT },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A3D28',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: GREEN },
  name: { fontSize: 20, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 4 },
  email: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', marginBottom: 24 },

  signInButton: {
    marginHorizontal: 20,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  signInText: { fontSize: 15, fontWeight: '800', color: '#000' },

  divider: { height: 1, backgroundColor: '#161B22', marginBottom: 8 },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#161B22',
  },
  menuLabel: { fontSize: 16, color: TEXT },
  chevron: { fontSize: 20, color: TEXT_MUTED },
});
