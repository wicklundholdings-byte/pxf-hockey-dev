import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const RED    = '#EF4444';

type Camp = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  price_cents: number;
  max_spots: number | null;
  location: string | null;
  status: string;
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CampsScreen() {
  const router = useRouter();
  const [camps, setCamps]   = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState<'all' | 'draft' | 'published'>('all');

  async function loadCamps() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('camps')
      .select('id, name, start_date, end_date, price_cents, max_spots, location, status')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setCamps(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadCamps(); }, []);

  async function publish(camp: Camp) {
    Alert.alert('Publish Camp', `Make "${camp.name}" visible to parents?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Publish', onPress: async () => {
        const { error } = await supabase.from('camps').update({ status: 'published' }).eq('id', camp.id);
        if (error) { Alert.alert('Error', error.message); return; }
        setCamps(prev => prev.map(c => c.id === camp.id ? { ...c, status: 'published' } : c));
      }},
    ]);
  }

  async function deleteCamp(camp: Camp) {
    Alert.alert('Delete Camp', `Delete "${camp.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('camps').delete().eq('id', camp.id);
        if (error) { Alert.alert('Error', error.message); return; }
        setCamps(prev => prev.filter(c => c.id !== camp.id));
      }},
    ]);
  }

  const filtered = filter === 'all' ? camps : camps.filter(c => c.status === filter);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <ThemedText style={s.title}>Camps</ThemedText>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.quickSessionBtn}
                onPress={() => router.push({ pathname: '/events', params: { showCreate: '1', type: 'session', templates: '1' } } as any)}>
                <Ionicons name="flash-outline" size={14} color="#000" />
                <ThemedText style={s.quickSessionText}>Quick Session</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={s.addBtn}
                onPress={() => router.push({ pathname: '/events', params: { showCreate: '1' } } as any)}>
                <Ionicons name="add" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.filterRow}>
            {(['all', 'draft', 'published'] as const).map(f => (
              <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
                <ThemedText style={[s.filterText, filter === f && s.filterTextActive]}>
                  {f === 'all' ? 'All' : f === 'draft' ? 'Drafts' : 'Published'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ThemedText style={s.empty}>Loading…</ThemedText>
          ) : filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="megaphone-outline" size={40} color={MUTED} />
              <ThemedText style={s.emptyTitle}>No camps yet</ThemedText>
              <ThemedText style={s.emptySub}>Tap + to create your first camp</ThemedText>
            </View>
          ) : filtered.map(camp => (
            <TouchableOpacity key={camp.id} style={s.card} onPress={() => router.push(`/camp/${camp.id}` as any)} activeOpacity={0.85}>
              <View style={[s.badge, camp.status === 'published' ? s.badgeLive : s.badgeDraft]}>
                <ThemedText style={[s.badgeText, { color: camp.status === 'published' ? GREEN : ORANGE }]}>
                  {camp.status === 'published' ? '● LIVE' : '○ DRAFT'}
                </ThemedText>
              </View>

              <ThemedText style={s.campName}>{camp.name}</ThemedText>

              {(camp.start_date || camp.end_date) && (
                <View style={s.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={MUTED} />
                  <ThemedText style={s.metaText}>
                    {formatDate(camp.start_date) ?? '—'}{camp.end_date ? ` → ${formatDate(camp.end_date)}` : ''}
                  </ThemedText>
                </View>
              )}

              {camp.location ? (
                <View style={s.metaRow}>
                  <Ionicons name="location-outline" size={13} color={MUTED} />
                  <ThemedText style={s.metaText}>{camp.location}</ThemedText>
                </View>
              ) : null}

              <View style={s.metaRow}>
                <Ionicons name="pricetag-outline" size={13} color={MUTED} />
                <ThemedText style={s.metaText}>
                  ${(camp.price_cents / 100).toFixed(0)}{camp.max_spots ? ` · ${camp.max_spots} spots` : ''}
                </ThemedText>
              </View>

              <View style={s.actions}>
                {camp.status === 'draft' && (
                  <TouchableOpacity style={s.publishBtn} onPress={(e) => { e.stopPropagation?.(); publish(camp); }}>
                    <Ionicons name="rocket-outline" size={14} color="#000" />
                    <ThemedText style={s.publishText}>Publish</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.deleteBtn} onPress={(e) => { e.stopPropagation?.(); deleteCamp(camp); }}>
                  <Ionicons name="trash-outline" size={16} color={RED} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 40 },

  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:   { flex: 1, fontSize: 24, fontWeight: '800', color: TEXT, lineHeight: 30 },
  headerRight:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickSessionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ORANGE, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  quickSessionText: { fontSize: 12, fontWeight: '800', color: '#000' },
  addBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  filterRow:      { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, backgroundColor: CARD, borderRadius: 10, padding: 3 },
  filterBtn:      { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  filterBtnActive:{ backgroundColor: TEAL },
  filterText:     { fontSize: 12, fontWeight: '700', color: MUTED },
  filterTextActive:{ color: '#000' },

  empty:      { textAlign: 'center', color: MUTED, marginTop: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub:   { fontSize: 14, color: MUTED },

  card:       { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16 },
  badge:      { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  badgeDraft: { backgroundColor: 'rgba(245,158,11,0.12)' },
  badgeLive:  { backgroundColor: 'rgba(61,255,143,0.10)' },
  badgeText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  campName:   { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 10 },

  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  metaText: { fontSize: 13, color: MUTED },

  actions:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 },
  publishBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flex: 1, justifyContent: 'center' },
  publishText: { fontSize: 13, fontWeight: '700', color: '#000' },
  deleteBtn:   { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },
});
