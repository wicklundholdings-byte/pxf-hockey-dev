import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { DatePicker } from '@/components/date-picker';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#21262D';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';

// ─── Types ────────────────────────────────────────────────────────────────────
type Player = { id: string; full_name: string };

type FeePayment = {
  id: string;
  player_id: string;
  status: 'pending' | 'paid' | 'waived';
  amount_paid: number;
};

type FeeRequest = {
  id: string;
  title: string;
  amount: number;
  due_date: string | null;
  notes: string | null;
  is_archived: boolean;
  payments: FeePayment[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDue(d: string | null) {
  if (!d) return null;
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(s: 'pending' | 'paid' | 'waived') {
  return s === 'paid' ? GREEN : s === 'waived' ? MUTED : ORANGE;
}

function statusLabel(s: 'pending' | 'paid' | 'waived') {
  return s === 'paid' ? 'Paid' : s === 'waived' ? 'Waived' : 'Pending';
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TeamFeesScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();

  const [teamName,    setTeamName]    = useState('');
  const [players,     setPlayers]     = useState<Player[]>([]);
  const [fees,        setFees]        = useState<FeeRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<Record<string, boolean>>({});

  // New Fee modal
  const [showNew,     setShowNew]     = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newAmount,   setNewAmount]   = useState('');
  const [newDue,      setNewDue]      = useState('');
  const [newNotes,    setNewNotes]    = useState('');
  const [saving,      setSaving]      = useState(false);

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => { load(); }, [teamId]);

  async function load() {
    if (!teamId) return;
    setLoading(true);

    const [{ data: teamData }, { data: playerData }, { data: feeData }] = await Promise.all([
      supabase.from('teams').select('name').eq('id', teamId).single(),
      supabase.from('players').select('id, full_name').eq('team_id', teamId).order('full_name'),
      supabase.from('team_fee_requests')
        .select('id, title, amount, due_date, notes, is_archived, team_fee_payments(id, player_id, status, amount_paid)')
        .eq('team_id', teamId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false }),
    ]);

    setTeamName(teamData?.name ?? '');
    setPlayers(playerData ?? []);
    setFees(
      (feeData ?? []).map((f: any) => ({
        ...f,
        payments: f.team_fee_payments ?? [],
      }))
    );
    setLoading(false);
  }

  // ── Summary ───────────────────────────────────────────────────
  const totalRequested = fees.reduce((sum, f) => sum + f.amount * players.length, 0);
  const totalCollected = fees.reduce((sum, f) =>
    sum + f.payments.reduce((s: number, p: FeePayment) => s + (p.status === 'paid' ? p.amount_paid : 0), 0), 0);
  const totalOutstanding = Math.max(0, totalRequested - totalCollected);

  // ── Create Fee ────────────────────────────────────────────────
  async function createFee() {
    if (!newTitle.trim() || !newAmount.trim()) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) { Alert.alert('Invalid amount'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: feeRow, error } = await supabase
      .from('team_fee_requests')
      .insert({
        team_id:  teamId,
        coach_id: user.id,
        title:    newTitle.trim(),
        amount,
        due_date: newDue.trim() || null,
        notes:    newNotes.trim() || null,
      })
      .select('id').single();

    if (error) { Alert.alert('Error', error.message); setSaving(false); return; }

    // Pre-create a pending payment row for every player
    if (players.length > 0 && feeRow) {
      await supabase.from('team_fee_payments').insert(
        players.map(p => ({
          fee_request_id: feeRow.id,
          player_id:      p.id,
          status:         'pending',
          amount_paid:    0,
        }))
      );
    }

    setSaving(false);
    setShowNew(false);
    setNewTitle(''); setNewAmount(''); setNewDue(''); setNewNotes('');
    load();
  }

  // ── Toggle payment status ─────────────────────────────────────
  async function cycleStatus(feeId: string, playerId: string, current: 'pending' | 'paid' | 'waived') {
    const next: Record<string, 'pending' | 'paid' | 'waived'> = {
      pending: 'paid', paid: 'waived', waived: 'pending',
    };
    const newStatus = next[current];
    const now = newStatus === 'paid' ? new Date().toISOString() : null;

    // Find existing payment row
    const fee = fees.find(f => f.id === feeId);
    const pay = fee?.payments.find((p: FeePayment) => p.player_id === playerId);
    const amount = fee?.amount ?? 0;

    if (pay) {
      await supabase.from('team_fee_payments').update({
        status:      newStatus,
        amount_paid: newStatus === 'paid' ? amount : 0,
        paid_at:     now,
      }).eq('id', pay.id);
    } else {
      await supabase.from('team_fee_payments').insert({
        fee_request_id: feeId,
        player_id:      playerId,
        status:         newStatus,
        amount_paid:    newStatus === 'paid' ? amount : 0,
        paid_at:        now,
      });
    }

    // Optimistic update
    setFees(prev => prev.map(f => {
      if (f.id !== feeId) return f;
      const updatedPayments = pay
        ? f.payments.map((p: FeePayment) => p.player_id === playerId
            ? { ...p, status: newStatus, amount_paid: newStatus === 'paid' ? amount : 0 }
            : p)
        : [...f.payments, { id: 'tmp', player_id: playerId, status: newStatus, amount_paid: newStatus === 'paid' ? amount : 0 }];
      return { ...f, payments: updatedPayments };
    }));
  }

  // ── Archive ───────────────────────────────────────────────────
  async function archiveFee(feeId: string) {
    Alert.alert('Archive Fee', 'Remove this fee request from the active list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive',
        onPress: async () => {
          await supabase.from('team_fee_requests').update({ is_archived: true }).eq('id', feeId);
          setFees(prev => prev.filter(f => f.id !== feeId));
        },
      },
    ]);
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.headerSub}>{teamName}</ThemedText>
            <ThemedText style={s.headerTitle}>Team Fees</ThemedText>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowNew(true)}>
            <Ionicons name="add" size={20} color="#000" />
            <ThemedText style={s.addBtnText}>New Fee</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Balance Summary */}
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderColor: TEAL }]}>
              <ThemedText style={s.summaryLabel}>REQUESTED</ThemedText>
              <ThemedText style={[s.summaryAmount, { color: TEAL }]}>{fmt(totalRequested)}</ThemedText>
            </View>
            <View style={[s.summaryCard, { borderColor: GREEN }]}>
              <ThemedText style={s.summaryLabel}>COLLECTED</ThemedText>
              <ThemedText style={[s.summaryAmount, { color: GREEN }]}>{fmt(totalCollected)}</ThemedText>
            </View>
            <View style={[s.summaryCard, { borderColor: ORANGE }]}>
              <ThemedText style={s.summaryLabel}>OUTSTANDING</ThemedText>
              <ThemedText style={[s.summaryAmount, { color: ORANGE }]}>{fmt(totalOutstanding)}</ThemedText>
            </View>
          </View>

          {/* Fee Requests */}
          {fees.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="cash-outline" size={36} color={MUTED} />
              <ThemedText style={s.emptyTitle}>No Fee Requests Yet</ThemedText>
              <ThemedText style={s.emptyBody}>
                Add team fees like tournament costs, extra ice, or end-of-season events.
              </ThemedText>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowNew(true)}>
                <ThemedText style={s.emptyBtnText}>+ Add Fee Request</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            fees.map(fee => {
              const paidCount    = fee.payments.filter((p: FeePayment) => p.status === 'paid').length;
              const waivedCount  = fee.payments.filter((p: FeePayment) => p.status === 'waived').length;
              const pendingCount = players.length - paidCount - waivedCount;
              const collected    = fee.payments.reduce((s: number, p: FeePayment) =>
                s + (p.status === 'paid' ? p.amount_paid : 0), 0);
              const isExpanded   = !!expanded[fee.id];

              return (
                <View key={fee.id} style={s.feeCard}>
                  {/* Fee header */}
                  <TouchableOpacity
                    style={s.feeHeader}
                    onPress={() => setExpanded(prev => ({ ...prev, [fee.id]: !prev[fee.id] }))}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.feeTitle}>{fee.title}</ThemedText>
                      <ThemedText style={s.feeMeta}>
                        {fmt(fee.amount)} / player
                        {fee.due_date ? ` · Due ${fmtDue(fee.due_date)}` : ''}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16} color={MUTED}
                    />
                  </TouchableOpacity>

                  {/* Progress bar */}
                  <View style={s.progressRow}>
                    <View style={s.progressBar}>
                      <View style={[s.progressFill, { flex: paidCount, backgroundColor: GREEN }]} />
                      <View style={[s.progressFill, { flex: waivedCount, backgroundColor: MUTED }]} />
                      <View style={[s.progressFill, { flex: Math.max(pendingCount, 0), backgroundColor: BORDER }]} />
                    </View>
                    <ThemedText style={s.progressLabel}>
                      {paidCount}/{players.length} paid · {fmt(collected)} collected
                    </ThemedText>
                  </View>

                  {/* Player list (expanded) */}
                  {isExpanded && (
                    <>
                      <View style={s.divider} />
                      {players.length === 0 ? (
                        <ThemedText style={[s.feeMeta, { padding: 12 }]}>No players on roster yet.</ThemedText>
                      ) : (
                        players.map(player => {
                          const pay = fee.payments.find((p: FeePayment) => p.player_id === player.id);
                          const status: 'pending' | 'paid' | 'waived' = pay?.status ?? 'pending';
                          return (
                            <View key={player.id} style={s.playerRow}>
                              <ThemedText style={s.playerName}>{player.full_name}</ThemedText>
                              <TouchableOpacity
                                style={[s.statusChip, { borderColor: statusColor(status) }]}
                                onPress={() => cycleStatus(fee.id, player.id, status)}
                                activeOpacity={0.8}
                              >
                                <View style={[s.statusDot, { backgroundColor: statusColor(status) }]} />
                                <ThemedText style={[s.statusText, { color: statusColor(status) }]}>
                                  {statusLabel(status)}
                                </ThemedText>
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}
                      <TouchableOpacity style={s.archiveBtn} onPress={() => archiveFee(fee.id)}>
                        <Ionicons name="archive-outline" size={13} color={MUTED} />
                        <ThemedText style={s.archiveBtnText}>Archive Fee</ThemedText>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* New Fee Modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.handle} />
              <View style={s.sheetHeader}>
                <ThemedText style={s.sheetTitle}>New Fee Request</ThemedText>
                <TouchableOpacity onPress={() => { setShowNew(false); setNewTitle(''); setNewAmount(''); setNewDue(''); setNewNotes(''); }}>
                  <Ionicons name="close" size={22} color={MUTED} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
                <ThemedText style={s.fieldLabel}>FEE NAME</ThemedText>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Kelowna Tournament Fee"
                  placeholderTextColor={MUTED}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                />

                <ThemedText style={s.fieldLabel}>AMOUNT PER PLAYER ($)</ThemedText>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 125.00"
                  placeholderTextColor={MUTED}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  keyboardType="decimal-pad"
                />

                <ThemedText style={s.fieldLabel}>DUE DATE (OPTIONAL)</ThemedText>
                <DatePicker value={newDue || null} onChange={v => setNewDue(v)} placeholder="No due date" />

                <ThemedText style={s.fieldLabel}>NOTES (OPTIONAL)</ThemedText>
                <TextInput
                  style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                  placeholder="Payment instructions, e-transfer info, etc."
                  placeholderTextColor={MUTED}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  multiline
                />

                <TouchableOpacity
                  style={[s.createBtn, (!newTitle.trim() || !newAmount.trim() || saving) && { opacity: 0.4 }]}
                  onPress={createFee}
                  disabled={!newTitle.trim() || !newAmount.trim() || saving}
                >
                  <ThemedText style={s.createBtnText}>
                    {saving ? 'Creating…' : `Create Fee${players.length > 0 ? ` · ${players.length} players` : ''}`}
                  </ThemedText>
                </TouchableOpacity>
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub:   { fontSize: 11, color: MUTED, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: TEAL, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  // Summary
  summaryRow:    { flexDirection: 'row', gap: 8, marginBottom: 20 },
  summaryCard:   {
    flex: 1, backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, padding: 12, alignItems: 'center', gap: 4,
  },
  summaryLabel:  { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  summaryAmount: { fontSize: 16, fontWeight: '800', lineHeight: 20 },

  // Fee cards
  feeCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1,
    borderColor: BORDER, marginBottom: 12, overflow: 'hidden',
  },
  feeHeader:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  feeTitle:     { fontSize: 15, fontWeight: '700', color: TEXT },
  feeMeta:      { fontSize: 12, color: MUTED, marginTop: 2 },

  progressRow: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  progressBar: {
    flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden',
    backgroundColor: BORDER,
  },
  progressFill:  { height: 4 },
  progressLabel: { fontSize: 11, color: MUTED, fontWeight: '500' },

  divider: { height: 1, backgroundColor: BORDER },

  // Player rows
  playerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  playerName: { fontSize: 14, color: TEXT, fontWeight: '500', flex: 1 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  archiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 12, justifyContent: 'center',
  },
  archiveBtnText: { fontSize: 12, color: MUTED },

  // Empty state
  emptyCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1,
    borderColor: BORDER, padding: 32, alignItems: 'center', gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyBody:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8, backgroundColor: TEAL, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

  // Modal
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:      { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20, maxHeight: '90%' },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: TEXT },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: BG, borderRadius: 10, borderWidth: 1,
    borderColor: BORDER, color: TEXT, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  createBtn: {
    marginTop: 20, backgroundColor: TEAL, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  createBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
