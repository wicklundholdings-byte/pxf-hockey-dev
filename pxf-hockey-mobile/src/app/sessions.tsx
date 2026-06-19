import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

const BG = '#0D1117';
const GREEN = '#3DFF8F';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';

export default function SessionsScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Sessions</ThemedText>
          <ThemedText style={styles.subtitle}>Your training history</ThemedText>
        </View>
        <View style={styles.empty}>
          <ThemedText style={styles.emptyIcon}>📋</ThemedText>
          <ThemedText style={styles.emptyTitle}>No sessions yet</ThemedText>
          <ThemedText style={styles.emptyText}>Complete your first drill to start tracking progress.</ThemedText>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, lineHeight: 38 },
  subtitle: { fontSize: 14, color: TEXT_MUTED },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyText: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },
});
