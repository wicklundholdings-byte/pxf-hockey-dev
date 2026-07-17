import { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const RED    = '#EF4444';

type SeriesDay = {
  id: string;
  day_number: number;
  session_id: string | null;
  notes: string | null;
  session?: { id: string; title: string; total_duration_minutes: number | null } | null;
};

type Session = { id: string; title: string; total_duration_minutes: number | null; date: string | null };

export default function SeriesBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName]         = useState('');
  const [dayCount, setDayCount] = useState(0);
  const [days, setDays]         = useState<SeriesDay[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]   = useState(true);
  const [pickerDay, setPickerDay] = useState<SeriesDay | null>(null);

  useEffect(() => { if (id) loadAll(); }, [id]);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: seriesData }, { data: daysData }, { data: sessData }] = await Promise.all([
      supabase.from('session_series').select('name, day_count').eq('id', id).maybeSingle(),
      supabase.from('session_series_days')
        .select('id, day_number, session_id, notes, session:sessions(id, title, total_duration_minutes)')
        .eq('series_id', id).order('day_number'),
      supabase.from('sessions')
        .select('id, title, total_duration_minutes, date')
        .eq('coach_id', user.id).order('date', { ascending: false }).limit(50),
    ]);

    if (seriesData) {
      setName(seriesData.name);
      setDayCount(seriesData.day_count);
      // Ensure we have a row for every day
      const existing = new Map((daysData ?? []).map((d: any) => [d.day_number, d]));
      const fullDays: SeriesDay[] = Array.from({ length: seriesData.day_count }, (_, i) => {
        const n = i + 1;
        return existing.get(n) ?? { id: '', day_number: n, session_id: null, notes: null, session: null };
      });
      setDays(fullDays);
    }
    setSessions(sessData ?? []);
    setLoading(false);
  }

  async function assignSession(day: SeriesDay, session: Session | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!day.id) {
      // Row doesn't exist yet — insert it
      const { data, error } = await supabase.from('session_series_days')
        .insert({ series_id: id, day_number: day.day_number, session_id: session?.id ?? null })
        .select('id, day_number, session_id, notes').single();
      if (error) { Alert.alert('Error', error.message); return; }
      setDays(prev => prev.map(d =>
        d.day_number === day.day_number
          ? { ...data, session: session ? { id: session.id, title: session.title, total_duration_minutes: session.total_duration_minutes } : null }
          : d
      ));
    } else {
      const { error } = await supabase.from('session_series_days')
        .update({ session_id: session?.id ?? null }).eq('id', day.id);
      if (error) { Alert.alert('Error', error.message); return; }
      setDays(prev => prev.map(d =>
        d.day_number === day.day_number
          ? { ...d, session_id: session?.id ?? null, session: session ? { id: session.id, title: session.title, total_duration_minutes: session.total_duration_minutes } : null }
          : d
      ));
    }
    setPickerDay(null);
  }

  async function deleteSeries() {
    Alert.alert('Delete Series', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('session_series').delete().eq('id', id);
        router.back();
      }},
    ]);
  }

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={TEAL} /></View>;
  }

  const assignedCount = days.filter(d => d.session_id).length;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={TEXT} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.title}>{name}</ThemedText>
              <ThemedText style={s.subtitle}>{dayCount}-day series · {assignedCount}/{dayCount} sessions assigned</ThemedText>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressSection}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(assignedCount / dayCount) * 100}%` as any }]} />
            </View>
          </View>

          {/* Day cards */}
          <ThemedText style={s.sectionLabel}>SESSION PLAN</ThemedText>
          {days.map(day => {
            const sess = day.session as any;
            return (
              <View key={day.day_number} style={s.dayCard}>
                <View style={s.dayHeader}>
                  <View style={s.dayBadge}>
                    <ThemedText style={s.dayBadgeNum}>{day.day_number}</ThemedText>
                    <ThemedText style={s.dayBadgeLabel}>DAY</ThemedText>
                  </View>
                  <ThemedText style={s.dayTitle}>Day {day.day_number}</ThemedText>
                  {sess && (
                    <TouchableOpacity onPress={() => assignSession(day, null)} style={s.removeBtn}>
                      <Ionicons name="close" size={14} color={MUTED} />
                    </TouchableOpacity>
                  )}
                </View>

                {sess ? (
                  <TouchableOpacity style={s.sessionCard}
                    onPress={() => router.push(`/session/${sess.id}` as any)} activeOpacity={0.8}>
                    <View style={s.sessionBar} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.sessionTitle}>{sess.title}</ThemedText>
                      {sess.total_duration_minutes && (
                        <ThemedText style={s.sessionMeta}>{sess.total_duration_minutes} min</ThemedText>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setPickerDay(day)} style={{ padding: 4 }}>
                      <Ionicons name="swap-horizontal-outline" size={16} color={MUTED} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.addBtn} onPress={() => setPickerDay(day)} activeOpacity={0.7}>
                    <Ionicons name="add" size={16} color={TEAL} />
                    <ThemedText style={s.addText}>Assign Session</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Delete */}
          <TouchableOpacity style={s.deleteBtn} onPress={deleteSeries}>
            <Ionicons name="trash-outline" size={16} color={RED} />
            <ThemedText style={s.deleteText}>Delete Series</ThemedText>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>

      {/* Session Picker Modal */}
      <Modal visible={!!pickerDay} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>Day {pickerDay?.day_number} — Pick Session</ThemedText>
              <TouchableOpacity onPress={() => setPickerDay(null)}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            {sessions.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
                <Ionicons name="document-outline" size={32} color={MUTED} />
                <ThemedText style={{ color: MUTED, textAlign: 'center' }}>
                  No sessions yet. Create sessions in the Playbook first.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={sessions}
                keyExtractor={item => item.id}
                style={{ maxHeight: 420 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: BORDER }} />}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.pickerRow}
                    onPress={() => pickerDay && assignSession(pickerDay, item)} activeOpacity={0.8}>
                    <View style={s.pickerIcon}>
                      <Ionicons name="document-text-outline" size={18} color={TEAL} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.pickerTitle}>{item.title}</ThemedText>
                      <ThemedText style={s.pickerMeta}>
                        {[item.date, item.total_duration_minutes ? `${item.total_duration_minutes} min` : null].filter(Boolean).join(' · ')}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity style={s.newSessionBtn}
              onPress={() => { setPickerDay(null); router.push('/sessions' as any); }}>
              <Ionicons name="add" size={16} color={TEAL} />
              <ThemedText style={{ fontSize: 14, fontWeight: '700', color: TEAL }}>Create New Session</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 40, paddingHorizontal: 16, paddingTop: 0 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  title: { fontSize: 20, fontWeight: '800', color: TEXT, lineHeight: 26 },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2 },

  progressSection: { marginBottom: 20 },
  progressTrack: { height: 4, backgroundColor: BORDER, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: TEAL, borderRadius: 2 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 12 },

  dayCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 10, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dayBadge: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeNum: { fontSize: 15, fontWeight: '800', color: TEAL },
  dayBadgeLabel: { fontSize: 7, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  dayTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT },
  removeBtn: { padding: 8 },

  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: BORDER, padding: 14 },
  sessionBar: { width: 3, height: 34, borderRadius: 2, backgroundColor: TEAL },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  sessionMeta: { fontSize: 12, color: MUTED, marginTop: 2 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: BORDER, padding: 14 },
  addText: { fontSize: 14, fontWeight: '600', color: TEAL },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingVertical: 14, marginTop: 16 },
  deleteText: { fontSize: 14, fontWeight: '700', color: RED },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  pickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontSize: 15, fontWeight: '600', color: TEXT },
  pickerMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  newSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, borderRadius: 14, borderWidth: 1, borderColor: TEAL, paddingVertical: 14 },
});
