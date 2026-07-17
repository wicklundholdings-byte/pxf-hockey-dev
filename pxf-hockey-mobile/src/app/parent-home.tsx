import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ParentTabBar } from '@/components/parent-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Athlete = {
  id: string; initials: string; name: string;
  position: string | null; number: string | null;
  teamName?: string; teamId?: string;
};

function playerInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Star Rating ─────────────────────────────────────────────────────────────
function StarRow({ label, rating }: { label: string; rating: number }) {
  return (
    <View style={s.starRow}>
      <ThemedText style={s.starLabel}>{label}</ThemedText>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={14} color={GREEN} />
        ))}
      </View>
    </View>
  );
}

// ─── Athlete Card ─────────────────────────────────────────────────────────────
function AthleteCard({ athlete, expanded, onToggle }: {
  athlete: Athlete; expanded: boolean; onToggle: () => void;
}) {
  return (
    <View style={[s.athleteCard, expanded && s.athleteCardExpanded]}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
        <LinearGradient colors={[TEAL, '#00876A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.athleteAvatar}>
          <ThemedText style={s.athleteAvatarText}>{athlete.initials}</ThemedText>
        </LinearGradient>
        <ThemedText style={s.athleteName}>{athlete.name}</ThemedText>
        <ThemedText style={s.athleteMeta}>{[athlete.position, athlete.teamName].filter(Boolean).join(' · ')}</ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} style={{ alignSelf: 'center', marginTop: 6 }} />
      </TouchableOpacity>
      {expanded && (
        <View style={s.athleteExpanded}>
          <View style={s.combineStats}>
            <ThemedText style={s.combineSub}>PXF COMBINE STATS</ThemedText>
            <View style={s.combineRow}>
              {['SKATING', 'SHOT', 'EDGES'].map(stat => (
                <View key={stat} style={s.combineItem}>
                  <ThemedText style={s.combineNum}>--</ThemedText>
                  <ThemedText style={s.combineStat}>{stat}</ThemedText>
                </View>
              ))}
            </View>
            <ThemedText style={s.combineNote}>Connect PXF hardware to unlock</ThemedText>
          </View>
          <ThemedText style={s.campHistoryLabel}>CAMP HISTORY</ThemedText>
          <ThemedText style={s.campHistoryEmpty}>No camps yet</ThemedText>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
type NextSession = { id: string; title: string; date: string; time: string | null; teamName: string };

export default function ParentHomeScreen() {
  const router = useRouter();
  const [loading, setLoading]           = useState(true);
  const [parentName, setParentName]     = useState('');
  const [userInitials, setUserInitials] = useState('P');
  const [athletes, setAthletes]         = useState<Athlete[]>([]);
  const [nextSession, setNextSession]   = useState<NextSession | null>(null);
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [nextRsvp,       setNextRsvp]       = useState<'yes'|'no'|'maybe'|'none'>('none');
  const [nextRsvpSaving, setNextRsvpSaving] = useState(false);
  const [firstPlayerId,  setFirstPlayerId]  = useState<string | null>(null);
  const [homeUserId,     setHomeUserId]     = useState<string | null>(null);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [paidRegs,       setPaidRegs]       = useState<{ label: string; amount: string; date: string }[]>([]);
  const [recentThreads,  setRecentThreads]  = useState<{ id: string; name: string; updated_at: string }[]>([]);
  const [isCoachViewing, setIsCoachViewing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setHomeUserId(user.id);

      const { data: prof } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
      const name = prof?.full_name || user.email?.split('@')[0] || 'Parent';

      // Detect if a coach is viewing in parent mode
      if (prof?.role === 'elite' || prof?.role === 'team') {
        setIsCoachViewing(true);
      }
      setParentName(name.split(' ')[0]);
      setUserInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'P');

      // Find players linked to this parent by email
      const { data: playerData } = await supabase
        .from('players')
        .select('id, full_name, jersey_number, position, team_id, teams(id, name, coach_id)')
        .eq('parent_email', user.email ?? '');

      if (playerData && playerData.length > 0) {
        setFirstPlayerId(playerData[0].id as string);
        const mapped = playerData.map((p: any) => {
          const t: any = Array.isArray(p.teams) ? p.teams[0] ?? null : p.teams ?? null;
          return {
            id: p.id,
            name: p.full_name,
            initials: playerInitials(p.full_name),
            position: p.position ?? null,
            number: p.jersey_number ?? null,
            teamName: t?.name ?? undefined,
            teamId: p.team_id ?? undefined,
          };
        });
        setAthletes(mapped);

        // Load next upcoming session across all athlete coaches
        const coachTeamMap: Record<string, string> = {};
        for (const p of playerData) {
          const t: any = Array.isArray(p.teams) ? p.teams[0] ?? null : p.teams ?? null;
          if (t?.coach_id) coachTeamMap[t.coach_id] = t.name ?? 'Team';
        }
        const coachIds = Object.keys(coachTeamMap);
        if (coachIds.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const { data: sessData } = await supabase
            .from('sessions')
            .select('id, title, date, time, coach_id')
            .in('coach_id', coachIds)
            .gte('date', today)
            .order('date').order('time', { nullsFirst: false })
            .limit(1).maybeSingle();
          if (sessData) {
            setNextSession({
              id: sessData.id,
              title: sessData.title,
              date: sessData.date,
              time: sessData.time,
              teamName: coachTeamMap[sessData.coach_id] ?? 'Team',
            });
            // Load existing RSVP for this session
            const { data: rsvpRow } = await supabase
              .from('event_rsvps')
              .select('status')
              .eq('session_id', sessData.id)
              .eq('parent_user_id', user.id)
              .maybeSingle();
            if (rsvpRow) setNextRsvp(rsvpRow.status as 'yes'|'no'|'maybe'|'none');
          }
        }
      }

      // Load camp registration payments for this parent
      const { data: regData } = await supabase
        .from('camp_registrations')
        .select('id, status, amount_cents, created_at, camp:camps(title)')
        .eq('parent_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const regs = (regData ?? []).map((r: any) => ({
        ...r,
        camp: Array.isArray(r.camp) ? r.camp[0] ?? null : r.camp ?? null,
      }));
      const pending = regs.filter((r: any) => r.status === 'pending');
      const paid    = regs.filter((r: any) => r.status === 'confirmed' || r.status === 'paid');
      setPendingBalance(pending.reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0));
      setPaidRegs(paid.slice(0, 3).map((r: any) => ({
        label:  r.camp?.title ?? 'Camp Registration',
        amount: r.amount_cents ? `$${(r.amount_cents / 100).toFixed(2)}` : '$0',
        date:   new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })));

      // Load recent message threads
      const { data: participations } = await supabase
        .from('thread_participants')
        .select('thread_id, message_threads(id, name, updated_at)')
        .eq('user_id', user.id)
        .order('thread_id', { ascending: false })
        .limit(3);
      const threads = (participations ?? []).map((p: any) => {
        const t: any = Array.isArray(p.message_threads) ? p.message_threads[0] : p.message_threads;
        return t ? { id: t.id as string, name: t.name as string, updated_at: t.updated_at as string } : null;
      }).filter(Boolean) as { id: string; name: string; updated_at: string }[];
      setRecentThreads(threads);

      setLoading(false);
    }
    load();
  }, []);

  async function handleNextRsvp(status: 'yes' | 'no' | 'maybe') {
    if (!nextSession || !firstPlayerId || !homeUserId) return;
    setNextRsvp(status);
    setNextRsvpSaving(true);
    const { data: existing } = await supabase
      .from('event_rsvps').select('id')
      .eq('session_id', nextSession.id).eq('player_id', firstPlayerId).maybeSingle();
    if (existing?.id) {
      await supabase.from('event_rsvps')
        .update({ status, responded_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('event_rsvps').insert({
        session_id: nextSession.id, player_id: firstPlayerId,
        parent_user_id: homeUserId, status, responded_at: new Date().toISOString(),
      });
    }
    setNextRsvpSaving(false);
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

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
        {/* PXF Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.logoRow}>
              <ThemedText style={s.logoPXF}>PXF</ThemedText>
              <ThemedText style={s.logoHockey}>HOCKEY</ThemedText>
            </View>
            {isCoachViewing && (
              <View style={s.parentModeBadge}>
                <Ionicons name="heart" size={10} color={TEAL} />
                <ThemedText style={s.parentModeBadgeTxt}>PARENT MODE</ThemedText>
              </View>
            )}
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerIcon}>
              <Ionicons name="notifications-outline" size={22} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileAvatar} onPress={() => router.push("/parent-profile" as any)}>
              <ThemedText style={s.profileAvatarText}>{userInitials}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {/* Coach viewing as parent — return banner */}
          {isCoachViewing && (
            <TouchableOpacity style={s.coachReturnBanner} activeOpacity={0.85} onPress={() => router.replace('/' as any)}>
              <Ionicons name="arrow-back" size={14} color="#000" />
              <ThemedText style={s.coachReturnTxt}>Return to Coach Dashboard</ThemedText>
            </TouchableOpacity>
          )}

          {/* Greeting */}
          <ThemedText style={s.greeting}>{greeting}, {parentName}</ThemedText>
          <ThemedText style={s.greetingSub}>Here's what's happening.</ThemedText>

          {/* ── My Athletes ── */}
          <ThemedText style={s.sectionLabel}>MY ATHLETES</ThemedText>
          {athletes.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={24} color={MUTED} />
              <ThemedText style={s.emptyText}>No athletes linked to your account</ThemedText>
              <ThemedText style={s.emptyNote}>Your coach will add you via your email address</ThemedText>
            </View>
          ) : (
          <View style={s.athleteRow}>
            {athletes.map(a => (
              <AthleteCard
                key={a.id}
                athlete={a}
                expanded={expandedAthlete === a.id}
                onToggle={() => setExpandedAthlete(expandedAthlete === a.id ? null : a.id)}
              />
            ))}
          </View>
          )}

          {/* ── Next Up ── */}
          <ThemedText style={s.sectionLabel}>NEXT UP</ThemedText>
          {nextSession ? (
            <TouchableOpacity style={s.nextUpCard} activeOpacity={0.85}
              onPress={() => router.push(`/parent-events` as any)}>
              <View style={s.nextUpHeader}>
                <ThemedText style={s.nextUpAthlete}>{nextSession.teamName.toUpperCase()}</ThemedText>
                <View style={s.nextUpDateBadge}>
                  <ThemedText style={s.nextUpDateText}>
                    {new Date(nextSession.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={s.nextUpTitle}>{nextSession.title}</ThemedText>
              <ThemedText style={s.nextUpSub}>Practice Session</ThemedText>
              <View style={s.nextUpDetails}>
                <View style={s.nextUpDetail}>
                  <Ionicons name="calendar-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
                  <ThemedText style={s.nextUpDetailText}>
                    {new Date(nextSession.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </ThemedText>
                </View>
                {nextSession.time && (
                  <View style={s.nextUpDetail}>
                    <Ionicons name="time-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
                    <ThemedText style={s.nextUpDetailText}>{nextSession.time}</ThemedText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="calendar-outline" size={22} color={MUTED} />
              <ThemedText style={s.emptyText}>Nothing coming up</ThemedText>
            </View>
          )}

          {/* ── RSVP ── */}
          <ThemedText style={s.sectionLabel}>RSVP NEEDED</ThemedText>
          {nextSession ? (
            <View style={s.rsvpCard}>
              <ThemedText style={s.rsvpCardTitle}>{nextSession.title}</ThemedText>
              <ThemedText style={s.rsvpCardMeta}>
                {new Date(nextSession.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {nextSession.time ? ` · ${nextSession.time.slice(0, 5)}` : ''}
              </ThemedText>
              <ThemedText style={s.rsvpQuestion}>Will your athlete attend?</ThemedText>
              {nextRsvpSaving ? (
                <ActivityIndicator color={TEAL} size="small" style={{ marginTop: 8 }} />
              ) : (
                <View style={s.rsvpBtns}>
                  {([
                    { st: 'yes'   as const, label: 'Going',     color: TEAL,   bg: 'rgba(0,196,180,0.15)',  icon: 'checkmark-circle' },
                    { st: 'maybe' as const, label: 'Maybe',     color: ORANGE, bg: 'rgba(245,158,11,0.15)', icon: 'help-circle' },
                    { st: 'no'    as const, label: "Can't Go",  color: RED,    bg: 'rgba(239,68,68,0.15)',  icon: 'close-circle' },
                  ]).map(({ st, label, color, bg, icon }) => {
                    const isActive = nextRsvp === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[s.rsvpBtn, isActive && { backgroundColor: bg, borderColor: color }]}
                        onPress={() => void handleNextRsvp(st)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={icon as any} size={16} color={isActive ? color : MUTED} />
                        <ThemedText style={[s.rsvpBtnText, { color: isActive ? color : MUTED }]}>{label}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="calendar-outline" size={22} color={MUTED} />
              <ThemedText style={s.emptyText}>No RSVPs needed</ThemedText>
            </View>
          )}

          {/* ── Payments ── */}
          <ThemedText style={s.sectionLabel}>PAYMENTS</ThemedText>
          <View style={s.paymentsCard}>
            <ThemedText style={s.payEyebrow}>OUTSTANDING BALANCE</ThemedText>
            <ThemedText style={s.payAmount}>
              {pendingBalance > 0 ? `$${(pendingBalance / 100).toFixed(2)}` : '$0.00'}
            </ThemedText>
            {pendingBalance > 0 && (
              <TouchableOpacity style={s.payNowBtn} onPress={() => setShowPayModal(true)} activeOpacity={0.85}>
                <LinearGradient colors={[TEAL, TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.payNowGrad}>
                  <ThemedText style={s.payNowText}>Pay Now →</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {paidRegs.length > 0 && (
              <>
                <View style={s.payDivider} />
                <ThemedText style={s.recentLabel}>RECENT PAYMENTS</ThemedText>
                {paidRegs.map((p, i) => (
                  <View key={i} style={s.payRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={TEAL} style={{ marginRight: 8 }} />
                    <ThemedText style={s.payRowLabel} numberOfLines={1}>{p.label}</ThemedText>
                    <ThemedText style={s.payRowAmount}>{p.amount}</ThemedText>
                    <ThemedText style={s.payRowDate}> · {p.date}</ThemedText>
                  </View>
                ))}
              </>
            )}
            {pendingBalance === 0 && paidRegs.length === 0 && (
              <ThemedText style={[s.payDue, { marginTop: 4 }]}>No payments yet</ThemedText>
            )}
            <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.push('/parent-clubs' as any)}>
              <ThemedText style={s.viewInvoices}>View All Invoices →</ThemedText>
            </TouchableOpacity>
          </View>

          {/* ── Dryland This Week ── */}
          <View style={s.drylandCard}>
            <View style={s.drylandHeader}>
              <ThemedText style={s.drylandLabel}>DRYLAND THIS WEEK</ThemedText>
              <Ionicons name="fitness-outline" size={18} color={MUTED} />
            </View>
            <View style={s.drylandComingSoon}>
              <Ionicons name="time-outline" size={20} color={MUTED} style={{ marginBottom: 4 }} />
              <ThemedText style={s.drylandComingSoonText}>Coming Soon</ThemedText>
              <ThemedText style={s.drylandComingSoonSub}>Dryland tracking will be available soon</ThemedText>
            </View>
          </View>

          {/* ── My Teams ── */}
          <ThemedText style={s.sectionLabel}>MY TEAMS</ThemedText>
          {athletes.filter(a => a.teamId).length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={22} color={MUTED} />
              <ThemedText style={s.emptyText}>No teams yet</ThemedText>
            </View>
          ) : athletes.filter((a, i, arr) => a.teamId && arr.findIndex(x => x.teamId === a.teamId) === i).map(a => (
            <TouchableOpacity
              key={a.teamId}
              style={s.teamCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/parent-team/${a.teamId}` as any)}
            >
              <View style={s.teamAvatar}>
                <ThemedText style={s.teamAvatarText}>
                  {(a.teamName ?? 'T').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.teamName}>{a.teamName ?? 'My Team'}</ThemedText>
                <ThemedText style={s.teamMeta}>{a.number ? `#${a.number} · ` : ''}{a.position ?? ''}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
          ))}

          {/* ── Recent Media ── */}
          <View style={s.mediaHeader}>
            <ThemedText style={s.sectionLabel}>RECENT MEDIA</ThemedText>
            <TouchableOpacity><ThemedText style={s.seeAll}>See All</ThemedText></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {athletes.map((a: Athlete) => (
              <View key={a.id} style={s.mediaThumb}>
                <View style={s.mediaBg}>
                  <Ionicons name="ellipse-outline" size={32} color="rgba(255,255,255,0.2)" />
                </View>
                <ThemedText style={s.mediaName}>{a.name.split(' ')[0]}</ThemedText>
              </View>
            ))}
            <View style={s.mediaThumb}>
              <View style={[s.mediaBg, { justifyContent: 'center' }]}>
                <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.3)" />
              </View>
              <ThemedText style={s.mediaName}>More</ThemedText>
            </View>
          </ScrollView>

          {/* ── Messages ── */}
          <ThemedText style={s.sectionLabel}>MESSAGES</ThemedText>
          {recentThreads.length === 0 ? (
            <View style={[s.msgCard, { justifyContent: 'center', paddingVertical: 18 }]}>
              <ThemedText style={{ color: MUTED, fontSize: 14, textAlign: 'center' }}>No messages yet</ThemedText>
            </View>
          ) : recentThreads.map(thread => {
            const initials = thread.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
            const timeAgo = (() => {
              const diff = Date.now() - new Date(thread.updated_at).getTime();
              const hrs = Math.floor(diff / 3600000);
              if (hrs < 1) return 'now';
              if (hrs < 24) return `${hrs}h`;
              return `${Math.floor(hrs / 24)}d`;
            })();
            return (
              <TouchableOpacity key={thread.id} style={s.msgCard} activeOpacity={0.85}
                onPress={() => router.push('/parent-inbox' as any)}>
                <View style={s.msgAvatar}>
                  <ThemedText style={s.msgAvatarText}>{initials}</ThemedText>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.msgNameRow}>
                    <ThemedText style={s.msgName}>{thread.name}</ThemedText>
                    <ThemedText style={s.msgTime}>{timeAgo}</ThemedText>
                  </View>
                  <ThemedText style={s.msgPreview}>Tap to open conversation</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Payment Modal ── */}
      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowPayModal(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalDivider} />
            <View style={s.modalHeaderRow}>
              <ThemedText style={s.modalEyebrow}>INVOICE</ThemedText>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ThemedText style={s.modalTitle}>Outstanding Balance</ThemedText>
            <View style={s.modalAmountBox}>
              <ThemedText style={s.modalAmountLabel}>AMOUNT DUE</ThemedText>
              <ThemedText style={s.modalAmount}>
                {pendingBalance > 0 ? `$${(pendingBalance / 100).toFixed(2)}` : '$0.00'}
              </ThemedText>
            </View>
            <View style={s.modalCardRow}>
              <Ionicons name="card-outline" size={20} color={TEAL} style={{ marginRight: 12 }} />
              <View>
                <ThemedText style={s.modalCardName}>Online payment via Stripe</ThemedText>
                <ThemedText style={s.modalCardSub}>Coming soon</ThemedText>
              </View>
            </View>
            <TouchableOpacity
              style={s.confirmBtn}
              activeOpacity={0.85}
              onPress={() => {
                setShowPayModal(false);
                Alert.alert('Coming Soon', 'Online payments will be available when your coach connects Stripe.');
              }}
            >
              <LinearGradient colors={[TEAL, TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.confirmGrad}>
                <ThemedText style={s.confirmText}>Confirm Payment</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }}>
              <ThemedText style={s.diffCard}>Use Different Card</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <ParentTabBar active="home" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoPXF: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  devChip: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  devChipText: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  parentModeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,196,180,0.4)' },
  parentModeBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#00C4B4' },
  coachReturnBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#00C4B4', borderRadius: 12, paddingVertical: 12, marginHorizontal: 16, marginBottom: 16 },
  coachReturnTxt: { fontSize: 14, fontWeight: '800', color: '#000' },
  logoHockey: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  profileAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },

  content: { paddingHorizontal: 16, paddingBottom: 100 },
  greeting: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEXT, marginTop: 8, marginBottom: 2 },
  greetingSub: { fontSize: 15, color: MUTED, marginBottom: 20 },

  emptyCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 24, alignItems: 'center', gap: 8, marginBottom: 16,
  },
  emptyText: { fontSize: 14, color: MUTED },
  emptyNote: { fontSize: 12, color: MUTED, textAlign: 'center', opacity: 0.7 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  mediaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  seeAll: { fontSize: 14, fontWeight: '700', color: TEAL },

  // Athletes
  athleteRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  athleteCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, alignItems: 'center' },
  athleteCardExpanded: { alignItems: 'stretch' },
  athleteAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 8 },
  athleteAvatarText: { fontSize: 18, fontWeight: '800', color: '#000' },
  athleteName: { fontSize: 14, fontWeight: '700', color: TEXT, textAlign: 'center' },
  athleteMeta: { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 2 },
  athleteExpanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 },
  combineStats: { backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 10 },
  combineSub: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  combineRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  combineItem: { alignItems: 'center' },
  combineNum: { fontSize: 18, fontWeight: '800', color: MUTED },
  combineStat: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  combineNote: { fontSize: 11, color: MUTED, textAlign: 'center' },
  campHistoryLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 4 },
  campHistoryEmpty: { fontSize: 13, color: MUTED },

  // Next Up
  nextUpCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 20 },
  nextUpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nextUpAthlete: { fontSize: 12, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },
  nextUpDateBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: BORDER },
  nextUpDateText: { fontSize: 12, fontWeight: '600', color: TEXT },
  nextUpTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 2 },
  nextUpSub: { fontSize: 13, color: MUTED, marginBottom: 12 },
  nextUpDetails: { gap: 6 },
  nextUpDetail: { flexDirection: 'row', alignItems: 'center' },
  nextUpDetailText: { fontSize: 13, color: MUTED },

  // RSVP
  rsvpCard:      { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 16 },
  rsvpCardTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  rsvpCardMeta:  { fontSize: 13, color: MUTED, marginBottom: 12 },
  rsvpQuestion:  { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 10 },
  rsvpBtns:      { flexDirection: 'row', gap: 8 },
  rsvpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  rsvpBtnText: { fontSize: 13, fontWeight: '700', color: MUTED },

  // Payments
  paymentsCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 20 },
  payEyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 4 },
  payAmount: { fontSize: 32, fontWeight: '800', fontStyle: 'normal', lineHeight: 40, color: TEXT, marginBottom: 2 },
  payDue: { fontSize: 13, color: MUTED, marginBottom: 14 },
  payNowBtn: { marginBottom: 16 },
  payNowGrad: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  payNowText: { fontSize: 16, fontWeight: '800', color: '#000' },
  payDivider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },
  recentLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 10 },
  payRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  payRowLabel: { fontSize: 13, color: TEXT, flex: 1 },
  payRowAmount: { fontSize: 13, fontWeight: '700', color: TEXT },
  payRowDate: { fontSize: 13, color: MUTED },
  viewInvoices: { fontSize: 13, fontWeight: '700', color: TEAL },

  // Dryland
  drylandCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 20 },
  drylandComingSoon: { alignItems: 'center', paddingVertical: 16, gap: 2 },
  drylandComingSoonText: { fontSize: 14, fontWeight: '700', color: MUTED },
  drylandComingSoonSub: { fontSize: 12, color: MUTED, opacity: 0.6, textAlign: 'center' },
  drylandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  drylandLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  drylandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  drylandCount: { fontSize: 18, fontWeight: '800', color: TEXT },
  drylandPct: { fontSize: 14, fontWeight: '700', color: TEAL },
  progressTrack: { height: 6, backgroundColor: BORDER, borderRadius: 3, marginBottom: 10 },
  progressFill: { height: 6, backgroundColor: TEAL, borderRadius: 3 },
  drylandRank: { flexDirection: 'row', alignItems: 'center' },
  drylandRankText: { fontSize: 13, color: GREEN, fontWeight: '600' },

  // Teams
  teamCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 20, gap: 14 },
  teamAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  teamAvatarText: { fontSize: 14, fontWeight: '800', color: '#000' },
  teamName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  teamMeta: { fontSize: 12, color: MUTED },

  // Media
  mediaThumb: { width: 120, height: 120, marginRight: 10, borderRadius: 14, overflow: 'hidden', backgroundColor: CARD },
  mediaBg: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
  mediaName: { fontSize: 12, fontWeight: '700', color: TEXT, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, paddingHorizontal: 8 },

  // Messages
  msgCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 20 },
  msgAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },
  msgNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  msgName: { fontSize: 15, fontWeight: '700', color: TEXT },
  msgTime: { fontSize: 12, color: MUTED },
  msgCamp: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.3, marginBottom: 4 },
  msgPreview: { fontSize: 13, color: MUTED },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL, marginLeft: 8, marginTop: 6 },

  // Evaluation
  evalCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 4 },
  evalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  evalName: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 2 },
  evalSub: { fontSize: 13, color: MUTED },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  starLabel: { fontSize: 14, color: TEXT, fontWeight: '500' },
  evalQuote: { fontSize: 13, color: MUTED, fontStyle: 'italic', marginTop: 8, lineHeight: 18 },

  // Payment Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalDivider: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalEyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 16 },
  modalAmountBox: { backgroundColor: BG, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  modalAmountLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  modalAmount: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEAL },
  modalCardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  modalCardName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  modalCardSub: { fontSize: 12, color: MUTED },
  confirmBtn: {},
  confirmGrad: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  confirmText: { fontSize: 16, fontWeight: '800', color: '#000' },
  diffCard: { fontSize: 14, fontWeight: '700', color: TEAL },
});
