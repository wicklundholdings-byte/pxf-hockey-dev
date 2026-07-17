import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Tab = 'Overview' | 'Schedule' | 'Roster' | 'Payments';
const TABS: Tab[] = ['Overview', 'Schedule', 'Roster', 'Payments'];

type CampData = {
  id: string;
  title: string;
  type: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  description: string | null;
  coachName: string | null;
};

type RegData = {
  playerName: string;
  status: string;
  amountCents: number;
  paidAt: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDateRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const mo = s.toLocaleDateString('en-US', { month: 'short' });
  if (start === end) return `${mo} ${s.getDate()}`;
  if (s.getMonth() === e.getMonth()) return `${mo} ${s.getDate()}–${e.getDate()}`;
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function fmtFullDates(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return `${fmtDateRange(start, end)}, ${s.getFullYear()} · ${days} day${days !== 1 ? 's' : ''}`;
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T12:00:00');
  const last = new Date(end + 'T12:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ camp, reg }: { camp: CampData; reg: RegData | null }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.infoCard}>
        <ThemedText style={s.infoLabel}>DATES</ThemedText>
        <ThemedText style={s.infoValue}>{fmtFullDates(camp.startDate, camp.endDate)}</ThemedText>
      </View>
      {camp.location ? (
        <View style={s.infoCard}>
          <Ionicons name="location-outline" size={16} color={TEAL} style={{ marginRight: 10 }} />
          <View>
            <ThemedText style={s.infoValue}>{camp.location}</ThemedText>
            {camp.coachName && <ThemedText style={s.infoSub}>{camp.coachName}</ThemedText>}
          </View>
        </View>
      ) : null}
      {camp.description ? (
        <View style={s.infoCard}>
          <ThemedText style={s.infoLabel}>ABOUT</ThemedText>
          <ThemedText style={[s.infoSub, { marginTop: 4 }]}>{camp.description}</ThemedText>
        </View>
      ) : null}
      <View style={[s.infoCard, { borderColor: 'rgba(0,196,180,0.35)', backgroundColor: 'rgba(0,196,180,0.06)' }]}>
        <View style={s.athleteCheckRow}>
          <View style={s.checkCircle}>
            <Ionicons name="checkmark" size={16} color={TEAL} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText style={s.infoValue}>{reg?.playerName ?? 'Athlete'}</ThemedText>
            <ThemedText style={s.infoSub}>Athlete check-in</ThemedText>
          </View>
          <View style={s.confirmedBadge}>
            <ThemedText style={s.confirmedText}>{(reg?.status ?? 'confirmed').toUpperCase()}</ThemedText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ camp }: { camp: CampData }) {
  const days = getDaysBetween(camp.startDate, camp.endDate);
  const multiDay = days.length > 1;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {days.map((d, i) => (
        <View key={d} style={s.dayCard}>
          <View style={s.dayHeader}>
            <ThemedText style={s.dayDate}>{fmtDayLabel(d)}</ThemedText>
            <ThemedText style={s.dayLabel}>{multiDay ? `DAY ${i + 1}` : 'SESSION 1'}</ThemedText>
          </View>
          {camp.location ? (
            <View style={s.dayDetail}>
              <Ionicons name="location-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
              <ThemedText style={s.dayDetailText}>{camp.location}</ThemedText>
            </View>
          ) : null}
          {camp.coachName ? (
            <View style={s.dayDetail}>
              <Ionicons name="person-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
              <ThemedText style={s.dayDetailText}>{camp.coachName}</ThemedText>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Roster Tab ───────────────────────────────────────────────────────────────
function RosterTab({ reg }: { reg: RegData | null }) {
  const name = reg?.playerName ?? '';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.myAthleteCard}>
        <ThemedText style={s.myAthleteLabel}>MY ATHLETE</ThemedText>
        <View style={s.myAthleteRow}>
          <View style={s.myAthleteAvatar}>
            <ThemedText style={s.myAthleteAvatarText}>{initials}</ThemedText>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText style={s.myAthleteName}>{name || 'Athlete'}</ThemedText>
            <ThemedText style={s.myAthleteSub}>
              {reg ? `Enrolled · ${reg.status === 'confirmed' ? 'Check-in confirmed' : reg.status}` : 'Enrolled'}
            </ThemedText>
          </View>
          <View style={s.confirmedBadge}>
            <ThemedText style={s.confirmedText}>{(reg?.status ?? 'CONFIRMED').toUpperCase()}</ThemedText>
          </View>
        </View>
        <ThemedText style={s.privacyNote}>Other athletes' names are kept private.</ThemedText>
      </View>
    </ScrollView>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab({ camp, reg }: { camp: CampData; reg: RegData | null }) {
  if (!reg || reg.amountCents === 0) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[s.paidCard, { alignItems: 'center', paddingVertical: 32 }]}>
          <Ionicons name="receipt-outline" size={32} color={MUTED} />
          <ThemedText style={[s.paidDate, { marginTop: 12, textAlign: 'center' }]}>
            No payment info available
          </ThemedText>
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.paidCard}>
        <View style={s.paidHeader}>
          <ThemedText style={s.paidLabel}>TOTAL PAID</ThemedText>
          <View style={s.paidBadge}>
            <ThemedText style={s.paidBadgeText}>PAID</ThemedText>
          </View>
        </View>
        <ThemedText style={s.paidAmount}>{fmtCents(reg.amountCents)}</ThemedText>
        {reg.paidAt && <ThemedText style={s.paidDate}>Paid in full on {fmtDate(reg.paidAt)}</ThemedText>}
      </View>
      <TouchableOpacity style={s.receiptRow} activeOpacity={0.85}>
        <View style={s.receiptIcon}>
          <Ionicons name="receipt-outline" size={20} color={TEAL} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <ThemedText style={s.receiptTitle}>Receipt</ThemedText>
          <ThemedText style={s.receiptSub}>PDF · {camp.title}</ThemedText>
        </View>
        <Ionicons name="download-outline" size={20} color={TEAL} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function EnrollmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [camp, setCamp] = useState<CampData | null>(null);
  const [reg, setReg] = useState<RegData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Load camp
      const { data: campRow } = await supabase
        .from('camps')
        .select('id, title, type, start_date, end_date, location, description, coach_id')
        .eq('id', id)
        .maybeSingle();

      if (!campRow) { setNotFound(true); setLoading(false); return; }

      // Load coach name separately (camps.coach_id → profiles.id)
      let coachName: string | null = null;
      if (campRow.coach_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', campRow.coach_id)
          .maybeSingle();
        coachName = profile?.full_name ?? null;
      }

      setCamp({
        id: campRow.id,
        title: campRow.title,
        type: campRow.type ?? 'camp',
        startDate: campRow.start_date,
        endDate: campRow.end_date ?? campRow.start_date,
        location: campRow.location,
        description: campRow.description,
        coachName,
      });

      // Load this parent's registration for this camp
      const { data: regRow } = await supabase
        .from('camp_registrations')
        .select('player_name, status, amount_cents, paid_at')
        .eq('camp_id', id)
        .eq('parent_user_id', user.id)
        .maybeSingle();

      if (regRow) {
        setReg({
          playerName: regRow.player_name,
          status: regRow.status,
          amountCents: regRow.amount_cents ?? 0,
          paidAt: regRow.paid_at,
        });
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  if (notFound || !camp) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="calendar-outline" size={40} color={MUTED} />
        <ThemedText style={{ color: MUTED, marginTop: 12 }}>Camp not found</ThemedText>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <ThemedText style={{ color: TEAL }}>Go back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const typeLabel = (camp.type ?? 'camp').toUpperCase();
  const dateHeader = fmtDateRange(camp.startDate, camp.endDate);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* Top Nav */}
        <View style={s.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backChip} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backText}>My enrollment</ThemedText>
          </TouchableOpacity>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerIcon}>
              <Ionicons name="notifications-outline" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Breadcrumb */}
        <View style={s.breadcrumbRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.breadcrumb}>
            <Ionicons name="arrow-back" size={14} color={TEAL} style={{ marginRight: 4 }} />
            <ThemedText style={s.breadcrumbText}>My Clubs</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Camp header */}
        <View style={s.campHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.campName}>{camp.title}</ThemedText>
            <View style={s.campMeta}>
              <Ionicons name="calendar-outline" size={12} color={MUTED} style={{ marginRight: 4 }} />
              <ThemedText style={s.campMetaText}>
                {dateHeader}{camp.coachName ? ` · ${camp.coachName}` : ''}
              </ThemedText>
            </View>
            {camp.location && (
              <ThemedText style={s.campCoach}>{camp.location}</ThemedText>
            )}
          </View>
          <View style={s.campTypeBadge}>
            <ThemedText style={s.campTypeText}>{typeLabel}</ThemedText>
          </View>
        </View>

        {/* Tab strip */}
        <View style={s.tabStrip}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, activeTab === t && s.tabBtnActive]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.tabTxt, activeTab === t && s.tabTxtActive]}>{t}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.content}>
          {activeTab === 'Overview'  && <OverviewTab  camp={camp} reg={reg} />}
          {activeTab === 'Schedule'  && <ScheduleTab  camp={camp} />}
          {activeTab === 'Roster'    && <RosterTab    reg={reg} />}
          {activeTab === 'Payments'  && <PaymentsTab  camp={camp} reg={reg} />}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  backText: { fontSize: 13, fontWeight: '600', color: TEXT },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { padding: 4 },

  breadcrumbRow: { paddingHorizontal: 16, marginBottom: 8 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbText: { fontSize: 14, fontWeight: '700', color: TEAL },

  campHeader: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: CARD, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 14 },
  campName: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 4 },
  campMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  campMetaText: { fontSize: 12, color: MUTED },
  campCoach: { fontSize: 13, color: MUTED },
  campTypeBadge: { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', alignSelf: 'flex-start' },
  campTypeText: { fontSize: 11, fontWeight: '800', color: TEAL },

  tabStrip: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: CARD, borderRadius: 30, padding: 4, marginBottom: 0, borderWidth: 1, borderColor: BORDER },
  tabBtn: { flex: 1, borderRadius: 26, paddingVertical: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: TEAL },
  tabTxt: { fontSize: 12, fontWeight: '700', color: MUTED },
  tabTxtActive: { color: '#000' },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  // Info cards (Overview)
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 4, flex: 0, marginRight: 8 },
  infoValue: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  infoSub: { fontSize: 13, color: MUTED },
  athleteCheckRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,196,180,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  confirmedBadge: { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  confirmedText: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 0.3 },

  // Day cards (Schedule)
  dayCard: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayDate: { fontSize: 16, fontWeight: '800', color: TEXT },
  dayLabel: { fontSize: 12, fontWeight: '800', color: TEAL, letterSpacing: 0.3 },
  dayDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dayDetailText: { fontSize: 13, color: MUTED },

  // Roster
  myAthleteCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16 },
  myAthleteLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 12 },
  myAthleteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  myAthleteAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  myAthleteAvatarText: { fontSize: 14, fontWeight: '800', color: '#000' },
  myAthleteName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  myAthleteSub: { fontSize: 13, color: MUTED },
  privacyNote: { fontSize: 13, color: MUTED, fontStyle: 'italic' },

  // Payments
  paidCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 10 },
  paidHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  paidLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  paidBadge: { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  paidBadgeText: { fontSize: 11, fontWeight: '800', color: TEAL },
  paidAmount: { fontSize: 36, fontWeight: '800', lineHeight: 44, color: TEXT, marginBottom: 4 },
  paidDate: { fontSize: 13, color: MUTED },
  receiptRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14 },
  receiptIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  receiptTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  receiptSub: { fontSize: 13, color: MUTED },
});
