import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
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

type HubItem = {
  label: string;
  sub: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  route: string;
  badge?: string;
};

const HUB_ITEMS: HubItem[] = [
  {
    label: 'Schedule',
    sub: 'Sessions & ice time',
    icon: 'calendar-outline',
    color: TEAL,
    bg: 'rgba(0,196,180,0.08)',
    border: 'rgba(0,196,180,0.25)',
    route: '/events',
  },
  {
    label: 'Camps',
    sub: 'Draft & publish camps',
    icon: 'snow-outline',
    color: ORANGE,
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    route: '/camps',
  },
  {
    label: 'Ice Management',
    sub: 'AI contract import',
    icon: 'layers-outline',
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.25)',
    route: '/ice-management',
    badge: 'AI',
  },
  {
    label: 'Staff',
    sub: 'Employees & contractors',
    icon: 'people-circle-outline',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.25)',
    route: '/staff',
  },
  {
    label: 'Contacts',
    sub: 'CRM & pipeline',
    icon: 'people-outline',
    color: PURPLE,
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.25)',
    route: '/contacts',
  },
  {
    label: 'Financials',
    sub: 'Revenue & payouts',
    icon: 'bar-chart-outline',
    color: GREEN,
    bg: 'rgba(61,255,143,0.08)',
    border: 'rgba(61,255,143,0.25)',
    route: '/financials',
  },
  {
    label: 'Campaigns',
    sub: 'Email & outreach',
    icon: 'megaphone-outline',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.08)',
    border: 'rgba(244,114,182,0.25)',
    route: '/campaigns',
  },
];

