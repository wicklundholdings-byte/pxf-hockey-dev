import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

// These require native modules — lazy-loaded so the screen doesn't crash
// if a rebuild hasn't happened yet. After `npx expo run:ios` they'll be available.
let ImagePicker: typeof import('expo-image-picker') | null = null;
try { ImagePicker = require('expo-image-picker'); } catch { /* needs rebuild */ }

let DocumentPicker: typeof import('expo-document-picker') | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch { /* needs rebuild */ }
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { DatePicker } from '@/components/date-picker';
import { TimePicker } from '@/components/time-picker';

const PLACES_KEY = 'AIzaSyBSC0TcManJa-ssPxot8xoQu9-gqqHJNAU';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const PURPLE = '#7C3AED';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const BLUE   = '#38BDF8';
const SCREEN_W = Dimensions.get('window').width;

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType   = 'log' | 'ai' | 'locations';
type PoolFilter = 'all' | 'business' | string; // string = team id
type AllocType = 'camp' | 'session' | 'game' | 'private';

type Location = { id: string; name: string; address: string | null; color: string };
type Team = { id: string; name: string };
type PlaceSuggestion = { place_id: string; description: string };

type IceSlot = {
  id: string;
  rink_id: string | null;       // legacy — kept for read compat
  location_id: string | null;   // unified location (coach_locations)
  pool_type: 'business' | 'team';
  team_id: string | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  allocated_to_type: AllocType | null;
  allocated_to_id: string | null;
  allocated_to_name: string | null;
  notes: string | null;
  cost: number | null;
};

type AllocEvent = { id: string; label: string; sub: string };

type AiState = 'upload' | 'parsing' | 'preview';
type ParsedSlot = {
  date: string;
  start_time: string;
  end_time: string;
  rink_name: string | null;
  cost: number | null;
  _removed?: boolean;
};

