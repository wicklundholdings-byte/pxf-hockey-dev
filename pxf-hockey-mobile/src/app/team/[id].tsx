import { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { TimePicker } from '@/components/time-picker';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab          = 'overview' | 'schedule' | 'roster' | 'tournaments' | 'more';
type MoreSection  = null | 'stats' | 'media' | 'payments' | 'practice-plans' | 'staff' | 'volunteers' | 'ice';
type SchedFilter  = 'all' | 'games' | 'practices';

// ── Types ─────────────────────────────────────────────────────────────────────
type DBTeam = { id: string; name: string; age_group: string | null; season: string | null; primary_color: string | null; coach_id: string | null; logo_url: string | null };
type Player = { id: string; full_name: string; jersey_number: string | null; position: string | null; parent_email: string | null };

// ── Fallback ──────────────────────────────────────────────────────────────────
const TEAM_FALLBACK = {
  name: 'Loading…',
  season: '',
  level: '',
  initials: '?',
};

// ── Session type ──────────────────────────────────────────────────────────────
type CoachSession = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  location: string | null;
  durationMinutes: number | null;
  mainFocus: string[];
};

type GameRow = {
  id: string;
  opponent: string;
  game_date: string;
  game_time: string | null;
  location: string | null;
  home_away: string;
  home_score: number | null;
  away_score: number | null;
  status: string; // 'upcoming' | 'live' | 'final'
};