export default function BusinessScreen() {
  const router = useRouter();
  const [revenue, setRevenue]       = useState(0);
  const [regCount, setRegCount]     = useState(0);
  const [pendingAmt, setPendingAmt] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      // Load camp registrations for this coach's camps
      const { data } = await supabase
        .from('camp_registrations')
        .select('status, amount_cents, camp:camps(coach_id)');
      const mine = (data ?? []).filter((r: any) => {
        const c = Array.isArray(r.camp) ? r.camp[0] : r.camp;
        return c?.coach_id === user.id;
      });
      const paid = mine.filter((r: any) => r.status === 'confirmed' || r.status === 'paid');
      const pend = mine.filter((r: any) => r.status === 'pending');
      setRevenue(paid.reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0));
      setRegCount(paid.length);
      setPendingAmt(pend.reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0));
    });
  }, []);

  const fmtDollar = (cents: number) =>
    cents === 0 ? '$0' : `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <ThemedText style={s.title}>Business</ThemedText>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/settings' as any)}>
              <Ionicons name="settings-outline" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Snapshot Row */}
          <ThemedText style={s.sectionLabel}>SNAPSHOT</ThemedText>
          <View style={s.snapshotRow}>
            <TouchableOpacity style={s.snapshotCard} activeOpacity={0.7} onPress={() => router.push('/financials' as any)}>
              <ThemedText style={s.snapshotLabel}>REVENUE</ThemedText>
              <ThemedText style={[s.snapshotValue, { color: TEAL }]}>{fmtDollar(revenue)}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.snapshotCard} activeOpacity={0.7} onPress={() => router.push('/financials' as any)}>
              <ThemedText style={s.snapshotLabel}>REGISTRATIONS</ThemedText>
              <ThemedText style={s.snapshotValue}>{regCount}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.snapshotCard} activeOpacity={0.7} onPress={() => router.push('/financials' as any)}>
              <ThemedText style={s.snapshotLabel}>PENDING</ThemedText>
              <ThemedText style={[s.snapshotValue, { color: ORANGE }]}>{fmtDollar(pendingAmt)}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Hub Grid */}
          <ThemedText style={s.sectionLabel}>TOOLS</ThemedText>
          <View style={s.grid}>
            {HUB_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[s.hubCard, { backgroundColor: item.bg, borderColor: item.border }]}
                activeOpacity={0.75}
                onPress={() => router.push(item.route as any)}
              >
                {item.badge && (
                  <View style={[s.hubBadge, { backgroundColor: item.color }]}>
                    <ThemedText style={s.hubBadgeText}>{item.badge}</ThemedText>
                  </View>
                )}
                <View style={[s.hubIconWrap, { backgroundColor: `${item.bg}`, borderColor: item.border }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <ThemedText style={[s.hubLabel, { color: item.color }]}>{item.label}</ThemedText>
                <ThemedText style={s.hubSub}>{item.sub}</ThemedText>
                <View style={s.hubArrow}>
                  <Ionicons name="arrow-forward" size={14} color={item.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Actions */}
          <ThemedText style={s.sectionLabel}>QUICK ACTIONS</ThemedText>
          <View style={s.quickActions}>
            <TouchableOpacity style={s.actionBtn} activeOpacity={0.8} onPress={() => router.push('/camps' as any)}>
              <Ionicons name="add-circle-outline" size={18} color={TEAL} />
              <ThemedText style={s.actionText}>New Camp</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} activeOpacity={0.8} onPress={() => router.push('/contacts' as any)}>
              <Ionicons name="person-add-outline" size={18} color={TEAL} />
              <ThemedText style={s.actionText}>Add Contact</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} activeOpacity={0.8} onPress={() => router.push('/campaigns' as any)}>
              <Ionicons name="mail-outline" size={18} color={TEAL} />
              <ThemedText style={s.actionText}>Send Campaign</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Media */}
          <ThemedText style={s.sectionLabel}>MEDIA</ThemedText>
          <View style={s.mediaRow}>
            <TouchableOpacity style={s.mediaCard} activeOpacity={0.8} onPress={() => router.push('/record' as any)}>
              <View style={[s.mediaIcon, { backgroundColor: TEAL }]}>
                <Ionicons name="videocam" size={20} color="#000" />
              </View>
              <ThemedText style={s.mediaTitle}>Record</ThemedText>
              <ThemedText style={s.mediaSub}>Shoot & tag</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaCard} activeOpacity={0.8} onPress={() => router.push('/film-library' as any)}>
              <View style={[s.mediaIcon, { backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' }]}>
                <Ionicons name="film-outline" size={20} color={TEAL} />
              </View>
              <ThemedText style={s.mediaTitle}>Library</ThemedText>
              <ThemedText style={s.mediaSub}>Review clips</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaCard} activeOpacity={0.8} onPress={() => router.push('/film-library' as any)}>
              <View style={[s.mediaIcon, { backgroundColor: 'rgba(124,58,237,0.12)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' }]}>
                <Ionicons name="share-social-outline" size={20} color={PURPLE} />
              </View>
              <ThemedText style={s.mediaTitle}>Export</ThemedText>
              <ThemedText style={s.mediaSub}>Save & share</ThemedText>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  title: { fontSize: 32, fontWeight: '800', lineHeight: 40, color: TEXT },
  iconBtn: { padding: 6 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10, marginTop: 16 },

  snapshotRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  snapshotCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER, alignItems: 'center',
  },
  snapshotLabel: { fontSize: 8, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' },
  snapshotValue: { fontSize: 20, fontWeight: '800', lineHeight: 24, color: TEXT },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  hubCard: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 6,
    position: 'relative',
  },
  hubIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 4,
  },
  hubLabel: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  hubSub: { fontSize: 12, color: MUTED, lineHeight: 16 },
  hubArrow: {
    position: 'absolute', top: 14, right: 14,
  },
  hubBadge: {
    position: 'absolute', top: 10, left: 10,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  hubBadgeText: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 0.5 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  actionBtn: {
    flex: 1, backgroundColor: CARD, borderRadius: 14,
    paddingVertical: 14, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  actionText: { fontSize: 11, fontWeight: '700', color: TEAL, textAlign: 'center' },

  mediaRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  mediaCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, alignItems: 'center', gap: 6,
  },
  mediaIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  mediaTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  mediaSub: { fontSize: 11, color: MUTED, textAlign: 'center' },
});