const LOCATION_COLORS = [TEAL, BLUE, PURPLE, ORANGE, RED, '#EAB308', '#22C55E', '#EC4899'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() { return localDateStr(new Date()); }

function weekSunday(d: Date): Date {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// Parse "8:45 AM", "8:45", "09:00" → "08:45" (24h HH:MM for DB)
function parseTimeInput(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[3] ?? '').toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function fmtTime(t: string): string {
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (isNaN(h)) return t;
  return `${h % 12 || 12}:${String(isNaN(m) ? 0 : m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtTimeShort(t: string): string {
  const h = parseInt(t.split(':')[0], 10);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'p' : 'a';
  return `${h % 12 || 12}${ampm}`;
}

function slotHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function normDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return String(d).substring(0, 10);
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function IceManagementScreen() {
  const router = useRouter();

  // ── tabs + pool filter ──────────────────────────────────────────────────────
  const [tab,     setTab]     = useState<TabType>('log');
  const [pool,    setPool]    = useState<PoolFilter>('business');

  // ── week navigation ─────────────────────────────────────────────────────────
  const [weekOf,  setWeekOf]  = useState<Date>(() => weekSunday(new Date()));

  // ── data ────────────────────────────────────────────────────────────────────
  const [slots,     setSlots]     = useState<IceSlot[]>([]);
  const [monthSlots, setMonthSlots] = useState<IceSlot[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [teams,     setTeams]     = useState<Team[]>([]);

  // ── modals ──────────────────────────────────────────────────────────────────
  const [showAddSlot,     setShowAddSlot]     = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [selSlot,         setSelSlot]         = useState<IceSlot | null>(null);

  // ── add-slot form ────────────────────────────────────────────────────────────
  const [asLocation, setAsLocation] = useState('');
  const [asDate,     setAsDate]     = useState(todayStr);
  const [asStart,    setAsStart]    = useState('09:00');
  const [asEnd,      setAsEnd]      = useState('11:00');
  const [asPool,     setAsPool]     = useState<'business' | 'team'>('business');
  const [asTeam,     setAsTeam]     = useState('');
  const [asCost,     setAsCost]     = useState('');
  const [asSaving,   setAsSaving]   = useState(false);

  // ── add-location form ─────────────────────────────────────────────────────
  const [alName,    setAlName]    = useState('');
  const [alAddr,    setAlAddr]    = useState('');
  const [alColor,   setAlColor]   = useState(TEAL);
  const [alSaving,  setAlSaving]  = useState(false);
  // Google Places autocomplete for add-location
  const [locSuggestions, setLocSuggestions] = useState<PlaceSuggestion[]>([]);
  const [locSearching,   setLocSearching]   = useState(false);
  const locSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── allocation modal ─────────────────────────────────────────────────────
  const [allocTab,    setAllocTab]    = useState<AllocType>('camp');
  const [allocEvents, setAllocEvents] = useState<AllocEvent[]>([]);
  const [allocSaving, setAllocSaving] = useState(false);

  // ── AI import ─────────────────────────────────────────────────────────────
  const [aiState,        setAiState]        = useState<AiState>('upload');
  const [parsedSlots,    setParsedSlots]    = useState<ParsedSlot[]>([]);
  const [aiRinkName,     setAiRinkName]     = useState(''); // raw name from AI (for display / new location)
  const [aiLocationId,   setAiLocationId]   = useState(''); // selected existing location id
  const [aiNewLocName,   setAiNewLocName]   = useState(''); // name for creating a new location
  const [aiContractName, setAiContractName] = useState('');
  const [aiHourlyRate,   setAiHourlyRate]   = useState('');
  const [aiBulkCost,     setAiBulkCost]     = useState(''); // fill-all cost shortcut
  const [aiPool,         setAiPool]         = useState<'business' | 'team'>('business');
  const [aiTeam,         setAiTeam]         = useState('');
  const [aiSaving,       setAiSaving]       = useState(false);

  // ── Select mode ──────────────────────────────────────────────────────────
  const [selectMode,      setSelectMode]      = useState(false);
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  type CreateType = 'camp' | 'session' | 'private' | 'game';
  const [createType,  setCreateType]  = useState<CreateType | null>(null);
  const [creating,    setCreating]    = useState(false);
  // camp form
  const [cName,  setCName]  = useState('');
  const [cType,  setCType]  = useState('skating');
  // session/practice form
  const [sTitle, setSTitle] = useState('Practice');
  const [sTeam,  setSTeam]  = useState('');
  // private form
  const [pName,  setPName]  = useState('');
  // game form
  const [gOpponent, setGOpponent] = useState('');
  const [gTeam,     setGTeam]     = useState('');

  // ── View mode ─────────────────────────────────────────────────────────────
  type ViewMode = 'day' | 'week' | 'month';
  const [viewMode,      setViewMode]      = useState<ViewMode>('week');
  const [selectedDate,  setSelectedDate]  = useState<string>(todayStr());

  // ── Edit slot ─────────────────────────────────────────────────────────────
  const [editMode,     setEditMode]     = useState(false);   // inside slot detail modal
  const [editLocation, setEditLocation] = useState('');
  const [editStart,    setEditStart]    = useState('');
  const [editEnd,      setEditEnd]      = useState('');
  const [editNotes,    setEditNotes]    = useState('');
  const [editCost,     setEditCost]     = useState('');
  const [editSaving,   setEditSaving]   = useState(false);

  // ── Split slot ────────────────────────────────────────────────────────────
  const [showSplit,       setShowSplit]       = useState(false);
  const [splitParts,      setSplitParts]      = useState(2);
  // Custom 2-slot split: user sets end of slot 1 and start of slot 2
  const [splitSlot1End,   setSplitSlot1End]   = useState('');
  const [splitSlot2Start, setSplitSlot2Start] = useState('');

  // ── Group edit ────────────────────────────────────────────────────────────
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [geLocation,    setGeLocation]    = useState('');
  const [gePool,        setGePool]        = useState<'business' | 'team' | ''>('');
  const [geTeam,        setGeTeam]        = useState('');
  const [geSaving,      setGeSaving]      = useState(false);

  // ── Camera ────────────────────────────────────────────────────────────────
  const [showCamera,  setShowCamera]  = useState(false);
  const [camPerm,     requestCamPerm] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);


  // ── derived ──────────────────────────────────────────────────────────────
  const locationMap = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekOf, i)), [weekOf]);

  const weekDateStrs = useMemo(() => weekDays.map(localDateStr), [weekDays]);

  const filteredSlots = useMemo(() => {
    const base = pool === 'all' ? slots : pool === 'business'
      ? slots.filter(s => s.pool_type === 'business')
      : slots.filter(s => s.team_id === pool);
    return base;
  }, [slots, pool]);

  const filteredMonthSlots = useMemo(() => {
    const base = pool === 'all' ? monthSlots : pool === 'business'
      ? monthSlots.filter(s => s.pool_type === 'business')
      : monthSlots.filter(s => s.team_id === pool);
    return base;
  }, [monthSlots, pool]);

  const byDate = useMemo(() => {
    const m = new Map<string, IceSlot[]>();
    filteredSlots.forEach(s => {
      const d = normDate(s.slot_date) ?? s.slot_date;
      const arr = m.get(d) ?? [];
      arr.push(s);
      m.set(d, arr);
    });
    return m;
  }, [filteredSlots]);

  const byDateMonth = useMemo(() => {
    const m = new Map<string, IceSlot[]>();
    filteredMonthSlots.forEach(s => {
      const d = normDate(s.slot_date) ?? s.slot_date;
      const arr = m.get(d) ?? [];
      arr.push(s);
      m.set(d, arr);
    });
    return m;
  }, [filteredMonthSlots]);

  // Month stats
  const monthStats = useMemo(() => {
    const relevant = pool === 'all' ? monthSlots
      : pool === 'business' ? monthSlots.filter(s => s.pool_type === 'business')
      : monthSlots.filter(s => s.team_id === pool);
    const total = relevant.reduce((acc, s) => acc + slotHours(s.start_time, s.end_time), 0);
    const linked = relevant.filter(s => s.allocated_to_id).length;
    const locSet = new Set(relevant.map(s => s.location_id ?? s.rink_id).filter(Boolean));
    const perRink = new Map<string, number>();
    relevant.forEach(s => {
      const lid = s.location_id ?? s.rink_id;
      if (!lid) return;
      perRink.set(lid, (perRink.get(lid) ?? 0) + slotHours(s.start_time, s.end_time));
    });
    return { total, linked, total_count: relevant.length, rinks: locSet.size, perRink };
  }, [monthSlots, pool]);

  // ── load ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadBase(); }, []);
  useEffect(() => { loadWeek(); }, [weekOf]);
  useEffect(() => {
    const m = new Date(weekOf);
    m.setDate(1);
    loadMonth(m);
  }, [weekOf]);

  async function loadBase() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: ld }, { data: td }] = await Promise.all([
      supabase.from('coach_locations').select('id, name, address, color').eq('coach_id', user.id).order('name'),
      supabase.from('teams').select('id, name').eq('coach_id', user.id).order('name'),
    ]);
    setLocations(ld ?? []);
    setTeams(td ?? []);
  }

  async function loadWeek() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const start = localDateStr(weekOf);
    const end   = localDateStr(addDays(weekOf, 6));
    const { data } = await supabase
      .from('ice_slots')
      .select('id, rink_id, location_id, pool_type, team_id, slot_date, start_time, end_time, allocated_to_type, allocated_to_id, allocated_to_name, notes, cost')
      .eq('coach_id', user.id)
      .gte('slot_date', start)
      .lte('slot_date', end)
      .order('start_time');
    setSlots((data ?? []).map((s: any) => ({ ...s, slot_date: normDate(s.slot_date) ?? s.slot_date })));
  }

  async function loadMonth(firstOfMonth: Date) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const y = firstOfMonth.getFullYear();
    const m = firstOfMonth.getMonth();
    const start = localDateStr(new Date(y, m, 1));
    const end   = localDateStr(new Date(y, m + 1, 0));
    const { data } = await supabase
      .from('ice_slots')
      .select('id, rink_id, location_id, pool_type, team_id, slot_date, start_time, end_time, allocated_to_id, allocated_to_type, allocated_to_name, notes, cost')
      .eq('coach_id', user.id)
      .gte('slot_date', start)
      .lte('slot_date', end)
      .order('start_time');
    setMonthSlots((data ?? []).map((s: any) => ({ ...s, slot_date: normDate(s.slot_date) ?? s.slot_date })));
  }

  // ── Google Places autocomplete for Locations ─────────────────────────────
  function searchLocationPlaces(text: string) {
    setAlName(text);
    setAlAddr('');
    if (locSearchTimer.current) clearTimeout(locSearchTimer.current);
    if (text.length < 2) { setLocSuggestions([]); return; }
    locSearchTimer.current = setTimeout(async () => {
      setLocSearching(true);
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': PLACES_KEY },
          body: JSON.stringify({ input: text, includedPrimaryTypes: ['establishment'] }),
        });
        const json = await res.json();
        setLocSuggestions(
          (json.suggestions ?? []).map((s: any) => ({
            place_id: s.placePrediction.placeId,
            description: s.placePrediction.text.text,
          }))
        );
      } catch { setLocSuggestions([]); }
      setLocSearching(false);
    }, 400);
  }

  async function pickLocationSuggestion(sug: PlaceSuggestion) {
    setLocSuggestions([]);
    setLocSearching(true);
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${sug.place_id}`, {
        headers: { 'X-Goog-Api-Key': PLACES_KEY, 'X-Goog-FieldMask': 'displayName,formattedAddress' },
      });
      const json = await res.json();
      setAlName(json.displayName?.text ?? sug.description);
      setAlAddr(json.formattedAddress ?? '');
    } catch {}
    setLocSearching(false);
  }

  // ── Update a slot (edit mode) ─────────────────────────────────────────────
  async function updateSlot() {
    if (!selSlot) return;
    setEditSaving(true);
    const { data: updated, error } = await supabase.from('ice_slots').update({
      location_id: editLocation || null,
      start_time:  editStart,
      end_time:    editEnd,
      notes:       editNotes || null,
      cost:        editCost.trim() ? parseFloat(editCost) : 0,
    }).eq('id', selSlot.id).select();
    setEditSaving(false);
    if (error) { Alert.alert('Save failed', error.message); return; }
    if (!updated || updated.length === 0) {
      Alert.alert('Save failed', 'No rows were updated. You may not have permission to edit this slot.');
      return;
    }
    // Cascade location to linked camp
    if (editLocation && selSlot.allocated_to_type === 'camp' && selSlot.allocated_to_id) {
      const loc = locationMap.get(editLocation);
      if (loc) await supabase.from('camps').update({ location: loc.name }).eq('id', selSlot.allocated_to_id);
    }
    setSelSlot(null);
    setEditMode(false);
    loadWeek();
    loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
  }

  // ── Split a slot into N equal parts ──────────────────────────────────────
  async function splitSlot(n: number) {
    if (!selSlot) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [sh, sm] = selSlot.start_time.split(':').map(Number);
    const [eh, em] = selSlot.end_time.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) { Alert.alert('Invalid time range'); return; }
    const partMin = Math.floor(totalMin / n);
    const rows = Array.from({ length: n }, (_, i) => {
      const startMin = sh * 60 + sm + i * partMin;
      const endMin   = i === n - 1 ? eh * 60 + em : startMin + partMin;
      const fmt = (mins: number) =>
        `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      return {
        coach_id:   user.id,
        location_id: selSlot.location_id,
        pool_type:  selSlot.pool_type,
        team_id:    selSlot.team_id,
        slot_date:  selSlot.slot_date,
        start_time: fmt(startMin),
        end_time:   fmt(endMin),
        notes:      selSlot.notes,
      };
    });
    // Delete original, insert parts
    await supabase.from('ice_slots').delete().eq('id', selSlot.id);
    const { error } = await supabase.from('ice_slots').insert(rows);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowSplit(false);
    setSelSlot(null);
    setEditMode(false);
    loadWeek();
    loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
  }

  // ── Split a slot into 2 with custom times ────────────────────────────────
  async function splitSlotCustom() {
    if (!selSlot) return;
    if (!splitSlot1End || !splitSlot2Start) {
      Alert.alert('Times required', 'Set an end time for slot 1 and a start time for slot 2.');
      return;
    }
    const end1 = parseTimeInput(splitSlot1End);
    const start2 = parseTimeInput(splitSlot2Start);
    if (!end1) { Alert.alert('Invalid time', `"${splitSlot1End}" isn't a valid time. Try something like 8:45 AM.`); return; }
    if (!start2) { Alert.alert('Invalid time', `"${splitSlot2Start}" isn't a valid time. Try something like 9:00 AM.`); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = [
      {
        coach_id: user.id, location_id: selSlot.location_id, pool_type: selSlot.pool_type,
        team_id: selSlot.team_id, slot_date: selSlot.slot_date,
        start_time: selSlot.start_time, end_time: end1, notes: selSlot.notes,
      },
      {
        coach_id: user.id, location_id: selSlot.location_id, pool_type: selSlot.pool_type,
        team_id: selSlot.team_id, slot_date: selSlot.slot_date,
        start_time: start2, end_time: selSlot.end_time, notes: selSlot.notes,
      },
    ];
    await supabase.from('ice_slots').delete().eq('id', selSlot.id);
    const { error } = await supabase.from('ice_slots').insert(rows);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowSplit(false); setSelSlot(null); setEditMode(false);
    loadWeek();
    loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
  }

  // ── Group edit selected slots ─────────────────────────────────────────────
  async function applyGroupEdit() {
    if (selectedIds.size === 0) return;
    setGeSaving(true);
    const updates: Record<string, any> = {};
    if (geLocation !== '') updates.location_id = geLocation === 'none' ? null : geLocation;
    if (gePool !== '') {
      updates.pool_type = gePool;
      updates.team_id = gePool === 'team' ? (geTeam || null) : null;
    }
    if (Object.keys(updates).length === 0) { setGeSaving(false); return; }
    const { data: updated, error } = await supabase.from('ice_slots').update(updates).in('id', [...selectedIds]).select();
    setGeSaving(false);
    if (error) { Alert.alert('Save failed', error.message); return; }
    if (!updated || updated.length === 0) {
      Alert.alert('Save failed', 'No rows were updated. You may not have permission to edit these slots.');
      return;
    }
    // Cascade location to any linked camps
    if (geLocation && geLocation !== 'none') {
      const loc = locationMap.get(geLocation);
      if (loc) {
        const linkedCampIds = new Set<string>();
        for (const slotId of selectedIds) {
          const slot = slots.find(s => s.id === slotId);
          if (slot?.allocated_to_type === 'camp' && slot?.allocated_to_id) linkedCampIds.add(slot.allocated_to_id);
        }
        for (const campId of linkedCampIds) {
          await supabase.from('camps').update({ location: loc.name }).eq('id', campId);
        }
      }
    }
    setShowGroupEdit(false);
    setGeLocation(''); setGePool(''); setGeTeam('');
    exitSelect();
    loadWeek();
    loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
  }

  // ── add slot ──────────────────────────────────────────────────────────────
  async function saveSlot() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!asDate || !asStart || !asEnd) return Alert.alert('Missing fields', 'Date and times are required.');
    setAsSaving(true);
    const { error } = await supabase.from('ice_slots').insert({
      coach_id:    user.id,
      location_id: asLocation || null,
      pool_type:   asPool,
      team_id:     asPool === 'team' ? (asTeam || null) : null,
      slot_date:   asDate,
      start_time:  asStart,
      end_time:    asEnd,
      cost:        asCost.trim() ? parseFloat(asCost) : 0,
    });
    setAsSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowAddSlot(false);
    setAsLocation(''); setAsPool('business'); setAsTeam(''); setAsCost('');
    loadWeek(); loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
  }

  // ── add location ──────────────────────────────────────────────────────────
  async function saveLocation() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!alName.trim()) return Alert.alert('Name required');
    setAlSaving(true);
    const { error } = await supabase.from('coach_locations').insert({
      coach_id: user.id, name: alName.trim(), address: alAddr.trim() || null, color: alColor,
    });
    setAlSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowAddLocation(false);
    setAlName(''); setAlAddr(''); setAlColor(TEAL); setLocSuggestions([]);
    loadBase();
  }

  // ── delete location ───────────────────────────────────────────────────────
  async function deleteLocation(id: string) {
    Alert.alert('Delete Location', "This won't delete ice slots, just remove the location.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('coach_locations').delete().eq('id', id);
        loadBase();
      }},
    ]);
  }

  // ── delete slot ───────────────────────────────────────────────────────────
  async function deleteSlot(id: string) {
    Alert.alert('Delete Slot', 'Remove this ice slot?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('ice_slots').delete().eq('id', id);
        setSelSlot(null);
        loadWeek();
        loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
      }},
    ]);
  }

  // ── load events for allocation tab ────────────────────────────────────────
  async function loadAllocEvents(type: AllocType, slotDate: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let events: AllocEvent[] = [];
    if (type === 'camp') {
      const { data } = await supabase.from('camps')
        .select('id, name, start_date, end_date').eq('coach_id', user.id)
        .gte('end_date', slotDate).order('start_date').limit(20);
      events = (data ?? []).map((c: any) => ({
        id: c.id, label: c.name, sub: `${normDate(c.start_date)} – ${normDate(c.end_date)}`,
      }));
    } else if (type === 'session') {
      const { data } = await supabase.from('sessions')
        .select('id, title, date').eq('coach_id', user.id)
        .gte('date', slotDate).order('date').limit(20);
      events = (data ?? []).map((s: any) => ({
        id: s.id, label: s.title, sub: normDate(s.date) ?? s.date,
      }));
    } else if (type === 'game') {
      const { data } = await supabase.from('games')
        .select('id, opponent, game_date').eq('coach_id', user.id)
        .gte('game_date', slotDate).order('game_date').limit(20);
      events = (data ?? []).map((g: any) => ({
        id: g.id, label: `vs ${g.opponent}`, sub: normDate(g.game_date) ?? g.game_date,
      }));
    } else if (type === 'private') {
      const { data } = await supabase.from('camps')
        .select('id, name, start_date').eq('coach_id', user.id).eq('type', 'private')
        .gte('start_date', slotDate).order('start_date').limit(20);
      events = (data ?? []).map((c: any) => ({
        id: c.id, label: c.name, sub: normDate(c.start_date) ?? c.start_date,
      }));
    }
    setAllocEvents(events);
  }

  // ── link slot to event ────────────────────────────────────────────────────
  async function linkSlot(event: AllocEvent, type: AllocType) {
    if (!selSlot) return;
    setAllocSaving(true);
    const { error } = await supabase.from('ice_slots').update({
      allocated_to_type: type,
      allocated_to_id:   event.id,
      allocated_to_name: event.label,
    }).eq('id', selSlot.id);
    setAllocSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setSelSlot(null);
    loadWeek();
    loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
  }

  // ── unlink slot ───────────────────────────────────────────────────────────
  async function unlinkSlot() {
    if (!selSlot) return;
    setAllocSaving(true);
    await supabase.from('ice_slots').update({
      allocated_to_type: null, allocated_to_id: null, allocated_to_name: null,
    }).eq('id', selSlot.id);
    setAllocSaving(false);
    setSelSlot(null);
    loadWeek();
  }

  // ── auto-suggest allocation ───────────────────────────────────────────────
  async function autoSuggest() {
    if (!selSlot) return;
    const date = selSlot.slot_date;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Check camps covering this date
    const { data: camps } = await supabase.from('camps')
      .select('id, name, start_date, end_date').eq('coach_id', user.id)
      .lte('start_date', date).gte('end_date', date);
    if (camps && camps.length > 0) {
      const c = camps[0] as any;
      Alert.alert(
        'Suggested link',
        `Link to "${c.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Link', onPress: () => linkSlot({ id: c.id, label: c.name, sub: '' }, 'camp') },
        ]
      );
      return;
    }
    // Check sessions on same date
    const { data: sesses } = await supabase.from('sessions')
      .select('id, title').eq('coach_id', user.id).eq('date', date);
    if (sesses && sesses.length > 0) {
      const s = sesses[0] as any;
      Alert.alert('Suggested link', `Link to "${s.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Link', onPress: () => linkSlot({ id: s.id, label: s.title, sub: '' }, 'session') },
      ]);
      return;
    }
    // Check games
    const { data: gms } = await supabase.from('games')
      .select('id, opponent, game_date').eq('coach_id', user.id).eq('game_date', date);
    if (gms && gms.length > 0) {
      const g = gms[0] as any;
      Alert.alert('Suggested link', `Link to "vs ${g.opponent}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Link', onPress: () => linkSlot({ id: g.id, label: `vs ${g.opponent}`, sub: '' }, 'game') },
      ]);
      return;
    }
    Alert.alert('No match found', 'No camps, sessions, or games found on this date. Add one first.');
  }

  // ── Select mode helpers ──────────────────────────────────────────────────
  const allLoadedSlots = useMemo(() => {
    const map = new Map<string, IceSlot>();
    slots.forEach(s => map.set(s.id, s));
    monthSlots.forEach(s => map.set(s.id, s));
    return [...map.values()];
  }, [slots, monthSlots]);

  const selectedSlots = useMemo(() =>
    allLoadedSlots.filter(s => selectedIds.has(s.id)), [allLoadedSlots, selectedIds]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  // ── Create event from selected slots ─────────────────────────────────────
  async function createFromSlots() {
    if (!createType || selectedSlots.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCreating(true);

    const sorted = [...selectedSlots].sort((a, b) => a.slot_date.localeCompare(b.slot_date));
    const ids = sorted.map(s => s.id);

    try {
      if (createType === 'camp' || createType === 'private') {
        const campName = createType === 'private' ? (pName || 'Private Lesson') : (cName || 'Camp');
        const { data: camp, error } = await supabase.from('camps').insert({
          coach_id:   user.id,
          name:       campName,
          type:       createType === 'private' ? 'private' : cType,
          start_date: sorted[0].slot_date,
          end_date:   sorted[sorted.length - 1].slot_date,
          event_time: sorted[0].start_time,
          location:   locationMap.get(sorted[0].location_id ?? '')?.name ?? null,
          schedule_config: { dates: sorted.map(s => s.slot_date) },
        }).select('id, name').single();
        if (error) throw error;
        await supabase.from('ice_slots').update({
          allocated_to_type: 'camp',
          allocated_to_id:   camp.id,
          allocated_to_name: camp.name,
        }).in('id', ids);

      } else if (createType === 'session') {
        const title = sTitle || 'Practice';
        const rows = sorted.map(s => ({
          coach_id: user.id,
          team_id:  sTeam || null,
          title,
          date:     s.slot_date,
          time:     s.start_time,
          total_duration_minutes: Math.round(slotHours(s.start_time, s.end_time) * 60),
          location: locationMap.get(s.location_id ?? '')?.name ?? null,
        }));
        const { data: sessions, error } = await supabase.from('sessions').insert(rows).select('id');
        if (error) throw error;
        // Link each slot to its own session
        await Promise.all(sorted.map((s, i) =>
          supabase.from('ice_slots').update({
            allocated_to_type: 'session',
            allocated_to_id:   sessions[i].id,
            allocated_to_name: title,
          }).eq('id', s.id)
        ));

      } else if (createType === 'game') {
        const s = sorted[0];
        const opponent = gOpponent || 'TBD';
        const { data: game, error } = await supabase.from('games').insert({
          coach_id:  user.id,
          team_id:   gTeam || null,
          opponent,
          game_date: s.slot_date,
          game_time: s.start_time,
          location:  locationMap.get(s.location_id ?? '')?.name ?? null,
        }).select('id').single();
        if (error) throw error;
        await supabase.from('ice_slots').update({
          allocated_to_type: 'game',
          allocated_to_id:   game.id,
          allocated_to_name: `vs ${opponent}`,
        }).in('id', ids);
      }

      setShowCreateSheet(false);
      setCreateType(null);
      exitSelect();
      // Reset forms
      setCName(''); setCType('skating'); setSTitle('Practice'); setSTeam('');
      setPName(''); setGOpponent(''); setGTeam('');
      loadWeek();
      loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));

    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong');
    }
    setCreating(false);
  }

  // ── AI import: open camera ────────────────────────────────────────────────
  async function openCamera() {
    if (!camPerm?.granted) {
      const res = await requestCamPerm();
      if (!res.granted) { Alert.alert('Permission needed', 'Camera access is required to photograph your contract.'); return; }
    }
    setShowCamera(true);
  }

  // ── AI import: capture photo and send to AI ───────────────────────────────
  async function captureAndParse() {
    if (!cameraRef.current) return;
    setShowCamera(false);
    setAiState('parsing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.85 });
      if (!photo?.base64) { setAiState('upload'); Alert.alert('Capture failed', 'No image data returned.'); return; }
      await parseImageBase64(photo.base64, 'image/jpeg');
    } catch (e: any) {
      setAiState('upload');
      Alert.alert('Error', e?.message ?? 'Camera capture failed');
    }
  }

  // ── AI import: choose image from library ─────────────────────────────────
  async function pickImage() {
    if (!ImagePicker) {
      Alert.alert('Rebuild required', 'Run: npx expo install expo-image-picker && npx expo run:ios');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.85 });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setAiState('parsing');
    await parseImageBase64(result.assets[0].base64, 'image/jpeg');
  }

  // ── AI import: pick a document (PDF / image file) ─────────────────────────
  async function pickDocument() {
    if (!DocumentPicker) {
      Alert.alert('Rebuild required', 'Run: npx expo install expo-document-picker && npx expo run:ios');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setAiState('parsing');
    try {
      const base64 = await readFileAsBase64(asset.uri);
      const mediaType = asset.mimeType === 'application/pdf' ? 'application/pdf' : (asset.mimeType ?? 'image/jpeg');
      await parseImageBase64(base64, mediaType as any);
    } catch (e: any) {
      setAiState('upload');
      Alert.alert('Error reading file', e?.message ?? 'Could not read document');
    }
  }

  // ── Read local file URI → base64 (XHR avoids Hermes blob limitation) ──────
  function readFileAsBase64(uri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        try {
          const bytes = new Uint8Array(xhr.response as ArrayBuffer);
          let binary = '';
          const chunk = 8192;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
          }
          resolve(btoa(binary));
        } catch (e) { reject(e); }
      };
      xhr.onerror = () => reject(new Error('XHR failed'));
      xhr.open('GET', uri);
      xhr.responseType = 'arraybuffer';
      xhr.send();
    });
  }

  // ── AI import: send base64 to edge function ───────────────────────────────
  async function parseImageBase64(imageBase64: string, mediaType: string) {
    try {
      const { data, error } = await supabase.functions.invoke('parse-ice-contract', {
        body: { imageBase64, mediaType },
      });

      if (error || !data) {
        setAiState('upload');
        // Try to surface the real error body from the edge function response
        let errMsg = error?.message ?? 'No data returned from AI.';
        try {
          const ctx = (error as any)?.context;
          if (ctx?.json) {
            const body = await ctx.json();
            // Show detail (Anthropic raw error) first so we can diagnose
            errMsg = body?.detail ?? body?.error ?? body?.message ?? errMsg;
          }
        } catch {}
        Alert.alert('Parsing failed', String(errMsg).slice(0, 300));
        return;
      }

      if (!data.slots || data.slots.length === 0) {
        setAiState('upload');
        Alert.alert('No slots found', "The AI couldn't find any ice time slots. Try a clearer photo with better lighting.");
        return;
      }

      setParsedSlots(data.slots.map((s: ParsedSlot) => ({ ...s, _removed: false })));
      setAiRinkName(data.rink_name ?? '');
      setAiNewLocName(data.rink_name ?? '');
      setAiLocationId('');
      setAiContractName(data.rink_name ? `${data.rink_name} Contract` : 'Ice Contract');
      setAiHourlyRate(data.hourly_rate != null ? String(data.hourly_rate) : '');
      setAiBulkCost('');
      setAiState('preview');
    } catch (e: any) {
      setAiState('upload');
      Alert.alert('Error', e?.message ?? 'Unexpected error');
    }
  }

  // ── AI import: save all confirmed slots ───────────────────────────────────
  async function saveAiSlots() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const keep = parsedSlots.filter(s => !s._removed);
    if (keep.length === 0) { Alert.alert('No slots to save'); return; }

    setAiSaving(true);

    // Resolve location: use selected existing, or create new from aiNewLocName
    let locationId: string | null = null;
    if (aiLocationId) {
      locationId = aiLocationId;
    } else if (aiNewLocName.trim()) {
      const existing = locations.find(l => l.name.toLowerCase() === aiNewLocName.trim().toLowerCase());
      if (existing) {
        locationId = existing.id;
      } else {
        const { data: newLoc } = await supabase.from('coach_locations').insert({
          coach_id: user.id, name: aiNewLocName.trim(), color: TEAL,
        }).select('id').single();
        locationId = newLoc?.id ?? null;
        if (locationId) loadBase();
      }
    }

    const rows = keep.map(s => ({
      coach_id:    user.id,
      location_id: locationId,
      pool_type:   aiPool,
      team_id:     aiPool === 'team' ? (aiTeam || null) : null,
      slot_date:   s.date,
      start_time:  s.start_time,
      end_time:    s.end_time,
      cost:        s.cost ?? 0,
    }));

    // Dedup: skip slots that already exist at the same location with same date+times
    const dates = rows.map(r => r.slot_date);
    const minDate = dates.reduce((a, b) => a < b ? a : b);
    const maxDate = dates.reduce((a, b) => a > b ? a : b);
    const { data: existing } = locationId
      ? await supabase.from('ice_slots')
          .select('slot_date, start_time, end_time')
          .eq('coach_id', user.id)
          .eq('location_id', locationId)
          .gte('slot_date', minDate)
          .lte('slot_date', maxDate)
      : { data: [] };
    const existingKeys = new Set((existing ?? []).map(s => `${s.slot_date}|${s.start_time}|${s.end_time}`));
    const newRows = rows.filter(r => !existingKeys.has(`${r.slot_date}|${r.start_time}|${r.end_time}`));

    if (newRows.length === 0) {
      setAiSaving(false);
      Alert.alert('Already imported', 'All slots from this contract already exist in your log.');
      return;
    }

    const { error } = await supabase.from('ice_slots').insert(newRows);
    setAiSaving(false);

    if (error) { Alert.alert('Save failed', error.message); return; }

    const skipped = rows.length - newRows.length;
    Alert.alert('Done!', `${newRows.length} slot${newRows.length !== 1 ? 's' : ''} saved${skipped > 0 ? `, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : ''}.`);
    setAiState('upload');
    setParsedSlots([]);
    setAiContractName('');
    setAiRinkName('');
    setAiLocationId('');
    setAiNewLocName('');
    setAiHourlyRate('');
    setAiBulkCost('');
    loadBase();
    loadWeek();
    loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
  }

  const today = todayStr();

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.title}>Ice Time</ThemedText>
          {tab === 'log' && (
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAddSlot(true)}>
              <Ionicons name="add" size={22} color="#000" />
              <ThemedText style={s.addBtnText}>Add Single Slot</ThemedText>
            </TouchableOpacity>
          )}
          {tab === 'locations' && (
            <TouchableOpacity style={s.addBtn} onPress={() => {
              setAlName(''); setAlAddr(''); setAlColor(TEAL); setLocSuggestions([]);
              setShowAddLocation(true);
            }}>
              <Ionicons name="add" size={22} color="#000" />
              <ThemedText style={s.addBtnText}>Add Location</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab bar */}
        <View style={s.tabs}>
          {(['log', 'ai', 'locations'] as TabType[]).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <ThemedText style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'log' ? 'Log' : t === 'ai' ? 'AI Import' : 'Locations'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── LOG TAB ── */}
        {tab === 'log' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.logContent}>
            {/* Pool filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.poolScroll}
              contentContainerStyle={s.poolRow}>
              {([
                { key: 'all',      label: 'All' },
                { key: 'business', label: 'Business' },
                ...teams.map(t => ({ key: t.id, label: t.name })),
              ] as { key: string; label: string }[]).map(p => (
                <TouchableOpacity key={p.key} style={[s.poolChip, pool === p.key && s.poolChipActive]}
                  onPress={() => setPool(p.key)}>
                  <ThemedText style={[s.poolChipText, pool === p.key && s.poolChipTextActive]}>{p.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* View mode toggle */}
            <View style={s.viewToggleRow}>
              {(['day', 'week', 'month'] as ViewMode[]).map(v => (
                <TouchableOpacity key={v} style={[s.viewToggleBtn, viewMode === v && s.viewToggleBtnActive]}
                  onPress={() => setViewMode(v)}>
                  <ThemedText style={[s.viewToggleText, viewMode === v && s.viewToggleTextActive]}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nav bar */}
            {/* Week navigation — always visible so you can browse weeks while selecting */}
            <View style={s.weekNav}>
              <TouchableOpacity style={s.weekNavBtn} onPress={() => {
                if (viewMode === 'day') setSelectedDate(localDateStr(addDays(new Date(selectedDate + 'T12:00:00'), -1)));
                else if (viewMode === 'month') { const m = new Date(weekOf); m.setMonth(m.getMonth() - 1); setWeekOf(weekSunday(m)); }
                else setWeekOf(addDays(weekOf, -7));
              }}>
                <Ionicons name="chevron-back" size={18} color={TEXT} />
              </TouchableOpacity>
              {!selectMode && (
                <TouchableOpacity style={s.todayBtn} onPress={() => {
                  const t = new Date();
                  setSelectedDate(todayStr());
                  setWeekOf(weekSunday(t));
                }}>
                  <ThemedText style={s.todayBtnText}>Today</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.weekNavBtn} onPress={() => {
                if (viewMode === 'day') setSelectedDate(localDateStr(addDays(new Date(selectedDate + 'T12:00:00'), 1)));
                else if (viewMode === 'month') { const m = new Date(weekOf); m.setMonth(m.getMonth() + 1); setWeekOf(weekSunday(m)); }
                else setWeekOf(addDays(weekOf, 7));
              }}>
                <Ionicons name="chevron-forward" size={18} color={TEXT} />
              </TouchableOpacity>
              <ThemedText style={[s.weekRangeText, { flex: 1 }]}>
                {viewMode === 'day'
                  ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  : viewMode === 'month'
                  ? fmtMonthYear(weekOf)
                  : `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                }
              </ThemedText>
              {!selectMode
                ? <TouchableOpacity style={s.selectModeBtn} onPress={() => setSelectMode(true)}>
                    <ThemedText style={s.selectModeBtnText}>Select</ThemedText>
                  </TouchableOpacity>
                : null}
            </View>

            {/* Select mode action bar */}
            {selectMode && (
              <View style={[s.weekNav, { marginTop: 4 }]}>
                <TouchableOpacity style={s.cancelSelectBtn} onPress={exitSelect}>
                  <ThemedText style={s.cancelSelectBtnText}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={[s.selectCountText, { flex: 1 }]}>
                  {selectedIds.size} selected
                </ThemedText>
                <TouchableOpacity
                  style={[s.selectModeBtn, { backgroundColor: CARD, borderColor: BORDER }, selectedIds.size === 0 && { opacity: 0.4 }]}
                  onPress={() => selectedIds.size > 0 && setShowGroupEdit(true)}>
                  <ThemedText style={s.selectModeBtnText}>Edit</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.selectModeBtn, { backgroundColor: TEAL }, selectedIds.size === 0 && { opacity: 0.4 }]}
                  onPress={() => selectedIds.size > 0 && setShowCreateSheet(true)}>
                  <ThemedText style={[s.selectModeBtnText, { color: '#000' }]}>Create</ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* ── DAY VIEW ── */}
            {viewMode === 'day' && (() => {
              const daySlots = (byDateMonth.get(selectedDate) ?? byDate.get(selectedDate) ?? [])
                .slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
              return (
                <View style={{ marginBottom: 16 }}>
                  {daySlots.length === 0 && (
                    <View style={s.emptyDayBig}>
                      <Ionicons name="snow-outline" size={32} color={MUTED} />
                      <ThemedText style={s.emptyDayBigText}>No ice slots</ThemedText>
                    </View>
                  )}
                  {daySlots.map(slot => {
                    const loc = locationMap.get(slot.location_id ?? '') ?? (slot.rink_id ? locationMap.get(slot.rink_id) : undefined);
                    const linked = !!slot.allocated_to_id;
                    const isSelected = selectedIds.has(slot.id);
                    return (
                      <TouchableOpacity key={slot.id}
                        style={[s.slotRow, { borderLeftColor: linked ? TEAL : ORANGE }, isSelected && s.slotRowSelected]}
                        onPress={() => {
                          if (selectMode) { toggleSelect(slot.id); return; }
                          setSelSlot(slot); setEditMode(false);
                          setEditLocation(slot.location_id ?? ''); setEditStart(slot.start_time);
                          setEditEnd(slot.end_time); setEditNotes(slot.notes ?? '');
                          setEditCost(slot.cost != null && slot.cost > 0 ? String(slot.cost) : '');
                          setAllocTab('camp'); loadAllocEvents('camp', slot.slot_date);
                        }}>
                        {selectMode && (
                          <View style={[s.slotCheckbox, isSelected && s.slotCheckboxChecked]}>
                            {isSelected && <Ionicons name="checkmark" size={10} color="#000" />}
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <ThemedText style={s.slotRowTime}>
                            {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                            {'  '}{slotHours(slot.start_time, slot.end_time).toFixed(1)}h
                          </ThemedText>
                          {loc && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <View style={[s.slotRinkDot, { backgroundColor: loc.color }]} />
                              <ThemedText style={s.slotRowRink}>{loc.name}</ThemedText>
                            </View>
                          )}
                          {linked && <ThemedText style={s.slotRowLinked}>{slot.allocated_to_name}</ThemedText>}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          {slot.cost != null && slot.cost > 0 && (
                            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: ORANGE }}>
                              ${slot.cost.toFixed(2)}
                            </ThemedText>
                          )}
                          <View style={[s.slotStatusBadge, { backgroundColor: linked ? 'rgba(0,196,180,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                            <ThemedText style={[s.slotStatusText, { color: linked ? TEAL : ORANGE }]}>
                              {linked ? 'Linked' : 'Unlinked'}
                            </ThemedText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}

            {/* ── WEEK VIEW (vertical) ── */}
            {viewMode === 'week' && (
              <View style={{ marginBottom: 16 }}>
                {weekDays.map((day, i) => {
                  const ds = weekDateStrs[i];
                  const isToday = ds === today;
                  const daySlots = (byDate.get(ds) ?? []).slice().sort((a,b) => a.start_time.localeCompare(b.start_time));
                  return (
                    <View key={ds} style={{ marginBottom: 4 }}>
                      {/* Day header */}
                      <TouchableOpacity style={s.weekDayHeader}
                        onPress={() => { setSelectedDate(ds); setViewMode('day'); }}>
                        <View style={[s.dayNumWrap, isToday && s.dayNumWrapToday]}>
                          <ThemedText style={[s.dayNum, isToday && s.dayNumToday]}>{day.getDate()}</ThemedText>
                        </View>
                        <ThemedText style={[s.weekDayName, isToday && { color: TEAL }]}>
                          {DAY_NAMES[i]}{isToday ? ' · Today' : ''}
                        </ThemedText>
                        {daySlots.length > 0 && (
                          <ThemedText style={s.weekDayCount}>{daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}</ThemedText>
                        )}
                      </TouchableOpacity>
                      {daySlots.map(slot => {
                        const loc = locationMap.get(slot.location_id ?? '') ?? (slot.rink_id ? locationMap.get(slot.rink_id) : undefined);
                        const linked = !!slot.allocated_to_id;
                        const isSelected = selectedIds.has(slot.id);
                        return (
                          <TouchableOpacity key={slot.id}
                            style={[s.slotRow, { borderLeftColor: linked ? TEAL : ORANGE }, isSelected && s.slotRowSelected]}
                            onPress={() => {
                              if (selectMode) { toggleSelect(slot.id); return; }
                              setSelSlot(slot); setEditMode(false);
                              setEditLocation(slot.location_id ?? ''); setEditStart(slot.start_time);
                              setEditEnd(slot.end_time); setEditNotes(slot.notes ?? '');
                              setAllocTab('camp'); loadAllocEvents('camp', slot.slot_date);
                            }}>
                            {selectMode && (
                              <View style={[s.slotCheckbox, isSelected && s.slotCheckboxChecked]}>
                                {isSelected && <Ionicons name="checkmark" size={10} color="#000" />}
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <ThemedText style={s.slotRowTime}>
                                {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                                {'  '}{slotHours(slot.start_time, slot.end_time).toFixed(1)}h
                              </ThemedText>
                              {loc && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                  <View style={[s.slotRinkDot, { backgroundColor: loc.color }]} />
                                  <ThemedText style={s.slotRowRink}>{loc.name}</ThemedText>
                                </View>
                              )}
                              {linked && <ThemedText style={s.slotRowLinked}>{slot.allocated_to_name}</ThemedText>}
                            </View>
                            <View style={[s.slotStatusBadge, { backgroundColor: linked ? 'rgba(0,196,180,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                              <ThemedText style={[s.slotStatusText, { color: linked ? TEAL : ORANGE }]}>
                                {linked ? 'Linked' : 'Unlinked'}
                              </ThemedText>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {daySlots.length === 0 && (
                        <View style={s.emptyDayRow}>
                          <ThemedText style={s.emptyDayRowText}>No slots</ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── MONTH VIEW ── */}
            {viewMode === 'month' && (() => {
              const year  = weekOf.getFullYear();
              const month = weekOf.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells: (number | null)[] = [
                ...Array(firstDay).fill(null),
                ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
              ];
              while (cells.length % 7 !== 0) cells.push(null);
              return (
                <View style={{ marginBottom: 16 }}>
                  {/* Day-of-week headers */}
                  <View style={s.calHeaderRow}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <ThemedText key={d} style={s.calHeaderCell}>{d}</ThemedText>
                    ))}
                  </View>
                  {/* Weeks */}
                  {Array.from({ length: cells.length / 7 }, (_, wi) => (
                    <View key={wi} style={s.calWeekRow}>
                      {cells.slice(wi * 7, wi * 7 + 7).map((day, ci) => {
                        if (day === null) return <View key={ci} style={s.calCell} />;
                        const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const daySlots = byDateMonth.get(ds) ?? [];
                        const isToday = ds === today;
                        const linkedCount = daySlots.filter(s => s.allocated_to_id).length;
                        return (
                          <TouchableOpacity key={ci} style={s.calCell}
                            onPress={() => { setSelectedDate(ds); setWeekOf(weekSunday(new Date(ds + 'T12:00:00'))); setViewMode('day'); }}>
                            <View style={[s.calDayNum, isToday && s.calDayNumToday]}>
                              <ThemedText style={[s.calDayText, isToday && { color: '#000' }]}>{day}</ThemedText>
                            </View>
                            {daySlots.length > 0 && (
                              <View style={s.calDots}>
                                {daySlots.slice(0, 3).map((_, di) => (
                                  <View key={di} style={[s.calDot, { backgroundColor: di < linkedCount ? TEAL : ORANGE }]} />
                                ))}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* THIS MONTH stats */}
            <View style={s.monthCard}>
              <ThemedText style={s.monthTitle}>
                {fmtMonthYear(weekOf).toUpperCase()}
              </ThemedText>
              <View style={s.monthStats}>
                <View style={s.statBox}>
                  <ThemedText style={s.statNum}>{monthStats.total.toFixed(1)}</ThemedText>
                  <ThemedText style={s.statLabel}>Total hours</ThemedText>
                </View>
                <View style={s.statBox}>
                  <ThemedText style={[s.statNum, { color: TEAL }]}>
                    {monthStats.total_count === 0 ? '—' : `${Math.round(monthStats.linked / monthStats.total_count * 100)}%`}
                  </ThemedText>
                  <ThemedText style={s.statLabel}>Linked</ThemedText>
                </View>
                <View style={s.statBox}>
                  <ThemedText style={s.statNum}>{monthStats.rinks}</ThemedText>
                  <ThemedText style={s.statLabel}>Locations</ThemedText>
                </View>
              </View>
              {/* Per-location breakdown */}
              {[...monthStats.perRink.entries()].map(([rid, hrs]) => {
                const loc = locationMap.get(rid);
                return (
                  <View key={rid} style={s.rinkRow}>
                    <View style={[s.rinkDot, { backgroundColor: loc?.color ?? MUTED }]} />
                    <ThemedText style={s.rinkRowName}>{loc?.name ?? 'Unknown'}</ThemedText>
                    <ThemedText style={s.rinkRowHrs}>{hrs.toFixed(1)}h</ThemedText>
                  </View>
                );
              })}
              {monthStats.total_count === 0 && (
                <ThemedText style={s.noSlotsNote}>No ice slots this month. Tap + to add one.</ThemedText>
              )}
            </View>
          </ScrollView>
        )}

        {/* ── AI IMPORT TAB ── */}
        {tab === 'ai' && (
          <ScrollView contentContainerStyle={s.aiContent} showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ── UPLOAD STATE ── */}
            {aiState === 'upload' && (
              <>
                <View style={s.aiHero}>
                  <View style={s.aiIconWrap}>
                    <Ionicons name="document-text-outline" size={40} color={GREEN} />
                  </View>
                  <ThemedText style={s.aiTitle}>Import Ice Contract</ThemedText>
                  <ThemedText style={s.aiSub}>
                    Photograph or screenshot your ice contract. AI reads every slot and adds them to your log instantly.
                  </ThemedText>
                  <View style={s.aiBadgeRow}>
                    <View style={s.aiBadge}><ThemedText style={s.aiBadgeText}>AI</ThemedText></View>
                    <ThemedText style={s.aiBadgeSub}>Reads rink names, dates & times</ThemedText>
                  </View>
                </View>

                <View style={s.uploadBtnRow}>
                  <TouchableOpacity style={s.uploadBtn} onPress={openCamera}>
                    <Ionicons name="camera-outline" size={26} color={TEAL} />
                    <ThemedText style={s.uploadBtnTitle}>Camera</ThemedText>
                    <ThemedText style={s.uploadBtnSub}>Photograph a contract</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.uploadBtn} onPress={pickImage}>
                    <Ionicons name="images-outline" size={26} color={BLUE} />
                    <ThemedText style={s.uploadBtnTitle}>Photo Library</ThemedText>
                    <ThemedText style={s.uploadBtnSub}>Screenshot or image</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.uploadBtn} onPress={pickDocument}>
                    <Ionicons name="document-text-outline" size={26} color={ORANGE} />
                    <ThemedText style={s.uploadBtnTitle}>Document</ThemedText>
                    <ThemedText style={s.uploadBtnSub}>PDF or file</ThemedText>
                  </TouchableOpacity>
                </View>

                <ThemedText style={s.sectionLabel}>WHAT GETS EXTRACTED</ThemedText>
                {[
                  { icon: 'calendar-outline', text: 'Every booked date and time slot' },
                  { icon: 'location-outline', text: 'Rink name and pad number' },
                  { icon: 'link-outline',     text: 'Auto-linked to matching events' },
                  { icon: 'bar-chart-outline',text: 'Hours tracked per rink, per month' },
                ].map((f, i) => (
                  <View key={i} style={s.aiFeature}>
                    <View style={s.aiFeatureIcon}>
                      <Ionicons name={f.icon as any} size={18} color={BLUE} />
                    </View>
                    <ThemedText style={s.aiFeatureText}>{f.text}</ThemedText>
                  </View>
                ))}
              </>
            )}

            {/* ── PARSING STATE ── */}
            {aiState === 'parsing' && (
              <View style={s.parsingWrap}>
                <View style={s.parsingCard}>
                  <ActivityIndicator size="large" color={TEAL} />
                  <ThemedText style={s.parsingTitle}>Reading your contract…</ThemedText>
                  <ThemedText style={s.parsingSub}>AI is extracting all ice slots. This takes about 10 seconds.</ThemedText>
                  <View style={s.parsingSteps}>
                    {['Analyzing image', 'Finding time slots', 'Parsing dates & times', 'Building your schedule'].map((step, i) => (
                      <View key={i} style={s.parsingStep}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={MUTED} />
                        <ThemedText style={s.parsingStepText}>{step}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* ── PREVIEW STATE ── */}
            {aiState === 'preview' && (
              <>
                {/* Success header */}
                <View style={s.previewHeader}>
                  <View style={s.previewHeaderIcon}>
                    <Ionicons name="checkmark-circle" size={28} color={GREEN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.previewHeaderTitle}>
                      {parsedSlots.filter(s => !s._removed).length} slots found
                    </ThemedText>
                    <ThemedText style={s.previewHeaderSub}>Review and confirm before saving</ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => { setAiState('upload'); setParsedSlots([]); }}>
                    <ThemedText style={{ color: MUTED, fontSize: 13 }}>Start over</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Contract name */}
                <ThemedText style={s.fieldLabel}>CONTRACT NAME</ThemedText>
                <TextInput style={s.input} value={aiContractName}
                  onChangeText={setAiContractName} placeholder="e.g. Semiahmoo Summer Contract"
                  placeholderTextColor={MUTED} />

                {/* Location picker */}
                <ThemedText style={s.fieldLabel}>LOCATION</ThemedText>
                {aiRinkName ? (
                  <ThemedText style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
                    AI found: <ThemedText style={{ color: ORANGE }}>{aiRinkName}</ThemedText>
                    {' '}— select your actual location below or create a new one.
                  </ThemedText>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                  <TouchableOpacity
                    style={[s.chipSm, aiLocationId === '' && s.chipSmActive]}
                    onPress={() => setAiLocationId('')}>
                    <ThemedText style={[s.chipSmText, aiLocationId === '' && s.chipSmTextActive]}>
                      + New
                    </ThemedText>
                  </TouchableOpacity>
                  {locations.map(l => (
                    <TouchableOpacity key={l.id}
                      style={[s.chipSm, aiLocationId === l.id && s.chipSmActive]}
                      onPress={() => setAiLocationId(l.id)}>
                      <View style={[s.chipDot, { backgroundColor: l.color }]} />
                      <ThemedText style={[s.chipSmText, aiLocationId === l.id && s.chipSmTextActive]}>
                        {l.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {aiLocationId === '' && (
                  <TextInput style={[s.input, { marginBottom: 0 }]} value={aiNewLocName}
                    onChangeText={setAiNewLocName} placeholder="New location name"
                    placeholderTextColor={MUTED} />
                )}

                {/* Bulk cost fill */}
                <ThemedText style={[s.fieldLabel, { marginTop: 16 }]}>SET ALL COSTS ($)</ThemedText>
                <ThemedText style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
                  Fill this to apply one cost to every slot, then edit individual slots below to override.
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    value={aiBulkCost}
                    onChangeText={setAiBulkCost}
                    placeholder="e.g. 325.00"
                    placeholderTextColor={MUTED}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity
                    style={{ backgroundColor: TEAL, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 }}
                    onPress={() => {
                      const val = parseFloat(aiBulkCost);
                      if (isNaN(val)) return;
                      setParsedSlots(prev => prev.map(s => ({ ...s, cost: val })));
                    }}>
                    <ThemedText style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>Apply</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Pool */}
                <ThemedText style={s.fieldLabel}>POOL</ThemedText>
                <View style={s.poolToggle}>
                  {(['business', 'team'] as const).map(p => (
                    <TouchableOpacity key={p} style={[s.poolToggleBtn, aiPool === p && s.poolToggleBtnActive]}
                      onPress={() => setAiPool(p)}>
                      <ThemedText style={[s.poolToggleText, aiPool === p && s.poolToggleTextActive]}>
                        {p === 'business' ? 'Business' : 'Team'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {aiPool === 'team' && (
                  <>
                    <ThemedText style={[s.fieldLabel, { marginTop: 12 }]}>TEAM</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
                      contentContainerStyle={{ gap: 8 }}>
                      {teams.map(t => (
                        <TouchableOpacity key={t.id} style={[s.chipSm, aiTeam === t.id && s.chipSmActive]}
                          onPress={() => setAiTeam(t.id)}>
                          <ThemedText style={[s.chipSmText, aiTeam === t.id && s.chipSmTextActive]}>{t.name}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* Slot list */}
                <ThemedText style={[s.sectionLabel, { marginTop: 8 }]}>EXTRACTED SLOTS</ThemedText>
                {parsedSlots.map((slot, i) => (
                  <View key={i} style={[s.parsedSlotRow, slot._removed && s.parsedSlotRowRemoved]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[s.parsedSlotDate, slot._removed && { color: MUTED }]}>
                        {(() => {
                          const d = new Date(slot.date + 'T12:00:00');
                          return isNaN(d.getTime()) ? slot.date :
                            d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        })()}
                      </ThemedText>
                      <ThemedText style={[s.parsedSlotTime, slot._removed && { color: MUTED }]}>
                        {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                        {'  ·  '}{slotHours(slot.start_time, slot.end_time).toFixed(1)}h
                        {slot.rink_name ? `  ·  ${slot.rink_name}` : ''}
                      </ThemedText>
                      {!slot._removed && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                          <ThemedText style={{ fontSize: 11, color: MUTED }}>$</ThemedText>
                          <TextInput
                            style={s.slotCostInput}
                            value={slot.cost != null && slot.cost > 0 ? String(slot.cost) : ''}
                            onChangeText={v => {
                              const num = v === '' ? null : parseFloat(v);
                              setParsedSlots(prev => prev.map((s, j) =>
                                j === i ? { ...s, cost: num != null && !isNaN(num) ? num : null } : s
                              ));
                            }}
                            placeholder="Cost"
                            placeholderTextColor={MUTED}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => setParsedSlots(prev => prev.map((s, j) => j === i ? { ...s, _removed: !s._removed } : s))}
                      hitSlop={12}>
                      <Ionicons
                        name={slot._removed ? 'add-circle-outline' : 'close-circle-outline'}
                        size={22}
                        color={slot._removed ? TEAL : MUTED}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Save CTA */}
                <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={saveAiSlots} disabled={aiSaving}>
                  {aiSaving
                    ? <ActivityIndicator color="#000" />
                    : <ThemedText style={s.ctaBtnText}>
                        Save {parsedSlots.filter(s => !s._removed).length} Slots
                      </ThemedText>
                  }
                </TouchableOpacity>
              </>
            )}

          </ScrollView>
        )}

        {/* ── LOCATIONS TAB ── */}
        {tab === 'locations' && (
          <ScrollView contentContainerStyle={s.rinksContent} showsVerticalScrollIndicator={false}>
            <ThemedText style={[s.fieldLabel, { marginBottom: 12 }]}>
              Locations are shared across ice slots, camps, practices, and privates.
            </ThemedText>
            {locations.length === 0 && (
              <View style={s.emptyRinks}>
                <Ionicons name="location-outline" size={40} color={MUTED} />
                <ThemedText style={s.emptyRinksText}>No locations saved yet.</ThemedText>
                <ThemedText style={s.emptyRinksSub}>Tap "Add Location" to add an arena, rink, or dryland facility.</ThemedText>
              </View>
            )}
            {locations.map(l => (
              <View key={l.id} style={s.rinkCard}>
                <View style={[s.rinkCardDot, { backgroundColor: l.color }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.rinkCardName}>{l.name}</ThemedText>
                  {l.address && <ThemedText style={s.rinkCardAddr}>{l.address}</ThemedText>}
                </View>
                <TouchableOpacity onPress={() => deleteLocation(l.id)} hitSlop={12}>
                  <Ionicons name="trash-outline" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

      </SafeAreaView>

      {/* ── CREATE EVENT SHEET ───────────────────────────────────────────────── */}
      <Modal visible={showCreateSheet} transparent animationType="slide"
        onRequestClose={() => { setShowCreateSheet(false); setCreateType(null); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.overlay} activeOpacity={1}
          onPress={() => { setShowCreateSheet(false); setCreateType(null); }}>
          <TouchableOpacity style={[s.sheet, s.sheetTall]} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />

            {/* Slot summary */}
            <View style={s.createSummary}>
              <View style={s.createSummaryBadge}>
                <ThemedText style={s.createSummaryBadgeText}>{selectedIds.size}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.createSummaryTitle}>
                  {selectedIds.size} ice slot{selectedIds.size !== 1 ? 's' : ''} selected
                </ThemedText>
                <ThemedText style={s.createSummarySub}>
                  {selectedSlots.length > 0 && (() => {
                    const sorted = [...selectedSlots].sort((a,b) => a.slot_date.localeCompare(b.slot_date));
                    const first = new Date(sorted[0].slot_date + 'T12:00:00');
                    const last  = new Date(sorted[sorted.length-1].slot_date + 'T12:00:00');
                    if (sorted.length === 1)
                      return first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                  })()}
                </ThemedText>
              </View>
            </View>

            {/* Type picker */}
            {!createType && (
              <>
                <ThemedText style={s.fieldLabel}>WHAT ARE THESE SLOTS FOR?</ThemedText>
                {([
                  { key: 'camp',    label: 'Camp',     sub: 'Multi-day program', icon: 'snow-outline',       color: ORANGE },
                  { key: 'session', label: 'Practices', sub: `${selectedIds.size} individual sessions`, icon: 'fitness-outline', color: TEAL },
                  { key: 'private', label: 'Private',  sub: 'Private lesson series', icon: 'person-outline',  color: PURPLE },
                  { key: 'game',    label: 'Game',     sub: 'Single game slot', icon: 'trophy-outline',       color: '#EAB308' },
                ] as { key: CreateType; label: string; sub: string; icon: any; color: string }[]).map(opt => (
                  <TouchableOpacity key={opt.key} style={s.createTypeRow}
                    onPress={() => setCreateType(opt.key)}>
                    <View style={[s.createTypeIcon, { backgroundColor: `${opt.color}22` }]}>
                      <Ionicons name={opt.icon} size={22} color={opt.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.createTypeLabel}>{opt.label}</ThemedText>
                      <ThemedText style={s.createTypeSub}>{opt.sub}</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={MUTED} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Camp form */}
            {createType === 'camp' && (
              <>
                <TouchableOpacity style={s.backRow} onPress={() => setCreateType(null)}>
                  <Ionicons name="chevron-back" size={16} color={MUTED} />
                  <ThemedText style={s.backRowText}>Back</ThemedText>
                </TouchableOpacity>
                <ThemedText style={s.sheetTitle}>Create Camp</ThemedText>
                <ThemedText style={s.fieldLabel}>CAMP NAME</ThemedText>
                <TextInput style={s.input} value={cName} onChangeText={setCName}
                  placeholder="e.g. Summer Skills Camp" placeholderTextColor={MUTED} />
                <ThemedText style={s.fieldLabel}>TYPE</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
                  {['camp', 'clinic', 'showcase', 'tryout'].map(t => (
                    <TouchableOpacity key={t} style={[s.chipSm, cType === t && s.chipSmActive]}
                      onPress={() => setCType(t)}>
                      <ThemedText style={[s.chipSmText, cType === t && s.chipSmTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={s.ctaBtn} onPress={createFromSlots} disabled={creating}>
                  {creating ? <ActivityIndicator color="#000" /> :
                    <ThemedText style={s.ctaBtnText}>
                      Create Camp + Link {selectedIds.size} Slots
                    </ThemedText>}
                </TouchableOpacity>
              </>
            )}

            {/* Practices / Sessions form */}
            {createType === 'session' && (
              <>
                <TouchableOpacity style={s.backRow} onPress={() => setCreateType(null)}>
                  <Ionicons name="chevron-back" size={16} color={MUTED} />
                  <ThemedText style={s.backRowText}>Back</ThemedText>
                </TouchableOpacity>
                <ThemedText style={s.sheetTitle}>Create {selectedIds.size} Practices</ThemedText>
                <ThemedText style={s.fieldLabel}>SESSION TITLE</ThemedText>
                <TextInput style={s.input} value={sTitle} onChangeText={setSTitle}
                  placeholder="Practice" placeholderTextColor={MUTED} />
                <ThemedText style={s.fieldLabel}>TEAM (optional)</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity style={[s.chipSm, sTeam === '' && s.chipSmActive]}
                    onPress={() => setSTeam('')}>
                    <ThemedText style={[s.chipSmText, sTeam === '' && s.chipSmTextActive]}>No team</ThemedText>
                  </TouchableOpacity>
                  {teams.map(t => (
                    <TouchableOpacity key={t.id} style={[s.chipSm, sTeam === t.id && s.chipSmActive]}
                      onPress={() => setSTeam(t.id)}>
                      <ThemedText style={[s.chipSmText, sTeam === t.id && s.chipSmTextActive]}>{t.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={s.ctaBtn} onPress={createFromSlots} disabled={creating}>
                  {creating ? <ActivityIndicator color="#000" /> :
                    <ThemedText style={s.ctaBtnText}>
                      Create {selectedIds.size} Sessions
                    </ThemedText>}
                </TouchableOpacity>
              </>
            )}

            {/* Private form */}
            {createType === 'private' && (
              <>
                <TouchableOpacity style={s.backRow} onPress={() => setCreateType(null)}>
                  <Ionicons name="chevron-back" size={16} color={MUTED} />
                  <ThemedText style={s.backRowText}>Back</ThemedText>
                </TouchableOpacity>
                <ThemedText style={s.sheetTitle}>Create Private</ThemedText>
                <ThemedText style={s.fieldLabel}>CLIENT / LESSON NAME</ThemedText>
                <TextInput style={s.input} value={pName} onChangeText={setPName}
                  placeholder="e.g. Smith Private Lessons" placeholderTextColor={MUTED} />
                <TouchableOpacity style={s.ctaBtn} onPress={createFromSlots} disabled={creating}>
                  {creating ? <ActivityIndicator color="#000" /> :
                    <ThemedText style={s.ctaBtnText}>
                      Create Private + Link {selectedIds.size} Slots
                    </ThemedText>}
                </TouchableOpacity>
              </>
            )}

            {/* Game form */}
            {createType === 'game' && (
              <>
                <TouchableOpacity style={s.backRow} onPress={() => setCreateType(null)}>
                  <Ionicons name="chevron-back" size={16} color={MUTED} />
                  <ThemedText style={s.backRowText}>Back</ThemedText>
                </TouchableOpacity>
                <ThemedText style={s.sheetTitle}>Create Game</ThemedText>
                <ThemedText style={s.fieldLabel}>OPPONENT</ThemedText>
                <TextInput style={s.input} value={gOpponent} onChangeText={setGOpponent}
                  placeholder="e.g. Burnaby Winter Club" placeholderTextColor={MUTED} />
                <ThemedText style={s.fieldLabel}>TEAM</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
                  {teams.map(t => (
                    <TouchableOpacity key={t.id} style={[s.chipSm, gTeam === t.id && s.chipSmActive]}
                      onPress={() => setGTeam(t.id)}>
                      <ThemedText style={[s.chipSmText, gTeam === t.id && s.chipSmTextActive]}>{t.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={s.ctaBtn} onPress={createFromSlots} disabled={creating}>
                  {creating ? <ActivityIndicator color="#000" /> :
                    <ThemedText style={s.ctaBtnText}>Create Game</ThemedText>}
                </TouchableOpacity>
              </>
            )}

          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CAMERA MODAL ─────────────────────────────────────────────────────── */}
      <Modal visible={showCamera} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

          {/* Instructions */}
          <View style={s.camTip}>
            <ThemedText style={s.camTipText}>Point at your ice contract — make sure all rows are visible</ThemedText>
          </View>

          {/* Capture button */}
          <View style={s.camControls}>
            <TouchableOpacity style={s.camCancel} onPress={() => setShowCamera(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.camCapture} onPress={captureAndParse}>
              <View style={s.camCaptureInner} />
            </TouchableOpacity>
            <View style={{ width: 52 }} />
          </View>
        </View>
      </Modal>

      {/* ── ADD SLOT MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={showAddSlot} transparent animationType="slide" onRequestClose={() => setShowAddSlot(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAddSlot(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <ThemedText style={s.sheetTitle}>Add Ice Slot</ThemedText>

            <ThemedText style={s.fieldLabel}>LOCATION</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              <TouchableOpacity style={[s.chipSm, asLocation === '' && s.chipSmActive]} onPress={() => setAsLocation('')}>
                <ThemedText style={[s.chipSmText, asLocation === '' && s.chipSmTextActive]}>No location</ThemedText>
              </TouchableOpacity>
              {locations.map(l => (
                <TouchableOpacity key={l.id} style={[s.chipSm, asLocation === l.id && s.chipSmActive]} onPress={() => setAsLocation(l.id)}>
                  <View style={[s.chipDot, { backgroundColor: l.color }]} />
                  <ThemedText style={[s.chipSmText, asLocation === l.id && s.chipSmTextActive]}>{l.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ThemedText style={s.fieldLabel}>DATE</ThemedText>
            <View style={{ marginBottom: 16 }}>
              <DatePicker value={asDate} onChange={(v: string) => { if (v) setAsDate(v); }} />
            </View>

            <View style={s.timeRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.fieldLabel}>START</ThemedText>
                <TimePicker value={asStart} onChange={v => v && setAsStart(v)} />
              </View>
              <View style={s.timeSep}><ThemedText style={{ color: MUTED }}>–</ThemedText></View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.fieldLabel}>END</ThemedText>
                <TimePicker value={asEnd} onChange={v => v && setAsEnd(v)} />
              </View>
            </View>

            <ThemedText style={[s.fieldLabel, { marginTop: 16 }]}>POOL</ThemedText>
            <View style={s.poolToggle}>
              {(['business', 'team'] as const).map(p => (
                <TouchableOpacity key={p} style={[s.poolToggleBtn, asPool === p && s.poolToggleBtnActive]}
                  onPress={() => setAsPool(p)}>
                  <ThemedText style={[s.poolToggleText, asPool === p && s.poolToggleTextActive]}>
                    {p === 'business' ? 'Business' : 'Team'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {asPool === 'team' && (
              <>
                <ThemedText style={[s.fieldLabel, { marginTop: 12 }]}>TEAM</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
                  contentContainerStyle={{ gap: 8 }}>
                  {teams.map(t => (
                    <TouchableOpacity key={t.id} style={[s.chipSm, asTeam === t.id && s.chipSmActive]}
                      onPress={() => setAsTeam(t.id)}>
                      <ThemedText style={[s.chipSmText, asTeam === t.id && s.chipSmTextActive]}>{t.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <ThemedText style={[s.fieldLabel, { marginBottom: 8 }]}>ICE COST ($) (optional)</ThemedText>
            <TextInput style={[s.input, { marginBottom: 16 }]} value={asCost} onChangeText={setAsCost}
              placeholder="e.g. 325.00" placeholderTextColor={MUTED} keyboardType="decimal-pad" />

            <TouchableOpacity style={s.ctaBtn} onPress={saveSlot} disabled={asSaving}>
              <ThemedText style={s.ctaBtnText}>{asSaving ? 'Saving…' : 'Add Slot'}</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── ADD LOCATION MODAL ────────────────────────────────────────────────── */}
      <Modal visible={showAddLocation} transparent animationType="slide" onRequestClose={() => setShowAddLocation(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAddLocation(false)}>
            <TouchableOpacity style={[s.sheet, s.sheetTall]} activeOpacity={1} onPress={() => {}}>
              <View style={s.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <ThemedText style={s.sheetTitle}>Add Location</ThemedText>
                <ThemedText style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
                  Ice rink, dryland facility, gym, or any venue. Shared across camps, sessions, and ice slots.
                </ThemedText>

                {/* Name + Places search */}
                <ThemedText style={s.fieldLabel}>NAME / SEARCH</ThemedText>
                <View style={{ position: 'relative', marginBottom: locSuggestions.length > 0 ? 4 : 16 }}>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Semiahmoo Twin Rink, Newton Recreation Centre"
                    placeholderTextColor={MUTED}
                    value={alName}
                    onChangeText={searchLocationPlaces}
                    autoCorrect={false}
                  />
                  {locSearching && (
                    <View style={{ position: 'absolute', right: 14, top: 14 }}>
                      <ActivityIndicator size="small" color={TEAL} />
                    </View>
                  )}
                </View>

                {/* Places suggestions */}
                {locSuggestions.length > 0 && (
                  <View style={s.suggestionsBox}>
                    {locSuggestions.map(sug => (
                      <TouchableOpacity
                        key={sug.place_id}
                        style={s.suggestionRow}
                        onPress={() => pickLocationSuggestion(sug)}
                      >
                        <Ionicons name="location-outline" size={15} color={TEAL} style={{ marginTop: 1 }} />
                        <ThemedText style={s.suggestionText} numberOfLines={2}>{sug.description}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Address (auto-filled from Places or manual) */}
                {alAddr ? (
                  <View style={s.addrRow}>
                    <Ionicons name="location-outline" size={14} color={MUTED} />
                    <ThemedText style={s.addrText} numberOfLines={2}>{alAddr}</ThemedText>
                  </View>
                ) : null}

                <ThemedText style={[s.fieldLabel, { marginTop: 16 }]}>COLOR</ThemedText>
                <View style={s.colorRow}>
                  {LOCATION_COLORS.map(c => (
                    <TouchableOpacity key={c} style={[s.colorSwatch, { backgroundColor: c }, alColor === c && s.colorSwatchSel]}
                      onPress={() => setAlColor(c)} />
                  ))}
                </View>

                <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={saveLocation} disabled={alSaving}>
                  <ThemedText style={s.ctaBtnText}>{alSaving ? 'Saving…' : 'Add Location'}</ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── SLOT DETAIL / ALLOCATION MODAL ───────────────────────────────────── */}
      {selSlot && (
        <Modal visible transparent animationType="slide" onRequestClose={() => { setSelSlot(null); setEditMode(false); setShowSplit(false); }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { setSelSlot(null); setEditMode(false); setShowSplit(false); }}>
            <TouchableOpacity style={[s.sheet, s.sheetTall]} activeOpacity={1} onPress={() => {}}>
              <View style={s.sheetHandle} />

              {/* Slot info header */}
              <View style={s.allocHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.allocDate}>
                    {new Date(selSlot.slot_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </ThemedText>
                  <ThemedText style={s.allocTime}>
                    {fmtTime(selSlot.start_time)} – {fmtTime(selSlot.end_time)}
                    {'  '}{slotHours(selSlot.start_time, selSlot.end_time).toFixed(1)}h
                  </ThemedText>
                  {(() => {
                    const slotLoc = locationMap.get(selSlot.location_id ?? '') ?? locationMap.get(selSlot.rink_id ?? '');
                    return slotLoc ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={[s.rinkDot, { backgroundColor: slotLoc.color }]} />
                        <ThemedText style={s.allocRink}>{slotLoc.name}</ThemedText>
                      </View>
                    ) : null;
                  })()}
                </View>
                <View style={[s.allocBadge, { backgroundColor: selSlot.allocated_to_id ? 'rgba(0,196,180,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                  <ThemedText style={[s.allocBadgeText, { color: selSlot.allocated_to_id ? TEAL : ORANGE }]}>
                    {selSlot.allocated_to_id ? 'Linked' : 'Unlinked'}
                  </ThemedText>
                </View>
              </View>

              {/* Edit / Link toggle */}
              <View style={[s.poolToggle, { marginBottom: 16 }]}>
                <TouchableOpacity style={[s.poolToggleBtn, !editMode && s.poolToggleBtnActive]} onPress={() => setEditMode(false)}>
                  <ThemedText style={[s.poolToggleText, !editMode && s.poolToggleTextActive]}>Link to Event</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[s.poolToggleBtn, editMode && s.poolToggleBtnActive]} onPress={() => setEditMode(true)}>
                  <ThemedText style={[s.poolToggleText, editMode && s.poolToggleTextActive]}>Edit Slot</ThemedText>
                </TouchableOpacity>
              </View>

              {/* ── EDIT MODE ── */}
              {editMode && !showSplit && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <ThemedText style={s.fieldLabel}>LOCATION</ThemedText>
                    {locations.length === 0 && (
                      <ThemedText style={{ fontSize: 11, color: ORANGE }}>Add locations in the Locations tab</ThemedText>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
                    contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                    <TouchableOpacity style={[s.chipSm, editLocation === '' && s.chipSmActive]} onPress={() => setEditLocation('')}>
                      <ThemedText style={[s.chipSmText, editLocation === '' && s.chipSmTextActive]}>No location</ThemedText>
                    </TouchableOpacity>
                    {locations.map(l => (
                      <TouchableOpacity key={l.id} style={[s.chipSm, editLocation === l.id && s.chipSmActive]} onPress={() => setEditLocation(l.id)}>
                        <View style={[s.chipDot, { backgroundColor: l.color }]} />
                        <ThemedText style={[s.chipSmText, editLocation === l.id && s.chipSmTextActive]}>{l.name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={s.timeRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.fieldLabel}>START</ThemedText>
                      <TimePicker value={editStart} onChange={v => v && setEditStart(v)} />
                    </View>
                    <View style={s.timeSep}><ThemedText style={{ color: MUTED }}>–</ThemedText></View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.fieldLabel}>END</ThemedText>
                      <TimePicker value={editEnd} onChange={v => v && setEditEnd(v)} />
                    </View>
                  </View>

                  <ThemedText style={[s.fieldLabel, { marginTop: 12 }]}>ICE COST ($)</ThemedText>
                  <TextInput style={s.input} value={editCost} onChangeText={setEditCost}
                    placeholder="e.g. 325.00" placeholderTextColor={MUTED} keyboardType="decimal-pad" />

                  <ThemedText style={[s.fieldLabel, { marginTop: 12 }]}>NOTES (optional)</ThemedText>
                  <TextInput style={s.input} value={editNotes} onChangeText={setEditNotes}
                    placeholder="e.g. Pad 1, blue group" placeholderTextColor={MUTED} />

                  <TouchableOpacity style={s.ctaBtn} onPress={updateSlot} disabled={editSaving}>
                    {editSaving ? <ActivityIndicator color="#000" /> :
                      <ThemedText style={s.ctaBtnText}>Save Changes</ThemedText>}
                  </TouchableOpacity>

                  {/* Split */}
                  <TouchableOpacity style={s.splitBtn} onPress={() => {
                    // Default: midpoint as the break
                    const [sh, sm] = selSlot!.start_time.split(':').map(Number);
                    const [eh, em] = selSlot!.end_time.split(':').map(Number);
                    const midMin = Math.floor(((sh * 60 + sm) + (eh * 60 + em)) / 2);
                    const mid = `${String(Math.floor(midMin / 60)).padStart(2, '0')}:${String(midMin % 60).padStart(2, '0')}`;
                    setSplitSlot1End(mid);
                    setSplitSlot2Start(mid);
                    setShowSplit(true);
                  }}>
                    <Ionicons name="cut-outline" size={16} color={BLUE} />
                    <ThemedText style={s.splitBtnText}>Split this slot into 2</ThemedText>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* ── SPLIT MODE ── */}
              {editMode && showSplit && (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
                  <TouchableOpacity style={s.backRow} onPress={() => setShowSplit(false)}>
                    <Ionicons name="chevron-back" size={16} color={MUTED} />
                    <ThemedText style={s.backRowText}>Back</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={s.sheetTitle}>Split into 2 Slots</ThemedText>
                  <ThemedText style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
                    Set the end of the first ice time and the start of the second. The break in between (e.g. ice resurfacing) is excluded.
                  </ThemedText>

                  {/* Slot 1 */}
                  <View style={s.splitSlotCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <View style={s.splitSlotNum}><ThemedText style={s.splitSlotNumText}>1</ThemedText></View>
                      <ThemedText style={s.fieldLabel}>FIRST SLOT</ThemedText>
                    </View>
                    <View style={s.timeRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={s.fieldLabel}>START (locked)</ThemedText>
                        <View style={s.lockedTimeBox}>
                          <ThemedText style={s.lockedTimeText}>{fmtTime(selSlot.start_time)}</ThemedText>
                        </View>
                      </View>
                      <View style={s.timeSep}><ThemedText style={{ color: MUTED }}>–</ThemedText></View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={s.fieldLabel}>END</ThemedText>
                        <TextInput
                          style={s.splitTimeInput}
                          value={splitSlot1End}
                          onChangeText={setSplitSlot1End}
                          placeholder="e.g. 8:45 AM"
                          placeholderTextColor={MUTED}
                          keyboardType="numbers-and-punctuation"
                          returnKeyType="done"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Break indicator */}
                  <View style={s.splitBreakRow}>
                    <View style={s.splitBreakLine} />
                    <View style={s.splitBreakBadge}>
                      <Ionicons name="snow-outline" size={11} color={MUTED} />
                      <ThemedText style={s.splitBreakText}>Ice resurfacing break</ThemedText>
                    </View>
                    <View style={s.splitBreakLine} />
                  </View>

                  {/* Slot 2 */}
                  <View style={s.splitSlotCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <View style={[s.splitSlotNum, { backgroundColor: BLUE + '33', borderColor: BLUE }]}>
                        <ThemedText style={[s.splitSlotNumText, { color: BLUE }]}>2</ThemedText>
                      </View>
                      <ThemedText style={s.fieldLabel}>SECOND SLOT</ThemedText>
                    </View>
                    <View style={s.timeRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={s.fieldLabel}>START</ThemedText>
                        <TextInput
                          style={s.splitTimeInput}
                          value={splitSlot2Start}
                          onChangeText={setSplitSlot2Start}
                          placeholder="e.g. 9:00 AM"
                          placeholderTextColor={MUTED}
                          keyboardType="numbers-and-punctuation"
                          returnKeyType="done"
                        />
                      </View>
                      <View style={s.timeSep}><ThemedText style={{ color: MUTED }}>–</ThemedText></View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={s.fieldLabel}>END (locked)</ThemedText>
                        <View style={s.lockedTimeBox}>
                          <ThemedText style={s.lockedTimeText}>{fmtTime(selSlot.end_time)}</ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Preview */}
                  {(() => {
                    const end1 = parseTimeInput(splitSlot1End);
                    const start2 = parseTimeInput(splitSlot2Start);
                    if (!end1 || !start2) return null;
                    return (
                      <View style={s.splitPreview}>
                        <ThemedText style={s.splitPreviewLabel}>RESULT</ThemedText>
                        <ThemedText style={s.splitPreviewItem}>
                          • {fmtTime(selSlot.start_time)} – {fmtTime(end1)}
                          {'  '}({slotHours(selSlot.start_time, end1).toFixed(1)}h)
                        </ThemedText>
                        <ThemedText style={s.splitPreviewItem}>
                          • {fmtTime(start2)} – {fmtTime(selSlot.end_time)}
                          {'  '}({slotHours(start2, selSlot.end_time).toFixed(1)}h)
                        </ThemedText>
                      </View>
                    );
                  })()}

                  <TouchableOpacity style={[s.ctaBtn, { marginTop: 20 }]} onPress={splitSlotCustom}>
                    <ThemedText style={s.ctaBtnText}>Split into 2 Slots</ThemedText>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* ── LINK MODE ── */}
              {!editMode && (
                <>
                  {selSlot.allocated_to_name && (
                    <View style={s.currentLink}>
                      <Ionicons name="checkmark-circle" size={16} color={TEAL} />
                      <ThemedText style={s.currentLinkText}>{selSlot.allocated_to_name}</ThemedText>
                      <TouchableOpacity onPress={unlinkSlot} style={s.unlinkBtn}>
                        <ThemedText style={s.unlinkBtnText}>Remove</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={s.allocSection}>
                    <View style={s.allocSectionHeader}>
                      <ThemedText style={s.allocSectionTitle}>LINK TO EVENT</ThemedText>
                      <TouchableOpacity style={s.autoBtn} onPress={autoSuggest}>
                        <Ionicons name="sparkles-outline" size={14} color={TEAL} />
                        <ThemedText style={s.autoBtnText}>Auto-suggest</ThemedText>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                      {(['camp', 'session', 'game', 'private'] as AllocType[]).map(t => (
                        <TouchableOpacity key={t} style={[s.allocTypeTab, allocTab === t && s.allocTypeTabActive]}
                          onPress={() => { setAllocTab(t); loadAllocEvents(t, selSlot.slot_date); }}>
                          <ThemedText style={[s.allocTypeTabText, allocTab === t && s.allocTypeTabTextActive]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                      {allocEvents.length === 0 && (
                        <ThemedText style={s.noAllocEvents}>No upcoming {allocTab}s found.</ThemedText>
                      )}
                      {allocEvents.map(ev => (
                        <TouchableOpacity key={ev.id} style={s.allocEventRow}
                          onPress={() => { if (!allocSaving) linkSlot(ev, allocTab); }}>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={s.allocEventName}>{ev.label}</ThemedText>
                            <ThemedText style={s.allocEventSub}>{ev.sub}</ThemedText>
                          </View>
                          <View style={s.linkBtn}>
                            <ThemedText style={s.linkBtnText}>{allocSaving ? '…' : 'Link'}</ThemedText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              <TouchableOpacity style={s.deleteSlotBtn} onPress={() => deleteSlot(selSlot.id)}>
                <Ionicons name="trash-outline" size={15} color={RED} />
                <ThemedText style={s.deleteSlotBtnText}>Delete slot</ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ── GROUP EDIT MODAL ─────────────────────────────────────────────────── */}
      <Modal visible={showGroupEdit} transparent animationType="slide" onRequestClose={() => setShowGroupEdit(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowGroupEdit(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <ThemedText style={s.sheetTitle}>Edit {selectedIds.size} {selectedIds.size === 1 ? 'Slot' : 'Slots'}</ThemedText>

            <ThemedText style={s.fieldLabel}>CHANGE LOCATION</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              <TouchableOpacity style={[s.chipSm, geLocation === 'none' && s.chipSmActive]} onPress={() => setGeLocation('none')}>
                <ThemedText style={[s.chipSmText, geLocation === 'none' && s.chipSmTextActive]}>Remove location</ThemedText>
              </TouchableOpacity>
              {locations.map(l => (
                <TouchableOpacity key={l.id} style={[s.chipSm, geLocation === l.id && s.chipSmActive]} onPress={() => setGeLocation(l.id)}>
                  <View style={[s.chipDot, { backgroundColor: l.color }]} />
                  <ThemedText style={[s.chipSmText, geLocation === l.id && s.chipSmTextActive]}>{l.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ThemedText style={s.fieldLabel}>CHANGE POOL</ThemedText>
            <View style={[s.poolToggle, { marginBottom: 16 }]}>
              {(['', 'business', 'team'] as const).map(p => (
                <TouchableOpacity key={p || 'keep'} style={[s.poolToggleBtn, gePool === p && s.poolToggleBtnActive]}
                  onPress={() => setGePool(p)}>
                  <ThemedText style={[s.poolToggleText, gePool === p && s.poolToggleTextActive]}>
                    {p === '' ? 'No change' : p === 'business' ? 'Business' : 'Team'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {gePool === 'team' && (
              <>
                <ThemedText style={s.fieldLabel}>TEAM</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
                  contentContainerStyle={{ gap: 8 }}>
                  {teams.map(t => (
                    <TouchableOpacity key={t.id} style={[s.chipSm, geTeam === t.id && s.chipSmActive]} onPress={() => setGeTeam(t.id)}>
                      <ThemedText style={[s.chipSmText, geTeam === t.id && s.chipSmTextActive]}>{t.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={s.ctaBtn} onPress={applyGroupEdit} disabled={geSaving}>
              {geSaving ? <ActivityIndicator color="#000" /> :
                <ThemedText style={s.ctaBtnText}>Apply to {selectedIds.size} {selectedIds.size === 1 ? 'Slot' : 'Slots'}</ThemedText>}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
              disabled={geSaving}
              onPress={() => {
                Alert.alert(
                  `Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'Slot' : 'Slots'}`,
                  'This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete', style: 'destructive',
                      onPress: async () => {
                        setGeSaving(true);
                        const { error } = await supabase.from('ice_slots').delete().in('id', [...selectedIds]);
                        setGeSaving(false);
                        if (error) { Alert.alert('Delete failed', error.message); return; }
                        setShowGroupEdit(false);
                        exitSelect();
                        loadWeek();
                        loadMonth(new Date(weekOf.getFullYear(), weekOf.getMonth(), 1));
                      },
                    },
                  ]
                );
              }}>
              <Ionicons name="trash-outline" size={16} color={RED} />
              <ThemedText style={{ color: RED, fontSize: 14, fontWeight: '600' }}>
                Delete {selectedIds.size} {selectedIds.size === 1 ? 'Slot' : 'Slots'}
              </ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const COL_W = Math.floor((SCREEN_W - 32) / 7);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  // header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  title: { flex: 1, fontSize: 26, fontWeight: '800', color: TEXT, lineHeight: 32 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  // tabs
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 30, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 26, alignItems: 'center' },
  tabActive: { backgroundColor: GREEN },
  tabText: { fontSize: 12, fontWeight: '700', color: MUTED },
  tabTextActive: { color: '#000' },

  // log
  logContent: { paddingHorizontal: 16, paddingBottom: 48 },
  poolScroll: { flexGrow: 0, marginBottom: 12 },
  poolRow: { gap: 8, flexDirection: 'row', paddingRight: 8 },
  poolChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  poolChipActive: { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.1)' },
  poolChipText: { fontSize: 13, fontWeight: '600', color: MUTED },
  poolChipTextActive: { color: TEAL },

  // week nav
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  weekNavBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  todayBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  todayBtnText: { fontSize: 12, fontWeight: '700', color: TEXT },
  weekRangeText: { fontSize: 13, color: MUTED, fontWeight: '600', flex: 1, textAlign: 'right' },

  // 7-day grid
  weekGrid: { flexDirection: 'row', marginBottom: 20 },
  dayCol: { width: COL_W, alignItems: 'center' },
  dayName: { fontSize: 10, fontWeight: '600', color: MUTED, marginBottom: 4 },
  dayNumWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dayNumWrapToday: { backgroundColor: TEAL },
  dayNum: { fontSize: 12, fontWeight: '700', color: TEXT },
  dayNumToday: { color: '#000' },

  // slot card inside day column
  slotCard: {
    width: COL_W - 4, minHeight: 54, borderRadius: 6, borderLeftWidth: 3,
    backgroundColor: CARD, padding: 4, marginBottom: 4, borderWidth: 1, borderColor: BORDER,
  },
  slotTime: { fontSize: 9, fontWeight: '700', color: TEXT, marginBottom: 2 },
  slotRinkDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 2 },
  slotLinkedName: { fontSize: 8, color: TEAL, lineHeight: 11 },
  slotUnlinked: { fontSize: 8, color: ORANGE },
  emptyDay: { height: 4 },

  // month stats
  monthCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 24 },
  monthTitle: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 12 },
  monthStats: { flexDirection: 'row', marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: TEXT },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
  rinkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: BORDER },
  rinkDot: { width: 10, height: 10, borderRadius: 5 },
  rinkRowName: { flex: 1, fontSize: 13, color: TEXT },
  rinkRowHrs: { fontSize: 13, fontWeight: '700', color: TEAL },
  noSlotsNote: { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 8 },

  // ai tab
  aiContent: { paddingHorizontal: 16, paddingBottom: 48 },
  aiHero: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(61,255,143,0.2)', padding: 28, alignItems: 'center', gap: 12, marginVertical: 16 },
  aiIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(61,255,143,0.1)', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  aiSub: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  aiBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: { backgroundColor: BLUE, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  aiBadgeText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  aiBadgeSub: { fontSize: 12, color: MUTED },
  aiFeature: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  aiFeatureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.1)', alignItems: 'center', justifyContent: 'center' },
  aiFeatureText: { fontSize: 13, color: TEXT, flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 10, marginTop: 4 },
  afterImportNote: { fontSize: 13, color: MUTED, lineHeight: 20 },

  // select mode
  selectModeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  selectModeBtnText: { fontSize: 12, fontWeight: '700', color: TEXT },
  cancelSelectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  cancelSelectBtnText: { fontSize: 12, fontWeight: '700', color: MUTED },
  selectCountText: { fontSize: 13, fontWeight: '600', color: TEXT, flex: 1, textAlign: 'center' },
  slotCardSelected: { backgroundColor: 'rgba(0,196,180,0.12)', borderColor: TEAL },
  slotCheckbox: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: MUTED, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  slotCheckboxChecked: { backgroundColor: TEAL, borderColor: TEAL },

  // create event sheet
  createSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', padding: 14, marginBottom: 20 },
  createSummaryBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  createSummaryBadgeText: { fontSize: 16, fontWeight: '900', color: '#000' },
  createSummaryTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  createSummarySub: { fontSize: 12, color: MUTED, marginTop: 2 },
  createTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  createTypeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  createTypeLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  createTypeSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backRowText: { fontSize: 13, color: MUTED },

  // library picker
  libHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  libTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  libSub: { fontSize: 12, color: MUTED, paddingHorizontal: 16, marginBottom: 8 },
  libThumbWrap: { flex: 1/3, aspectRatio: 1 },
  libThumb: { width: '100%', height: '100%' },

  // camera modal
  camTip: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: 12, alignItems: 'center' },
  camTipText: { fontSize: 13, color: '#fff', textAlign: 'center' },
  camControls: { position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40 },
  camCancel: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  camCapture: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  camCaptureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  // upload buttons
  uploadBtnRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  uploadBtn: { flex: 1, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, alignItems: 'center', gap: 8 },
  uploadBtnTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  uploadBtnSub: { fontSize: 11, color: MUTED, textAlign: 'center' },

  // parsing state
  parsingWrap: { flex: 1, justifyContent: 'center', paddingTop: 60 },
  parsingCard: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 32, alignItems: 'center', gap: 16 },
  parsingTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  parsingSub: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  parsingSteps: { width: '100%', gap: 10, marginTop: 8 },
  parsingStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  parsingStepText: { fontSize: 13, color: MUTED },

  // preview state
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(61,255,143,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(61,255,143,0.2)', padding: 16, marginBottom: 20 },
  previewHeaderIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(61,255,143,0.1)', alignItems: 'center', justifyContent: 'center' },
  previewHeaderTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  previewHeaderSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  // parsed slot rows
  parsedSlotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  parsedSlotRowRemoved: { opacity: 0.4 },
  parsedSlotDate: { fontSize: 14, fontWeight: '700', color: TEXT },
  parsedSlotTime: { fontSize: 12, color: MUTED, marginTop: 3 },
  slotCostInput: {
    fontSize: 12, color: ORANGE, fontWeight: '700',
    borderBottomWidth: 1, borderBottomColor: ORANGE,
    paddingVertical: 1, paddingHorizontal: 2, minWidth: 50,
  },

  // rinks tab
  rinksContent: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 8 },
  emptyRinks: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyRinksText: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyRinksSub: { fontSize: 13, color: MUTED, textAlign: 'center' },
  rinkCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 10 },
  rinkCardDot: { width: 14, height: 14, borderRadius: 7 },
  rinkCardName: { fontSize: 15, fontWeight: '700', color: TEXT },
  rinkCardAddr: { fontSize: 12, color: MUTED, marginTop: 2 },

  // shared modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: BORDER },
  sheetTall: { maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 20 },

  // form
  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, color: TEXT, fontSize: 15, marginBottom: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeSep: { paddingTop: 20 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchSel: { borderWidth: 3, borderColor: TEXT },

  chipSm: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  chipSmActive: { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.1)' },
  chipSmText: { fontSize: 12, fontWeight: '600', color: MUTED },
  chipSmTextActive: { color: TEAL },
  chipDot: { width: 8, height: 8, borderRadius: 4 },

  poolToggle: { flexDirection: 'row', backgroundColor: BG, borderRadius: 12, padding: 4, marginBottom: 4 },
  poolToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  poolToggleBtnActive: { backgroundColor: TEAL },
  poolToggleText: { fontSize: 13, fontWeight: '700', color: MUTED },
  poolToggleTextActive: { color: '#000' },

  ctaBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },

  // allocation modal
  allocHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  allocDate: { fontSize: 15, fontWeight: '700', color: TEXT },
  allocTime: { fontSize: 13, color: MUTED, marginTop: 2 },
  allocRink: { fontSize: 13, color: MUTED },
  allocBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  allocBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  currentLink: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 10, padding: 12, marginBottom: 16 },
  currentLinkText: { flex: 1, fontSize: 13, fontWeight: '600', color: TEAL },
  unlinkBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)' },
  unlinkBtnText: { fontSize: 12, fontWeight: '700', color: RED },

  allocSection: { marginTop: 4 },
  allocSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  allocSectionTitle: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  autoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(0,196,180,0.1)' },
  autoBtnText: { fontSize: 12, fontWeight: '700', color: TEAL },

  allocTypeTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  allocTypeTabActive: { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.1)' },
  allocTypeTabText: { fontSize: 12, fontWeight: '600', color: MUTED },
  allocTypeTabTextActive: { color: TEAL },

  noAllocEvents: { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 16 },
  allocEventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  allocEventName: { fontSize: 14, fontWeight: '700', color: TEXT },
  allocEventSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  linkBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: TEAL },
  linkBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  deleteSlotBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20, paddingVertical: 10 },
  deleteSlotBtnText: { fontSize: 13, color: RED },

  // view toggle
  viewToggleRow: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 10, padding: 3, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  viewToggleBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: TEAL },
  viewToggleText: { fontSize: 12, fontWeight: '700', color: MUTED },
  viewToggleTextActive: { color: '#000' },

  // vertical slot row (day + week views)
  slotRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 3, padding: 14, marginBottom: 8, gap: 12 },
  slotRowSelected: { backgroundColor: 'rgba(0,196,180,0.08)', borderColor: TEAL },
  slotRowTime: { fontSize: 14, fontWeight: '700', color: TEXT },
  slotRowRink: { fontSize: 12, color: MUTED },
  slotRowLinked: { fontSize: 12, color: TEAL, marginTop: 3 },
  slotStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  slotStatusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  // week view day header
  weekDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 6, marginTop: 4 },
  weekDayName: { fontSize: 13, fontWeight: '700', color: MUTED, flex: 1 },
  weekDayCount: { fontSize: 11, color: MUTED },

  emptyDayRow: { paddingVertical: 8, paddingLeft: 4 },
  emptyDayRowText: { fontSize: 12, color: BORDER },
  emptyDayBig: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyDayBigText: { fontSize: 14, color: MUTED },

  // month calendar
  calHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  calHeaderCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: MUTED, paddingVertical: 6 },
  calWeekRow: { flexDirection: 'row', marginBottom: 2 },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  calDayNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  calDayNumToday: { backgroundColor: TEAL },
  calDayText: { fontSize: 13, fontWeight: '600', color: TEXT },
  calDots: { flexDirection: 'row', gap: 3, marginTop: 3 },
  calDot: { width: 5, height: 5, borderRadius: 2.5 },

  // edit slot
  splitBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: BLUE, backgroundColor: 'rgba(56,189,248,0.08)' },
  splitBtnText: { fontSize: 14, fontWeight: '700', color: BLUE },
  splitPartBtn: { flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center', paddingVertical: 14 },
  splitPartBtnActive: { backgroundColor: TEAL, borderColor: TEAL },
  splitPartNum: { fontSize: 22, fontWeight: '800', color: TEXT },
  splitPartSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  // Custom split UI
  splitSlotCard: {
    backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 4,
  },
  splitSlotNum: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: TEAL + '33', borderWidth: 1, borderColor: TEAL,
  },
  splitSlotNumText: { fontSize: 12, fontWeight: '800', color: TEAL },
  lockedTimeBox: {
    backgroundColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', opacity: 0.7,
  },
  lockedTimeText: { fontSize: 14, color: MUTED, fontWeight: '600' },
  splitTimeInput: {
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: TEAL,
    paddingHorizontal: 12, paddingVertical: 14,
    fontSize: 14, color: TEXT, fontWeight: '600', textAlign: 'center',
  },
  splitBreakRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10,
  },
  splitBreakLine: { flex: 1, height: 1, backgroundColor: BORDER },
  splitBreakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  splitBreakText: { fontSize: 10, color: MUTED, fontWeight: '600' },
  splitPreview: {
    backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', marginTop: 8,
  },
  splitPreviewLabel: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, marginBottom: 8 },
  splitPreviewItem: { fontSize: 13, color: TEXT, marginBottom: 4, fontWeight: '500' },

  // Location autocomplete suggestions
  suggestionsBox: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    marginBottom: 12, overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  suggestionText: { flex: 1, fontSize: 13, color: TEXT, lineHeight: 18 },
  addrRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)',
  },
  addrText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 },
});
