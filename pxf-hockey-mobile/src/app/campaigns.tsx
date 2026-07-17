import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const PURPLE = '#7C3AED';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type AudienceId = 'everyone' | 'parents' | 'players' | 'leads';

type AudienceOption = {
  id: AudienceId;
  label: string;
  icon: string;
  color: string;
  count: number;
};

type Broadcast = {
  id: string;
  audience: string;
  message: string;
  sentAt: string;
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function audienceColor(audience: string): string {
  if (audience === 'everyone') return TEAL;
  if (audience === 'parents')  return ORANGE;
  if (audience === 'players')  return GREEN;
  if (audience === 'leads')    return PURPLE;
  return TEAL;
}

function audienceLabel(audience: string): string {
  if (audience === 'everyone') return 'Everyone';
  if (audience === 'parents')  return 'All Parents';
  if (audience === 'players')  return 'All Players';
  if (audience === 'leads')    return 'Leads';
  return audience;
}

export default function CampaignsScreen() {
  const router = useRouter();
  const [broadcasts,       setBroadcasts]       = useState<Broadcast[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [userId,           setUserId]           = useState('');
  const [showCompose,      setShowCompose]       = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<AudienceId | null>(null);
  const [message,          setMessage]          = useState('');
  const [sending,          setSending]          = useState(false);
  const [audiences,        setAudiences]        = useState<AudienceOption[]>([
    { id: 'everyone', label: 'Everyone',    icon: 'people-outline',  color: TEAL,   count: 0 },
    { id: 'parents',  label: 'All Parents', icon: 'home-outline',    color: ORANGE, count: 0 },
    { id: 'players',  label: 'All Players', icon: 'person-outline',  color: GREEN,  count: 0 },
    { id: 'leads',    label: 'Leads',       icon: 'star-outline',    color: PURPLE, count: 0 },
  ]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Load sent broadcasts
      const { data: rows } = await supabase
        .from('broadcasts')
        .select('id, audience, message, sent_at')
        .eq('coach_id', user.id)
        .order('sent_at', { ascending: false });
      setBroadcasts((rows ?? []).map((r: any) => ({
        id: r.id, audience: r.audience, message: r.message, sentAt: r.sent_at,
      })));

      // Load audience counts
      const [{ count: playerCount }, { count: contactCount }, { count: leadCount }] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }).eq('coach_id', user.id),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('coach_id', user.id),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('stage', 'lead'),
      ]);

      const pc = playerCount ?? 0;
      const cc = contactCount ?? 0;
      const lc = leadCount ?? 0;

      setAudiences([
        { id: 'everyone', label: 'Everyone',    icon: 'people-outline',  color: TEAL,   count: pc + cc },
        { id: 'parents',  label: 'All Parents', icon: 'home-outline',    color: ORANGE, count: cc },
        { id: 'players',  label: 'All Players', icon: 'person-outline',  color: GREEN,  count: pc },
        { id: 'leads',    label: 'Leads',       icon: 'star-outline',    color: PURPLE, count: lc },
      ]);

      setLoading(false);
    })();
  }, []);

  function closeCompose() {
    setShowCompose(false);
    setSelectedAudience(null);
    setMessage('');
  }

  async function handleSend() {
    if (!selectedAudience || !message.trim() || !userId) return;
    setSending(true);
    const { error } = await supabase.from('broadcasts').insert({
      coach_id: userId,
      audience: selectedAudience,
      message:  message.trim(),
    });
    if (error) {
      Alert.alert('Error', 'Could not send broadcast. Please try again.');
      setSending(false);
      return;
    }
    // Prepend locally for instant feedback
    const newBroadcast: Broadcast = {
      id: Date.now().toString(),
      audience: selectedAudience,
      message: message.trim(),
      sentAt: new Date().toISOString(),
    };
    setBroadcasts(prev => [newBroadcast, ...prev]);
    setSending(false);
    closeCompose();
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <ThemedText style={s.title}>Broadcasts</ThemedText>
            <TouchableOpacity style={s.newBtn} onPress={() => setShowCompose(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#000" />
              <ThemedText style={s.newBtnText}>New</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Explainer */}
          <View style={s.explainer}>
            <Ionicons name="megaphone-outline" size={18} color={TEAL} />
            <ThemedText style={s.explainerText}>
              Send an in-app message to a group — your team, all parents, or contacts at a specific stage.
            </ThemedText>
          </View>

          {/* Sent */}
          <ThemedText style={s.sectionLabel}>SENT</ThemedText>

          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
          ) : broadcasts.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="megaphone-outline" size={32} color={MUTED} />
              <ThemedText style={s.emptyText}>No broadcasts yet</ThemedText>
              <TouchableOpacity style={s.nudgeBtn} onPress={() => setShowCompose(true)} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={16} color={TEAL} />
                <ThemedText style={s.nudgeBtnText}>Send a broadcast</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {broadcasts.map((c) => {
                const color = audienceColor(c.audience);
                return (
                  <View key={c.id} style={s.campaignCard}>
                    <View style={s.campaignTop}>
                      <ThemedText style={s.campaignTitle} numberOfLines={1}>
                        {audienceLabel(c.audience)} broadcast
                      </ThemedText>
                      <View style={[s.audienceBadge, { borderColor: `${color}66`, backgroundColor: `${color}12` }]}>
                        <ThemedText style={[s.audienceBadgeText, { color }]}>
                          {audienceLabel(c.audience).toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={s.campaignPreview} numberOfLines={2}>{c.message}</ThemedText>
                    <View style={s.campaignMeta}>
                      <ThemedText style={s.metaText}>{fmtDate(c.sentAt)}</ThemedText>
                    </View>
                  </View>
                );
              })}
              <View style={s.emptyNudge}>
                <TouchableOpacity style={s.nudgeBtn} onPress={() => setShowCompose(true)} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={16} color={TEAL} />
                  <ThemedText style={s.nudgeBtnText}>Send another broadcast</ThemedText>
                </TouchableOpacity>
              </View>
            </>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Compose Modal */}
      <Modal visible={showCompose} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeCompose}>
        <View style={s.modal}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={closeCompose}>
                <ThemedText style={s.cancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={s.modalTitle}>New Broadcast</ThemedText>
              <TouchableOpacity
                style={[s.sendBtn, { opacity: selectedAudience && message.trim() && !sending ? 1 : 0.4 }]}
                disabled={!selectedAudience || !message.trim() || sending}
                onPress={handleSend}
                activeOpacity={0.8}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#000" />
                  : <ThemedText style={s.sendBtnText}>Send</ThemedText>
                }
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">

              <ThemedText style={s.sectionLabel}>AUDIENCE</ThemedText>
              <View style={s.audienceList}>
                {audiences.map((a) => {
                  const active = selectedAudience === a.id;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[s.audienceRow, active && { borderColor: a.color, backgroundColor: `${a.color}10` }]}
                      onPress={() => setSelectedAudience(a.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.audienceIcon, { backgroundColor: `${a.color}15` }]}>
                        <Ionicons name={a.icon as any} size={16} color={a.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[s.audienceLabel, active && { color: a.color }]}>{a.label}</ThemedText>
                        <ThemedText style={s.audienceCount}>{a.count} {a.count === 1 ? 'person' : 'people'}</ThemedText>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={20} color={a.color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ThemedText style={[s.sectionLabel, { marginTop: 20 }]}>MESSAGE</ThemedText>
              <TextInput
                style={s.messageInput}
                placeholder="Write your message..."
                placeholderTextColor={MUTED}
                multiline
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />
              <ThemedText style={s.hint}>Recipients will see this as a message in their inbox.</ThemedText>

            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 32, fontWeight: '800', lineHeight: 40, color: TEXT },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  newBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },

  explainer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: 'rgba(0,196,180,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', padding: 12,
  },
  explainerText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 18 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },

  campaignCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16 },
  campaignTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
  campaignTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT },
  audienceBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  audienceBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  campaignPreview: { fontSize: 13, color: MUTED, lineHeight: 18, marginBottom: 10 },
  campaignMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: MUTED },

  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText: { fontSize: 15, color: MUTED, fontWeight: '600' },
  emptyNudge: { alignItems: 'center', marginTop: 12 },
  nudgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 20, paddingVertical: 12 },
  nudgeBtnText: { fontSize: 14, fontWeight: '700', color: TEAL },

  modal: { flex: 1, backgroundColor: BG },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  cancelText: { fontSize: 16, color: MUTED },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  sendBtn: { backgroundColor: TEAL, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 7, minWidth: 56, alignItems: 'center' },
  sendBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },

  audienceList: { gap: 8 },
  audienceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14 },
  audienceIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  audienceLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  audienceCount: { fontSize: 12, color: MUTED, marginTop: 1 },

  messageInput: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, fontSize: 15, color: TEXT, minHeight: 140, lineHeight: 22 },
  hint: { fontSize: 12, color: MUTED, marginTop: 8, paddingHorizontal: 4 },
});