function fmtSessionDate(dateStr: string | null | undefined, time: string | null): string {
  if (!dateStr) return 'Date TBD';
  // Strip time/timezone if present (handles plain YYYY-MM-DD and full ISO timestamps)
  const datePart = dateStr.split('T')[0];
  const d = new Date(datePart + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Date TBD';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let label = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    label += ` · ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  return label;
}



// ── Small shared components ───────────────────────────────────────────────────
function GradBtn({ label, onPress, icon }: { label: string; onPress?: () => void; icon?: string }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <LinearGradient colors={[TEAL, GREEN]} style={s.gradBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {icon && <Ionicons name={icon as any} size={15} color="#000" />}
        <ThemedText style={s.gradBtnText}>{label}</ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SectionLabel({ children, marginTop = 14 }: { children: string; marginTop?: number }) {
  return <ThemedText style={[s.sectionLabel, { marginTop }]}>{children}</ThemedText>;
}

function SectionRow({ label, onSeeAll }: { label: string; onSeeAll?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <ThemedText style={s.sectionLabel}>{label}</ThemedText>
      {onSeeAll && <TouchableOpacity onPress={onSeeAll}><ThemedText style={s.seeAll}>See All ›</ThemedText></TouchableOpacity>}
    </View>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab({ setTab, coachId, teamId }: { setTab: (t: Tab) => void; coachId: string; teamId: string }) {
  const router = useRouter();
  const [upcomingSessions, setUpcomingSessions] = useState<CoachSession[]>([]);
  const [nextGame,  setNextGame]  = useState<GameRow | null>(null);
  const [lastGame,  setLastGame]  = useState<GameRow | null>(null);
  const [record,    setRecord]    = useState({ wins: 0, losses: 0, ties: 0 });
  const [filmClips, setFilmClips] = useState<{ id: string; title: string | null; created_at: string | null }[]>([]);

  useEffect(() => {
    if (!coachId) return;
    const today = new Date().toISOString().split('T')[0];

    // Sessions
    supabase
      .from('sessions')
      .select('id, title, date, time, location, total_duration_minutes')
      .eq('coach_id', coachId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(3)
      .then(({ data }) => {
        setUpcomingSessions((data ?? []).map((r: any) => ({
          id: r.id, title: r.title, date: r.date,
          startTime: r.time ?? null, location: r.location ?? null,
          durationMinutes: r.total_duration_minutes ?? null,
        })));
      });

    // Games: next upcoming + all final games for record
    supabase
      .from('games')
      .select('id, opponent, game_date, game_time, location, home_away, home_score, away_score, status')
      .eq('coach_id', coachId)
      .eq('team_id', teamId)
      .order('game_date', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        const games = (data ?? []) as GameRow[];
        const upcomingG = games.filter(g => g.status !== 'final' && g.game_date >= today);
        const finalG    = games.filter(g => g.status === 'final');
        setNextGame(upcomingG[0] ?? null);
        setLastGame(finalG[finalG.length - 1] ?? null);

        // Compute record from final games
        let wins = 0, losses = 0, ties = 0;
        finalG.forEach(g => {
          if (g.home_score == null || g.away_score == null) return;
          const my    = g.home_away === 'home' ? g.home_score : g.away_score;
          const their = g.home_away === 'home' ? g.away_score : g.home_score;
          if (my > their)      wins++;
          else if (my < their) losses++;
          else                 ties++;
        });
        setRecord({ wins, losses, ties });
      });

    // Recent film clips
    supabase
      .from('clips')
      .select('id, notes, category, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setFilmClips((data ?? []).map((c: any) => ({ id: c.id, title: c.notes || c.category || 'Clip', created_at: c.created_at }))));
  }, [coachId]);

  const fmtGame = (g: GameRow) => {
    const d = new Date(g.game_date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return g.game_time ? `${dateStr} · ${fmtGameTime(g.game_time)}` : dateStr;
  };

  return (
    <>
      {/* Next Game */}
      {nextGame ? (
        <View style={s.nextGameCard}>
          <ThemedText style={s.nextGameLabel}>NEXT GAME</ThemedText>
          <ThemedText style={s.nextGameTitle}>vs. {nextGame.opponent}</ThemedText>
          <ThemedText style={s.metaText}>{fmtGame(nextGame)}</ThemedText>
          {nextGame.location ? (
            <View style={s.venueRow}>
              <Ionicons name="location-outline" size={13} color={MUTED} />
              <ThemedText style={s.metaText}>{nextGame.location}</ThemedText>
            </View>
          ) : null}
          <TouchableOpacity style={s.viewGameBtn} onPress={() => router.push(`/game/${nextGame.id}` as any)}>
            <ThemedText style={s.viewGameText}>View Game</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[s.card, { alignItems: 'center', gap: 6, paddingVertical: 18 }]}>
          <Ionicons name="trophy-outline" size={22} color={MUTED} />
          <ThemedText style={s.metaText}>No upcoming games</ThemedText>
          <TouchableOpacity onPress={() => setTab('schedule')}>
            <ThemedText style={[s.seeAll, { fontSize: 12 }]}>+ Add game in Schedule tab</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Last Result */}
      {lastGame && lastGame.home_score != null && (
        <View style={s.card}>
          <ThemedText style={s.miniLabel}>
            LAST RESULT · {new Date(lastGame.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </ThemedText>
          <View style={s.lastResultRow}>
            <View>
              <ThemedText style={s.metaText}>vs. {lastGame.opponent}</ThemedText>
              <ThemedText style={s.bigScore}>{lastGame.home_score} — {lastGame.away_score}</ThemedText>
            </View>
            {(() => {
              const my    = lastGame.home_away === 'home' ? lastGame.home_score! : lastGame.away_score!;
              const their = lastGame.home_away === 'home' ? lastGame.away_score! : lastGame.home_score!;
              const won   = my > their;
              const lost  = my < their;
              return (
                <View style={[s.resultBadge, { backgroundColor: won ? 'rgba(61,255,143,0.15)' : lost ? 'rgba(239,68,68,0.15)' : 'rgba(139,148,158,0.15)' }]}>
                  <ThemedText style={[s.resultText, { color: won ? GREEN : lost ? RED : MUTED }]}>
                    {won ? 'WIN' : lost ? 'LOSS' : 'TIE'}
                  </ThemedText>
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* Season Record */}
      <SectionLabel>SEASON RECORD</SectionLabel>
      <View style={[s.card, s.recordCard]}>
        <View style={s.recordCol}>
          <ThemedText style={[s.recordNum, { color: TEAL }]}>{record.wins}</ThemedText>
          <ThemedText style={s.recordLbl}>WINS</ThemedText>
        </View>
        <View style={[s.recordDivider]} />
        <View style={s.recordCol}>
          <ThemedText style={[s.recordNum, { color: RED }]}>{record.losses}</ThemedText>
          <ThemedText style={s.recordLbl}>LOSSES</ThemedText>
        </View>
        <View style={[s.recordDivider]} />
        <View style={s.recordCol}>
          <ThemedText style={[s.recordNum, { color: MUTED }]}>{record.ties}</ThemedText>
          <ThemedText style={s.recordLbl}>TIES</ThemedText>
        </View>
      </View>

      {/* Upcoming Schedule */}
      <View style={s.sectionRow}>
        <ThemedText style={s.sectionLabel}>UPCOMING SCHEDULE</ThemedText>
        <TouchableOpacity onPress={() => setTab('schedule')}>
          <ThemedText style={s.seeAll}>View full schedule ›</ThemedText>
        </TouchableOpacity>
      </View>
      {upcomingSessions.length === 0 ? (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 20 }]}>
          <ThemedText style={s.metaText}>No upcoming sessions</ThemedText>
        </View>
      ) : upcomingSessions.map(session => (
        <TouchableOpacity key={session.id} style={[s.card, s.schedRow]} onPress={() => setTab('schedule')}>
          <ThemedText style={s.schedDate}>{new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.schedName}>{session.title}</ThemedText>
            <ThemedText style={s.metaText}>
              {fmtSessionDate(session.date, session.startTime)}
              {session.location ? ` · ${session.location}` : ''}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={MUTED} />
        </TouchableOpacity>
      ))}

      {/* Team Stats */}
      <View style={s.sectionRow}>
        <ThemedText style={s.sectionLabel}>TEAM STATS</ThemedText>
        <TouchableOpacity onPress={() => setTab('more')}><ThemedText style={s.seeAll}>View Full Stats ›</ThemedText></TouchableOpacity>
      </View>
      <View style={[s.card, { alignItems: 'center', paddingVertical: 18, gap: 6 }]}>
        <Ionicons name="stats-chart-outline" size={22} color={MUTED} />
        <ThemedText style={s.metaText}>Player stats coming soon</ThemedText>
      </View>

      {/* Team Fees shortcut */}
      <TouchableOpacity style={s.alertCard} activeOpacity={0.8} onPress={() => router.push(`/team-fees/${teamId}` as any)}>
        <View style={s.alertTop}>
          <Ionicons name="cash-outline" size={18} color={TEAL} />
          <ThemedText style={s.alertTitle}>Team Fees</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 'auto' }} />
        </View>
        <ThemedText style={s.alertBody}>Manage fee requests, track payments, and see what's been collected.</ThemedText>
      </TouchableOpacity>

      {/* Dryland Leaderboard */}
      <SectionLabel marginTop={14}>DRYLAND LEADERBOARD · This Month</SectionLabel>
      <View style={[s.card, { alignItems: 'center', paddingVertical: 18, gap: 6 }]}>
        <Ionicons name="flame-outline" size={22} color={MUTED} />
        <ThemedText style={s.metaText}>Dryland leaderboard coming soon</ThemedText>
      </View>

      {/* Recent Film */}
      <SectionRow label="RECENT FILM" />
      {filmClips.length === 0 ? (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 18, gap: 6 }]}>
          <Ionicons name="film-outline" size={22} color={MUTED} />
          <ThemedText style={s.metaText}>No film clips yet</ThemedText>
        </View>
      ) : (
        <View style={s.filmRow}>
          {filmClips.map(f => (
            <TouchableOpacity key={f.id} style={s.filmCard} activeOpacity={0.8}>
              <View style={s.filmThumb}>
                <Ionicons name="play-circle" size={34} color="rgba(255,255,255,0.75)" />
              </View>
              <ThemedText style={s.filmTitle} numberOfLines={1}>{f.title ?? ''}</ThemedText>
              <ThemedText style={s.filmDate}>{f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </>
  );
}

// ── Tab: Schedule ─────────────────────────────────────────────────────────────
function fmtGameTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function daysUntil(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const d = new Date(datePart + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff <= 30) return `In ${diff} days`;
  return null;
}

function ScheduleTab({ coachId, teamId }: { coachId: string; teamId: string }) {
  const router = useRouter();
  const [filter,        setFilter]       = useState<SchedFilter>('all');
  const [upcoming,      setUpcoming]     = useState<CoachSession[]>([]);
  const [past,          setPast]         = useState<CoachSession[]>([]);
  const [upGames,       setUpGames]      = useState<GameRow[]>([]);
  const [pastGames,     setPastGames]    = useState<GameRow[]>([]);
  const [loading,       setLoading]      = useState(true);
  type VolPos = { role_name: string; spots_total: number; filled: string[] };
  const [volMap,          setVolMap]          = useState<Record<string, VolPos[]>>({});
  const [rsvpMap,         setRsvpMap]         = useState<Record<string, number>>({});
  const [teamPlayerCount, setTeamPlayerCount] = useState(0);
  const [showGameModal, setShowGameModal]= useState(false);
  const [gOpponent,     setGOpponent]   = useState('');
  const [gDate,         setGDate]       = useState('');
  const [gTime,         setGTime]       = useState<string | null>(null);
  const [gLoc,          setGLoc]        = useState('');
  const [gHomeAway,     setGHomeAway]   = useState<'home'|'away'>('home');
  const [gSaving,       setGSaving]     = useState(false);
  // Combined "Add Event" modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventType,      setEventType]      = useState<'practice' | 'game'>('practice');
  // Session creation modal (kept for state; modal is combined)
  const [showSessModal, setShowSessModal] = useState(false);
  const [sTitle,        setSTitle]        = useState('');
  const [sDate,         setSDate]         = useState('');
  const [sTime,         setSTime]         = useState<string | null>(null);
  const [sLoc,          setSLoc]          = useState('');
  const [sDuration,     setSDuration]     = useState('60');
  const [sSaving,       setSSaving]       = useState(false);

  // ── Date picker state ──────────────────────────────────────────────────────
  const [dpFor,    setDpFor]    = useState<'sDate'|'gDate'|null>(null);
  const [dpMonth,  setDpMonth]  = useState(new Date());


  // ── Location autocomplete (Google Places) ──────────────────────────────────
  const PLACES_KEY = 'AIzaSyBSC0TcManJa-ssPxot8xoQu9-gqqHJNAU';
  type LocSug = { place_id: string; description: string };
  const [locSugs,      setLocSugs]      = useState<LocSug[]>([]);
  const [locFor,       setLocFor]       = useState<'sLoc'|'gLoc'|null>(null);
  const [loadingLoc,   setLoadingLoc]   = useState(false);
  const [savedLocs,    setSavedLocs]    = useState<{id:string; name:string}[]>([]);
  const [locSaveReady, setLocSaveReady] = useState<{field:'sLoc'|'gLoc'; name:string}|null>(null);
  const [savingLoc,    setSavingLoc]    = useState(false);
  const locTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Load saved locations when modal opens
  useEffect(() => {
    if (!showEventModal) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('coach_locations').select('id, name').eq('coach_id', user.id).order('name')
        .then(({ data }) => setSavedLocs(data ?? []));
    });
  }, [showEventModal]);

  async function saveLocToCoachLocs(name: string, field: 'sLoc'|'gLoc') {
    setSavingLoc(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingLoc(false); return; }
    const { data } = await supabase.from('coach_locations')
      .insert({ coach_id: user.id, name: name.trim() })
      .select('id, name').single();
    if (data) setSavedLocs(prev => [...prev, { id: data.id, name: data.name }].sort((a,b) => a.name.localeCompare(b.name)));
    setLocSaveReady(null);
    setSavingLoc(false);
  }

  // ── Calendar helpers ───────────────────────────────────────────────────────
  function fmtPickedDate(iso: string) {
    const [y,m,d] = iso.split('-').map(Number);
    return new Date(y, m-1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }


  // ── Places autocomplete ────────────────────────────────────────────────────
  function onLocInput(text: string, field: 'sLoc'|'gLoc') {
    if (field === 'sLoc') setSLoc(text); else setGLoc(text);
    setLocFor(field);
    setLocSugs([]);
    if (text.length < 2) return;
    if (locTimer.current) clearTimeout(locTimer.current);
    locTimer.current = setTimeout(async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': PLACES_KEY,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
          },
          body: JSON.stringify({ input: text, includedPrimaryTypes: ['establishment'] }),
        });
        const json = await res.json();
        setLocSugs((json.suggestions ?? []).map((s: any) => ({
          place_id: s.placePrediction.placeId,
          description: s.placePrediction.text.text,
        })));
      } catch {}
      setLoadingLoc(false);
    }, 350);
  }

  async function pickLocSug(sug: LocSug, field: 'sLoc'|'gLoc') {
    setLocSugs([]);
    const setter = field === 'sLoc' ? setSLoc : setGLoc;
    let finalName = sug.description.split(',')[0];
    setter(finalName);
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${sug.place_id}`, {
        headers: { 'X-Goog-Api-Key': PLACES_KEY, 'X-Goog-FieldMask': 'displayName,formattedAddress' },
      });
      const json = await res.json();
      finalName = json.displayName?.text || finalName;
      setter(finalName);
    } catch {}
    // Offer to save if not already in saved locations
    const alreadySaved = savedLocs.some(l => l.name.toLowerCase() === finalName.toLowerCase());
    if (!alreadySaved) setLocSaveReady({ field, name: finalName });
    setLocFor(null);
  }

  // ── Inline calendar renderer ───────────────────────────────────────────────
  function renderInlineCal(field: 'sDate'|'gDate') {
    const y = dpMonth.getFullYear();
    const m = dpMonth.getMonth();
    const daysInM = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInM}, (_, i) => i + 1)];
    const currentVal = field === 'sDate' ? sDate : gDate;
    const setter = field === 'sDate' ? setSDate : setGDate;
    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <View style={s.calWrap}>
        <View style={s.calNav}>
          <TouchableOpacity onPress={() => { const d = new Date(dpMonth); d.setMonth(d.getMonth()-1); setDpMonth(d); }} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.calMonth}>{dpMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</ThemedText>
          <TouchableOpacity onPress={() => { const d = new Date(dpMonth); d.setMonth(d.getMonth()+1); setDpMonth(d); }} style={{ padding: 6 }}>
            <Ionicons name="chevron-forward" size={18} color={TEXT} />
          </TouchableOpacity>
        </View>
        <View style={s.calDayHdrs}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => (
            <ThemedText key={day} style={s.calDayHdr}>{day}</ThemedText>
          ))}
        </View>
        <View style={s.calGrid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={s.calCell} />;
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isSel   = currentVal === dateStr;
            const isToday = dateStr === todayStr;
            return (
              <TouchableOpacity
                key={i}
                style={[s.calCell, isSel && s.calCellSel, isToday && !isSel && s.calCellToday]}
                onPress={() => { setter(dateStr); setDpFor(null); }}
                activeOpacity={0.8}
              >
                <ThemedText style={[s.calCellTxt, isSel && { color: '#000' }, isToday && !isSel && { color: TEAL }]}>
                  {day}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }


  async function load() {
    const today = new Date().toISOString().split('T')[0];
    // Use the authenticated user's id for session queries (sessions have no team_id)
    const { data: { user: me } } = await supabase.auth.getUser();
    const cid = me?.id ?? coachId;
    if (!cid && !teamId) return;

    const [{ data: upRows }, { data: pastRows }, { data: upGRows }, { data: pastGRows }] = await Promise.all([
      supabase.from('sessions')
        .select('id, title, date, time, location, total_duration_minutes, main_focus')
        .eq('coach_id', cid).gte('date', today)
        .order('date', { ascending: true }).order('time', { nullsFirst: false }).limit(20),
      supabase.from('sessions')
        .select('id, title, date, time, location, total_duration_minutes, main_focus')
        .eq('coach_id', cid).lt('date', today)
        .order('date', { ascending: false }).limit(10),
      // Games: filter by team_id (reliable; not dependent on team.coach_id being populated)
      supabase.from('games')
        .select('id, opponent, game_date, game_time, location, home_away, home_score, away_score, status')
        .eq('team_id', teamId).gte('game_date', today)
        .order('game_date', { ascending: true }).order('game_time', { nullsFirst: false }).limit(20),
      supabase.from('games')
        .select('id, opponent, game_date, game_time, location, home_away, home_score, away_score, status')
        .eq('team_id', teamId).lt('game_date', today)
        .order('game_date', { ascending: false }).limit(10),
    ]);

    const mapSess = (r: any): CoachSession => ({
      id: r.id, title: r.title, date: r.date,
      startTime: r.time ?? null, location: r.location ?? null,
      durationMinutes: r.total_duration_minutes ?? null,
      mainFocus: Array.isArray(r.main_focus) ? r.main_focus : [],
    });

    setUpcoming((upRows ?? []).map(mapSess));
    setPast((pastRows ?? []).map(mapSess));
    setUpGames((upGRows ?? []) as GameRow[]);
    setPastGames((pastGRows ?? []) as GameRow[]);

    // Load player count + RSVP yes-counts for upcoming games
    const upGameIds = (upGRows ?? []).map((g: any) => g.id);
    const upSessIds = (upRows ?? []).map((r: any) => r.id);

    const [{ count: playerCount }, { data: rsvpRows }] = await Promise.all([
      teamId
        ? supabase.from('players').select('id', { count: 'exact', head: true }).eq('team_id', teamId)
        : Promise.resolve({ count: 0, data: null, error: null }),
      upGameIds.length > 0
        ? supabase.from('event_rsvps').select('game_id').eq('status', 'yes').in('game_id', upGameIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    setTeamPlayerCount(playerCount ?? 0);
    const newRsvpMap: Record<string, number> = {};
    (rsvpRows ?? []).forEach((r: any) => {
      newRsvpMap[r.game_id] = (newRsvpMap[r.game_id] ?? 0) + 1;
    });
    setRsvpMap(newRsvpMap);

    // Load volunteer positions for all upcoming events
    const allEntityIds = [...upGameIds, ...upSessIds];
    if (allEntityIds.length > 0) {
      const { data: posRows } = await supabase
        .from('team_positions')
        .select('id, role_name, spots_total, entity_id')
        .in('entity_id', allEntityIds);
      if (posRows && posRows.length > 0) {
        const posIds = posRows.map((p: any) => p.id);
        const { data: signupRows } = await supabase
          .from('position_signups')
          .select('position_id, signup_name')
          .in('position_id', posIds);
        const newMap: Record<string, VolPos[]> = {};
        posRows.forEach((pos: any) => {
          const names = (signupRows ?? [])
            .filter((s: any) => s.position_id === pos.id)
            .map((s: any) => s.signup_name as string);
          if (!newMap[pos.entity_id]) newMap[pos.entity_id] = [];
          newMap[pos.entity_id].push({ role_name: pos.role_name, spots_total: pos.spots_total, filled: names });
        });
        setVolMap(newMap);
      } else {
        setVolMap({});
      }
    } else {
      setVolMap({});
    }

    setLoading(false);
  }

  useEffect(() => { void load(); }, [coachId]);

  async function handleCreateGame() {
    if (!gOpponent.trim() || !gDate.trim()) return;
    setGSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGSaving(false); return; }

    const { data: gameRow, error: gErr } = await supabase.from('games').insert({
      coach_id:  user.id,
      team_id:   teamId || null,
      opponent:  gOpponent.trim(),
      game_date: gDate.trim(),
      game_time: gTime ?? null,
      location:  gLoc.trim() || null,
      home_away: gHomeAway,
      status:    'upcoming',
    }).select('id').single();

    if (gErr) {
      Alert.alert('Error saving game', gErr.message);
      setGSaving(false);
      return;
    }

    // Auto-create volunteer positions from team defaults
    if (gameRow && teamId) {
      const applyValues = gHomeAway === 'home' ? ['home_game', 'all_games'] : ['all_games'];
      const { data: defaults } = await supabase
        .from('team_volunteer_defaults')
        .select('role_name, spots_total')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .in('apply_to', applyValues);
      if (defaults && defaults.length > 0) {
        await supabase.from('team_positions').insert(
          defaults.map((d: any) => ({
            team_id:     teamId,
            owner_id:    user.id,
            entity_type: 'game',
            entity_id:   gameRow.id,
            role_name:   d.role_name,
            spots_total: d.spots_total,
          }))
        );
      }
    }

    setGOpponent(''); setGDate(''); setGTime(null);
    setGLoc(''); setGHomeAway('home'); setLocSugs([]);
    setShowEventModal(false);
    void load();
    setGSaving(false);
  }

  async function handleCreateSession() {
    if (!sTitle.trim() || !sDate.trim()) return;
    setSSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSSaving(false); return; }

    const { error: sErr } = await supabase.from('sessions').insert({
      coach_id:               user.id,
      title:                  sTitle.trim(),
      date:                   sDate.trim(),
      time:                   sTime ?? null,
      location:               sLoc.trim() || null,
      total_duration_minutes: parseInt(sDuration, 10) || 60,
      main_focus:             [],
      is_complete:            false,
    });

    if (sErr) {
      Alert.alert('Error saving session', sErr.message);
      setSSaving(false);
      return;
    }

    setSTitle(''); setSDate(''); setSTime(null);
    setSLoc(''); setSDuration('60'); setLocSugs([]);
    setShowEventModal(false);
    void load();
    setSSaving(false);
  }

  // Filter logic: combine sessions + games for 'all', separate for others
  const shownUpSess  = filter === 'games' ? [] : upcoming;
  const shownPastSess= filter === 'games' ? [] : past;
  const shownUpGames = filter === 'practices' ? [] : upGames;
  const shownPastGames = filter === 'practices' ? [] : pastGames;

  const addLabel = '+ Event';
  const onAddPress = () => {
    setEventType(filter === 'games' ? 'game' : 'practice');
    setShowEventModal(true);
  };

  const upcomingEmpty  = shownUpSess.length === 0 && shownUpGames.length === 0;
  const pastEmpty      = shownPastSess.length === 0 && shownPastGames.length === 0;

  return (
    <>
      {/* Controls */}
      <View style={s.schedControls}>
        <View style={s.filterRow}>
          {(['all', 'games', 'practices'] as SchedFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, filter === f && s.filterChipOn]}
              onPress={() => setFilter(f)}
            >
              <ThemedText style={[s.filterChipTxt, filter === f && s.filterChipTxtOn]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <GradBtn label={addLabel} onPress={onAddPress} />
      </View>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : (
        <>
          <SectionLabel marginTop={4}>UPCOMING</SectionLabel>
          {upcomingEmpty ? (
            <View style={[s.card, { alignItems: 'center', gap: 8, paddingVertical: 24 }]}>
              <Ionicons name="calendar-outline" size={24} color={MUTED} />
              <ThemedText style={{ fontSize: 13, color: MUTED }}>
                {filter === 'games' ? 'No games scheduled' : 'No upcoming sessions'}
              </ThemedText>
            </View>
          ) : (
            <>
              {shownUpGames.map(g => {
                const yesCount = rsvpMap[g.id] ?? 0;
                const vols = volMap[g.id] ?? [];
                const countdown = daysUntil(g.game_date);
                const allGreen = teamPlayerCount > 0 && yesCount === teamPlayerCount;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={s.eventCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/game/${g.id}` as any)}
                  >
                    {/* Top row: badge + attendance */}
                    <View style={s.eventCardTopRow}>
                      <View style={[s.eventBadge, { backgroundColor: 'rgba(245,158,11,0.15)', marginBottom: 0 }]}>
                        <ThemedText style={[s.eventBadgeTxt, { color: ORANGE }]}>
                          {g.home_away === 'home' ? 'HOME' : 'AWAY'}
                        </ThemedText>
                      </View>
                      <View style={s.attendBadge}>
                        <Ionicons name="people-outline" size={12} color={allGreen ? GREEN : MUTED} />
                        <ThemedText style={[s.attendTxt, { color: allGreen ? GREEN : MUTED }]}>
                          {yesCount}/{teamPlayerCount}
                        </ThemedText>
                      </View>
                    </View>
                    {/* Title + chevron */}
                    <View style={s.eventTitleRow}>
                      <ThemedText style={[s.eventTitle, { flex: 1 }]}>vs. {g.opponent}</ThemedText>
                      <Ionicons name="chevron-forward" size={16} color={BORDER} />
                    </View>
                    {/* Countdown */}
                    {countdown && (
                      <ThemedText style={s.countdownTxt}>{countdown}</ThemedText>
                    )}
                    <ThemedText style={s.metaText}>
                      {fmtSessionDate(g.game_date, null)}
                      {g.game_time ? ` · ${fmtGameTime(g.game_time)}` : ''}
                      {g.location ? ` · ${g.location}` : ''}
                    </ThemedText>
                    {vols.length > 0 && (
                      <>
                        <View style={s.volDivider} />
                        <View style={s.volList}>
                          {vols.map((pos, i) => {
                            const isFull = pos.filled.length >= pos.spots_total;
                            return (
                              <View key={i} style={s.volRow}>
                                <View style={[s.volDot, { backgroundColor: isFull ? GREEN : ORANGE }]} />
                                <ThemedText style={s.volRowRole}>{pos.role_name}</ThemedText>
                                <ThemedText style={[s.volRowName, { color: isFull ? GREEN : ORANGE }]} numberOfLines={1}>
                                  {isFull && pos.filled.length > 0
                                    ? pos.filled[0]
                                    : `${pos.filled.length}/${pos.spots_total}`}
                                </ThemedText>
                                {isFull && (
                                  <ThemedText style={[s.volRowCount, { color: TEAL }]}>
                                    {pos.filled.length}/{pos.spots_total}
                                  </ThemedText>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
              {shownUpSess.map(sess => {
                const vols = volMap[sess.id] ?? [];
                const countdown = daysUntil(sess.date);
                return (
                  <TouchableOpacity
                    key={sess.id}
                    style={s.eventCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/session/${sess.id}?teamId=${encodeURIComponent(teamId)}` as any)}
                  >
                    {/* Top row: badge + duration */}
                    <View style={s.eventCardTopRow}>
                      <View style={[s.eventBadge, { backgroundColor: 'rgba(139,92,246,0.15)', marginBottom: 0 }]}>
                        <ThemedText style={[s.eventBadgeTxt, { color: '#8B5CF6' }]}>PRACTICE</ThemedText>
                      </View>
                      {sess.durationMinutes != null && (
                        <ThemedText style={[s.attendTxt, { color: MUTED }]}>{sess.durationMinutes} min</ThemedText>
                      )}
                    </View>
                    {/* Title + chevron */}
                    <View style={s.eventTitleRow}>
                      <ThemedText style={[s.eventTitle, { flex: 1 }]}>{sess.title}</ThemedText>
                      <Ionicons name="chevron-forward" size={16} color={BORDER} />
                    </View>
                    {/* Countdown */}
                    {countdown && (
                      <ThemedText style={s.countdownTxt}>{countdown}</ThemedText>
                    )}
                    <ThemedText style={s.metaText}>
                      {fmtSessionDate(sess.date, sess.startTime)}
                      {sess.location ? ` · ${sess.location}` : ''}
                    </ThemedText>
                    {/* Focus tags */}
                    {sess.mainFocus.length > 0 && (
                      <View style={s.focusRow}>
                        {sess.mainFocus.map((f, i) => (
                          <View key={i} style={s.focusTag}>
                            <ThemedText style={s.focusTagTxt}>{f}</ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                    {vols.length > 0 && (
                      <>
                        <View style={s.volDivider} />
                        <View style={s.volList}>
                          {vols.map((pos, i) => {
                            const isFull = pos.filled.length >= pos.spots_total;
                            return (
                              <View key={i} style={s.volRow}>
                                <View style={[s.volDot, { backgroundColor: isFull ? GREEN : ORANGE }]} />
                                <ThemedText style={s.volRowRole}>{pos.role_name}</ThemedText>
                                <ThemedText style={[s.volRowName, { color: isFull ? GREEN : ORANGE }]} numberOfLines={1}>
                                  {isFull && pos.filled.length > 0
                                    ? pos.filled[0]
                                    : `${pos.filled.length}/${pos.spots_total}`}
                                </ThemedText>
                                {isFull && (
                                  <ThemedText style={[s.volRowCount, { color: TEAL }]}>
                                    {pos.filled.length}/{pos.spots_total}
                                  </ThemedText>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <SectionLabel marginTop={16}>PAST</SectionLabel>
          {pastEmpty ? (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 20 }]}>
              <ThemedText style={{ fontSize: 13, color: MUTED }}>No past events</ThemedText>
            </View>
          ) : (
            <>
              {shownPastGames.map(g => {
                const isWin  = g.status === 'final' && g.home_score != null && g.away_score != null &&
                  ((g.home_away === 'home' && g.home_score > g.away_score) ||
                   (g.home_away === 'away' && g.away_score > g.home_score));
                const isLoss = g.status === 'final' && g.home_score != null && g.away_score != null && !isWin;
                const resultColor = isWin ? GREEN : isLoss ? RED : MUTED;
                const hasScore = g.status === 'final' && g.home_score != null;
                const resultLabel = hasScore
                  ? `${g.home_score}–${g.away_score} ${isWin ? 'W' : isLoss ? 'L' : 'T'}`
                  : '';
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[s.card, s.pastRow]}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/game/${g.id}` as any)}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.pastOpponent}>vs. {g.opponent}</ThemedText>
                      <ThemedText style={s.metaText}>{fmtSessionDate(g.game_date, null)}</ThemedText>
                    </View>
                    {hasScore ? (
                      <ThemedText style={[s.metaText, { color: resultColor, fontWeight: '700' }]}>
                        {resultLabel}
                      </ThemedText>
                    ) : (
                      <View style={s.enterScoreChip}>
                        <ThemedText style={s.enterScoreTxt}>Enter score</ThemedText>
                        <Ionicons name="chevron-forward" size={12} color={TEAL} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {shownPastSess.map(sess => (
                <TouchableOpacity
                  key={sess.id}
                  style={[s.card, s.pastRow]}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/session/${sess.id}?teamId=${encodeURIComponent(teamId)}` as any)}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.pastOpponent}>{sess.title}</ThemedText>
                    <ThemedText style={s.metaText}>{fmtSessionDate(sess.date, null)}</ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
          <View style={{ height: 24 }} />
        </>
      )}

      {/* ── Add Event Modal (combined Practice + Game) ── */}
      <Modal visible={showEventModal} transparent animationType="slide" onRequestClose={() => setShowEventModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowEventModal(false)}>
            <TouchableOpacity style={[s.modalSheet, { maxHeight: '94%', flex: 1 }]} activeOpacity={1}>
              <View style={s.modalHandle} />
              <ThemedText style={s.modalTitle}>Add Event</ThemedText>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
                {/* Type selector */}
                <ThemedText style={s.modalFieldLabel}>TYPE</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  {(['practice', 'game'] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.haBtn, eventType === t && s.haBtnActive, { flex: 1 }]}
                      onPress={() => { setEventType(t); setDpFor(null); setLocSugs([]); }}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={[s.haBtnTxt, eventType === t && { color: '#000' }]}>
                        {t === 'practice' ? 'Practice' : 'Game'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Practice fields ── */}
                {eventType === 'practice' && (
                  <>
                    <ThemedText style={s.modalFieldLabel}>TITLE *</ThemedText>
                    <TextInput
                      style={s.modalInput}
                      value={sTitle}
                      onChangeText={setSTitle}
                      placeholder="e.g. Tuesday Practice"
                      placeholderTextColor={MUTED}
                      autoCapitalize="words"
                    />

                    <ThemedText style={s.modalFieldLabel}>DATE *</ThemedText>
                    <TouchableOpacity
                      style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                      onPress={() => {
                        setDpFor(dpFor === 'sDate' ? null : 'sDate');
                        setDpMonth(sDate ? new Date(sDate + 'T00:00:00') : new Date());
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={16} color={sDate ? TEAL : MUTED} />
                      <ThemedText style={{ color: sDate ? TEXT : MUTED, fontSize: 15, flex: 1 }}>
                        {sDate ? fmtPickedDate(sDate) : 'Select date'}
                      </ThemedText>
                      <Ionicons name={dpFor === 'sDate' ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                    </TouchableOpacity>
                    {dpFor === 'sDate' && renderInlineCal('sDate')}

                    <ThemedText style={s.modalFieldLabel}>DURATION (MIN)</ThemedText>
                    <TextInput
                      style={s.modalInput}
                      value={sDuration}
                      onChangeText={setSDuration}
                      placeholder="60"
                      placeholderTextColor={MUTED}
                      keyboardType="number-pad"
                    />

                    <ThemedText style={s.modalFieldLabel}>TIME</ThemedText>
                    <TimePicker value={sTime} onChange={v => setSTime(v)} />

                    <ThemedText style={[s.modalFieldLabel, { marginTop: 14 }]}>LOCATION</ThemedText>
                    <TextInput
                      style={s.modalInput}
                      value={sLoc}
                      onChangeText={(t) => { setLocSaveReady(null); onLocInput(t, 'sLoc'); }}
                      onFocus={() => setLocFor('sLoc')}
                      placeholder="Search venues…"
                      placeholderTextColor={MUTED}
                      autoCapitalize="words"
                    />
                    {loadingLoc && locFor === 'sLoc' && <ActivityIndicator color={TEAL} style={{ marginTop: 6 }} size="small" />}
                    {locFor === 'sLoc' && locSugs.length > 0 && (
                      <View style={s.locDropdown}>
                        {locSugs.map(sug => (
                          <TouchableOpacity key={sug.place_id} style={s.locRow} onPress={() => void pickLocSug(sug, 'sLoc')} activeOpacity={0.8}>
                            <Ionicons name="location-outline" size={13} color={MUTED} />
                            <ThemedText style={s.locTxt} numberOfLines={1}>{sug.description}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {locFor === 'sLoc' && sLoc.length === 0 && savedLocs.length > 0 && (
                      <View style={s.locDropdown}>
                        <ThemedText style={s.locSavedHdr}>SAVED LOCATIONS</ThemedText>
                        {savedLocs.map(loc => (
                          <TouchableOpacity key={loc.id} style={s.locRow} onPress={() => { setSLoc(loc.name); setLocFor(null); }} activeOpacity={0.8}>
                            <Ionicons name="bookmark" size={13} color={TEAL} />
                            <ThemedText style={s.locTxt}>{loc.name}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {locSaveReady?.field === 'sLoc' && (
                      <TouchableOpacity
                        style={s.locSaveBtn}
                        onPress={() => void saveLocToCoachLocs(locSaveReady.name, 'sLoc')}
                        disabled={savingLoc}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="bookmark-outline" size={14} color={TEAL} />
                        <ThemedText style={s.locSaveTxt}>
                          {savingLoc ? 'Saving…' : `Save "${locSaveReady.name}" to My Locations`}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* ── Game fields ── */}
                {eventType === 'game' && (
                  <>
                    <ThemedText style={s.modalFieldLabel}>OPPONENT *</ThemedText>
                    <TextInput
                      style={s.modalInput}
                      value={gOpponent}
                      onChangeText={setGOpponent}
                      placeholder="e.g. Thunder Bay Kings"
                      placeholderTextColor={MUTED}
                      autoCapitalize="words"
                    />

                    <ThemedText style={s.modalFieldLabel}>DATE *</ThemedText>
                    <TouchableOpacity
                      style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                      onPress={() => {
                        setDpFor(dpFor === 'gDate' ? null : 'gDate');
                        setDpMonth(gDate ? new Date(gDate + 'T00:00:00') : new Date());
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={16} color={gDate ? TEAL : MUTED} />
                      <ThemedText style={{ color: gDate ? TEXT : MUTED, fontSize: 15, flex: 1 }}>
                        {gDate ? fmtPickedDate(gDate) : 'Select date'}
                      </ThemedText>
                      <Ionicons name={dpFor === 'gDate' ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                    </TouchableOpacity>
                    {dpFor === 'gDate' && renderInlineCal('gDate')}

                    <ThemedText style={s.modalFieldLabel}>TIME</ThemedText>
                    <TimePicker value={gTime} onChange={v => setGTime(v)} />

                    <ThemedText style={[s.modalFieldLabel, { marginTop: 14 }]}>HOME / AWAY</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['home', 'away'] as const).map(ha => (
                        <TouchableOpacity
                          key={ha}
                          style={[s.haBtn, gHomeAway === ha && s.haBtnActive, { flex: 1 }]}
                          onPress={() => setGHomeAway(ha)}
                          activeOpacity={0.8}
                        >
                          <ThemedText style={[s.haBtnTxt, gHomeAway === ha && { color: '#000' }]}>
                            {ha.charAt(0).toUpperCase() + ha.slice(1)}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <ThemedText style={[s.modalFieldLabel, { marginTop: 14 }]}>LOCATION</ThemedText>
                    <TextInput
                      style={s.modalInput}
                      value={gLoc}
                      onChangeText={(t) => { setLocSaveReady(null); onLocInput(t, 'gLoc'); }}
                      onFocus={() => setLocFor('gLoc')}
                      placeholder="Search venues…"
                      placeholderTextColor={MUTED}
                      autoCapitalize="words"
                    />
                    {loadingLoc && locFor === 'gLoc' && <ActivityIndicator color={TEAL} style={{ marginTop: 6 }} size="small" />}
                    {locFor === 'gLoc' && locSugs.length > 0 && (
                      <View style={s.locDropdown}>
                        {locSugs.map(sug => (
                          <TouchableOpacity key={sug.place_id} style={s.locRow} onPress={() => void pickLocSug(sug, 'gLoc')} activeOpacity={0.8}>
                            <Ionicons name="location-outline" size={13} color={MUTED} />
                            <ThemedText style={s.locTxt} numberOfLines={1}>{sug.description}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {locFor === 'gLoc' && gLoc.length === 0 && savedLocs.length > 0 && (
                      <View style={s.locDropdown}>
                        <ThemedText style={s.locSavedHdr}>SAVED LOCATIONS</ThemedText>
                        {savedLocs.map(loc => (
                          <TouchableOpacity key={loc.id} style={s.locRow} onPress={() => { setGLoc(loc.name); setLocFor(null); }} activeOpacity={0.8}>
                            <Ionicons name="bookmark" size={13} color={TEAL} />
                            <ThemedText style={s.locTxt}>{loc.name}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {locSaveReady?.field === 'gLoc' && (
                      <TouchableOpacity
                        style={s.locSaveBtn}
                        onPress={() => void saveLocToCoachLocs(locSaveReady.name, 'gLoc')}
                        disabled={savingLoc}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="bookmark-outline" size={14} color={TEAL} />
                        <ThemedText style={s.locSaveTxt}>
                          {savingLoc ? 'Saving…' : `Save "${locSaveReady.name}" to My Locations`}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </>
                )}

              </ScrollView>

              {/* Save — pinned below scroll content */}
              <TouchableOpacity
                style={[s.modalSave, { marginTop: 12 }, (
                  eventType === 'practice'
                    ? (!sTitle.trim() || !sDate.trim() || sSaving)
                    : (!gOpponent.trim() || !gDate.trim() || gSaving)
                ) && { opacity: 0.5 }]}
                onPress={() => eventType === 'practice' ? void handleCreateSession() : void handleCreateGame()}
                disabled={eventType === 'practice'
                  ? (!sTitle.trim() || !sDate.trim() || sSaving)
                  : (!gOpponent.trim() || !gDate.trim() || gSaving)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalSaveGrad}>
                  <ThemedText style={s.modalSaveTxt}>
                    {(eventType === 'practice' ? sSaving : gSaving)
                      ? 'Saving…'
                      : eventType === 'practice' ? 'Add Practice' : 'Add Game'}
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Tab: Roster ───────────────────────────────────────────────────────────────
const POSITIONS = ['Forward', 'Defense', 'Goalie'];

function RosterTab({ teamId }: { teamId: string }) {
  const [players,  setPlayers]  = useState<Player[]>([]);
  const [loading,  setLoading]  = useState(true);
  // Add modal
  const [modalOpen, setModal]   = useState(false);
  const [pName,   setPName]     = useState('');
  const [pNum,    setPNum]      = useState('');
  const [pPos,    setPPos]      = useState('Forward');
  const [pEmail,  setPEmail]    = useState('');
  const [saving,  setSaving]    = useState(false);
  // Detail / edit sheet
  const [selPlayer,    setSelPlayer]    = useState<Player | null>(null);
  const [editMode,     setEditMode]     = useState(false);
  const [eName,        setEName]        = useState('');
  const [eNum,         setENum]         = useState('');
  const [ePos,         setEPos]         = useState('Forward');
  const [eEmail,       setEEmail]       = useState('');
  const [editSaving,   setEditSaving]   = useState(false);

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('id, full_name, jersey_number, position, parent_email')
      .eq('team_id', teamId)
      .order('position')
      .order('full_name');
    setPlayers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { if (teamId) loadPlayers(); }, [teamId]);

  function openPlayer(p: Player) {
    setSelPlayer(p);
    setEName(p.full_name);
    setENum(p.jersey_number ?? '');
    setEPos(p.position ?? 'Forward');
    setEEmail(p.parent_email ?? '');
    setEditMode(false);
  }

  async function handleAddPlayer() {
    if (!pName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from('players').insert({
      coach_id:      user.id,
      team_id:       teamId,
      full_name:     pName.trim(),
      jersey_number: pNum.trim() || null,
      position:      pPos,
      parent_email:  pEmail.trim() || null,
    });
    if (!error) {
      setPName(''); setPNum(''); setPPos('Forward'); setPEmail('');
      setModal(false);
      loadPlayers();
    } else {
      Alert.alert('Error', 'Could not add player. Please try again.');
    }
    setSaving(false);
  }

  async function handleSaveEdit() {
    if (!selPlayer || !eName.trim()) return;
    setEditSaving(true);
    const { error } = await supabase.from('players').update({
      full_name:     eName.trim(),
      jersey_number: eNum.trim() || null,
      position:      ePos,
      parent_email:  eEmail.trim() || null,
    }).eq('id', selPlayer.id);
    if (!error) {
      setSelPlayer(null);
      loadPlayers();
    } else {
      Alert.alert('Error', 'Could not update player.');
    }
    setEditSaving(false);
  }

  function handleDeletePlayer() {
    if (!selPlayer) return;
    Alert.alert(`Remove ${selPlayer.full_name}?`, 'This will remove them from the roster.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('players').delete().eq('id', selPlayer.id);
        setSelPlayer(null);
        loadPlayers();
      }},
    ]);
  }

  // Group by position
  const byPosition: Record<string, Player[]> = {};
  for (const p of players) {
    const key = p.position ?? 'Other';
    if (!byPosition[key]) byPosition[key] = [];
    byPosition[key].push(p);
  }

  return (
    <>
      <View style={s.tabHeaderRow}>
        <ThemedText style={s.tabHeaderTitle}>Roster · {players.length}</ThemedText>
        <GradBtn label="+ Add Player" onPress={() => setModal(true)} />
      </View>

      {loading && <ActivityIndicator color={TEAL} style={{ marginTop: 20 }} />}

      {!loading && players.length === 0 && (
        <View style={[s.card, { alignItems: 'center', gap: 8, paddingVertical: 28 }]}>
          <Ionicons name="people-outline" size={28} color={MUTED} />
          <ThemedText style={{ fontSize: 14, color: MUTED }}>No players yet</ThemedText>
          <TouchableOpacity style={[s.card, { margin: 0, paddingHorizontal: 16, paddingVertical: 10, borderColor: TEAL }]} onPress={() => setModal(true)}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: TEAL }}>+ Add first player</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {Object.entries(byPosition).map(([pos, posPlayers]) => (
        <View key={pos}>
          <SectionLabel marginTop={10}>{`${pos.toUpperCase()}S`}</SectionLabel>
          {posPlayers.map(p => (
            <TouchableOpacity key={p.id} style={[s.card, s.playerRow]} activeOpacity={0.8} onPress={() => openPlayer(p)}>
              <View style={s.playerNum}>
                <ThemedText style={s.playerNumTxt}>{p.jersey_number ? `#${p.jersey_number}` : '—'}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.playerName}>{p.full_name}</ThemedText>
                <ThemedText style={s.metaText}>{p.position ?? 'No position'}{p.parent_email ? ' · Parent linked' : ''}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={{ height: 24 }} />

      {/* ── Player Detail / Edit Sheet ── */}
      <Modal visible={!!selPlayer} transparent animationType="slide" onRequestClose={() => setSelPlayer(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setSelPlayer(null)} />
          <View style={s.modalSheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>{editMode ? 'Edit Player' : selPlayer?.full_name ?? ''}</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!editMode && (
                  <TouchableOpacity onPress={() => setEditMode(true)} style={{ padding: 4 }}>
                    <Ionicons name="pencil-outline" size={18} color={TEAL} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setSelPlayer(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              {!editMode ? (
                /* ── View mode ── */
                <>
                  <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 16, margin: 0, marginBottom: 12 }]}>
                    <View style={[s.playerNum, { width: 56, height: 56, borderRadius: 16 }]}>
                      <ThemedText style={[s.playerNumTxt, { fontSize: 18 }]}>
                        {selPlayer?.jersey_number ? `#${selPlayer.jersey_number}` : '—'}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[s.playerName, { fontSize: 18 }]}>{selPlayer?.full_name}</ThemedText>
                      <ThemedText style={s.metaText}>{selPlayer?.position ?? 'No position'}</ThemedText>
                    </View>
                  </View>
                  {selPlayer?.parent_email && (
                    <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 0, marginBottom: 12 }]}>
                      <Ionicons name="person-outline" size={16} color={TEAL} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>PARENT EMAIL</ThemedText>
                        <ThemedText style={{ fontSize: 14, color: TEXT }}>{selPlayer.parent_email}</ThemedText>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity style={{ marginTop: 8, padding: 14, alignItems: 'center' }} onPress={handleDeletePlayer}>
                    <ThemedText style={{ fontSize: 14, color: RED, fontWeight: '600' }}>Remove from roster</ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                /* ── Edit mode ── */
                <>
                  <ThemedText style={s.fieldLabel}>FULL NAME</ThemedText>
                  <TextInput style={s.textInput} value={eName} onChangeText={setEName} placeholder="e.g. Jake Morrison" placeholderTextColor={MUTED} autoCapitalize="words" autoFocus />

                  <ThemedText style={s.fieldLabel}>JERSEY NUMBER</ThemedText>
                  <TextInput style={s.textInput} value={eNum} onChangeText={setENum} placeholder="e.g. 14" placeholderTextColor={MUTED} keyboardType="number-pad" maxLength={2} />

                  <ThemedText style={s.fieldLabel}>POSITION</ThemedText>
                  <View style={s.chipWrap}>
                    {POSITIONS.map(pos => (
                      <TouchableOpacity key={pos} style={[s.chip, ePos === pos && s.chipActive]} onPress={() => setEPos(pos)} activeOpacity={0.8}>
                        <ThemedText style={[s.chipText, ePos === pos && s.chipTextActive]}>{pos}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ThemedText style={s.fieldLabel}>PARENT EMAIL</ThemedText>
                  <TextInput style={s.textInput} value={eEmail} onChangeText={setEEmail} placeholder="parent@email.com" placeholderTextColor={MUTED} keyboardType="email-address" autoCapitalize="none" />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 28 }}>
                    <TouchableOpacity style={[s.saveBtn, { flex: 1, opacity: 0.6 }]} onPress={() => setEditMode(false)} activeOpacity={0.8}>
                      <View style={[s.saveBtnGrad, { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER }]}>
                        <ThemedText style={[s.saveBtnText, { color: MUTED }]}>Cancel</ThemedText>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.saveBtn, { flex: 2 }, (!eName.trim() || editSaving) && s.saveBtnDisabled]}
                      onPress={() => void handleSaveEdit()}
                      disabled={!eName.trim() || editSaving}
                      activeOpacity={0.85}
                    >
                      <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                        {editSaving ? <ActivityIndicator color="#000" size="small" /> : <ThemedText style={s.saveBtnText}>Save Changes</ThemedText>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Player Modal ── */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>Add Player</ThemedText>
              <TouchableOpacity onPress={() => setModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              <ThemedText style={s.fieldLabel}>FULL NAME</ThemedText>
              <TextInput style={s.textInput} value={pName} onChangeText={setPName} placeholder="e.g. Jake Morrison" placeholderTextColor={MUTED} autoCapitalize="words" autoFocus />

              <ThemedText style={s.fieldLabel}>JERSEY NUMBER</ThemedText>
              <TextInput style={s.textInput} value={pNum} onChangeText={setPNum} placeholder="e.g. 14" placeholderTextColor={MUTED} keyboardType="number-pad" maxLength={2} />

              <ThemedText style={s.fieldLabel}>POSITION</ThemedText>
              <View style={s.chipWrap}>
                {POSITIONS.map(pos => (
                  <TouchableOpacity key={pos} style={[s.chip, pPos === pos && s.chipActive]} onPress={() => setPPos(pos)} activeOpacity={0.8}>
                    <ThemedText style={[s.chipText, pPos === pos && s.chipTextActive]}>{pos}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={s.fieldLabel}>PARENT EMAIL <ThemedText style={{ color: MUTED, fontWeight: '400', letterSpacing: 0 }}>(optional — links parent account)</ThemedText></ThemedText>
              <TextInput style={s.textInput} value={pEmail} onChangeText={setPEmail} placeholder="parent@email.com" placeholderTextColor={MUTED} keyboardType="email-address" autoCapitalize="none" />

              <TouchableOpacity
                style={[s.saveBtn, (!pName.trim() || saving) && s.saveBtnDisabled]}
                onPress={handleAddPlayer}
                disabled={!pName.trim() || saving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#000" size="small" /> : <ThemedText style={s.saveBtnText}>Add Player</ThemedText>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Tab: Tournaments ──────────────────────────────────────────────────────────
type TournRow = { id: string; name: string; start_date: string | null; end_date: string | null; location: string | null; status: string | null };

function TournamentsTab({ teamId, coachId, onTournament }: { teamId: string; coachId: string; onTournament: (id: string) => void }) {
  const [active,  setActive]  = useState<TournRow[]>([]);
  const [past,    setPast]    = useState<TournRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [tName,   setTName]   = useState('');
  const [tStart,  setTStart]  = useState('');
  const [tEnd,    setTEnd]    = useState('');
  const [tLoc,    setTLoc]    = useState('');
  const [tSaving, setTSaving] = useState(false);
  // Inline calendar
  const [dpFor,   setDpFor]   = useState<'start'|'end'|null>(null);
  const [dpMonth, setDpMonth] = useState(new Date());

  async function load() {
    if (!coachId) { setLoading(false); return; }
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('tournaments')
      .select('id, name, start_date, end_date, location, status')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false });
    const rows = (data ?? []) as TournRow[];
    setActive(rows.filter(t => !t.end_date || t.end_date >= today));
    setPast(rows.filter(t => t.end_date && t.end_date < today));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [teamId, coachId]);

  function fmtTournDates(t: TournRow): string {
    if (!t.start_date) return '';
    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return t.end_date ? `${fmt(t.start_date)} – ${fmt(t.end_date)}` : fmt(t.start_date);
  }

  function fmtPicked(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function renderCal(field: 'start' | 'end') {
    const y = dpMonth.getFullYear();
    const m = dpMonth.getMonth();
    const daysInM  = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInM }, (_, i) => i + 1)];
    const currentVal = field === 'start' ? tStart : tEnd;
    const setter     = field === 'start' ? setTStart : setTEnd;
    const todayStr   = new Date().toISOString().split('T')[0];
    return (
      <View style={s.calWrap}>
        <View style={s.calNav}>
          <TouchableOpacity onPress={() => { const d = new Date(dpMonth); d.setMonth(d.getMonth()-1); setDpMonth(d); }} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.calMonth}>{dpMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</ThemedText>
          <TouchableOpacity onPress={() => { const d = new Date(dpMonth); d.setMonth(d.getMonth()+1); setDpMonth(d); }} style={{ padding: 6 }}>
            <Ionicons name="chevron-forward" size={18} color={TEXT} />
          </TouchableOpacity>
        </View>
        <View style={s.calDayHdrs}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => (
            <ThemedText key={day} style={s.calDayHdr}>{day}</ThemedText>
          ))}
        </View>
        <View style={s.calGrid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={s.calCell} />;
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isSel   = currentVal === dateStr;
            const isToday = dateStr === todayStr;
            return (
              <TouchableOpacity
                key={i}
                style={[s.calCell, isSel && s.calCellSel, isToday && !isSel && s.calCellToday]}
                onPress={() => { setter(dateStr); setDpFor(null); }}
                activeOpacity={0.8}
              >
                <ThemedText style={[s.calCellTxt, isSel && { color: '#000' }, isToday && !isSel && { color: TEAL }]}>
                  {day}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // Location autocomplete
  const TPLACES_KEY = 'AIzaSyBSC0TcManJa-ssPxot8xoQu9-gqqHJNAU';
  type TLocSug = { place_id: string; description: string };
  const [tLocSugs,    setTLocSugs]    = useState<TLocSug[]>([]);
  const [tLocLoading, setTLocLoading] = useState(false);
  const tLocTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onTLocInput(text: string) {
    setTLoc(text);
    setTLocSugs([]);
    if (text.length < 2) return;
    if (tLocTimer.current) clearTimeout(tLocTimer.current);
    tLocTimer.current = setTimeout(async () => {
      setTLocLoading(true);
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places:autocomplete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': TPLACES_KEY },
          body: JSON.stringify({ input: text }),
        });
        const json = await res.json();
        setTLocSugs((json.suggestions ?? []).map((s: any) => ({
          place_id:    s.placePrediction?.placeId ?? '',
          description: s.placePrediction?.text?.text ?? '',
        })));
      } catch {}
      setTLocLoading(false);
    }, 350);
  }

  function pickTLocSug(sug: TLocSug) {
    setTLoc(sug.description.split(',').slice(0, 2).join(',').trim());
    setTLocSugs([]);
  }

  async function handleAdd() {
    if (!tName.trim()) return;
    setTSaving(true);
    const { error } = await supabase.from('tournaments').insert({
      team_id:    teamId,
      name:       tName.trim(),
      start_date: tStart || null,
      end_date:   tEnd || null,
      location:   tLoc.trim() || null,
    });
    setTSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setTName(''); setTStart(''); setTEnd(''); setTLoc(''); setDpFor(null); setTLocSugs([]);
    setShowAdd(false);
    void load();
  }

  if (loading) return <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />;

  return (
    <>
      <View style={s.tabHeaderRow}>
        <ThemedText style={s.tabHeaderTitle}>Tournaments</ThemedText>
        <GradBtn label="+ Add" onPress={() => setShowAdd(true)} />
      </View>

      <SectionLabel marginTop={4}>ACTIVE</SectionLabel>
      {active.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="trophy-outline" size={28} color={MUTED} style={{ marginBottom: 8 }} />
          <ThemedText style={s.emptyTxt}>No active tournaments</ThemedText>
          <TouchableOpacity style={{ marginTop: 10 }} onPress={() => setShowAdd(true)}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: TEAL }}>+ Register a tournament</ThemedText>
          </TouchableOpacity>
        </View>
      ) : active.map(t => (
        <TouchableOpacity key={t.id} style={s.card} activeOpacity={0.8} onPress={() => onTournament(t.id)}>
          <View style={s.tournTop}>
            <ThemedText style={[s.playerName, { flex: 1, marginRight: 8 }]} numberOfLines={2}>{t.name}</ThemedText>
            <View style={s.regBadge}><ThemedText style={s.regTxt}>REGISTERED</ThemedText></View>
          </View>
          {t.start_date && (
            <View style={s.venueRow}>
              <Ionicons name="calendar-outline" size={13} color={MUTED} />
              <ThemedText style={s.metaText}>{fmtTournDates(t)}</ThemedText>
            </View>
          )}
          {t.location && (
            <View style={s.venueRow}>
              <Ionicons name="location-outline" size={13} color={MUTED} />
              <ThemedText style={s.metaText}>{t.location}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      ))}

      <SectionLabel marginTop={16}>PAST</SectionLabel>
      {past.length === 0 ? (
        <View style={s.emptyCard}>
          <ThemedText style={s.emptyTxt}>No past tournaments</ThemedText>
        </View>
      ) : past.map(t => (
        <TouchableOpacity key={t.id} style={s.card} activeOpacity={0.8} onPress={() => onTournament(t.id)}>
          <ThemedText style={s.playerName} numberOfLines={2}>{t.name}</ThemedText>
          <View style={[s.venueRow, { marginTop: 8 }]}>
            <Ionicons name="calendar-outline" size={13} color={MUTED} />
            <ThemedText style={s.metaText}>{fmtTournDates(t)}</ThemedText>
          </View>
          {t.location && (
            <View style={s.venueRow}>
              <Ionicons name="location-outline" size={13} color={MUTED} />
              <ThemedText style={s.metaText}>{t.location}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      ))}
      <View style={{ height: 24 }} />

      {/* ── Add Tournament Modal ── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
            <TouchableOpacity style={[s.modalSheet, { maxHeight: '92%' }]} activeOpacity={1}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <ThemedText style={s.modalTitle}>Add Tournament</ThemedText>
                <TouchableOpacity onPress={() => setShowAdd(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
                <ThemedText style={s.modalFieldLabel}>TOURNAMENT NAME *</ThemedText>
                <TextInput
                  style={s.modalInput}
                  value={tName}
                  onChangeText={setTName}
                  placeholder="e.g. Whitby Invitational"
                  placeholderTextColor={MUTED}
                  autoCapitalize="words"
                  autoFocus
                />

                <ThemedText style={s.modalFieldLabel}>START DATE</ThemedText>
                <TouchableOpacity
                  style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => { setDpFor(dpFor === 'start' ? null : 'start'); setDpMonth(tStart ? new Date(tStart + 'T00:00:00') : new Date()); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color={tStart ? TEAL : MUTED} />
                  <ThemedText style={{ color: tStart ? TEXT : MUTED, fontSize: 15, flex: 1 }}>
                    {tStart ? fmtPicked(tStart) : 'Select start date'}
                  </ThemedText>
                  <Ionicons name={dpFor === 'start' ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                </TouchableOpacity>
                {dpFor === 'start' && renderCal('start')}

                <ThemedText style={s.modalFieldLabel}>END DATE</ThemedText>
                <TouchableOpacity
                  style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => { setDpFor(dpFor === 'end' ? null : 'end'); setDpMonth(tEnd ? new Date(tEnd + 'T00:00:00') : tStart ? new Date(tStart + 'T00:00:00') : new Date()); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color={tEnd ? TEAL : MUTED} />
                  <ThemedText style={{ color: tEnd ? TEXT : MUTED, fontSize: 15, flex: 1 }}>
                    {tEnd ? fmtPicked(tEnd) : 'Select end date'}
                  </ThemedText>
                  <Ionicons name={dpFor === 'end' ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                </TouchableOpacity>
                {dpFor === 'end' && renderCal('end')}

                <ThemedText style={s.modalFieldLabel}>LOCATION</ThemedText>
                <View style={{ position: 'relative', zIndex: 10 }}>
                  <View style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 0, paddingHorizontal: 14 }]}>
                    <Ionicons name="location-outline" size={16} color={tLoc ? TEAL : MUTED} />
                    <TextInput
                      style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
                      value={tLoc}
                      onChangeText={onTLocInput}
                      placeholder="e.g. Whitby, ON"
                      placeholderTextColor={MUTED}
                      autoCapitalize="words"
                    />
                    {tLocLoading && <ActivityIndicator size="small" color={TEAL} />}
                    {tLoc.length > 0 && !tLocLoading && (
                      <TouchableOpacity onPress={() => { setTLoc(''); setTLocSugs([]); }}>
                        <Ionicons name="close-circle" size={16} color={MUTED} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {tLocSugs.length > 0 && (
                    <View style={s.tLocDropdown}>
                      {tLocSugs.map(sug => (
                        <TouchableOpacity
                          key={sug.place_id}
                          style={s.tLocSugRow}
                          onPress={() => pickTLocSug(sug)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="location-outline" size={14} color={TEAL} style={{ marginTop: 1 }} />
                          <ThemedText style={s.tLocSugTxt} numberOfLines={2}>{sug.description}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[s.modalSave, (!tName.trim() || tSaving) && { opacity: 0.5 }]}
                  onPress={() => void handleAdd()}
                  disabled={!tName.trim() || tSaving}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[TEAL, TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalSaveGrad}>
                    <ThemedText style={s.modalSaveTxt}>{tSaving ? 'Saving…' : 'Add Tournament'}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Team Staff ────────────────────────────────────────────────────────────────
const STAFF_ROLES = [
  { key: 'head_coach',      label: 'Head Coach'    },
  { key: 'assistant_coach', label: 'Asst. Coach'   },
  { key: 'manager',         label: 'Team Manager'  },
  { key: 'safety',          label: 'Safety Person' },
  { key: 'trainer',         label: 'Trainer'       },
  { key: 'other',           label: 'Other'         },
];

type StaffContact = { id: string; name: string; role: string; email: string | null; phone: string | null };

function StaffSection({ teamId, onBack }: { teamId: string; onBack: () => void }) {
  const [staff,    setStaff]    = useState<StaffContact[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [name,     setName]     = useState('');
  const [role,     setRole]     = useState('assistant_coach');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);

  async function load() {
    const { data } = await supabase
      .from('team_staff_contacts')
      .select('id, name, role, email, phone')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    setStaff(data ?? []);
    setLoading(false);
  }

  useEffect(() => { if (teamId) void load(); }, [teamId]);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from('team_staff_contacts').insert({
      team_id: teamId, owner_id: user.id,
      name: name.trim(), role,
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
    if (!error) {
      setName(''); setRole('assistant_coach'); setEmail(''); setPhone('');
      setShowAdd(false);
      void load();
    }
    setSaving(false);
  }

  function handleRemove(sc: StaffContact) {
    Alert.alert(`Remove ${sc.name}?`, 'This will remove them from the team staff list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('team_staff_contacts').delete().eq('id', sc.id);
        void load();
      }},
    ]);
  }

  function roleLabel(key: string) {
    return STAFF_ROLES.find(r => r.key === key)?.label ?? key;
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <>
      <TouchableOpacity style={s.backLink} onPress={onBack}>
        <Ionicons name="chevron-back" size={16} color={TEXT} />
        <ThemedText style={s.backLinkTxt}>More</ThemedText>
      </TouchableOpacity>
      <View style={s.tabHeaderRow}>
        <ThemedText style={s.subTitle}>Team Staff</ThemedText>
        <GradBtn label="+ Add" onPress={() => setShowAdd(true)} />
      </View>
      <ThemedText style={s.subSubtitle}>Coaches, managers & support staff for this team</ThemedText>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
      ) : staff.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="people-circle-outline" size={32} color={MUTED} style={{ marginBottom: 8 }} />
          <ThemedText style={s.emptyTxt}>No staff added yet</ThemedText>
          <ThemedText style={[s.metaText, { textAlign: 'center', marginTop: 4 }]}>
            Add your assistant coach, team manager, safety person and more.
          </ThemedText>
        </View>
      ) : staff.map(person => (
        <TouchableOpacity
          key={person.id}
          style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
          onLongPress={() => handleRemove(person)}
          activeOpacity={0.85}
        >
          <View style={s.staffAvatar}>
            <ThemedText style={s.staffAvatarTxt}>{initials(person.name)}</ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.playerName}>{person.name}</ThemedText>
            <View style={[s.rolePill, { marginTop: 4 }]}>
              <ThemedText style={s.rolePillTxt}>{roleLabel(person.role)}</ThemedText>
            </View>
            {(person.email || person.phone) && (
              <ThemedText style={[s.metaText, { marginTop: 4 }]}>
                {[person.email, person.phone].filter(Boolean).join(' · ')}
              </ThemedText>
            )}
          </View>
          <TouchableOpacity style={{ padding: 4 }} onPress={() => handleRemove(person)}>
            <Ionicons name="trash-outline" size={16} color={MUTED} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      <View style={{ height: 24 }} />

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAdd(false)} />
          <View style={s.modalSheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>Add Staff Member</ThemedText>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              <ThemedText style={s.fieldLabel}>FULL NAME</ThemedText>
              <TextInput style={s.textInput} value={name} onChangeText={setName} placeholder="e.g. Mike Wilson" placeholderTextColor={MUTED} autoCapitalize="words" autoFocus />

              <ThemedText style={s.fieldLabel}>ROLE</ThemedText>
              <View style={s.chipWrap}>
                {STAFF_ROLES.map(r => (
                  <TouchableOpacity key={r.key} style={[s.chip, role === r.key && s.chipActive]} onPress={() => setRole(r.key)} activeOpacity={0.8}>
                    <ThemedText style={[s.chipText, role === r.key && s.chipTextActive]}>{r.label}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={s.fieldLabel}>EMAIL <ThemedText style={{ color: MUTED, fontWeight: '400', letterSpacing: 0 }}>(optional)</ThemedText></ThemedText>
              <TextInput style={s.textInput} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor={MUTED} keyboardType="email-address" autoCapitalize="none" />

              <ThemedText style={s.fieldLabel}>PHONE <ThemedText style={{ color: MUTED, fontWeight: '400', letterSpacing: 0 }}>(optional)</ThemedText></ThemedText>
              <TextInput style={s.textInput} value={phone} onChangeText={setPhone} placeholder="e.g. 555-0123" placeholderTextColor={MUTED} keyboardType="phone-pad" />

              <TouchableOpacity
                style={[s.saveBtn, (!name.trim() || saving) && s.saveBtnDisabled]}
                onPress={() => void handleAdd()}
                disabled={!name.trim() || saving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#000" size="small" /> : <ThemedText style={s.saveBtnText}>Add Staff Member</ThemedText>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Volunteer Positions ───────────────────────────────────────────────────────
type TeamPosition  = { id: string; entity_type: string; entity_id: string; role_name: string; spots_total: number; notes: string | null };
type PositionSignup= { id: string; position_id: string; signup_name: string };
type EventGroup    = { entityType: 'session' | 'game'; entityId: string; label: string; date: string; positions: (TeamPosition & { signups: PositionSignup[] })[] };
type UpcomingEvent = { id: string; label: string; date: string; type: 'session' | 'game' };
type VolDefault    = { id: string; role_name: string; spots_total: number; apply_to: string; is_active: boolean };

const VOLUNTEER_ROLES = ['Clock', 'Scorekeeper', 'Music', 'Bench Helper', 'On-Ice Helper', 'Custom'];
const APPLY_TO_OPTS: { key: 'home_game' | 'all_games' | 'all_practices'; label: string }[] = [
  { key: 'home_game',     label: 'Home Games'  },
  { key: 'all_games',     label: 'All Games'   },
  { key: 'all_practices', label: 'Practices'   },
];

function VolunteersSection({ teamId, coachId, onBack }: { teamId: string; coachId: string; onBack: () => void }) {
  const [groups,       setGroups]       = useState<EventGroup[]>([]);
  const [loading,      setLoading]      = useState(true);
  // Add Position modal
  const [showAdd,      setShowAdd]      = useState(false);
  const [upcomingEvts, setUpcomingEvts] = useState<UpcomingEvent[]>([]);
  const [evtsLoading,  setEvtsLoading]  = useState(false);
  const [selEvent,     setSelEvent]     = useState<UpcomingEvent | null>(null);
  const [selRoles,     setSelRoles]     = useState<string[]>([]);
  const [customRole,   setCustomRole]   = useState('');
  const [spots,        setSpots]        = useState('2');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  // Signup modal
  const [addingSignup, setAddingSignup] = useState<TeamPosition | null>(null);
  const [signupName,   setSignupName]   = useState('');
  // Home Game Defaults
  const [volDefaults,    setVolDefaults]    = useState<VolDefault[]>([]);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [showAddDef,     setShowAddDef]     = useState(false);
  const [defSelRoles,    setDefSelRoles]    = useState<string[]>([]);
  const [defCustomRole,  setDefCustomRole]  = useState('');
  const [defSpots,       setDefSpots]       = useState('1');
  const [defApplyTo,     setDefApplyTo]     = useState<'home_game'|'all_games'|'all_practices'>('home_game');
  const [defSaving,      setDefSaving]      = useState(false);

  async function load() {
    const { data: positions } = await supabase
      .from('team_positions')
      .select('id, entity_type, entity_id, role_name, spots_total, notes')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (!positions || positions.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const posIds     = positions.map((p: any) => p.id);
    const sessionIds = positions.filter((p: any) => p.entity_type === 'session').map((p: any) => p.entity_id);
    const gameIds    = positions.filter((p: any) => p.entity_type === 'game').map((p: any) => p.entity_id);

    const [{ data: signups }, { data: sessions }, { data: games }] = await Promise.all([
      supabase.from('position_signups').select('id, position_id, signup_name').in('position_id', posIds),
      sessionIds.length > 0
        ? supabase.from('sessions').select('id, title, date').in('id', sessionIds)
        : Promise.resolve({ data: [] as any[] }),
      gameIds.length > 0
        ? supabase.from('games').select('id, opponent, game_date').in('id', gameIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const entityMap: Record<string, { label: string; date: string }> = {};
    (sessions ?? []).forEach((s: any) => { entityMap[s.id] = { label: s.title, date: s.date }; });
    (games ?? []).forEach((g: any) => { entityMap[g.id] = { label: `vs. ${g.opponent}`, date: g.game_date }; });

    const signupMap: Record<string, PositionSignup[]> = {};
    (signups ?? []).forEach((sig: any) => {
      if (!signupMap[sig.position_id]) signupMap[sig.position_id] = [];
      signupMap[sig.position_id].push(sig);
    });

    const groupMap: Record<string, EventGroup> = {};
    (positions as any[]).forEach(pos => {
      const info = entityMap[pos.entity_id] ?? { label: 'Unknown Event', date: '' };
      if (!groupMap[pos.entity_id]) {
        groupMap[pos.entity_id] = { entityType: pos.entity_type, entityId: pos.entity_id, label: info.label, date: info.date, positions: [] };
      }
      groupMap[pos.entity_id].positions.push({ ...pos, signups: signupMap[pos.id] ?? [] });
    });

    setGroups(Object.values(groupMap).sort((a, b) => a.date.localeCompare(b.date)));
    setLoading(false);
  }

  async function loadDefaults() {
    const { data } = await supabase
      .from('team_volunteer_defaults')
      .select('id, role_name, spots_total, apply_to, is_active')
      .eq('team_id', teamId)
      .order('sort_order', { ascending: true });
    setVolDefaults(data ?? []);
    setDefaultsLoaded(true);
  }

  async function loadUpcoming() {
    setEvtsLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: sess }, { data: gms }] = await Promise.all([
      supabase.from('sessions').select('id, title, date').eq('coach_id', coachId).gte('date', today).order('date').limit(15),
      supabase.from('games').select('id, opponent, game_date').eq('coach_id', coachId).gte('game_date', today).order('game_date').limit(15),
    ]);
    const evts: UpcomingEvent[] = [
      ...(sess ?? []).map((s: any) => ({ id: s.id, label: s.title, date: s.date, type: 'session' as const })),
      ...(gms ?? []).map((g: any) => ({ id: g.id, label: `vs. ${g.opponent}`, date: g.game_date, type: 'game' as const })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    setUpcomingEvts(evts);
    setEvtsLoading(false);
  }

  useEffect(() => { if (teamId) { void load(); void loadDefaults(); } }, [teamId]);

  // ── Add Position ────────────────────────────────────────────────────────────
  function closeAdd() {
    setShowAdd(false); setSelEvent(null); setSelRoles([]); setCustomRole(''); setSpots('2'); setNotes('');
  }

  async function handleAddPosition() {
    if (!selEvent || selRoles.length === 0) return;
    const rolesToCreate: string[] = selRoles.flatMap(r =>
      r === 'Custom' ? (customRole.trim() ? [customRole.trim()] : []) : [r]
    );
    if (rolesToCreate.length === 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const rows = rolesToCreate.map(r => ({
      team_id: teamId, owner_id: user.id,
      entity_type: selEvent.type, entity_id: selEvent.id,
      role_name: r,
      spots_total: parseInt(spots, 10) || 1,
      notes: notes.trim() || null,
    }));
    const { error } = await supabase.from('team_positions').insert(rows);
    if (!error) { closeAdd(); void load(); }
    setSaving(false);
  }

  // ── Delete Position ─────────────────────────────────────────────────────────
  async function handleDeletePosition(posId: string) {
    Alert.alert('Delete Position?', 'This will remove all signups too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('team_positions').delete().eq('id', posId);
        void load();
      }},
    ]);
  }

  // ── Signup ──────────────────────────────────────────────────────────────────
  async function handleAddSignup() {
    if (!addingSignup || !signupName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('position_signups').insert({
      position_id: addingSignup.id,
      team_id: teamId,
      signup_name: signupName.trim(),
    });
    setAddingSignup(null);
    setSignupName('');
    void load();
  }

  async function handleRemoveSignup(signupId: string) {
    await supabase.from('position_signups').delete().eq('id', signupId);
    void load();
  }

  // ── Home Game Defaults ──────────────────────────────────────────────────────
  async function handleAddDefault() {
    const rolesToCreate: string[] = defSelRoles.flatMap(r =>
      r === 'Custom' ? (defCustomRole.trim() ? [defCustomRole.trim()] : []) : [r]
    );
    if (rolesToCreate.length === 0) return;
    setDefSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDefSaving(false); return; }
    const rows = rolesToCreate.map((r, i) => ({
      team_id: teamId, owner_id: user.id,
      role_name: r, spots_total: parseInt(defSpots, 10) || 1,
      apply_to: defApplyTo, is_active: true, sort_order: i,
    }));
    await supabase.from('team_volunteer_defaults').insert(rows);
    setShowAddDef(false); setDefSelRoles([]); setDefCustomRole(''); setDefSpots('1'); setDefApplyTo('home_game');
    void loadDefaults();
    setDefSaving(false);
  }

  async function handleToggleDefault(defId: string, current: boolean) {
    await supabase.from('team_volunteer_defaults').update({ is_active: !current }).eq('id', defId);
    void loadDefaults();
  }

  async function handleDeleteDefault(defId: string) {
    Alert.alert('Remove Default?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('team_volunteer_defaults').delete().eq('id', defId);
        void loadDefaults();
      }},
    ]);
  }

  function applyToLabel(key: string): string {
    return APPLY_TO_OPTS.find(o => o.key === key)?.label ?? key;
  }

  function fmtDate(d: string) {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const addCanSave = selEvent && selRoles.length > 0 && (selRoles.includes('Custom') ? customRole.trim().length > 0 : true);
  const defCanSave = defSelRoles.length > 0 && (defSelRoles.includes('Custom') ? defCustomRole.trim().length > 0 : true);

  return (
    <>
      <TouchableOpacity style={s.backLink} onPress={onBack}>
        <Ionicons name="chevron-back" size={16} color={TEXT} />
        <ThemedText style={s.backLinkTxt}>More</ThemedText>
      </TouchableOpacity>
      <View style={s.tabHeaderRow}>
        <ThemedText style={s.subTitle}>Volunteers</ThemedText>
        <GradBtn label="+ Position" onPress={() => { setShowAdd(true); void loadUpcoming(); }} />
      </View>
      <ThemedText style={s.subSubtitle}>Post open roles for practices and games — parents sign up</ThemedText>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="hand-left-outline" size={32} color={MUTED} style={{ marginBottom: 8 }} />
          <ThemedText style={s.emptyTxt}>No volunteer positions yet</ThemedText>
          <ThemedText style={[s.metaText, { textAlign: 'center', marginTop: 4 }]}>
            Tap "+ Position" to add roles like "On-Ice Helper" or "Scorekeeper" to upcoming events.
          </ThemedText>
        </View>
      ) : groups.map(group => (
        <View key={group.entityId} style={{ marginBottom: 4 }}>
          <View style={s.volEventHdr}>
            <View style={[s.rolePill, { backgroundColor: group.entityType === 'game' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)' }]}>
              <ThemedText style={[s.rolePillTxt, { color: group.entityType === 'game' ? ORANGE : '#8B5CF6' }]}>
                {group.entityType === 'game' ? 'GAME' : 'PRACTICE'}
              </ThemedText>
            </View>
            <ThemedText style={s.volEventTitle}>{group.label}</ThemedText>
            <ThemedText style={s.metaText}>{fmtDate(group.date)}</ThemedText>
          </View>

          {group.positions.map(pos => {
            const filled = pos.signups.length;
            const open   = pos.spots_total - filled;
            const isFull = open <= 0;
            return (
              <View key={pos.id} style={s.volCard}>
                <View style={s.volCardTop}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.volRoleName}>{pos.role_name}</ThemedText>
                    <ThemedText style={[s.metaText, { color: isFull ? GREEN : ORANGE, marginTop: 2 }]}>
                      {isFull ? `Full · ${filled}/${pos.spots_total}` : `${open} spot${open !== 1 ? 's' : ''} open · ${filled}/${pos.spots_total}`}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {!isFull && (
                      <TouchableOpacity style={s.volAddBtn} onPress={() => { setAddingSignup(pos); setSignupName(''); }}>
                        <Ionicons name="person-add-outline" size={14} color={TEAL} />
                        <ThemedText style={s.volAddBtnTxt}>Add</ThemedText>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={{ padding: 4 }} onPress={() => void handleDeletePosition(pos.id)}>
                      <Ionicons name="trash-outline" size={14} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                </View>
                {pos.notes ? <ThemedText style={[s.metaText, { marginTop: 4, fontStyle: 'italic' }]}>{pos.notes}</ThemedText> : null}
                {pos.signups.length > 0 && (
                  <View style={s.signupList}>
                    {pos.signups.map((sig, i) => (
                      <View key={sig.id} style={[s.signupRow, i < pos.signups.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }]}>
                        <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                        <ThemedText style={s.signupName}>{sig.signup_name}</ThemedText>
                        <TouchableOpacity onPress={() => void handleRemoveSignup(sig.id)} style={{ marginLeft: 'auto' }}>
                          <Ionicons name="close-circle-outline" size={16} color={MUTED} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* ── Home Game Defaults ──────────────────────────────────────────────── */}
      <View style={s.defaultsSection}>
        <View style={[s.tabHeaderRow, { paddingHorizontal: 0, paddingTop: 0 }]}>
          <View>
            <ThemedText style={s.sectionLabel}>DEFAULTS</ThemedText>
            <ThemedText style={[s.metaText, { marginTop: 2 }]}>Auto-posted when a game or practice is created</ThemedText>
          </View>
          <TouchableOpacity style={s.volAddBtn} onPress={() => setShowAddDef(true)}>
            <Ionicons name="add" size={14} color={TEAL} />
            <ThemedText style={s.volAddBtnTxt}>Add</ThemedText>
          </TouchableOpacity>
        </View>

        {!defaultsLoaded ? (
          <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} />
        ) : volDefaults.length === 0 ? (
          <View style={[s.emptyCard, { marginHorizontal: 0, marginTop: 8 }]}>
            <ThemedText style={s.emptyTxt}>No defaults set</ThemedText>
            <ThemedText style={[s.metaText, { textAlign: 'center', marginTop: 4 }]}>
              Add defaults like "Clocker · Home Games" to auto-post slots every time you create a home game.
            </ThemedText>
          </View>
        ) : volDefaults.map(def => (
          <View key={def.id} style={s.defRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[s.playerName, { fontSize: 14, opacity: def.is_active ? 1 : 0.45 }]}>
                {def.role_name}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <View style={[s.rolePill, { backgroundColor: 'rgba(0,196,180,0.1)' }]}>
                  <ThemedText style={s.rolePillTxt}>{applyToLabel(def.apply_to)}</ThemedText>
                </View>
                <ThemedText style={s.metaText}>{def.spots_total} spot{def.spots_total !== 1 ? 's' : ''}</ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                style={[s.defToggle, def.is_active && s.defToggleOn]}
                onPress={() => void handleToggleDefault(def.id, def.is_active)}
              >
                <ThemedText style={[s.defToggleTxt, def.is_active && s.defToggleTxtOn]}>
                  {def.is_active ? 'ON' : 'OFF'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleDeleteDefault(def.id)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={14} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />

      {/* ── Add Position Modal ──────────────────────────────────────────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={closeAdd}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeAdd} />
          <View style={[s.modalSheet, { maxHeight: '92%' }]}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>Add Position</ThemedText>
              <TouchableOpacity onPress={closeAdd} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              <ThemedText style={s.fieldLabel}>EVENT</ThemedText>
              {evtsLoading ? (
                <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} />
              ) : upcomingEvts.length === 0 ? (
                <ThemedText style={[s.metaText, { marginBottom: 8 }]}>No upcoming sessions or games found.</ThemedText>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                    {upcomingEvts.map(evt => (
                      <TouchableOpacity
                        key={evt.id}
                        style={[s.eventPickerChip, selEvent?.id === evt.id && s.eventPickerChipOn]}
                        onPress={() => setSelEvent(evt)}
                        activeOpacity={0.8}
                      >
                        <View style={[s.rolePill, { backgroundColor: evt.type === 'game' ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.2)', marginBottom: 4 }]}>
                          <ThemedText style={[s.rolePillTxt, { color: evt.type === 'game' ? ORANGE : '#8B5CF6', fontSize: 9 }]}>
                            {evt.type === 'game' ? 'GAME' : 'PRACTICE'}
                          </ThemedText>
                        </View>
                        <ThemedText style={[s.chipText, selEvent?.id === evt.id && { color: TEXT }]} numberOfLines={1}>{evt.label}</ThemedText>
                        <ThemedText style={[s.metaText, { fontSize: 11, marginTop: 2 }]}>{fmtDate(evt.date)}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              <ThemedText style={s.fieldLabel}>ROLE — select all that apply</ThemedText>
              <View style={s.chipWrap}>
                {VOLUNTEER_ROLES.map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[s.chip, selRoles.includes(role) && s.chipActive]}
                    onPress={() => setSelRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[s.chipText, selRoles.includes(role) && s.chipTextActive]}>{role}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {selRoles.includes('Custom') && (
                <>
                  <ThemedText style={s.fieldLabel}>CUSTOM ROLE NAME</ThemedText>
                  <TextInput style={s.textInput} value={customRole} onChangeText={setCustomRole} placeholder="e.g. Water Bottle Helper" placeholderTextColor={MUTED} autoCapitalize="words" />
                </>
              )}

              <ThemedText style={s.fieldLabel}>SPOTS PER ROLE</ThemedText>
              <View style={s.chipWrap}>
                {['1','2','3','4','5'].map(n => (
                  <TouchableOpacity key={n} style={[s.chip, spots === n && s.chipActive]} onPress={() => setSpots(n)} activeOpacity={0.8}>
                    <ThemedText style={[s.chipText, spots === n && s.chipTextActive]}>{n}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={s.fieldLabel}>NOTES <ThemedText style={{ color: MUTED, fontWeight: '400', letterSpacing: 0 }}>(optional)</ThemedText></ThemedText>
              <TextInput style={s.textInput} value={notes} onChangeText={setNotes} placeholder="e.g. Must arrive 30 min early" placeholderTextColor={MUTED} autoCapitalize="sentences" />

              <TouchableOpacity
                style={[s.saveBtn, (!addCanSave || saving) && s.saveBtnDisabled]}
                onPress={() => void handleAddPosition()}
                disabled={!addCanSave || saving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#000" size="small" /> : (
                    <ThemedText style={s.saveBtnText}>
                      {selRoles.length > 1 ? `Add ${selRoles.length} Positions` : 'Add Position'}
                    </ThemedText>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Default Modal ───────────────────────────────────────────────── */}
      <Modal visible={showAddDef} transparent animationType="slide" onRequestClose={() => setShowAddDef(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAddDef(false)} />
          <View style={[s.modalSheet, { maxHeight: '85%' }]}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>Add Default</ThemedText>
              <TouchableOpacity onPress={() => setShowAddDef(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              <ThemedText style={s.fieldLabel}>ROLE — select all that apply</ThemedText>
              <View style={s.chipWrap}>
                {VOLUNTEER_ROLES.map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[s.chip, defSelRoles.includes(role) && s.chipActive]}
                    onPress={() => setDefSelRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[s.chipText, defSelRoles.includes(role) && s.chipTextActive]}>{role}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {defSelRoles.includes('Custom') && (
                <>
                  <ThemedText style={s.fieldLabel}>CUSTOM ROLE NAME</ThemedText>
                  <TextInput style={s.textInput} value={defCustomRole} onChangeText={setDefCustomRole} placeholder="e.g. Water Bottle Helper" placeholderTextColor={MUTED} autoCapitalize="words" />
                </>
              )}

              <ThemedText style={s.fieldLabel}>SPOTS PER ROLE</ThemedText>
              <View style={s.chipWrap}>
                {['1','2','3','4','5'].map(n => (
                  <TouchableOpacity key={n} style={[s.chip, defSpots === n && s.chipActive]} onPress={() => setDefSpots(n)} activeOpacity={0.8}>
                    <ThemedText style={[s.chipText, defSpots === n && s.chipTextActive]}>{n}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={s.fieldLabel}>APPLY TO</ThemedText>
              <View style={s.chipWrap}>
                {APPLY_TO_OPTS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.chip, defApplyTo === opt.key && s.chipActive]}
                    onPress={() => setDefApplyTo(opt.key)}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[s.chipText, defApplyTo === opt.key && s.chipTextActive]}>{opt.label}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.saveBtn, (!defCanSave || defSaving) && s.saveBtnDisabled]}
                onPress={() => void handleAddDefault()}
                disabled={!defCanSave || defSaving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                  {defSaving ? <ActivityIndicator color="#000" size="small" /> : <ThemedText style={s.saveBtnText}>Save Default</ThemedText>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Signup Modal ────────────────────────────────────────────────── */}
      <Modal visible={!!addingSignup} transparent animationType="fade" onRequestClose={() => setAddingSignup(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setAddingSignup(null)} />
          <View style={[s.modalSheet, { maxHeight: 300 }]}>
            <View style={s.handle} />
            <ThemedText style={[s.modalTitle, { marginBottom: 4 }]}>Add Volunteer</ThemedText>
            <ThemedText style={[s.metaText, { marginBottom: 16 }]}>for: {addingSignup?.role_name}</ThemedText>
            <TextInput
              style={[s.textInput, { marginBottom: 16 }]}
              value={signupName}
              onChangeText={setSignupName}
              placeholder="Parent / volunteer name"
              placeholderTextColor={MUTED}
              autoCapitalize="words"
              autoFocus
            />
            <TouchableOpacity
              style={[s.saveBtn, !signupName.trim() && s.saveBtnDisabled]}
              onPress={() => void handleAddSignup()}
              disabled={!signupName.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                <ThemedText style={s.saveBtnText}>Confirm</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Tab: More ─────────────────────────────────────────────────────────────────
type PracticePlanRow = { id: string; title: string; date: string; time: string | null; location: string | null };

type GameRecord = { wins: number; losses: number; ties: number; gp: number; gf: number; ga: number };

function MoreTab({ coachId, teamId }: { coachId: string; teamId: string; staffCount?: number; }) {
  const router = useRouter();
  const [section, setSection] = useState<MoreSection>(null);
  const [planSessions, setPlanSessions] = useState<PracticePlanRow[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [gameRecord, setGameRecord] = useState<GameRecord | null>(null);
  const [filmClips, setFilmClips] = useState<{ id: string; title: string | null; created_at: string | null }[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  useEffect(() => {
    if (!coachId) return;
    setPlansLoading(true);
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('sessions')
        .select('id, title, date, time, location')
        .eq('coach_id', coachId)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(20);
      setPlanSessions((data ?? []) as PracticePlanRow[]);
      setPlansLoading(false);
    })();
  }, [coachId]);

  useEffect(() => {
    if (!coachId || !teamId) return;
    void (async () => {
      const { data } = await supabase
        .from('games')
        .select('home_away, home_score, away_score, status')
        .eq('coach_id', coachId)
        .eq('team_id', teamId)
        .eq('status', 'final');
      const rec: GameRecord = { wins: 0, losses: 0, ties: 0, gp: 0, gf: 0, ga: 0 };
      (data ?? []).forEach((g: any) => {
        const mine  = g.home_away === 'home' ? (g.home_score ?? 0) : (g.away_score ?? 0);
        const their = g.home_away === 'home' ? (g.away_score ?? 0) : (g.home_score ?? 0);
        rec.gp++; rec.gf += mine; rec.ga += their;
        if (mine > their) rec.wins++;
        else if (mine < their) rec.losses++;
        else rec.ties++;
      });
      setGameRecord(rec);
    })();
  }, [coachId, teamId]);

  useEffect(() => {
    if (section !== 'media' || !coachId || mediaLoaded) return;
    void (async () => {
      const { data } = await supabase
        .from('clips')
        .select('id, notes, category, created_at')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(12);
      setFilmClips((data ?? []).map((c: any) => ({ id: c.id, title: c.notes || c.category || 'Clip', created_at: c.created_at })));
      setMediaLoaded(true);
    })();
  }, [section, coachId]);

  // ── Ice state ───────────────────────────────────────────────────────────────
  type IceSlotRow = { id: string; slot_date: string; start_time: string; end_time: string; notes: string | null };
  const [iceSlots,      setIceSlots]      = useState<IceSlotRow[]>([]);
  const [iceCount,      setIceCount]      = useState(0);
  const [iceLoaded,     setIceLoaded]     = useState(false);
  const [showAddIce,    setShowAddIce]    = useState(false);
  const [iceDate,       setIceDate]       = useState('');
  const [iceStart,      setIceStart]      = useState('09:00');
  const [iceEnd,        setIceEnd]        = useState('10:00');
  const [iceRink,       setIceRink]       = useState('');
  const [iceSaving,     setIceSaving]     = useState(false);
  const [iceDpOpen,     setIceDpOpen]     = useState(false);
  const [iceDpMonth,    setIceDpMonth]    = useState(new Date());
  // AI import
  type ParsedSlotTeam = { date: string; start_time: string; end_time: string; rink_name: string | null; _removed: boolean };
  const [teamAiState,   setTeamAiState]   = useState<'idle' | 'parsing' | 'preview'>('idle');
  const [teamAiSlots,   setTeamAiSlots]   = useState<ParsedSlotTeam[]>([]);
  const [teamAiRink,    setTeamAiRink]    = useState('');
  const [teamAiSaving,  setTeamAiSaving]  = useState(false);

  // preload ice count for menu subtitle
  useEffect(() => {
    if (!coachId || !teamId) return;
    const today = new Date().toISOString().slice(0, 10);
    void supabase
      .from('ice_slots')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('team_id', teamId)
      .eq('pool_type', 'team')
      .gte('slot_date', today)
      .then(({ count }) => { if (count) setIceCount(count); });
  }, [coachId, teamId]);

  useEffect(() => {
    if (section !== 'ice' || iceLoaded || !coachId || !teamId) return;
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('ice_slots')
        .select('id, slot_date, start_time, end_time, notes')
        .eq('coach_id', coachId)
        .eq('team_id', teamId)
        .eq('pool_type', 'team')
        .gte('slot_date', today)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });
      setIceSlots((data ?? []) as IceSlotRow[]);
      setIceLoaded(true);
    })();
  }, [section, coachId, teamId, iceLoaded]);

  async function handleAddIceSlot() {
    if (!iceDate || !coachId || !teamId) return;
    setIceSaving(true);
    const { data, error } = await supabase.from('ice_slots').insert({
      coach_id: coachId,
      team_id: teamId,
      pool_type: 'team',
      slot_date: iceDate,
      start_time: iceStart,
      end_time: iceEnd,
      notes: iceRink.trim() || null,
    }).select('id, slot_date, start_time, end_time, notes').single();
    setIceSaving(false);
    if (!error && data) {
      setIceSlots(prev => [...prev, data as IceSlotRow].sort((a, b) => a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)));
      setIceCount(c => c + 1);
      setShowAddIce(false);
      setIceDate(''); setIceRink(''); setIceStart('09:00'); setIceEnd('10:00');
    } else if (error) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDeleteIceSlot(slotId: string) {
    Alert.alert('Remove Ice Slot', 'Remove this ice slot from the team?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('ice_slots').delete().eq('id', slotId);
        setIceSlots(prev => prev.filter(s => s.id !== slotId));
        setIceCount(c => Math.max(0, c - 1));
      }},
    ]);
  }

  function fmtIceTime(t: string): string {
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(isNaN(m) ? 0 : m).padStart(2, '0')} ${ampm}`;
  }

  function fmtIceDate(d: string): string {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  async function teamAiParseImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.85 });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setTeamAiState('parsing');
    try {
      const { data, error } = await supabase.functions.invoke('parse-ice-contract', {
        body: { imageBase64: result.assets[0].base64, mediaType: 'image/jpeg' },
      });
      if (error || !data?.slots?.length) {
        setTeamAiState('idle');
        let msg = error?.message ?? 'No slots found.';
        try { const ctx = (error as any)?.context; if (ctx?.json) { const b = await ctx.json(); msg = b?.detail ?? b?.error ?? msg; } } catch {}
        Alert.alert('Parsing failed', String(msg).slice(0, 300));
        return;
      }
      setTeamAiSlots(data.slots.map((s: any) => ({ ...s, _removed: false })));
      setTeamAiRink(data.rink_name ?? '');
      setTeamAiState('preview');
    } catch (e: any) {
      setTeamAiState('idle');
      Alert.alert('Error', e?.message ?? 'Unexpected error');
    }
  }

  async function teamAiSaveSlots() {
    const keep = teamAiSlots.filter(s => !s._removed);
    if (!keep.length || !coachId || !teamId) return;
    setTeamAiSaving(true);
    const rows = keep.map(s => ({
      coach_id:  coachId,
      team_id:   teamId,
      pool_type: 'team' as const,
      slot_date: s.date,
      start_time: s.start_time,
      end_time:   s.end_time,
      notes:      s.rink_name ?? teamAiRink ?? null,
    }));
    const { error } = await supabase.from('ice_slots').insert(rows);
    setTeamAiSaving(false);
    if (error) { Alert.alert('Save failed', error.message); return; }
    // Refresh ice list
    setIceLoaded(false);
    setIceCount(c => c + keep.length);
    setTeamAiState('idle');
    setTeamAiSlots([]);
    setTeamAiRink('');
    Alert.alert('Done!', `${keep.length} slot${keep.length !== 1 ? 's' : ''} added to the team.`);
  }

  function fmtPlanDate(date: string): string {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  // ── Stats sub-view ─────────────────────────────────────────────────────────
  if (section === 'stats') {
    return (
      <>
        <TouchableOpacity style={s.backLink} onPress={() => setSection(null)}>
          <Ionicons name="chevron-back" size={16} color={TEXT} />
          <ThemedText style={s.backLinkTxt}>More</ThemedText>
        </TouchableOpacity>
        <ThemedText style={s.subTitle}>Team Stats</ThemedText>

        <TouchableOpacity style={s.outlineBtn}>
          <ThemedText style={s.outlineBtnTxt}>Enter Game Stats</ThemedText>
        </TouchableOpacity>

        <View style={s.statGameFilter}>
          {['All Games', 'Home', 'Away'].map((f, i) => (
            <TouchableOpacity key={f} style={[s.statGameBtn, i === 0 && s.statGameBtnOn]}>
              <ThemedText style={[s.statGameTxt, i === 0 && s.statGameTxtOn]}>{f}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.card}>
          <ThemedText style={s.miniLabel}>SEASON RECORD</ThemedText>
          {gameRecord === null ? (
            <ActivityIndicator color={TEAL} style={{ marginVertical: 8 }} />
          ) : gameRecord.gp === 0 ? (
            <ThemedText style={s.metaText}>No final games recorded yet</ThemedText>
          ) : (
            <>
              <ThemedText style={s.bigScore}>{gameRecord.wins}W · {gameRecord.losses}L · {gameRecord.ties}T</ThemedText>
              <ThemedText style={s.metaText}>
                {gameRecord.gp} GP · GF {gameRecord.gf} · GA {gameRecord.ga} · DIFF {gameRecord.gf - gameRecord.ga >= 0 ? '+' : ''}{gameRecord.gf - gameRecord.ga}
              </ThemedText>
            </>
          )}
        </View>

        <View style={[s.tabHeaderRow, { marginTop: 14 }]}>
          <ThemedText style={s.tabHeaderTitle}>Skaters</ThemedText>
        </View>

        <View style={s.emptyCard}>
          <Ionicons name="stats-chart-outline" size={28} color={MUTED} style={{ marginBottom: 6 }} />
          <ThemedText style={s.emptyTxt}>Per-player stats coming soon</ThemedText>
          <ThemedText style={[s.metaText, { textAlign: 'center', marginTop: 4 }]}>
            Individual G / A / PTS tracking will be available in the next update
          </ThemedText>
        </View>
        <View style={{ height: 24 }} />
      </>
    );
  }

  // ── Media sub-view ─────────────────────────────────────────────────────────
  if (section === 'media') {
    return (
      <>
        <TouchableOpacity style={s.backLink} onPress={() => setSection(null)}>
          <Ionicons name="chevron-back" size={16} color={TEXT} />
          <ThemedText style={s.backLinkTxt}>More</ThemedText>
        </TouchableOpacity>
        <View style={s.tabHeaderRow}>
          <ThemedText style={s.subTitle}>Media</ThemedText>
          <GradBtn label="+ Record" onPress={() => router.push('/record' as any)} />
        </View>

        <SectionRow label="FILM" />
        {!mediaLoaded ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 20 }} />
        ) : filmClips.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="videocam-outline" size={28} color={MUTED} style={{ marginBottom: 6 }} />
            <ThemedText style={s.emptyTxt}>No film clips yet</ThemedText>
            <ThemedText style={[s.metaText, { textAlign: 'center', marginTop: 4 }]}>Record from the Film tab to add clips</ThemedText>
          </View>
        ) : (
          <View style={s.mediaGrid}>
            {filmClips.map(clip => (
              <TouchableOpacity key={clip.id} style={s.mediaTile} activeOpacity={0.8}>
                <View style={s.mediaTileThumb}>
                  <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.7)" />
                </View>
                <ThemedText style={s.mediaTileLabel} numberOfLines={1}>{clip.title ?? 'Untitled clip'}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 24 }} />
      </>
    );
  }

  // ── Payments sub-view ──────────────────────────────────────────────────────
  if (section === 'payments') {
    return (
      <>
        <TouchableOpacity style={s.backLink} onPress={() => setSection(null)}>
          <Ionicons name="chevron-back" size={16} color={TEXT} />
          <ThemedText style={s.backLinkTxt}>More</ThemedText>
        </TouchableOpacity>
        <ThemedText style={s.subTitle}>Payments</ThemedText>
        <ThemedText style={s.subSubtitle}>Team-level payment tracking — manage camps & fees in Financials</ThemedText>
        <View style={s.emptyCard}>
          <Ionicons name="cash-outline" size={32} color={MUTED} style={{ marginBottom: 8 }} />
          <ThemedText style={s.emptyTxt}>Team payment tracking coming soon</ThemedText>
          <ThemedText style={[s.metaText, { textAlign: 'center', marginTop: 4 }]}>
            Track camp registrations and outstanding balances from the Financials tab
          </ThemedText>
        </View>
        <View style={{ height: 24 }} />
      </>
    );
  }

  // ── Staff sub-view ─────────────────────────────────────────────────────────
  if (section === 'staff') {
    return <StaffSection teamId={teamId} onBack={() => setSection(null)} />;
  }

  // ── Volunteers sub-view ────────────────────────────────────────────────────
  if (section === 'volunteers') {
    return <VolunteersSection teamId={teamId} coachId={coachId} onBack={() => setSection(null)} />;
  }

  // ── Practice Plans sub-view ────────────────────────────────────────────────
  if (section === 'practice-plans') {
    return (
      <>
        <TouchableOpacity style={s.backLink} onPress={() => setSection(null)}>
          <Ionicons name="chevron-back" size={16} color={TEXT} />
          <ThemedText style={s.backLinkTxt}>More</ThemedText>
        </TouchableOpacity>
        <ThemedText style={s.subTitle}>Practice Plans</ThemedText>
        <ThemedText style={s.subSubtitle}>Upcoming sessions — tap to build a plan</ThemedText>

        {plansLoading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
        ) : planSessions.length === 0 ? (
          <View style={s.emptyCard}>
            <ThemedText style={s.emptyTxt}>No upcoming sessions</ThemedText>
          </View>
        ) : planSessions.map(p => (
          <TouchableOpacity key={p.id} style={[s.card, s.planRow]} onPress={() => router.push(`/session/${p.id}` as any)} activeOpacity={0.85}>
            <View style={s.planIcon}>
              <Ionicons name="time-outline" size={22} color={TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.playerName}>{p.title}</ThemedText>
              <ThemedText style={s.metaText}>{fmtPlanDate(p.date)}{p.time ? ` · ${p.time.slice(0, 5)}` : ''}</ThemedText>
              {p.location && <ThemedText style={s.metaText}>📍 {p.location}</ThemedText>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 24 }} />
      </>
    );
  }

  // ── Ice sub-view ──────────────────────────────────────────────────────────
  if (section === 'ice') {

    // ── AI preview mode ──
    if (teamAiState === 'preview') {
      const kept = teamAiSlots.filter(s => !s._removed).length;
      return (
        <>
          <View style={s.backLinkRow}>
            <TouchableOpacity style={s.backLink} onPress={() => { setTeamAiState('idle'); setTeamAiSlots([]); }}>
              <Ionicons name="chevron-back" size={16} color={TEXT} />
              <ThemedText style={s.backLinkTxt}>Start over</ThemedText>
            </TouchableOpacity>
          </View>
          <ThemedText style={s.subTitle}>Review Slots</ThemedText>
          {teamAiRink ? (
            <ThemedText style={{ fontSize: 13, color: MUTED, paddingHorizontal: 16, marginBottom: 12, marginTop: -8 }}>
              {teamAiRink} · {kept} of {teamAiSlots.length} selected
            </ThemedText>
          ) : (
            <ThemedText style={{ fontSize: 13, color: MUTED, paddingHorizontal: 16, marginBottom: 12, marginTop: -8 }}>
              {kept} of {teamAiSlots.length} slots selected
            </ThemedText>
          )}

          {teamAiSlots.map((slot, i) => (
            <TouchableOpacity
              key={i}
              style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, opacity: slot._removed ? 0.4 : 1 }]}
              onPress={() => setTeamAiSlots(prev => prev.map((s, j) => j === i ? { ...s, _removed: !s._removed } : s))}
              activeOpacity={0.75}
            >
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: slot._removed ? BORDER : 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={slot._removed ? 'close' : 'snow-outline'} size={18} color={slot._removed ? MUTED : TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: slot._removed ? MUTED : TEXT }}>{fmtIceDate(slot.date)}</ThemedText>
                <ThemedText style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{fmtIceTime(slot.start_time)} – {fmtIceTime(slot.end_time)}</ThemedText>
              </View>
              <Ionicons name={slot._removed ? 'add-circle-outline' : 'checkmark-circle'} size={22} color={slot._removed ? MUTED : TEAL} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[s.saveBtn, { marginHorizontal: 16, marginTop: 16 }, (!kept || teamAiSaving) && { opacity: 0.4 }]}
            onPress={() => void teamAiSaveSlots()}
            disabled={!kept || teamAiSaving}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
              {teamAiSaving
                ? <ActivityIndicator color="#000" size="small" />
                : <ThemedText style={s.saveBtnText}>Add {kept} Slot{kept !== 1 ? 's' : ''} to Team</ThemedText>
              }
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </>
      );
    }

    return (
      <>
        <View style={s.backLinkRow}>
          <TouchableOpacity style={s.backLink} onPress={() => setSection(null)}>
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backLinkTxt}>More</ThemedText>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
            <TouchableOpacity
              style={s.aiImportBtn}
              onPress={() => void teamAiParseImage()}
              disabled={teamAiState === 'parsing'}
              activeOpacity={0.8}
            >
              {teamAiState === 'parsing'
                ? <ActivityIndicator color={TEAL} size="small" />
                : <>
                    <Ionicons name="sparkles-outline" size={14} color={TEAL} />
                    <ThemedText style={s.aiImportTxt}>AI Import</ThemedText>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={s.gradSmBtn}
              onPress={() => setShowAddIce(true)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.gradSmBtnInner}>
                <Ionicons name="add" size={15} color="#000" />
                <ThemedText style={s.gradSmBtnTxt}>Add Slot</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        <ThemedText style={s.subTitle}>Team Ice</ThemedText>

        {!iceLoaded ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
        ) : iceSlots.length === 0 ? (
          <View style={[s.card, { alignItems: 'center', gap: 10, paddingVertical: 32 }]}>
            <Ionicons name="snow-outline" size={28} color={MUTED} />
            <ThemedText style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>No ice slots yet</ThemedText>
            <ThemedText style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 18 }}>Add slots manually or import from a photo with AI.</ThemedText>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[s.aiImportBtn, { paddingHorizontal: 16, paddingVertical: 12 }]}
                onPress={() => void teamAiParseImage()}
                disabled={teamAiState === 'parsing'}
                activeOpacity={0.8}
              >
                {teamAiState === 'parsing'
                  ? <ActivityIndicator color={TEAL} size="small" />
                  : <>
                      <Ionicons name="sparkles-outline" size={14} color={TEAL} />
                      <ThemedText style={s.aiImportTxt}>AI Import</ThemedText>
                    </>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddIce(true)} activeOpacity={0.85} style={{ borderRadius: 24, overflow: 'hidden' }}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Ionicons name="add" size={16} color="#000" />
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Add Slot</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          iceSlots.map(slot => (
            <View key={slot.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="snow-outline" size={20} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{fmtIceDate(slot.slot_date)}</ThemedText>
                <ThemedText style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                  {fmtIceTime(slot.start_time)} – {fmtIceTime(slot.end_time)}
                  {slot.notes ? ` · ${slot.notes}` : ''}
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => void handleDeleteIceSlot(slot.id)} style={{ padding: 6 }} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={17} color={MUTED} />
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 32 }} />

        {/* Add Ice Slot Modal */}
        <Modal visible={showAddIce} transparent animationType="slide" onRequestClose={() => setShowAddIce(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAddIce(false)} />
            <View style={[s.modalSheet, { maxHeight: '88%' }]}>
              <View style={s.handle} />
              <View style={s.modalHeader}>
                <ThemedText style={s.modalTitle}>Add Ice Slot</ThemedText>
                <TouchableOpacity onPress={() => setShowAddIce(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
                {/* Date */}
                <ThemedText style={s.fieldLabel}>DATE *</ThemedText>
                <TouchableOpacity
                  style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => {
                    setIceDpOpen(v => !v);
                    setIceDpMonth(iceDate ? new Date(iceDate + 'T00:00:00') : new Date());
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color={iceDate ? TEAL : MUTED} />
                  <ThemedText style={{ color: iceDate ? TEXT : MUTED, fontSize: 15, flex: 1 }}>
                    {iceDate ? fmtIceDate(iceDate) : 'Select date'}
                  </ThemedText>
                  <Ionicons name={iceDpOpen ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                </TouchableOpacity>
                {iceDpOpen && renderInlineCal_ice()}

                {/* Start / End time */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.fieldLabel}>START TIME</ThemedText>
                    <TimePicker value={iceStart} onChange={setIceStart} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.fieldLabel}>END TIME</ThemedText>
                    <TimePicker value={iceEnd} onChange={setIceEnd} />
                  </View>
                </View>

                {/* Rink */}
                <ThemedText style={[s.fieldLabel, { marginTop: 14 }]}>RINK / LOCATION</ThemedText>
                <TextInput
                  style={s.modalInput}
                  value={iceRink}
                  onChangeText={setIceRink}
                  placeholder="e.g. Centennial Arena"
                  placeholderTextColor={MUTED}
                  autoCapitalize="words"
                />
              </ScrollView>

              <TouchableOpacity
                style={[s.saveBtn, { marginTop: 12 }, (!iceDate || iceSaving) && { opacity: 0.4 }]}
                onPress={() => void handleAddIceSlot()}
                disabled={!iceDate || iceSaving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                  {iceSaving ? <ActivityIndicator color="#000" size="small" /> : <ThemedText style={s.saveBtnText}>Add Ice Slot</ThemedText>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  }

  function renderInlineCal_ice() {
    const year  = iceDpMonth.getFullYear();
    const month = iceDpMonth.getMonth();
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay    = new Date(year, month, 1).getDay();
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const pad = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < pad; i++) cells.push(null);

    return (
      <View style={s.dpWrap}>
        {/* Nav */}
        <View style={s.dpNav}>
          <TouchableOpacity onPress={() => setIceDpMonth(new Date(year, month - 1, 1))} style={s.dpNavBtn}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.dpMonthLbl}>{MONTHS[month]} {year}</ThemedText>
          <TouchableOpacity onPress={() => setIceDpMonth(new Date(year, month + 1, 1))} style={s.dpNavBtn}>
            <Ionicons name="chevron-forward" size={18} color={TEXT} />
          </TouchableOpacity>
        </View>
        {/* Day headers */}
        <View style={s.dpDayRow}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <ThemedText key={i} style={s.dpDayHdr}>{d}</ThemedText>
          ))}
        </View>
        {/* Grid */}
        <View style={s.dpGrid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={idx} style={s.dpCell} />;
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = iceDate === iso;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <TouchableOpacity key={idx} style={[s.dpCell, isSelected && s.dpCellSel, !isSelected && isToday && s.dpCellToday]} onPress={() => { setIceDate(iso); setIceDpOpen(false); }} activeOpacity={0.8}>
                <ThemedText style={[s.dpCellTxt, isSelected && s.dpCellTxtSel]}>{day}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── More menu (default) ────────────────────────────────────────────────────
  const menuItems = [
    { key: 'ice' as MoreSection,            icon: 'snow-outline',          label: 'Ice',             sub: iceCount > 0 ? `${iceCount} upcoming slot${iceCount !== 1 ? 's' : ''}` : 'Manage team ice slots', color: '#60A5FA' },
    { key: 'staff' as MoreSection,          icon: 'people-circle-outline', label: 'Staff',           sub: 'Coaches, managers & support staff',         color: TEAL },
    { key: 'volunteers' as MoreSection,     icon: 'hand-left-outline',     label: 'Volunteers',      sub: 'Sign-up slots for practices & games',        color: '#3DFF8F' },
    { key: 'stats' as MoreSection,          icon: 'bar-chart-outline',     label: 'Stats',           sub: gameRecord && gameRecord.gp > 0 ? `${gameRecord.wins}W · ${gameRecord.losses}L · ${gameRecord.ties}T · ${gameRecord.gp} GP` : 'Season record & skater stats', color: TEAL },
    { key: 'media' as MoreSection,          icon: 'camera-outline',        label: 'Media',           sub: 'Film clips & team photos',                   color: TEAL },
    { key: 'payments' as MoreSection,       icon: 'cash-outline',          label: 'Payments',        sub: 'Track team fees & balances',                 color: TEAL },
    { key: 'practice-plans' as MoreSection, icon: 'clipboard-outline',     label: 'Practice Plans',  sub: `${planSessions.length > 0 ? `${planSessions.length} upcoming session${planSessions.length !== 1 ? 's' : ''}` : 'Upcoming sessions'}`, color: TEAL },
  ];

  return (
    <>
      <View style={s.moreCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={String(item.key)}
            style={[s.moreItem, i < menuItems.length - 1 && s.moreItemBorder]}
            onPress={() => setSection(item.key)}
          >
            <View style={[s.moreItemIcon, { backgroundColor: `${item.color ?? TEAL}18` }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color ?? TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.moreItemLabel}>{item.label}</ThemedText>
              <ThemedText style={s.metaText}>{item.sub}</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={() => setSection('practice-plans')}>
        <LinearGradient colors={[TEAL, GREEN]} style={s.createPracticeBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="add" size={20} color="#000" />
          <ThemedText style={s.createPracticeTxt}>Create Practice</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
      <View style={{ height: 24 }} />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function teamInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Team color palette ────────────────────────────────────────────────────────
const TEAM_COLORS = [
  '#00C4B4', // teal (default)
  '#3DFF8F', // green
  '#3B82F6', // blue
  '#60A5FA', // light blue
  '#EF4444', // red
  '#F59E0B', // orange / gold
  '#F97316', // deep orange
  '#7C3AED', // purple
  '#EC4899', // pink
  '#22C55E', // lime green
  '#1E3A5F', // navy
  '#7C0A02', // maroon
  '#D97706', // amber
  '#6B7280', // silver/grey
  '#FFFFFF', // white
  '#111827', // near-black
];

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TeamDetailScreen() {
  const router = useRouter();
  const { id, initTab } = useLocalSearchParams<{ id: string; initTab?: string }>();
  const [tab, setTab] = useState<Tab>((initTab as Tab) ?? 'overview');
  const [dbTeam, setDbTeam] = useState<DBTeam | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  // Color picker / logo
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingColor,    setPendingColor]    = useState<string | null>(null);
  const [savingColor,     setSavingColor]     = useState(false);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('teams')
      .select('id, name, age_group, season, primary_color, coach_id, logo_url')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setDbTeam(data ?? null);
        setTeamLoading(false);
      });
  }, [id]);

  const teamName     = dbTeam?.name     ?? TEAM_FALLBACK.name;
  const teamSeason   = dbTeam?.season   ?? '';
  const teamAgeGroup = dbTeam?.age_group ?? '';
  const teamColor    = dbTeam?.primary_color ?? TEAL;
  const coachId      = dbTeam?.coach_id ?? '';
  const teamLogoUrl  = dbTeam?.logo_url ?? null;
  const teamInitialsStr = dbTeam ? teamInitials(dbTeam.name) : TEAM_FALLBACK.initials;

  function openColorPicker() {
    setPendingColor(teamColor);
    setShowColorPicker(true);
  }

  async function handleSaveColor() {
    if (!pendingColor || !id) return;
    setSavingColor(true);
    const { error } = await supabase.from('teams').update({ primary_color: pendingColor }).eq('id', id);
    if (!error) {
      setDbTeam(prev => prev ? { ...prev, primary_color: pendingColor } : prev);
    }
    setSavingColor(false);
    setShowColorPicker(false);
  }

  async function handleUploadLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to upload a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      const uri = result.assets[0].uri;
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      const filePath = `${user.id}/${id}.${fileExt}`;

      const fileResp = await fetch(uri);
      const blob = await fileResp.blob();

      const { error: uploadErr } = await supabase.storage
        .from('team-logos')
        .upload(filePath, blob, { contentType, upsert: true });

      if (uploadErr) {
        Alert.alert('Upload failed', uploadErr.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(filePath);

      // Add cache-bust so React Native re-renders immediately
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('teams')
        .update({ logo_url: urlWithBust })
        .eq('id', id);

      if (!dbErr) {
        setDbTeam(prev => prev ? { ...prev, logo_url: urlWithBust } : prev);
      }
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    if (!id) return;
    const { error } = await supabase.from('teams').update({ logo_url: null }).eq('id', id);
    if (!error) {
      setDbTeam(prev => prev ? { ...prev, logo_url: null } : prev);
    }
  }

  const previewColor = pendingColor ?? teamColor;
  // Text on the avatar should be black for light colors, white for dark
  function avatarTextColor(bg: string): string {
    const hex = bg.replace('#', '');
    if (hex.length < 6) return '#000';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#000000' : '#FFFFFF';
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',    label: 'Overview' },
    { key: 'schedule',    label: 'Schedule' },
    { key: 'roster',      label: 'Roster' },
    { key: 'tournaments', label: 'Tournaments' },
    { key: 'more',        label: 'More' },
  ];

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Top nav */}
          <View style={s.topNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={16} color={TEXT} />
              <ThemedText style={s.backBtnTxt}>Teams</ThemedText>
            </TouchableOpacity>
            <View style={s.navRight}>
              <View style={s.coachChip}>
                <ThemedText style={s.coachChipTxt}>COACH</ThemedText>
              </View>
              <View style={s.navIcons}>
                <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/profile' as any)}><Ionicons name="person-circle-outline" size={20} color={MUTED} /></TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/business' as any)}><Ionicons name="briefcase-outline"    size={18} color={MUTED} /></TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/record' as any)}><Ionicons name="camera-outline"         size={18} color={MUTED} /></TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/settings' as any)}><Ionicons name="settings-outline"     size={18} color={MUTED} /></TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Team header */}
          {teamLoading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 24, marginBottom: 8 }} />
          ) : (
            <View style={s.teamHdr}>
              {/* Tappable avatar */}
              <TouchableOpacity onPress={openColorPicker} activeOpacity={0.8} style={s.teamAvatarWrap}>
                {teamLogoUrl ? (
                  <Image source={{ uri: teamLogoUrl }} style={s.teamAvatar} />
                ) : (
                  <View style={[s.teamAvatar, { backgroundColor: teamColor }]}>
                    <ThemedText style={[s.teamAvatarTxt, { color: avatarTextColor(teamColor) }]}>{teamInitialsStr}</ThemedText>
                  </View>
                )}
                <View style={s.teamAvatarEdit}>
                  <Ionicons name={teamLogoUrl ? 'image-outline' : 'color-palette-outline'} size={11} color="#fff" />
                </View>
              </TouchableOpacity>
              <View>
                <ThemedText style={s.teamName}>{teamName}</ThemedText>
                <ThemedText style={s.teamSub}>
                  {[teamAgeGroup, teamSeason].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
            </View>
          )}

          {/* ── Team Appearance Modal ── */}
          <Modal visible={showColorPicker} transparent animationType="slide" onRequestClose={() => setShowColorPicker(false)}>
            <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowColorPicker(false)} />
            <View style={[s.modalSheet, { paddingBottom: 36 }]}>
              <View style={s.handle} />
              <View style={s.modalHeader}>
                <ThemedText style={s.modalTitle}>Team Appearance</ThemedText>
                <TouchableOpacity onPress={() => setShowColorPicker(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Preview */}
              <View style={s.colorPreview}>
                {teamLogoUrl ? (
                  <Image source={{ uri: teamLogoUrl }} style={s.colorPreviewAvatar} />
                ) : (
                  <View style={[s.colorPreviewAvatar, { backgroundColor: previewColor }]}>
                    <ThemedText style={[s.teamAvatarTxt, { fontSize: 22, color: avatarTextColor(previewColor) }]}>{teamInitialsStr}</ThemedText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700', color: TEXT }}>{teamName}</ThemedText>
                  <ThemedText style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{[teamAgeGroup, teamSeason].filter(Boolean).join(' · ')}</ThemedText>
                </View>
              </View>

              {/* Logo section */}
              <ThemedText style={[s.fieldLabel, { marginTop: 16 }]}>TEAM LOGO</ThemedText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[s.logoBtn, uploadingLogo && s.saveBtnDisabled]}
                  onPress={() => void handleUploadLogo()}
                  disabled={uploadingLogo}
                  activeOpacity={0.8}
                >
                  {uploadingLogo
                    ? <ActivityIndicator color={TEAL} size="small" />
                    : <>
                        <Ionicons name="cloud-upload-outline" size={16} color={TEAL} />
                        <ThemedText style={s.logoBtnTxt}>{teamLogoUrl ? 'Replace Logo' : 'Upload Logo'}</ThemedText>
                      </>
                  }
                </TouchableOpacity>
                {teamLogoUrl && (
                  <TouchableOpacity
                    style={s.logoRemoveBtn}
                    onPress={() => void handleRemoveLogo()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={15} color={RED} />
                    <ThemedText style={s.logoRemoveTxt}>Remove</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Color grid */}
              <ThemedText style={[s.fieldLabel, { marginTop: 20 }]}>TEAM COLOR</ThemedText>
              <View style={s.colorGrid}>
                {TEAM_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorSwatch, { backgroundColor: c }, pendingColor === c && s.colorSwatchSel]}
                    onPress={() => setPendingColor(c)}
                    activeOpacity={0.8}
                  >
                    {pendingColor === c && (
                      <Ionicons name="checkmark" size={16} color={avatarTextColor(c)} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.saveBtn, savingColor && s.saveBtnDisabled, { marginTop: 20 }]}
                onPress={() => void handleSaveColor()}
                disabled={savingColor}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                  {savingColor
                    ? <ActivityIndicator color="#000" size="small" />
                    : <ThemedText style={s.saveBtnText}>Save Color</ThemedText>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Modal>

          {/* Tab bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.tabBar}
            contentContainerStyle={s.tabBarContent}
          >
            {TABS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={s.tabItem}
                onPress={() => setTab(t.key)}
              >
                <ThemedText style={[s.tabLbl, tab === t.key && s.tabLblOn]}>{t.label}</ThemedText>
                {tab === t.key && <View style={s.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.tabDivider} />

          {/* Tab content */}
          {tab === 'overview'    && <OverviewTab setTab={setTab} coachId={coachId} teamId={id ?? ''} />}
          {tab === 'schedule'    && <ScheduleTab coachId={coachId} teamId={id ?? ''} />}
          {tab === 'roster'      && <RosterTab teamId={id ?? ''} />}
          {tab === 'tournaments' && <TournamentsTab teamId={id ?? ''} coachId={coachId} onTournament={(tid) => router.push(`/tournament/${tid}?teamId=${id}` as any)} />}
          {tab === 'more'        && <MoreTab coachId={coachId} teamId={id ?? ''} />}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── StyleSheet ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  safe:    { flex: 1 },
  content: { paddingBottom: 32 },

  // Top nav
  topNav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  backBtnTxt:  { fontSize: 14, fontWeight: '600', color: TEXT },
  navRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachChip:   { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL },
  coachChipTxt:{ fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  navIcons:    { flexDirection: 'row' },
  iconBtn:     { padding: 5 },

  // Team header
  teamHdr:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  teamAvatarWrap:   { position: 'relative' },
  teamAvatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  teamAvatarTxt:    { fontSize: 18, fontWeight: '800', color: '#000' },
  teamAvatarEdit:   { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#333', borderWidth: 1.5, borderColor: BG, alignItems: 'center', justifyContent: 'center' },
  teamName:         { fontSize: 20, fontWeight: '800', color: TEXT, lineHeight: 26 },
  teamSub:          { fontSize: 13, color: MUTED, marginTop: 2 },
  // Color picker / logo
  colorPreview:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: BG, borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: BORDER },
  colorPreviewAvatar:{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  colorGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  colorSwatch:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSel:    { borderColor: TEXT, borderWidth: 2.5 },
  logoBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                       backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 12, paddingVertical: 13,
                       borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  logoBtnTxt:        { fontSize: 14, fontWeight: '700', color: TEAL },
  logoRemoveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                       backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, paddingVertical: 13,
                       paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  logoRemoveTxt:     { fontSize: 14, fontWeight: '700', color: RED },

  // Tab bar
  tabBar:        { maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 10, gap: 0 },
  tabItem:       { paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  tabLbl:        { fontSize: 14, fontWeight: '600', color: MUTED },
  tabLblOn:      { color: TEAL },
  tabUnderline:  { height: 2, backgroundColor: TEAL, borderRadius: 1, width: '100%', marginTop: 4 },
  tabDivider:    { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  // Shared section labels
  sectionLabel:  { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 14 },
  miniLabel:     { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 6 },
  seeAll:        { fontSize: 13, color: TEAL, fontWeight: '600' },
  metaText:      { fontSize: 13, color: MUTED, lineHeight: 18 },

  // Shared card
  card:          { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },

  // Grad button
  gradBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22 },
  gradBtnText:   { fontSize: 13, fontWeight: '700', color: '#000' },

  // Next Game card
  nextGameCard:  { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(0,196,180,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: TEAL },
  nextGameLabel: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1.5, marginBottom: 8 },
  nextGameTitle: { fontSize: 18, fontWeight: '800', color: TEXT, lineHeight: 24, marginBottom: 4 },
  venueRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: 2 },
  attendRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 14 },
  dot:           { width: 7, height: 7, borderRadius: 4 },
  viewGameBtn:   { borderRadius: 12, borderWidth: 1, borderColor: TEAL, paddingVertical: 13, alignItems: 'center' },
  viewGameText:  { fontSize: 14, fontWeight: '700', color: TEAL },

  // Last Result
  lastResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigScore:      { fontSize: 28, fontWeight: '800', color: TEXT, lineHeight: 34 },
  resultBadge:   { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  resultText:    { fontSize: 12, fontWeight: '800' },

  // Season Record
  recordCard:    { flexDirection: 'row', alignItems: 'center' },
  recordCol:     { flex: 1, alignItems: 'center', paddingVertical: 4 },
  recordDivider: { width: 1, height: 48, backgroundColor: BORDER },
  recordNum:     { fontSize: 36, fontWeight: '800', lineHeight: 42 },
  recordLbl:     { fontSize: 11, color: MUTED, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },

  // Schedule rows
  schedRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  schedDate:     { fontSize: 13, fontWeight: '700', color: TEAL, width: 36 },
  schedName:     { fontSize: 15, fontWeight: '700', color: TEXT },

  // Mini stats
  miniStatsRow:  { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, gap: 8 },
  miniStatsCard: { backgroundColor: CARD, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: BORDER },
  miniStatsHdr:  { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  miniStatsRow2: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  miniStatsRank: { fontSize: 10, color: MUTED, width: 16 },
  miniStatsName: { flex: 1, fontSize: 11, fontWeight: '600', color: TEXT },
  miniStatsVal:  { fontSize: 12, fontWeight: '700', color: TEXT },

  // Alert card
  alertCard:  { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(245,158,11,0.07)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  alertTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: TEXT, flex: 1 },
  alertBody:  { fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 12 },
  remindBtn:  { paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  remindBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

  // Leaderboard
  leaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leaderIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(245,158,11,0.1)', alignItems: 'center', justifyContent: 'center' },
  leaderTop:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  leaderName: { fontSize: 15, fontWeight: '700', color: TEXT },
  flamePill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  flameText:  { fontSize: 12, fontWeight: '700', color: ORANGE },
  leaderBarBg:   { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  leaderBarFill: { height: '100%', borderRadius: 3 },

  // Film
  filmRow:    { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 10 },
  filmCard:   { flex: 1, backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  filmThumb:  { height: 96, backgroundColor: '#0F1923', alignItems: 'center', justifyContent: 'center' },
  filmTitle:  { fontSize: 12, fontWeight: '700', color: TEXT, padding: 8, paddingBottom: 2 },
  filmDate:   { fontSize: 11, color: MUTED, paddingHorizontal: 8, paddingBottom: 8 },

  // Schedule tab
  schedControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4, marginBottom: 10 },
  filterRow:     { flexDirection: 'row', gap: 6 },
  filterChip:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  filterChipOn:  { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.1)' },
  filterChipTxt: { fontSize: 13, fontWeight: '600', color: MUTED },
  filterChipTxtOn: { color: TEAL },
  eventCard:     { marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER },
  eventBadge:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  eventBadgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  eventTitleRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  eventTitle:      { fontSize: 16, fontWeight: '700', color: TEXT },
  countdownTxt:    { fontSize: 11, fontWeight: '700', color: TEAL, marginBottom: 3, marginTop: 1 },
  focusRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  focusTag:        { backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,196,180,0.18)' },
  focusTagTxt:     { fontSize: 11, color: TEAL, fontWeight: '600' },
  volDivider:      { height: 1, backgroundColor: BORDER, marginTop: 10, marginBottom: 8 },
  eventCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  attendBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendTxt:       { fontSize: 12, fontWeight: '700' },
  volList:         { marginTop: 8, gap: 5 },
  volRow:          { flexDirection: 'row', alignItems: 'center', gap: 7 },
  volDot:          { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  volRowRole:      { fontSize: 12, color: TEXT, fontWeight: '600', width: 92 },
  volRowName:      { fontSize: 12, fontWeight: '500', flex: 1 },
  volRowCount:     { fontSize: 11, fontWeight: '700', marginLeft: 6 },
  pastRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pastOpponent:  { fontSize: 15, fontWeight: '600', color: TEXT },
  pastScore:     { fontSize: 16, fontWeight: '700', color: TEXT },
  enterScoreChip:{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  enterScoreTxt: { fontSize: 11, fontWeight: '700', color: TEAL },

  // Roster
  tabHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  tabHeaderTitle:{ fontSize: 18, fontWeight: '800', color: TEXT },
  playerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerNum:     { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,196,180,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)' },
  playerNumTxt:  { fontSize: 13, fontWeight: '700', color: TEAL },
  playerName:    { fontSize: 15, fontWeight: '700', color: TEXT },
  unavailBadge:  { backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  unavailTxt:    { fontSize: 10, fontWeight: '700', color: ORANGE },

  // Tournaments
  tournTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  regBadge:       { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: TEAL },
  regTxt:         { fontSize: 10, fontWeight: '700', color: TEAL },
  tLocDropdown:   { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, zIndex: 999, overflow: 'hidden', marginTop: 2 },
  tLocSugRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  tLocSugTxt:     { flex: 1, fontSize: 14, color: TEXT, lineHeight: 20 },
  tournPlaceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },

  // More menu
  moreCard:       { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  moreItem:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  moreItemBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  moreItemIcon:   { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,196,180,0.1)', alignItems: 'center', justifyContent: 'center' },
  moreItemLabel:  { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  createPracticeBtn: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  createPracticeTxt: { fontSize: 16, fontWeight: '700', color: '#000' },

  // Sub-view shared
  backLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, marginBottom: 6 },
  backLink:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  backLinkTxt: { fontSize: 14, fontWeight: '600', color: TEXT },
  gradSmBtn:       { borderRadius: 20, overflow: 'hidden' },
  gradSmBtnInner:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9 },
  gradSmBtnTxt:    { fontSize: 13, fontWeight: '700', color: '#000' },
  aiImportBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9,
                     backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20,
                     borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  aiImportTxt:     { fontSize: 13, fontWeight: '700', color: TEAL },
  subTitle:    { fontSize: 24, fontWeight: '800', color: TEXT, lineHeight: 30, paddingHorizontal: 16, marginBottom: 14 },
  subSubtitle: { fontSize: 13, color: MUTED, paddingHorizontal: 16, marginBottom: 14, marginTop: -10 },

  // Stats sub-view
  outlineBtn:    { marginHorizontal: 16, marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: TEAL, paddingVertical: 14, alignItems: 'center' },
  outlineBtnTxt: { fontSize: 14, fontWeight: '700', color: TEAL },
  statGameFilter:{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 28, padding: 4, borderWidth: 1, borderColor: BORDER },
  statGameBtn:   { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 24 },
  statGameBtnOn: { backgroundColor: TEAL },
  statGameTxt:   { fontSize: 13, fontWeight: '600', color: MUTED },
  statGameTxtOn: { color: '#000', fontWeight: '700' },
  statSortRow:   { flexDirection: 'row', gap: 6 },
  sortChip:      { width: 42, height: 30, borderRadius: 15, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  sortChipOn:    { backgroundColor: TEAL, borderColor: TEAL },
  sortChipTxt:   { fontSize: 11, fontWeight: '700', color: MUTED },
  sortChipTxtOn: { color: '#000' },
  statsTable:    { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  statsHeaderRow:{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: BORDER },
  statsRow:      { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12 },
  statsCell:     { flex: 1, fontSize: 13, color: TEXT, textAlign: 'center' },
  statsHdrTxt:   { fontSize: 10, fontWeight: '700', color: MUTED },
  statName:      { fontWeight: '600' },

  // Media sub-view
  mediaGrid:      { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 8, marginBottom: 10 },
  mediaTile:      { width: '47.5%', backgroundColor: CARD, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  mediaTileThumb: { height: 88, backgroundColor: '#0F1923', alignItems: 'center', justifyContent: 'center' },
  mediaTileLabel: { fontSize: 12, fontWeight: '600', color: TEXT, padding: 8 },

  // Payments sub-view
  paymentRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentIcon:   { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,196,180,0.1)', alignItems: 'center', justifyContent: 'center' },
  paymentBarBg:  { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 10 },
  paymentBarFill:{ height: '100%', borderRadius: 3 },

  // Practice Plans sub-view
  planRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planIcon:    { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,196,180,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  planBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  planBadgeTxt:{ fontSize: 11, fontWeight: '600' },

  // Modal (Add Player)
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:      { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: '90%' },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:      { fontSize: 20, fontWeight: '800', color: TEXT },
  fieldLabel:      { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  textInput:       { backgroundColor: BG, borderRadius: 12, padding: 14, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER },
  chipWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  chipActive:      { backgroundColor: TEAL, borderColor: TEAL },
  chipText:        { fontSize: 13, color: MUTED, fontWeight: '600' },
  chipTextActive:  { color: '#000', fontWeight: '700' },
  saveBtn:         { borderRadius: 14, overflow: 'hidden', marginTop: 28 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnGrad:     { paddingVertical: 16, alignItems: 'center' },
  saveBtnText:     { fontSize: 16, fontWeight: '800', color: '#000' },

  // Game modal extras
  modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  modalFieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 6, marginTop: 14 },
  modalInput:      { backgroundColor: BG, borderRadius: 12, padding: 14, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER },
  modalSave:       { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
  modalSaveGrad:   { paddingVertical: 16, alignItems: 'center' },
  modalSaveTxt:    { fontSize: 16, fontWeight: '800', color: '#000' },
  haBtn:           { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center', backgroundColor: BG },
  haBtnActive:     { backgroundColor: TEAL, borderColor: TEAL },
  haBtnTxt:        { fontSize: 13, fontWeight: '700', color: MUTED },

  // ── Inline calendar ──────────────────────────────────────────────────────
  calWrap:    { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, marginTop: 8 },
  calNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calMonth:   { fontSize: 14, fontWeight: '700', color: TEXT },
  calDayHdrs: { flexDirection: 'row', marginBottom: 4 },
  calDayHdr:  { flex: 1, textAlign: 'center', fontSize: 11, color: MUTED, fontWeight: '600' },
  calGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:    { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  calCellSel: { backgroundColor: TEAL },
  calCellToday: { borderWidth: 1, borderColor: TEAL },
  calCellTxt: { fontSize: 13, fontWeight: '600', color: TEXT },

  // ── Time picker (stepper) ────────────────────────────────────────────────
  timePick:      { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 16, alignItems: 'center', gap: 10 },
  timeDispTxt:   { fontSize: 30, fontWeight: '800', color: TEXT, letterSpacing: 2, lineHeight: 36 },
  timeRow2:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeStepper:   { alignItems: 'center', gap: 2 },
  timeStepBtn:   { padding: 8 },
  timeStepVal:   { backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, minWidth: 60, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  timeStepTxt:   { fontSize: 24, fontWeight: '700', color: TEXT },
  timeColon:     { fontSize: 28, fontWeight: '800', color: MUTED, marginBottom: 6 },
  timeAmPm:      { gap: 6 },
  timeAmPmBtn:   { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, alignItems: 'center', minWidth: 54 },
  timeAmPmBtnOn: { backgroundColor: '#0D2A24', borderColor: TEAL },
  timeAmPmTxt:   { fontSize: 14, fontWeight: '700', color: MUTED },
  timeAmPmTxtOn: { color: TEAL },

  // ── Location autocomplete dropdown ───────────────────────────────────────
  locDropdown:  { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginTop: 4, overflow: 'hidden' },
  locRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: BORDER },
  locTxt:       { fontSize: 13, color: TEXT, flex: 1 },
  locSavedHdr:  { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1.5, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  locSaveBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  locSaveTxt:   { fontSize: 13, color: TEAL, fontWeight: '600', flex: 1 },

  emptyCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 20, alignItems: 'center' },
  emptyTxt:  { fontSize: 14, color: MUTED, textAlign: 'center' },

  // Staff
  staffAvatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,196,180,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  staffAvatarTxt: { fontSize: 14, fontWeight: '800', color: TEAL },
  rolePill:       { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillTxt:    { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 0.5 },

  // Volunteers
  volEventHdr:   { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  volEventTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginTop: 4, marginBottom: 2 },
  volCard:       { marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  volCardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  volRoleName:   { fontSize: 15, fontWeight: '700', color: TEXT },
  volAddBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)' },
  volAddBtnTxt:  { fontSize: 12, fontWeight: '700', color: TEAL },
  signupList:    { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden' },
  signupRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  signupName:    { fontSize: 13, fontWeight: '600', color: TEXT, flex: 1 },

  // Event picker chips (in add position modal)
  eventPickerChip:   { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 10, minWidth: 130, maxWidth: 160 },
  eventPickerChipOn: { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.08)' },

  // Volunteer defaults section
  defaultsSection: { marginHorizontal: 16, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER },
  defRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: BORDER, gap: 10 },
  defToggle:       { borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: BG },
  defToggleOn:     { backgroundColor: 'rgba(0,196,180,0.15)', borderColor: TEAL },
  defToggleTxt:    { fontSize: 11, fontWeight: '700', color: MUTED },
  defToggleTxtOn:  { color: TEAL },
});
