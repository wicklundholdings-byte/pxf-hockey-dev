import { useEffect, useState, useRef } from 'react';
import { TimePicker } from '@/components/time-picker';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Switch,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Linking, Image,
} from 'react-native';
// expo-image-picker requires a native build — enabled when distributed via TestFlight
// import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';

const PLACES_KEY = 'AIzaSyBSC0TcManJa-ssPxot8xoQu9-gqqHJNAU';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const RED    = '#EF4444';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type ViewMode = 'list' | 'day' | 'week' | 'month';
type Filter = 'all' | 'camp' | 'private' | 'team';

const HOURS = ['5 AM','6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM'];

// Use local date string everywhere — never toISOString() which gives UTC and is wrong after 5 PM Pacific
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function formatMonthYear(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function formatDayHeader(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
function formatWeekRange(date: Date) {
  const mon = new Date(date);
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
  mon.setDate(date.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  return `${fmt(mon)} — ${fmt(sun)}`;
}
function getWeekDays(date: Date) {
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
  const mon = new Date(date);
  mon.setDate(date.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}

type EventType = 'session' | 'game' | 'camp' | 'private';
type Event = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  total_duration_minutes: number | null;
  event_type: EventType;
  location?: string | null;
};

export default function EventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showCreate?: string; type?: string; templates?: string; editId?: string }>();
  const [view, setView]         = useState<ViewMode>('list');
  const [filter, setFilter]     = useState<Filter>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents]     = useState<Event[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const today = new Date();

  // ─── Create Camp modal state ───────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [campType, setCampType]     = useState<'camp' | 'private' | 'session'>('camp');
  const [campTitle, setCampTitle]   = useState('');
  const [campStart, setCampStart]   = useState('');
  const [campEnd, setCampEnd]       = useState('');
  const [campTime, setCampTime]     = useState<string | null>(null);
  const [campPrice, setCampPrice]   = useState('');
  const [campSpots, setCampSpots]   = useState('');
  const [campLocation, setCampLocation] = useState('');
  const [campDesc, setCampDesc]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [editingCampId, setEditingCampId] = useState<string | null>(null);

  // Schedule options (camp type only)
  const [scheduleType, setScheduleType]         = useState<'consecutive' | 'alternating' | 'weekly' | 'custom'>('consecutive');
  const [scheduleInterval, setScheduleInterval] = useState('2');
  const [weekDays, setWeekDays]                 = useState<Set<number>>(new Set());
  const [customDates, setCustomDates]           = useState<Set<string>>(new Set());

  // Private-specific
  const [athleteName, setAthleteName]           = useState('');
  type PlayerOption = { id: string; full_name: string };
  const [playerOptions, setPlayerOptions]       = useState<PlayerOption[]>([]);
  const [athleteId, setAthleteId]               = useState<string | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  // Media
  const [campImageUrl, setCampImageUrl]   = useState('');
  const [campVideoUrl, setCampVideoUrl]   = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  type MediaItem = { id: string; type: 'image' | 'video'; url: string; name: string | null };
  const [mediaLibrary, setMediaLibrary]   = useState<MediaItem[]>([]);

  // Registration Requirements
  type Requirements = {
    masterWaiver:     boolean;
    refundPolicy:     { on: boolean; text: string };
    photoConsent:     boolean;
    equipment:        { on: boolean; text: string };
    medicalClearance: boolean;
    travel:           boolean;
    skillRequirement: { on: boolean; text: string };
    illnessPolicy:    { on: boolean; text: string };
    custom:           { on: boolean; text: string };
  };
  const defaultReqs: Requirements = {
    masterWaiver:     true,
    refundPolicy:     { on: false, text: '' },
    photoConsent:     false,
    equipment:        { on: false, text: '' },
    medicalClearance: false,
    travel:           false,
    skillRequirement: { on: false, text: '' },
    illnessPolicy:    { on: false, text: '' },
    custom:           { on: false, text: '' },
  };
  const [requirements, setRequirements] = useState<Requirements>(defaultReqs);
  function setReq(key: keyof Requirements, val: any) {
    setRequirements(prev => ({ ...prev, [key]: typeof prev[key] === 'object' && !Array.isArray(prev[key])
      ? { ...(prev[key] as object), ...val } : val }));
  }

  // Templates
  type CampTemplate = {
    id: string;
    type: 'camp' | 'private' | 'session';
    title: string;
    description: string;
    price_cents: number;
    price_per_session_cents: number | null;
    max_spots: number | null;
    schedule_type: string | null;
  };
  const [templates, setTemplates]             = useState<CampTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [savingTemplate, setSavingTemplate]   = useState(false);

  // Camp visibility + invite list
  const [campIsPublic, setCampIsPublic]         = useState(true);
  type Invitee = { id: string; name: string; email: string; phone: string; playerId?: string };
  const [invitees, setInvitees]                 = useState<Invitee[]>([]);
  const [showAddInvitee, setShowAddInvitee]     = useState(false);
  const [inviteeName, setInviteeName]           = useState('');
  const [inviteeEmail, setInviteeEmail]         = useState('');
  const [inviteePhone, setInviteePhone]         = useState('');
  const [showInviteePicker, setShowInviteePicker] = useState(false);

  // ─── Location picker state ─────────────────────────────────────
  type SavedLocation = { id: string; name: string; address: string | null };
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [showNewLoc, setShowNewLoc]         = useState(false);
  const [newLocInput, setNewLocInput]       = useState('');
  const [newLocAddress, setNewLocAddress]   = useState('');
  const [savingLoc, setSavingLoc]           = useState(false);

  // Inline date picker (no nested Modal — expands inside the form)
  const [showPickerFor, setShowPickerFor] = useState<'start' | 'end' | null>(null);
  const [pickerMonth, setPickerMonth]     = useState(new Date());

  // Places autocomplete
  type Suggestion = { place_id: string; description: string };
  const [suggestions, setSuggestions]   = useState<Suggestion[]>([]);
  const [loadingSug, setLoadingSug]     = useState(false);
  const [locError, setLocError]         = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadLocations(userId: string) {
    const { data } = await supabase
      .from('coach_locations')
      .select('id, name, address')
      .eq('coach_id', userId)
      .order('name');
    setSavedLocations(data ?? []);
  }

  function onNewLocChange(text: string) {
    setNewLocInput(text);
    setNewLocAddress('');
    setLocError('');
    if (text.length < 2) { setSuggestions([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setLoadingSug(true);
      try {
        // Places API (New) — POST endpoint
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
        if (json.error) {
          setLocError(`Places: ${json.error.status}`);
          setSuggestions([]);
        } else {
          const preds = (json.suggestions ?? []).map((s: any) => ({
            place_id: s.placePrediction.placeId,
            description: s.placePrediction.text.text,
          }));
          setSuggestions(preds);
        }
      } catch (e: any) {
        setLocError(e?.message ?? 'Network error');
      }
      setLoadingSug(false);
    }, 350);
  }

  async function pickSuggestion(sug: Suggestion) {
    setSuggestions([]);
    setLoadingSug(true);
    try {
      // Places API (New) — place details
      const res = await fetch(`https://places.googleapis.com/v1/places/${sug.place_id}`, {
        headers: {
          'X-Goog-Api-Key': PLACES_KEY,
          'X-Goog-FieldMask': 'displayName,formattedAddress',
        },
      });
      const json = await res.json();
      const name = json.displayName?.text || sug.description.split(',')[0];
      const addr = json.formattedAddress || '';
      setNewLocInput(name);
      setNewLocAddress(addr);
    } catch {
      setNewLocInput(sug.description.split(',')[0]);
    }
    setLoadingSug(false);
  }

  async function saveNewLocation() {
    if (!newLocInput.trim()) return;
    setSavingLoc(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingLoc(false); return; }
    const { data, error } = await supabase
      .from('coach_locations')
      .insert({ coach_id: user.id, name: newLocInput.trim(), address: newLocAddress || null })
      .select('id, name, address')
      .single();
    setSavingLoc(false);
    if (error) { Alert.alert('Error', error.message); return; }
    const newLoc = data as SavedLocation;
    setSavedLocations(prev => [...prev, newLoc].sort((a, b) => a.name.localeCompare(b.name)));
    setCampLocation(newLoc.name);
    setNewLocInput('');
    setNewLocAddress('');
    setSuggestions([]);
    setShowNewLoc(false);
  }

  // Auto-open from URL param
  useEffect(() => {
    if (params.showCreate === '1') {
      if (params.type === 'session' || params.type === 'camp' || params.type === 'private') {
        setCampType(params.type);
      }
      if (params.templates === '1') setShowTemplatePicker(true);
      setShowCreate(true);
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) { loadLocations(user.id); loadPlayers(user.id); loadTemplates(user.id); loadMediaLibrary(user.id); }
      });
      // Edit mode: pre-populate with existing camp data
      if (params.editId) {
        loadCampForEdit(params.editId);
      }
    }
  }, [params.showCreate, params.editId]);

  // Also load locations + players when modal is opened via + button
  function openCreateModal(type?: 'camp' | 'private' | 'session', openTemplates?: boolean) {
    if (type) setCampType(type);
    if (openTemplates) setShowTemplatePicker(true);
    setShowCreate(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { loadLocations(user.id); loadPlayers(user.id); loadTemplates(user.id); loadMediaLibrary(user.id); }
    });
  }

  async function loadPlayers(userId: string) {
    const { data } = await supabase
      .from('players')
      .select('id, full_name')
      .eq('coach_id', userId)
      .order('full_name');
    setPlayerOptions(data ?? []);
  }

  async function loadTemplates(userId: string) {
    const { data } = await supabase
      .from('camp_templates')
      .select('id, type, title, description, price_cents, price_per_session_cents, max_spots, schedule_type')
      .eq('coach_id', userId)
      .order('title');
    setTemplates((data ?? []) as any);
  }

  function applyTemplate(t: CampTemplate) {
    setCampType(t.type);
    setCampTitle(t.title);
    setCampDesc(t.description ?? '');
    setCampPrice(t.price_per_session_cents
      ? (t.price_per_session_cents / 100).toFixed(2)
      : t.price_cents ? (t.price_cents / 100).toFixed(2) : '');
    setCampSpots(t.max_spots ? String(t.max_spots) : '');
    if (t.schedule_type && (t.schedule_type === 'consecutive' || t.schedule_type === 'alternating' || t.schedule_type === 'weekly' || t.schedule_type === 'custom')) {
      setScheduleType(t.schedule_type);
    }
    setShowTemplatePicker(false);
  }

  async function loadMediaLibrary(userId: string) {
    const { data } = await supabase
      .from('camp_media')
      .select('id, type, url, name')
      .eq('coach_id', userId)
      .order('created_at', { ascending: false });
    setMediaLibrary((data ?? []) as MediaItem[]);
  }

  async function pickAndUploadImage() {
    Alert.alert('Coming Soon', 'Image upload will be available in the next TestFlight build.');
  }

  async function pickAndUploadVideo() {
    Alert.alert('Coming Soon', 'Video upload from device will be available in the next TestFlight build. Paste a URL below instead.');
  }

  async function saveVideoToLibrary(url: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !url.trim()) return;
    const already = mediaLibrary.some(m => m.url === url.trim());
    if (already) return;
    await supabase.from('camp_media').insert({ coach_id: user.id, type: 'video', url: url.trim(), name: null });
    await loadMediaLibrary(user.id);
  }

  async function saveAsTemplate() {
    if (!campTitle.trim()) { Alert.alert('Add a title first'); return; }
    setSavingTemplate(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingTemplate(false); return; }
    const perSession = campType === 'private' && campPrice ? Math.round(parseFloat(campPrice) * 100) : null;
    const total = campPrice ? Math.round(parseFloat(campPrice) * 100) : 0;
    const { error } = await supabase.from('camp_templates').insert({
      coach_id: user.id,
      type: campType,
      title: campTitle.trim(),
      description: campDesc.trim() || null,
      price_cents: campType === 'private' ? (perSession ?? 0) * Math.max(customDates.size, 1) : total,
      price_per_session_cents: perSession,
      max_spots: campSpots ? parseInt(campSpots) : null,
      schedule_type: campType === 'camp' ? scheduleType : null,
    });
    setSavingTemplate(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await loadTemplates(user.id);
    Alert.alert('Template Saved', `"${campTitle.trim()}" added to your templates.`);
  }

  async function loadCampForEdit(campId: string) {
    const { data: c } = await supabase.from('camps').select('*').eq('id', campId).maybeSingle();
    if (!c) return;
    setEditingCampId(campId);
    setCampType(c.type ?? 'camp');
    setCampTitle(c.name ?? '');
    setCampStart(c.start_date ?? '');
    setCampEnd(c.end_date ?? '');
    setCampTime(c.event_time ?? null);
    setCampPrice(c.price_cents ? String(c.price_cents / 100) : '');
    setCampSpots(c.max_spots ? String(c.max_spots) : '');
    setCampLocation(c.location ?? '');
    setCampDesc(c.description ?? '');
    setCampIsPublic(c.is_public ?? true);
    setCampImageUrl(c.image_url ?? '');
    setCampVideoUrl(c.video_url ?? '');
    if (c.schedule_type) setScheduleType(c.schedule_type);
    if (c.schedule_config?.dates) {
      setCustomDates(new Set(c.schedule_config.dates));
    }
    if (c.schedule_config?.interval) setScheduleInterval(String(c.schedule_config.interval));
    if (c.schedule_config?.days) setWeekDays(new Set(c.schedule_config.days));
  }

  function resetModal() {
    setCampTitle(''); setCampStart(''); setCampEnd(''); setCampTime(null);
    setCampPrice(''); setCampSpots(''); setCampLocation(''); setCampDesc('');
    setNewLocInput(''); setNewLocAddress(''); setShowNewLoc(false);
    setSuggestions([]); setShowCreate(false); setShowPickerFor(null);
    setCampType('camp'); setScheduleType('consecutive');
    setScheduleInterval('2'); setWeekDays(new Set()); setCustomDates(new Set());
    setAthleteName(''); setAthleteId(null); setShowPlayerPicker(false);
    setCampIsPublic(true); setInvitees([]); setShowAddInvitee(false);
    setInviteeName(''); setInviteeEmail(''); setInviteePhone(''); setShowInviteePicker(false);
    setShowTemplatePicker(false);
    setCampImageUrl(''); setCampVideoUrl(''); setShowMediaLibrary(false);
    setRequirements(defaultReqs);
    setEditingCampId(null);
  }

  function toggleWeekDay(day: number) {
    setWeekDays(prev => { const n = new Set(prev); n.has(day) ? n.delete(day) : n.add(day); return n; });
  }

  function toggleCustomDate(dateStr: string) {
    setCustomDates(prev => { const n = new Set(prev); n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr); return n; });
  }

  async function createCamp(status: 'draft' | 'published' = 'draft') {
    if (!campTitle.trim()) { Alert.alert('Title required'); return; }
    if (campType === 'private' && customDates.size === 0) { Alert.alert('Date required', 'Please select at least one session date.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    // For privates, price_cents = per-session price × number of sessions
    const sessionCount = campType === 'private' ? customDates.size : 1;
    const perSessionCents = campPrice ? Math.round(parseFloat(campPrice) * 100) : 0;
    const totalPriceCents = campType === 'private' ? perSessionCents * Math.max(sessionCount, 1) : perSessionCents;

    const insertData: Record<string, unknown> = {
      coach_id: user.id,
      name: campTitle.trim(),
      title: campTitle.trim(),
      type: campType,
      price_cents: totalPriceCents,
      price_per_session_cents: campType === 'private' ? perSessionCents : null,
      max_spots: campSpots ? parseInt(campSpots, 10) : (campType === 'private' ? 1 : null),
      description: campDesc.trim() || null,
      image_url: campImageUrl.trim() || null,
      video_url: campVideoUrl.trim() || null,
      registration_requirements: requirements,
      status,
    };
    if (campLocation.trim()) insertData.location = campLocation.trim();
    // Save video to library if new
    if (campVideoUrl.trim()) saveVideoToLibrary(campVideoUrl.trim());

    if (campType === 'camp') {
      insertData.is_public = campIsPublic;
      insertData.schedule_type = scheduleType;
      if (!campIsPublic && invitees.length > 0) {
        insertData.invite_list = invitees;
      }
      if (scheduleType === 'custom') {
        insertData.schedule_config = { dates: [...customDates].sort() };
      } else {
        insertData.start_date = campStart || null;
        insertData.end_date = campEnd || null;
        if (scheduleType === 'alternating') insertData.schedule_config = { interval: parseInt(scheduleInterval) };
        if (scheduleType === 'weekly') insertData.schedule_config = { days: [...weekDays].sort() };
      }
    } else if (campType === 'private') {
      const sortedDates = [...customDates].sort();
      insertData.is_public = false;
      insertData.schedule_config = { dates: sortedDates };
      insertData.start_date = sortedDates[0];
      insertData.end_date = sortedDates[sortedDates.length - 1];
      if (campTime) insertData.event_time = campTime;
      if (athleteName.trim()) insertData.athlete_name = athleteName.trim();
      if (athleteId) insertData.athlete_id = athleteId;
    } else {
      // session — same public/private logic as camp
      insertData.is_public = campIsPublic;
      insertData.start_date = campStart || null;
      if (campTime) insertData.event_time = campTime;
      if (!campIsPublic && invitees.length > 0) {
        insertData.invite_list = invitees;
      }
    }

    let campData: { id: string } | null = null;
    let error: any = null;

    if (editingCampId) {
      // Edit mode — UPDATE existing camp
      const { error: updateErr } = await supabase.from('camps')
        .update({ ...insertData, status })
        .eq('id', editingCampId);
      error = updateErr;
      campData = { id: editingCampId };
    } else {
      // Create mode — INSERT new camp
      const { data, error: insertErr } = await supabase.from('camps').insert(insertData).select('id').single();
      error = insertErr;
      campData = data;
    }

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    // For private camp/session with an invite list, store invitations
    if ((campType === 'camp' || campType === 'session') && !campIsPublic && invitees.length > 0 && campData?.id && status === 'published') {
      await supabase.from('camp_invites').insert(
        invitees.map(inv => ({
          camp_id: campData.id,
          player_id: inv.playerId ?? null,
          name: inv.name,
          email: inv.email || null,
          phone: inv.phone || null,
        }))
      );
    }

    const title = campTitle.trim();
    const wasEditing = !!editingCampId;
    const editedId = editingCampId;
    resetModal();
    if (wasEditing) {
      // Navigate back to the camp detail screen, not the events list
      router.back();
    } else if (campType === 'private') {
      Alert.alert('Sent!', `Payment request sent to ${athleteName.trim() || 'the parent'}.`);
    } else if (!campIsPublic && status === 'published') {
      Alert.alert('Invites Sent!', `"${title}" published and ${invitees.length} invite${invitees.length !== 1 ? 's' : ''} sent.`);
    } else {
      Alert.alert(status === 'published' ? 'Published!' : 'Saved!',
        `"${title}" ${status === 'published' ? 'is now live.' : 'saved as draft.'}`);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      // Load 90 days back to show past events too
      const windowStart = new Date(); windowStart.setDate(windowStart.getDate() - 90);
      const startStr = windowStart.toISOString().split('T')[0];

      const [{ data: sesRows }, { data: gameRows }, { data: campRows }] = await Promise.all([
        supabase.from('sessions')
          .select('id, title, date, time, total_duration_minutes, location')
          .eq('coach_id', user.id)
          .gte('date', startStr)
          .order('date').order('time', { nullsFirst: false })
          .limit(200),
        supabase.from('games')
          .select('id, opponent, game_date, game_time, location')
          .eq('coach_id', user.id)
          .gte('game_date', startStr)
          .order('game_date').order('game_time', { nullsFirst: false })
          .limit(200),
        supabase.from('camps')
          .select('id, name, type, start_date, end_date, event_time, location, schedule_config')
          .eq('coach_id', user.id)
          .order('start_date', { nullsFirst: false })
          .limit(200),
      ]);

      const sessions: Event[] = (sesRows ?? []).map((r: any) => ({
        id: r.id, title: r.title, date: r.date,
        time: r.time ?? null, total_duration_minutes: r.total_duration_minutes ?? null,
        event_type: 'session' as EventType, location: r.location ?? null,
      }));
      const games: Event[] = (gameRows ?? []).map((r: any) => ({
        id: r.id, title: `vs. ${r.opponent}`, date: r.game_date,
        time: r.game_time ?? null, total_duration_minutes: null,
        event_type: 'game' as EventType, location: r.location ?? null,
      }));

      // Expand camps/privates into one Event per session date
      const campEvents: Event[] = [];
      for (const c of (campRows ?? [])) {
        const evType: EventType = c.type === 'private' ? 'private' : 'camp';
        const config = c.schedule_config as any;
        if (config?.dates && Array.isArray(config.dates) && config.dates.length > 0) {
          // Custom / private dates
          for (const d of config.dates) {
            campEvents.push({ id: c.id, title: c.name ?? '(Unnamed)', date: d, time: c.event_time ?? null, total_duration_minutes: null, event_type: evType, location: c.location ?? null });
          }
        } else if (c.start_date) {
          // Consecutive date range
          const cursor = new Date(c.start_date + 'T12:00:00');
          const endDate = new Date((c.end_date ?? c.start_date) + 'T12:00:00');
          while (cursor <= endDate) {
            const ds = localDateStr(cursor);
            campEvents.push({ id: c.id, title: c.name ?? '(Unnamed)', date: ds, time: c.event_time ?? null, total_duration_minutes: null, event_type: evType, location: c.location ?? null });
            cursor.setDate(cursor.getDate() + 1);
          }
        }
      }

      const merged = [...sessions, ...games, ...campEvents].sort((a, b) => {
        const dc = a.date.localeCompare(b.date);
        if (dc !== 0) return dc;
        const ta = a.time ?? '99:99', tb = b.time ?? '99:99';
        return ta.localeCompare(tb);
      });
      setEvents(merged);
    });
  }, []);

  function prevPeriod() {
    const d = new Date(currentDate);
    if (view === 'day')   d.setDate(d.getDate() - 1);
    if (view === 'week')  d.setDate(d.getDate() - 7);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  }
  function nextPeriod() {
    const d = new Date(currentDate);
    if (view === 'day')   d.setDate(d.getDate() + 1);
    if (view === 'week')  d.setDate(d.getDate() + 7);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  }
  function isToday(d: Date) { return d.toDateString() === today.toDateString(); }

  // ─── helpers ──────────────────────────────────────────────────
  function fmt24(t: string | null): string | null {
    if (!t) return null;
    const parts = t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return t;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function evColor(type: EventType) {
    if (type === 'game')    return ORANGE;
    if (type === 'camp')    return '#F59E0B';
    if (type === 'private') return '#EF4444';
    return TEAL;
  }
  function evLabel(type: EventType) {
    if (type === 'game')    return 'GAME';
    if (type === 'camp')    return 'CAMP';
    if (type === 'private') return 'PRIVATE';
    return 'SESSION';
  }
  function evDest(ev: Event) {
    if (ev.event_type === 'game')    return `/game/${ev.id}`;
    if (ev.event_type === 'camp' || ev.event_type === 'private') return `/camp/${ev.id}`;
    return `/session/${ev.id}`;
  }

  // ─── inline content renderers (no nested ScrollView) ──────────

  function renderList() {
    const todayStr = localDateStr(new Date());
    const filtered = filter === 'all' ? events
      : filter === 'camp'    ? events.filter(e => e.event_type === 'camp')
      : filter === 'private' ? events.filter(e => e.event_type === 'private')
      : events; // 'team' — future

    if (filtered.length === 0) {
      return (
        <View style={styles.emptySection}>
          <Ionicons name="calendar-outline" size={36} color={MUTED} />
          <ThemedText style={styles.emptyTitle}>No events</ThemedText>
          <ThemedText style={styles.emptySub}>Create sessions, camps, or privates to see them here</ThemedText>
        </View>
      );
    }

    const past   = filtered.filter(e => e.date <  todayStr);
    const future = filtered.filter(e => e.date >= todayStr);

    function evCards(list: Event[]) {
      return list.map(ev => {
        const d = new Date(ev.date + 'T00:00:00');
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const color = evColor(ev.event_type);
        const fmtTime = fmt24(ev.time);
        return (
          <TouchableOpacity key={`${ev.event_type}-${ev.id}-${ev.date}`}
            style={styles.eventCard}
            onPress={() => router.push(evDest(ev) as any)}
            activeOpacity={0.8}>
            <View style={[styles.eventAccent, { backgroundColor: color }]} />
            <View style={styles.eventBody}>
              <ThemedText style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 1, marginBottom: 2 }}>
                {evLabel(ev.event_type)}
              </ThemedText>
              <ThemedText style={styles.eventTitle}>{ev.title}</ThemedText>
              <ThemedText style={styles.eventMeta}>
                {dateStr}{fmtTime ? ` · ${fmtTime}` : ''}{ev.location ? ` · ${ev.location}` : ''}{ev.total_duration_minutes ? ` · ${ev.total_duration_minutes}min` : ''}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </TouchableOpacity>
        );
      });
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {past.length > 0 && (
          <>
            <ThemedText style={styles.listDateHeader}>PAST</ThemedText>
            {evCards(past)}
          </>
        )}
        {future.length > 0 && (
          <>
            {past.length > 0 && <ThemedText style={styles.listDateHeader}>UPCOMING</ThemedText>}
            {evCards(future)}
          </>
        )}
      </View>
    );
  }

  function renderDay() {
    const dateStr = localDateStr(currentDate);
    const dayEvents = events.filter(e => e.date === dateStr).sort((a, b) => {
      const ta = a.time ?? '99:99', tb = b.time ?? '99:99';
      return ta.localeCompare(tb);
    });
    return (
      <>
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={prevPeriod} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={styles.periodLabel}>{formatDayHeader(currentDate)}</ThemedText>
          <TouchableOpacity onPress={nextPeriod} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={TEXT} />
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {dayEvents.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="calendar-outline" size={32} color={MUTED} />
              <ThemedText style={styles.emptyTitle}>No events this day</ThemedText>
            </View>
          ) : dayEvents.map(ev => {
            const color = evColor(ev.event_type);
            const fmtTime = fmt24(ev.time);
            return (
              <TouchableOpacity key={`${ev.event_type}-${ev.id}-${ev.date}`}
                style={styles.dayEventRow} onPress={() => router.push(evDest(ev) as any)} activeOpacity={0.8}>
                <View style={styles.dayEventTime}>
                  <ThemedText style={[styles.dayEventTimeText, { color }]}>{fmtTime ?? '—'}</ThemedText>
                </View>
                <View style={[styles.dayEventCard, { borderLeftColor: color }]}>
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 1, marginBottom: 2 }}>{evLabel(ev.event_type)}</ThemedText>
                  <ThemedText style={styles.dayEventTitle}>{ev.title}</ThemedText>
                  {ev.location ? <ThemedText style={styles.dayEventMeta}>{ev.location}</ThemedText> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  }

  function renderWeek() {
    const days = getWeekDays(currentDate);
    const DAY_NAMES = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    return (
      <>
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={prevPeriod} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={styles.periodLabel}>{formatWeekRange(currentDate)}</ThemedText>
          <TouchableOpacity onPress={nextPeriod} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={TEXT} />
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {days.map((d, i) => {
            const ds = localDateStr(d);
            const dayEvs = events.filter(e => e.date === ds).sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
            const todayRow = isToday(d);
            return (
              <View key={i} style={styles.weekDaySection}>
                <View style={[styles.weekDayHeader, todayRow && styles.weekDayHeaderToday]}>
                  <ThemedText style={[styles.weekDayLabel, todayRow && { color: TEAL }]}>
                    {DAY_NAMES[i]} {d.getDate()}
                  </ThemedText>
                  {dayEvs.length > 0 && (
                    <View style={[styles.weekDayBadge, { backgroundColor: TEAL }]}>
                      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: '#000' }}>{dayEvs.length}</ThemedText>
                    </View>
                  )}
                </View>
                {dayEvs.length === 0 ? (
                  <ThemedText style={styles.weekDayEmpty}>No events</ThemedText>
                ) : dayEvs.map(ev => {
                  const color = evColor(ev.event_type);
                  const fmtTime = fmt24(ev.time);
                  return (
                    <TouchableOpacity key={`${ev.event_type}-${ev.id}-${ev.date}`}
                      style={[styles.weekEventRow, { borderLeftColor: color }]}
                      onPress={() => router.push(evDest(ev) as any)} activeOpacity={0.8}>
                      <ThemedText style={[styles.weekEventTime, { color }]}>{fmtTime ?? 'All day'}</ThemedText>
                      <ThemedText style={styles.weekEventTitle} numberOfLines={1}>{ev.title}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </>
    );
  }

  function renderMonth() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const DAY_NAMES = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // Build date → event types map for dot indicators
    const dotMap: Record<string, Set<EventType>> = {};
    events.forEach(ev => {
      if (!dotMap[ev.date]) dotMap[ev.date] = new Set();
      dotMap[ev.date].add(ev.event_type);
    });

    return (
      <>
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={prevPeriod} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={styles.periodLabel}>{formatMonthYear(currentDate)}</ThemedText>
          <TouchableOpacity onPress={nextPeriod} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={TEXT} />
          </TouchableOpacity>
        </View>
        <View style={styles.monthDayNames}>
          {DAY_NAMES.map(n => <ThemedText key={n} style={styles.monthDayName}>{n}</ThemedText>)}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.monthWeek}>
            {week.map((day, di) => {
              const dateObj = day ? new Date(year, month, day) : null;
              const todayCell = dateObj ? isToday(dateObj) : false;
              const isPast = dateObj ? dateObj < today && !todayCell : false;
              const dateKey = dateObj ? `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
              const dots = dateKey ? dotMap[dateKey] : null;
              return (
                <TouchableOpacity key={di} style={[styles.monthCell, selectedDay === dateKey && styles.monthCellSelected]} activeOpacity={0.7}
                  onPress={() => day !== null ? setSelectedDay(selectedDay === dateKey ? null : dateKey) : undefined}>
                  {day !== null && (
                    <>
                      <View style={[styles.monthDayCircle, todayCell && styles.monthDayCircleToday]}>
                        <ThemedText style={[styles.monthDayText, isPast && { color: MUTED }, todayCell && { color: '#000', fontWeight: '700' }]}>
                          {day}
                        </ThemedText>
                      </View>
                      {dots && dots.size > 0 && (
                        <View style={{ flexDirection: 'row', gap: 3, justifyContent: 'center', marginTop: 2 }}>
                          {dots.has('session') && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: TEAL }} />}
                          {dots.has('game')    && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ORANGE }} />}
                          {dots.has('camp')    && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#F59E0B' }} />}
                          {dots.has('private') && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#EF4444' }} />}
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        {/* Selected day events */}
        {selectedDay && (() => {
          const sel = events.filter(e => e.date === selectedDay).sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
          const d = new Date(selectedDay + 'T00:00:00');
          const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          return (
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <ThemedText style={styles.listDateHeader}>{label.toUpperCase()}</ThemedText>
              {sel.length === 0 ? (
                <ThemedText style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>No events</ThemedText>
              ) : sel.map(ev => {
                const color = evColor(ev.event_type);
                const fmtTime = fmt24(ev.time);
                return (
                  <TouchableOpacity key={`${ev.event_type}-${ev.id}-${ev.date}`}
                    style={styles.eventCard} onPress={() => router.push(evDest(ev) as any)} activeOpacity={0.8}>
                    <View style={[styles.eventAccent, { backgroundColor: color }]} />
                    <View style={styles.eventBody}>
                      <ThemedText style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 1, marginBottom: 2 }}>{evLabel(ev.event_type)}</ThemedText>
                      <ThemedText style={styles.eventTitle}>{ev.title}</ThemedText>
                      <ThemedText style={styles.eventMeta}>{fmtTime ?? 'All day'}{ev.location ? ` · ${ev.location}` : ''}</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}
      </>
    );
  }

  // ─── Inline calendar renderer (shared by single-pick and multi-pick) ─
  function renderInlineCal(multiSelect: boolean) {
    return (
      <>
        <View style={styles.dpMonthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => { const d = new Date(pickerMonth); d.setMonth(d.getMonth()-1); setPickerMonth(d); }}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={styles.dpMonthLabel}>{formatMonthYear(pickerMonth)}</ThemedText>
          <TouchableOpacity style={styles.navBtn} onPress={() => { const d = new Date(pickerMonth); d.setMonth(d.getMonth()+1); setPickerMonth(d); }}>
            <Ionicons name="chevron-forward" size={18} color={TEXT} />
          </TouchableOpacity>
        </View>
        <View style={styles.dpDayNames}>
          {['M','T','W','T','F','S','S'].map((n, i) => <ThemedText key={i} style={styles.dpDayName}>{n}</ThemedText>)}
        </View>
        {dpWeeks.map((week, wi) => (
          <View key={wi} style={styles.dpWeek}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.dpCell} />;
              const dateStr = `${dpYear}-${String(dpMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const selected = multiSelect
                ? customDates.has(dateStr)
                : (showPickerFor === 'start' ? campStart : campEnd) === dateStr;
              const todayCell = isToday(new Date(dateStr + 'T00:00:00'));
              return (
                <TouchableOpacity key={di} style={styles.dpCell} onPress={() => {
                  if (multiSelect) {
                    toggleCustomDate(dateStr);
                  } else {
                    if (showPickerFor === 'start') setCampStart(dateStr);
                    else setCampEnd(dateStr);
                    setShowPickerFor(null);
                  }
                }}>
                  <View style={[styles.dpDayCircle, selected && styles.dpDayCircleSelected, todayCell && !selected && styles.dpDayCircleToday]}>
                    <ThemedText style={[styles.dpDayText, selected && { color: '#000', fontWeight: '700' }, todayCell && !selected && { color: TEAL }]}>
                      {day}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </>
    );
  }

  // ─── Date picker helpers ───────────────────────────────────────
  function formatDisplayDate(dateStr: string) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function toggleDatePicker(target: 'start' | 'end') {
    if (showPickerFor === target) { setShowPickerFor(null); return; }
    const existing = target === 'start' ? campStart : campEnd;
    setPickerMonth(existing ? new Date(existing + 'T00:00:00') : new Date());
    setShowPickerFor(target);
  }

  // Build weeks grid for current picker month
  const dpYear  = pickerMonth.getFullYear();
  const dpMonth = pickerMonth.getMonth();
  const dpDaysInMonth = getDaysInMonth(dpYear, dpMonth);
  const dpFirstDay    = getFirstDayOfMonth(dpYear, dpMonth);
  const dpCells: (number | null)[] = [...Array(dpFirstDay).fill(null), ...Array.from({ length: dpDaysInMonth }, (_, i) => i + 1)];
  while (dpCells.length % 7 !== 0) dpCells.push(null);
  const dpWeeks: (number | null)[][] = [];
  for (let i = 0; i < dpCells.length; i += 7) dpWeeks.push(dpCells.slice(i, i + 7));

  // ─── Same outer structure as Dashboard ────────────────────────
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Coach row */}
          <View style={styles.coachRow}>
            <View style={styles.coachChip}>
              <ThemedText style={styles.coachChipText}>COACH</ThemedText>
            </View>
            <View style={styles.coachIcons}>
              <TouchableOpacity style={styles.iconBtn}><Ionicons name="person-circle-outline" size={22} color={MUTED} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}><Ionicons name="megaphone-outline" size={20} color={MUTED} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}><Ionicons name="camera-outline" size={20} color={MUTED} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}><Ionicons name="settings-outline" size={20} color={MUTED} /></TouchableOpacity>
            </View>
          </View>

          {/* Title + add */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>Schedule</ThemedText>
            <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
              <Ionicons name="add" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* View switcher */}
          <View style={styles.viewSwitcher}>
            {(['list','day','week','month'] as ViewMode[]).map(v => (
              <TouchableOpacity key={v} style={[styles.viewBtn, view === v && styles.viewBtnActive]} onPress={() => setView(v)}>
                <ThemedText style={[styles.viewBtnText, view === v && styles.viewBtnTextActive]}>
                  {v.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
            <TouchableOpacity style={[styles.filterChip, filter === 'all' && styles.filterChipActive]} onPress={() => setFilter('all')}>
              <ThemedText style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>All</ThemedText>
              <Ionicons name="star" size={11} color={filter === 'all' ? TEAL : ORANGE} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, filter === 'camp' && styles.filterChipActive]} onPress={() => setFilter('camp')}>
              <View style={[styles.filterDot, { backgroundColor: ORANGE }]} />
              <ThemedText style={[styles.filterChipText, filter === 'camp' && styles.filterChipTextActive]}>Camp</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, filter === 'private' && styles.filterChipActive]} onPress={() => setFilter('private')}>
              <View style={[styles.filterDot, { backgroundColor: RED }]} />
              <ThemedText style={[styles.filterChipText, filter === 'private' && styles.filterChipTextActive]}>Privates</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, filter === 'team' && styles.filterChipActive]} onPress={() => setFilter('team')}>
              <ThemedText style={[styles.filterChipText, filter === 'team' && styles.filterChipTextActive]}>Teams</ThemedText>
              <Ionicons name="chevron-down" size={12} color={filter === 'team' ? TEAL : MUTED} />
            </TouchableOpacity>
          </ScrollView>

          {/* Content — inline, no nested ScrollView */}
          {view === 'list'  && renderList()}
          {view === 'day'   && renderDay()}
          {view === 'week'  && renderWeek()}
          {view === 'month' && renderMonth()}

        </ScrollView>
      </SafeAreaView>

      {/* ─── Create Modal ──────────────────────────────────────── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { const wasEdit = !!editingCampId; resetModal(); if (wasEdit) router.back(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { const wasEdit = !!editingCampId; resetModal(); if (wasEdit) router.back(); }}>
              <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>
              {editingCampId
                ? `Edit ${campType === 'camp' ? 'Camp' : campType === 'private' ? 'Private' : 'Session'}`
                : campType === 'camp' ? 'New Camp' : campType === 'private' ? 'New Private' : 'New Session'}
            </ThemedText>
            <TouchableOpacity style={styles.templateHeaderBtn}
              onPress={() => setShowTemplatePicker(v => !v)} activeOpacity={0.7}>
              <Ionicons name="albums-outline" size={14} color={TEAL} />
              <ThemedText style={styles.templateHeaderBtnText}>Templates</ThemedText>
            </TouchableOpacity>
          </View>

          {/* ── Template picker drawer ── */}
          {showTemplatePicker && (
            <View style={styles.templateDrawer}>
              <View style={styles.templateDrawerHeader}>
                <ThemedText style={styles.templateDrawerTitle}>Your Templates</ThemedText>
                <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                  <Ionicons name="close" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
              {templates.filter(t => t.type === campType).length === 0 ? (
                <ThemedText style={styles.templateEmpty}>
                  No {campType} templates yet. Fill out a form and tap "Save as Template."
                </ThemedText>
              ) : (
                templates.filter(t => t.type === campType).map(t => (
                  <TouchableOpacity key={t.id} style={styles.templateCard}
                    onPress={() => applyTemplate(t)} activeOpacity={0.75}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.templateCardTitle}>{t.title}</ThemedText>
                      {t.description ? <ThemedText style={styles.templateCardSub} numberOfLines={1}>{t.description}</ThemedText> : null}
                    </View>
                    <View style={styles.templateCardRight}>
                      <ThemedText style={styles.templateCardPrice}>
                        {t.price_per_session_cents
                          ? `$${(t.price_per_session_cents / 100).toFixed(0)}/session`
                          : t.price_cents ? `$${(t.price_cents / 100).toFixed(0)}` : 'Free'}
                      </ThemedText>
                      <Ionicons name="arrow-forward-circle-outline" size={18} color={TEAL} />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">

            {/* ── Type selector ── */}
            <View style={styles.typeSelector}>
              {(['camp', 'private', 'session'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.typeBtn, campType === t && styles.typeBtnActive]}
                  onPress={() => { setCampType(t); setShowTemplatePicker(false); }}>
                  <ThemedText style={[styles.typeBtnText, campType === t && styles.typeBtnTextActive]}>
                    {t === 'camp' ? 'Camp' : t === 'private' ? 'Private' : 'Session'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Title ── */}
            <ThemedText style={styles.fieldLabel}>
              {campType === 'camp' ? 'Camp' : campType === 'private' ? 'Private Session' : 'Session'} Title *
            </ThemedText>
            <TextInput style={styles.fieldInput}
              placeholder={campType === 'camp' ? 'e.g. Summer Skating Camp' : campType === 'private' ? 'e.g. Power Skating 1-on-1' : 'e.g. Drop-in Skating'}
              placeholderTextColor={MUTED} value={campTitle} onChangeText={setCampTitle} />

            {/* ── Public / Private toggle (camp + session) ── */}
            {campType !== 'private' && (
              <>
                <ThemedText style={styles.fieldLabel}>Visibility</ThemedText>
                <View style={styles.visibilityRow}>
                  <TouchableOpacity
                    style={[styles.visBtn, campIsPublic && styles.visBtnActive]}
                    onPress={() => { setCampIsPublic(true); setInvitees([]); }}
                    activeOpacity={0.75}>
                    <Ionicons name="globe-outline" size={15} color={campIsPublic ? '#000' : MUTED} />
                    <ThemedText style={[styles.visBtnText, campIsPublic && styles.visBtnTextActive]}>Public</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.visBtn, !campIsPublic && styles.visBtnPrivate]}
                    onPress={() => setCampIsPublic(false)}
                    activeOpacity={0.75}>
                    <Ionicons name="lock-closed-outline" size={15} color={!campIsPublic ? '#000' : MUTED} />
                    <ThemedText style={[styles.visBtnText, !campIsPublic && styles.visBtnTextActive]}>Private (Invite Only)</ThemedText>
                  </TouchableOpacity>
                </View>

                {!campIsPublic && (
                  <View style={styles.inviteSection}>
                    <View style={styles.inviteHeader}>
                      <ThemedText style={styles.fieldLabel}>INVITE LIST</ThemedText>
                      <TouchableOpacity onPress={() => setShowAddInvitee(v => !v)} activeOpacity={0.7} style={styles.addInviteeBtn}>
                        <Ionicons name="person-add-outline" size={13} color={TEAL} />
                        <ThemedText style={styles.addInviteeBtnText}>Add</ThemedText>
                      </TouchableOpacity>
                    </View>

                    {invitees.length > 0 && (
                      <View style={styles.inviteeList}>
                        {invitees.map(inv => (
                          <View key={inv.id} style={styles.inviteeRow}>
                            <Ionicons name="person-circle-outline" size={20} color={TEAL} />
                            <View style={{ flex: 1 }}>
                              <ThemedText style={styles.inviteeName}>{inv.name}</ThemedText>
                              {(inv.email || inv.phone) && (
                                <ThemedText style={styles.inviteeContact}>{[inv.email, inv.phone].filter(Boolean).join(' · ')}</ThemedText>
                              )}
                            </View>
                            <TouchableOpacity onPress={() => setInvitees(prev => prev.filter(i => i.id !== inv.id))}>
                              <Ionicons name="close-circle-outline" size={18} color={MUTED} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {showAddInvitee && (
                      <View style={styles.addInviteeForm}>
                        {/* Pick from existing players */}
                        {playerOptions.length > 0 && (
                          <>
                            <TouchableOpacity style={styles.fromRosterBtn} onPress={() => setShowInviteePicker(v => !v)} activeOpacity={0.7}>
                              <Ionicons name="people-outline" size={14} color={TEAL} />
                              <ThemedText style={styles.fromRosterText}>Pick from roster</ThemedText>
                              <Ionicons name={showInviteePicker ? 'chevron-up' : 'chevron-down'} size={13} color={MUTED} />
                            </TouchableOpacity>
                            {showInviteePicker && (
                              <View style={styles.playerPicker}>
                                {playerOptions
                                  .filter(p => !invitees.some(i => i.playerId === p.id))
                                  .map(p => (
                                    <TouchableOpacity key={p.id} style={styles.playerRow}
                                      onPress={() => {
                                        setInvitees(prev => [...prev, { id: p.id, name: p.full_name, email: '', phone: '', playerId: p.id }]);
                                        setShowInviteePicker(false);
                                      }}>
                                      <Ionicons name="person-outline" size={14} color={TEAL} />
                                      <ThemedText style={styles.playerRowText}>{p.full_name}</ThemedText>
                                    </TouchableOpacity>
                                  ))}
                              </View>
                            )}
                          </>
                        )}

                        {/* Manual entry */}
                        <ThemedText style={[styles.fieldLabel, { marginTop: 10 }]}>Or add manually</ThemedText>
                        <TextInput style={styles.fieldInput} placeholder="Name *" placeholderTextColor={MUTED}
                          value={inviteeName} onChangeText={setInviteeName} />
                        <TextInput style={styles.fieldInput} placeholder="Email" placeholderTextColor={MUTED}
                          keyboardType="email-address" autoCapitalize="none"
                          value={inviteeEmail} onChangeText={setInviteeEmail} />
                        <TextInput style={styles.fieldInput} placeholder="Phone" placeholderTextColor={MUTED}
                          keyboardType="phone-pad"
                          value={inviteePhone} onChangeText={setInviteePhone} />
                        <TouchableOpacity
                          style={[styles.addInviteeConfirmBtn, !inviteeName.trim() && { opacity: 0.4 }]}
                          disabled={!inviteeName.trim()}
                          onPress={() => {
                            setInvitees(prev => [...prev, {
                              id: Date.now().toString(),
                              name: inviteeName.trim(),
                              email: inviteeEmail.trim(),
                              phone: inviteePhone.trim(),
                            }]);
                            setInviteeName(''); setInviteeEmail(''); setInviteePhone('');
                            setShowAddInvitee(false);
                          }}
                          activeOpacity={0.8}>
                          <ThemedText style={styles.addInviteeConfirmText}>Add to List</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}

                    {invitees.length === 0 && !showAddInvitee && (
                      <ThemedText style={styles.inviteeEmpty}>No invitees yet. Tap Add to invite players.</ThemedText>
                    )}
                  </View>
                )}
              </>
            )}

            {/* ── Schedule type (camp only) ── */}
            {campType === 'camp' && (
              <>
                <ThemedText style={styles.fieldLabel}>Schedule Type</ThemedText>
                <View style={styles.schedGrid}>
                  {([
                    { key: 'consecutive', label: 'Consecutive', sub: 'Every day in range' },
                    { key: 'alternating', label: 'Every X Days', sub: 'e.g. every other day' },
                    { key: 'weekly',      label: 'Weekly',       sub: 'Same day(s) each week' },
                    { key: 'custom',      label: 'Custom Dates', sub: 'Pick specific dates' },
                  ] as const).map(opt => (
                    <TouchableOpacity key={opt.key}
                      style={[styles.schedOpt, scheduleType === opt.key && styles.schedOptActive]}
                      onPress={() => setScheduleType(opt.key)}>
                      <View style={[styles.schedRadio, scheduleType === opt.key && styles.schedRadioActive]}>
                        {scheduleType === opt.key && <View style={styles.schedRadioDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.schedOptLabel, scheduleType === opt.key && { color: TEAL }]}>{opt.label}</ThemedText>
                        <ThemedText style={styles.schedOptSub}>{opt.sub}</ThemedText>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── Dates section ── */}
            {campType === 'private' ? (
              // Private: multi-date + time + athlete
              <>
                <View style={styles.privateNotice}>
                  <Ionicons name="lock-closed-outline" size={13} color={TEAL} />
                  <ThemedText style={styles.privateNoticeText}>Private — not shown on public website. Parent receives payment request after saving.</ThemedText>
                </View>

                <ThemedText style={styles.fieldLabel}>Athlete</ThemedText>
                <TouchableOpacity style={styles.fieldInput} onPress={() => setShowPlayerPicker(v => !v)}
                  activeOpacity={0.7}>
                  <ThemedText style={athleteName ? { color: TEXT, fontSize: 15 } : { color: MUTED, fontSize: 15 }}>
                    {athleteName || 'Select or type athlete name…'}
                  </ThemedText>
                </TouchableOpacity>
                {showPlayerPicker && (
                  <View style={styles.playerPicker}>
                    {playerOptions.length > 0 ? playerOptions.map(p => (
                      <TouchableOpacity key={p.id} style={styles.playerRow}
                        onPress={() => { setAthleteName(p.full_name); setAthleteId(p.id); setShowPlayerPicker(false); }}>
                        <Ionicons name="person-outline" size={14} color={TEAL} />
                        <ThemedText style={styles.playerRowText}>{p.full_name}</ThemedText>
                      </TouchableOpacity>
                    )) : (
                      <ThemedText style={{ color: MUTED, padding: 12, fontSize: 13 }}>No players yet — type name below</ThemedText>
                    )}
                    <TextInput style={[styles.fieldInput, { margin: 10, marginTop: 6 }]}
                      placeholder="Or type athlete name…" placeholderTextColor={MUTED}
                      value={athleteName} onChangeText={v => { setAthleteName(v); setAthleteId(null); }} />
                  </View>
                )}
                {!showPlayerPicker && !athleteId && athleteName.length === 0 && (
                  <TextInput style={[styles.fieldInput, { marginTop: -12 }]}
                    placeholder="Or type athlete name…" placeholderTextColor={MUTED}
                    value={athleteName} onChangeText={v => { setAthleteName(v); setAthleteId(null); }} />
                )}

                <ThemedText style={styles.fieldLabel}>Session Time</ThemedText>
                <TimePicker value={campTime} onChange={v => setCampTime(v)} />

                <ThemedText style={styles.fieldLabel}>Session Dates (tap to add/remove)</ThemedText>
                {customDates.size > 0 && (
                  <View style={styles.chipWrap}>
                    {[...customDates].sort().map(d => (
                      <TouchableOpacity key={d} style={styles.dateChip} onPress={() => toggleCustomDate(d)}>
                        <ThemedText style={styles.dateChipText}>{formatDisplayDate(d)}</ThemedText>
                        <Ionicons name="close" size={11} color="#000" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.dpInline}>{renderInlineCal(true)}</View>
              </>
            ) : campType === 'session' ? (
              // Session: single date + time
              <>
                <ThemedText style={styles.fieldLabel}>Date</ThemedText>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity style={[styles.dateBtn, showPickerFor === 'start' && styles.dateBtnOpen]}
                      onPress={() => toggleDatePicker('start')} activeOpacity={0.7}>
                      <Ionicons name="calendar-outline" size={16} color={campStart ? TEAL : MUTED} />
                      <ThemedText style={[styles.dateBtnText, !campStart && styles.dateBtnPlaceholder]}>
                        {campStart ? formatDisplayDate(campStart) : 'Select date'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fieldLabel}>Time</ThemedText>
                    <TimePicker value={campTime} onChange={v => setCampTime(v)} />
                  </View>
                </View>
                {showPickerFor === 'start' && <View style={styles.dpInline}>{renderInlineCal(false)}</View>}
              </>
            ) : scheduleType === 'custom' ? (
              // Custom: multi-select calendar
              <>
                <ThemedText style={styles.fieldLabel}>Select Dates (tap to add/remove)</ThemedText>
                {customDates.size > 0 && (
                  <View style={styles.chipWrap}>
                    {[...customDates].sort().map(d => (
                      <TouchableOpacity key={d} style={styles.dateChip} onPress={() => toggleCustomDate(d)}>
                        <ThemedText style={styles.dateChipText}>{formatDisplayDate(d)}</ThemedText>
                        <Ionicons name="close" size={11} color="#000" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.dpInline}>{renderInlineCal(true)}</View>
              </>
            ) : (
              // Consecutive / alternating / weekly: start + end
              <>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fieldLabel}>Start Date</ThemedText>
                    <TouchableOpacity style={[styles.dateBtn, showPickerFor === 'start' && styles.dateBtnOpen]}
                      onPress={() => toggleDatePicker('start')} activeOpacity={0.7}>
                      <Ionicons name="calendar-outline" size={16} color={campStart ? TEAL : MUTED} />
                      <ThemedText style={[styles.dateBtnText, !campStart && styles.dateBtnPlaceholder]}>
                        {campStart ? formatDisplayDate(campStart) : 'Select date'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fieldLabel}>End Date</ThemedText>
                    <TouchableOpacity style={[styles.dateBtn, showPickerFor === 'end' && styles.dateBtnOpen]}
                      onPress={() => toggleDatePicker('end')} activeOpacity={0.7}>
                      <Ionicons name="calendar-outline" size={16} color={campEnd ? TEAL : MUTED} />
                      <ThemedText style={[styles.dateBtnText, !campEnd && styles.dateBtnPlaceholder]}>
                        {campEnd ? formatDisplayDate(campEnd) : 'Select date'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                {showPickerFor !== null && <View style={styles.dpInline}>{renderInlineCal(false)}</View>}

                {scheduleType === 'alternating' && (
                  <View style={styles.intervalRow}>
                    <ThemedText style={styles.fieldLabel}>Repeat every</ThemedText>
                    <View style={styles.intervalControl}>
                      <TouchableOpacity onPress={() => setScheduleInterval(v => String(Math.max(2, parseInt(v)-1)))} style={styles.intervalBtn}>
                        <Ionicons name="remove" size={20} color={TEAL} />
                      </TouchableOpacity>
                      <ThemedText style={styles.intervalValue}>{scheduleInterval} days</ThemedText>
                      <TouchableOpacity onPress={() => setScheduleInterval(v => String(parseInt(v)+1))} style={styles.intervalBtn}>
                        <Ionicons name="add" size={20} color={TEAL} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {scheduleType === 'weekly' && (
                  <View style={{ marginBottom: 20 }}>
                    <ThemedText style={styles.fieldLabel}>Repeat on</ThemedText>
                    <View style={styles.weekDayRow}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
                        <TouchableOpacity key={i}
                          style={[styles.weekDayBtn, weekDays.has(i) && styles.weekDayBtnActive]}
                          onPress={() => toggleWeekDay(i)}>
                          <ThemedText style={[styles.weekDayBtnText, weekDays.has(i) && styles.weekDayBtnTextActive]}>{d}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* ── Price + Spots ── */}
            {campType === 'private' ? (
              <>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fieldLabel}>Price per Session ($)</ThemedText>
                    <TextInput style={styles.fieldInput} placeholder="0.00" placeholderTextColor={MUTED}
                      keyboardType="decimal-pad" value={campPrice} onChangeText={setCampPrice} />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fieldLabel}>Sessions</ThemedText>
                    <View style={[styles.fieldInput, { justifyContent: 'center' }]}>
                      <ThemedText style={{ color: customDates.size > 0 ? TEXT : MUTED, fontSize: 15 }}>
                        {customDates.size > 0 ? `${customDates.size} selected` : 'Pick dates above'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                {campPrice && customDates.size > 0 && !isNaN(parseFloat(campPrice)) && (
                  <View style={styles.totalRow}>
                    <ThemedText style={styles.totalLabel}>
                      {customDates.size} × ${parseFloat(campPrice).toFixed(2)}
                    </ThemedText>
                    <ThemedText style={styles.totalValue}>
                      Total: ${(parseFloat(campPrice) * customDates.size).toFixed(2)}
                    </ThemedText>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Price ($)</ThemedText>
                  <TextInput style={styles.fieldInput} placeholder="0.00" placeholderTextColor={MUTED}
                    keyboardType="decimal-pad" value={campPrice} onChangeText={setCampPrice} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Max Spots</ThemedText>
                  <TextInput style={styles.fieldInput} placeholder="e.g. 20"
                    placeholderTextColor={MUTED} keyboardType="number-pad"
                    value={campSpots} onChangeText={setCampSpots} />
                </View>
              </View>
            )}

            {/* ── Location ── */}
            <ThemedText style={styles.fieldLabel}>Location</ThemedText>
            <View style={styles.locationBox}>
              {savedLocations.map(loc => (
                <TouchableOpacity key={loc.id}
                  style={[styles.locRow, campLocation === loc.name && styles.locRowActive]}
                  onPress={() => { setCampLocation(loc.name); setShowNewLoc(false); setSuggestions([]); }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.locName, campLocation === loc.name && styles.locNameActive]}>{loc.name}</ThemedText>
                    {loc.address ? <ThemedText style={styles.locAddress}>{loc.address}</ThemedText> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {loc.address ? (
                      <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address!)}`)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="navigate-outline" size={16} color={TEAL} />
                      </TouchableOpacity>
                    ) : null}
                    {campLocation === loc.name && <Ionicons name="checkmark-circle" size={20} color={TEAL} />}
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.locRow, styles.locRowNew]}
                onPress={() => { setShowNewLoc(v => !v); if (showNewLoc) setNewLocInput(''); }}>
                <Ionicons name={showNewLoc ? 'remove-circle-outline' : 'add-circle-outline'} size={18} color={TEAL} />
                <ThemedText style={styles.locNewText}>
                  {showNewLoc ? 'Cancel' : savedLocations.length === 0 ? 'Add a location' : 'Add new location'}
                </ThemedText>
              </TouchableOpacity>
              {showNewLoc && (
                <View style={styles.newLocInputArea}>
                  <TextInput style={[styles.fieldInput, { marginBottom: suggestions.length > 0 ? 4 : 8 }]}
                    placeholder="Search arena or rink name" placeholderTextColor={MUTED}
                    value={newLocInput} onChangeText={onNewLocChange} autoFocus />
                  {suggestions.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      {suggestions.slice(0, 5).map((sug, i) => (
                        <TouchableOpacity key={sug.place_id}
                          style={[styles.suggestionRow, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER }]}
                          onPress={() => pickSuggestion(sug)}>
                          <Ionicons name="location-outline" size={14} color={TEAL} style={{ marginTop: 1 }} />
                          <ThemedText style={styles.suggestionText} numberOfLines={2}>{sug.description}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {locError ? <ThemedText style={styles.locError}>{locError}</ThemedText> : null}
                  {loadingSug && suggestions.length === 0 && !locError && <ThemedText style={styles.locSearching}>Searching…</ThemedText>}
                  {newLocAddress && suggestions.length === 0 && <ThemedText style={styles.locAddressPreview}>{newLocAddress}</ThemedText>}
                  {newLocInput.trim().length > 0 && suggestions.length === 0 && !loadingSug && (
                    <TouchableOpacity style={[styles.saveLocBtn, savingLoc && { opacity: 0.5 }]} onPress={saveNewLocation} disabled={savingLoc}>
                      <Ionicons name="bookmark-outline" size={15} color="#000" />
                      <ThemedText style={styles.saveLocBtnText}>{savingLoc ? 'Saving…' : 'Save as new location'}</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* ── Description ── */}
            <ThemedText style={styles.fieldLabel}>Description</ThemedText>
            <TextInput style={[styles.fieldInput, styles.fieldMultiline]}
              placeholder="What's included, schedule, requirements…"
              placeholderTextColor={MUTED} multiline numberOfLines={4}
              value={campDesc} onChangeText={setCampDesc} />

            {/* ── Media ── */}
            <ThemedText style={styles.fieldLabel}>Media</ThemedText>

            {/* Image */}
            <View style={styles.mediaImageRow}>
              {campImageUrl ? (
                <View style={styles.mediaPreviewWrap}>
                  <Image source={{ uri: campImageUrl }} style={styles.mediaPreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.mediaPreviewRemove} onPress={() => setCampImageUrl('')}>
                    <Ionicons name="close-circle" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.mediaUploadBtn} onPress={pickAndUploadImage}
                  disabled={uploadingImage} activeOpacity={0.75}>
                  <Ionicons name={uploadingImage ? 'hourglass-outline' : 'image-outline'} size={22} color={TEAL} />
                  <ThemedText style={styles.mediaUploadText}>
                    {uploadingImage ? 'Uploading…' : 'Upload Camp Image'}
                  </ThemedText>
                  <ThemedText style={styles.mediaUploadSub}>16:9 · shown on website</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* Previous images from library */}
            {mediaLibrary.filter(m => m.type === 'image').length > 0 && (
              <>
                <TouchableOpacity style={styles.mediaLibraryToggle}
                  onPress={() => setShowMediaLibrary(v => !v)} activeOpacity={0.7}>
                  <Ionicons name="albums-outline" size={14} color={TEAL} />
                  <ThemedText style={styles.mediaLibraryToggleText}>Previously Used Images</ThemedText>
                  <Ionicons name={showMediaLibrary ? 'chevron-up' : 'chevron-down'} size={13} color={MUTED} />
                </TouchableOpacity>
                {showMediaLibrary && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaLibraryScroll}
                    contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                    {mediaLibrary.filter(m => m.type === 'image').map(m => (
                      <TouchableOpacity key={m.id} onPress={() => { setCampImageUrl(m.url); setShowMediaLibrary(false); }}
                        activeOpacity={0.8}>
                        <Image source={{ uri: m.url }} style={styles.mediaLibraryThumb} resizeMode="cover" />
                        {campImageUrl === m.url && (
                          <View style={styles.mediaLibrarySelected}>
                            <Ionicons name="checkmark-circle" size={20} color={TEAL} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            {/* Video */}
            <ThemedText style={[styles.fieldLabel, { marginTop: 12 }]}>Video</ThemedText>
            {campVideoUrl ? (
              <View style={styles.videoSelectedRow}>
                <Ionicons name="play-circle" size={20} color={TEAL} />
                <ThemedText style={styles.videoSelectedText} numberOfLines={1}>{campVideoUrl}</ThemedText>
                <TouchableOpacity onPress={() => setCampVideoUrl('')}>
                  <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoPickRow}>
                <TouchableOpacity style={styles.videoPickBtn} onPress={pickAndUploadVideo}
                  disabled={uploadingVideo} activeOpacity={0.75}>
                  <Ionicons name={uploadingVideo ? 'hourglass-outline' : 'videocam-outline'} size={18} color={TEAL} />
                  <ThemedText style={styles.videoPickBtnText}>
                    {uploadingVideo ? 'Uploading…' : 'From Device'}
                  </ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.videoOrText}>or</ThemedText>
                <TextInput style={[styles.fieldInput, styles.videoUrlInput]}
                  placeholder="Paste URL" placeholderTextColor={MUTED}
                  autoCapitalize="none" keyboardType="url"
                  value={campVideoUrl} onChangeText={setCampVideoUrl} />
              </View>
            )}

            {/* Previous video URLs from library */}
            {mediaLibrary.filter(m => m.type === 'video').length > 0 && (
              <View style={styles.videoPrevList}>
                {mediaLibrary.filter(m => m.type === 'video').map(m => (
                  <TouchableOpacity key={m.id} style={[styles.videoPrevRow, campVideoUrl === m.url && styles.videoPrevRowActive]}
                    onPress={() => setCampVideoUrl(m.url)} activeOpacity={0.75}>
                    <Ionicons name="play-circle-outline" size={16} color={campVideoUrl === m.url ? TEAL : MUTED} />
                    <ThemedText style={[styles.videoPrevText, campVideoUrl === m.url && { color: TEAL }]} numberOfLines={1}>{m.url}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Registration Requirements ── */}
            <ThemedText style={styles.fieldLabel}>Registration Requirements</ThemedText>
            <View style={styles.reqCard}>

              {/* Master waiver */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Master Waiver</ThemedText>
                  <ThemedText style={styles.reqSub}>Parent signs general liability waiver once — covers all your camps & sessions</ThemedText>
                </View>
                <Switch value={requirements.masterWaiver} onValueChange={v => setReq('masterWaiver', v)}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>

              <View style={styles.reqDivider} />

              {/* Refund Policy */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Refund Policy</ThemedText>
                  <ThemedText style={styles.reqSub}>Parent acknowledges your refund terms</ThemedText>
                </View>
                <Switch value={requirements.refundPolicy.on} onValueChange={v => setReq('refundPolicy', { on: v })}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>
              {requirements.refundPolicy.on && (
                <TextInput style={[styles.fieldInput, styles.reqTextInput]}
                  placeholder="e.g. No refunds within 7 days of camp start date"
                  placeholderTextColor={MUTED} multiline
                  value={requirements.refundPolicy.text}
                  onChangeText={t => setReq('refundPolicy', { text: t })} />
              )}

              <View style={styles.reqDivider} />

              {/* Photo / Video Consent */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Photo / Video Consent</ThemedText>
                  <ThemedText style={styles.reqSub}>Permission to use player photos & video for promotion</ThemedText>
                </View>
                <Switch value={requirements.photoConsent} onValueChange={v => setReq('photoConsent', v)}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>

              <View style={styles.reqDivider} />

              {/* Equipment */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Equipment Requirements</ThemedText>
                  <ThemedText style={styles.reqSub}>Specify what players must bring</ThemedText>
                </View>
                <Switch value={requirements.equipment.on} onValueChange={v => setReq('equipment', { on: v })}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>
              {requirements.equipment.on && (
                <TextInput style={[styles.fieldInput, styles.reqTextInput]}
                  placeholder="e.g. Full gear required. No equipment provided."
                  placeholderTextColor={MUTED} multiline
                  value={requirements.equipment.text}
                  onChangeText={t => setReq('equipment', { text: t })} />
              )}

              <View style={styles.reqDivider} />

              {/* Medical Clearance */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Medical Clearance Required</ThemedText>
                  <ThemedText style={styles.reqSub}>Parent confirms player is medically cleared to participate</ThemedText>
                </View>
                <Switch value={requirements.medicalClearance} onValueChange={v => setReq('medicalClearance', v)}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>

              <View style={styles.reqDivider} />

              {/* Travel */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Travel / Out-of-Town Camp</ThemedText>
                  <ThemedText style={styles.reqSub}>Parent acknowledges travel is required</ThemedText>
                </View>
                <Switch value={requirements.travel} onValueChange={v => setReq('travel', v)}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>

              <View style={styles.reqDivider} />

              {/* Skill Requirement */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Age / Skill Requirement</ThemedText>
                  <ThemedText style={styles.reqSub}>Parent confirms player meets eligibility</ThemedText>
                </View>
                <Switch value={requirements.skillRequirement.on} onValueChange={v => setReq('skillRequirement', { on: v })}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>
              {requirements.skillRequirement.on && (
                <TextInput style={[styles.fieldInput, styles.reqTextInput]}
                  placeholder="e.g. AA/AAA players born 2012–2014 only"
                  placeholderTextColor={MUTED}
                  value={requirements.skillRequirement.text}
                  onChangeText={t => setReq('skillRequirement', { text: t })} />
              )}

              <View style={styles.reqDivider} />

              {/* Illness Policy */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Illness Policy</ThemedText>
                  <ThemedText style={styles.reqSub}>e.g. do not attend if symptomatic</ThemedText>
                </View>
                <Switch value={requirements.illnessPolicy.on} onValueChange={v => setReq('illnessPolicy', { on: v })}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>
              {requirements.illnessPolicy.on && (
                <TextInput style={[styles.fieldInput, styles.reqTextInput]}
                  placeholder="e.g. Players must stay home if showing any symptoms of illness"
                  placeholderTextColor={MUTED} multiline
                  value={requirements.illnessPolicy.text}
                  onChangeText={t => setReq('illnessPolicy', { text: t })} />
              )}

              <View style={styles.reqDivider} />

              {/* Custom */}
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.reqLabel}>Additional Condition</ThemedText>
                  <ThemedText style={styles.reqSub}>Anything else parents must acknowledge</ThemedText>
                </View>
                <Switch value={requirements.custom.on} onValueChange={v => setReq('custom', { on: v })}
                  trackColor={{ false: BORDER, true: TEAL }} thumbColor="#fff" />
              </View>
              {requirements.custom.on && (
                <TextInput style={[styles.fieldInput, styles.reqTextInput]}
                  placeholder="Describe the condition…"
                  placeholderTextColor={MUTED} multiline
                  value={requirements.custom.text}
                  onChangeText={t => setReq('custom', { text: t })} />
              )}

            </View>

            {/* ── Save / Publish ── */}
            <View style={styles.submitRow}>
              {editingCampId ? (
                // Edit mode: single "Save Changes" button
                <TouchableOpacity style={[styles.publishModalBtn, { flex: 1 }, saving && { opacity: 0.5 }]}
                  onPress={() => createCamp('draft')} disabled={saving}>
                  <Ionicons name="checkmark-outline" size={15} color="#000" />
                  <ThemedText style={styles.publishModalBtnText}>{saving ? 'Saving…' : 'Save Changes'}</ThemedText>
                </TouchableOpacity>
              ) : (
                <>
                  {campType !== 'private' && (
                    <TouchableOpacity style={[styles.draftBtn, saving && { opacity: 0.5 }]}
                      onPress={() => createCamp('draft')} disabled={saving}>
                      <ThemedText style={styles.draftBtnText}>{saving ? 'Saving…' : 'Save Draft'}</ThemedText>
                    </TouchableOpacity>
                  )}
                  {campType === 'private' && (
                    <TouchableOpacity style={[styles.draftBtn, saving && { opacity: 0.5 }]}
                      onPress={() => createCamp('draft')} disabled={saving}>
                      <ThemedText style={styles.draftBtnText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.publishModalBtn, saving && { opacity: 0.5 }]}
                    onPress={() => createCamp('published')} disabled={saving}>
                    <Ionicons name={campType === 'private' ? 'send-outline' : !campIsPublic ? 'mail-outline' : 'rocket-outline'} size={15} color="#000" />
                    <ThemedText style={styles.publishModalBtnText}>
                      {saving ? 'Sending…' : campType === 'private' ? 'Save & Send to Parent' : !campIsPublic ? 'Publish & Send Invites' : 'Publish'}
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* ── Save as Template ── */}
            <TouchableOpacity style={styles.saveTemplateBtn}
              onPress={saveAsTemplate} disabled={savingTemplate} activeOpacity={0.7}>
              <Ionicons name="bookmark-outline" size={14} color={MUTED} />
              <ThemedText style={styles.saveTemplateBtnText}>
                {savingTemplate ? 'Saving template…' : 'Save as Template'}
              </ThemedText>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  safe:    { flex: 1 },
  content: { paddingBottom: 32 },

  coachRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  coachChip:     { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  coachIcons:    { flexDirection: 'row', gap: 4 },
  iconBtn:       { padding: 6 },

  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  title:   { fontSize: 28, fontWeight: '800', color: TEXT, lineHeight: 36 },
  addBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  viewSwitcher:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 30, padding: 4 },
  viewBtn:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 26 },
  viewBtnActive:   { backgroundColor: TEAL },
  viewBtnText:     { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  viewBtnTextActive: { color: '#000' },

  filters:         { marginBottom: 16, maxHeight: 44 },
  filtersContent:  { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, paddingHorizontal: 14, paddingVertical: 7, height: 36 },
  filterChipActive:     { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.1)' },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  filterChipTextActive: { color: TEAL },
  filterDot:       { width: 6, height: 6, borderRadius: 3 },

  emptySection: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: TEXT },
  emptySub:     { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
  listDateHeader: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginTop: 16, marginBottom: 8 },

  eventCard: {
    flexDirection: 'row', backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 10, overflow: 'hidden',
  },
  eventAccent: { width: 4, backgroundColor: TEAL },
  eventBody: { flex: 1, padding: 14 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4 },
  eventMeta: { fontSize: 13, color: MUTED },

  periodNav:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn:     { padding: 8, borderRadius: 10, backgroundColor: CARD },
  periodLabel:{ fontSize: 15, fontWeight: '700', color: TEXT },

  hourRow:   { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, height: 56 },
  hourLabel: { fontSize: 11, color: MUTED, width: 44 },
  hourLine:  { flex: 1, height: 1, backgroundColor: BORDER },

  // Day view event rows
  dayEventRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  dayEventTime:     { width: 64, paddingTop: 14, alignItems: 'flex-end' },
  dayEventTimeText: { fontSize: 12, fontWeight: '700' },
  dayEventCard:     { flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 4, padding: 12 },
  dayEventTitle:    { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  dayEventMeta:     { fontSize: 12, color: MUTED },

  // Week view
  weekDaySection:     { marginBottom: 16 },
  weekDayHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 8 },
  weekDayHeaderToday: { borderBottomColor: TEAL },
  weekDayLabel:       { fontSize: 13, fontWeight: '800', color: MUTED, letterSpacing: 0.5 },
  weekDayBadge:       { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  weekDayEmpty:       { fontSize: 12, color: MUTED, paddingBottom: 8 },
  weekEventRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 12, borderLeftWidth: 3, marginBottom: 6, backgroundColor: CARD, borderRadius: 8 },
  weekEventTime:      { fontSize: 12, fontWeight: '700', width: 64 },
  weekEventTitle:     { fontSize: 13, fontWeight: '600', color: TEXT, flex: 1 },

  // Old week styles (kept for safety)
  weekDayHeaders:       { flexDirection: 'row', paddingLeft: 44, paddingRight: 16, paddingBottom: 8 },
  weekTimeSpacer:       { width: 44 },
  weekDayCol:           { flex: 1, alignItems: 'center', gap: 4 },
  weekDayName:          { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  weekDayNum:           { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekDayNumToday:      { backgroundColor: TEAL },
  weekDayNumText:       { fontSize: 14, fontWeight: '600', color: TEXT },
  weekDayNumTextToday:  { color: '#000', fontWeight: '800' },
  weekHourRow:          { flexDirection: 'row', alignItems: 'flex-start', height: 56, borderTopWidth: 1, borderTopColor: BORDER },
  weekHourLabel:        { fontSize: 10, color: MUTED, width: 44, paddingLeft: 16, paddingTop: 4 },
  weekCell:             { flex: 1, height: 56, borderLeftWidth: 1, borderLeftColor: BORDER },
  monthCellSelected:    { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8 },

  monthDayNames: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8 },
  monthDayName:  { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  monthWeek:     { flexDirection: 'row', paddingHorizontal: 8 },
  monthCell:     { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  monthDayCircle:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  monthDayCircleToday: { backgroundColor: TEAL },
  monthDayText:        { fontSize: 13, fontWeight: '500', color: TEXT },

  // ─── Create Camp Modal ─────────────────────────────────────────
  modalRoot:    { flex: 1, backgroundColor: BG },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: TEXT },
  modalCancel:  { fontSize: 15, color: MUTED },
  templateHeaderBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  templateHeaderBtnText: { fontSize: 12, fontWeight: '700', color: TEAL },
  templateDrawer:        { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 10 },
  templateDrawerHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  templateDrawerTitle:   { fontSize: 13, fontWeight: '700', color: TEXT, letterSpacing: 0.5 },
  templateEmpty:         { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 12 },
  templateCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 8 },
  templateCardTitle:     { fontSize: 14, fontWeight: '700', color: TEXT },
  templateCardSub:       { fontSize: 12, color: MUTED, marginTop: 2 },
  templateCardRight:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateCardPrice:     { fontSize: 12, fontWeight: '700', color: TEAL },
  // Registration Requirements
  reqCard:      { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 20, overflow: 'hidden' },
  reqRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  reqLabel:     { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  reqSub:       { fontSize: 11, color: MUTED, lineHeight: 15 },
  reqDivider:   { height: 1, backgroundColor: BORDER, marginLeft: 14 },
  reqTextInput: { marginHorizontal: 14, marginBottom: 12, marginTop: -4 },

  saveTemplateBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginBottom: 32 },
  saveTemplateBtnText:   { fontSize: 13, color: MUTED },

  // Media
  mediaImageRow:         { marginBottom: 10 },
  mediaUploadBtn:        { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', paddingVertical: 20, alignItems: 'center', gap: 6 },
  mediaUploadText:       { fontSize: 14, fontWeight: '700', color: TEAL },
  mediaUploadSub:        { fontSize: 11, color: MUTED },
  mediaPreviewWrap:      { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  mediaPreview:          { width: '100%', height: 160, borderRadius: 12 },
  mediaPreviewRemove:    { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 11 },
  mediaLibraryToggle:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 4 },
  mediaLibraryToggleText:{ fontSize: 12, fontWeight: '600', color: TEAL, flex: 1 },
  mediaLibraryScroll:    { marginBottom: 12 },
  mediaLibraryThumb:     { width: 100, height: 64, borderRadius: 8, backgroundColor: CARD },
  mediaLibrarySelected:  { position: 'absolute', top: 4, right: 4 },
  videoPickRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  videoPickBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 11 },
  videoPickBtnText:      { fontSize: 13, fontWeight: '700', color: TEAL },
  videoOrText:           { fontSize: 12, color: MUTED },
  videoUrlInput:         { flex: 1, marginBottom: 0 },
  videoSelectedRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,196,180,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', padding: 12, marginBottom: 10 },
  videoSelectedText:     { flex: 1, fontSize: 12, color: TEAL },
  videoPrevList:         { gap: 6, marginBottom: 16, marginTop: -8 },
  videoPrevRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD, borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 8 },
  videoPrevRowActive:    { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.06)' },
  videoPrevText:         { flex: 1, fontSize: 11, color: MUTED },
  modalSave:    { fontSize: 15, fontWeight: '700', color: TEAL },
  modalScroll:  { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  fieldLabel:    { fontSize: 12, fontWeight: '600', color: MUTED, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  fieldInput:    { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT, marginBottom: 20 },
  fieldMultiline:{ height: 100, textAlignVertical: 'top' },
  row:           { flexDirection: 'row', marginBottom: 0 },
  draftNote:     { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 4, marginBottom: 40 },

  // Date button
  dateBtn:             { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 4 },
  dateBtnOpen:         { borderColor: TEAL, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  dateBtnText:         { fontSize: 14, fontWeight: '600', color: TEXT },
  dateBtnPlaceholder:  { color: MUTED, fontWeight: '400' },

  // Inline date picker
  dpInline:            { backgroundColor: CARD, borderWidth: 1, borderColor: TEAL, borderRadius: 10, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingBottom: 8, marginBottom: 20 },
  dpMonthNav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  dpMonthLabel:        { fontSize: 14, fontWeight: '700', color: TEXT },
  dpDayNames:          { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4 },
  dpDayName:           { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  dpWeek:              { flexDirection: 'row', paddingHorizontal: 4 },
  dpCell:              { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dpDayCircle:         { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dpDayCircleSelected: { backgroundColor: TEAL },
  dpDayCircleToday:    { borderWidth: 1, borderColor: TEAL },
  dpDayText:           { fontSize: 13, fontWeight: '500', color: TEXT },

  // Location picker
  locationBox:     { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  locRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  locRowActive:    { backgroundColor: '#0D2A24' },
  locRowNew:       { borderBottomWidth: 0 },
  locName:         { fontSize: 15, color: TEXT, fontWeight: '500' },
  locNameActive:   { color: TEAL, fontWeight: '600' },
  locAddress:      { fontSize: 12, color: MUTED, marginTop: 1 },
  locNewText:      { fontSize: 14, color: TEAL, fontWeight: '600' },
  newLocInputArea: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14, borderTopWidth: 1, borderTopColor: BORDER },
  saveLocBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  saveLocBtnText:  { fontSize: 13, fontWeight: '700', color: '#000' },
  suggestionsBox:  { backgroundColor: CARD, borderWidth: 1, borderColor: TEAL, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  suggestionRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  suggestionText:  { flex: 1, fontSize: 13, color: TEXT, lineHeight: 18 },
  locAddressPreview: { fontSize: 12, color: MUTED, marginBottom: 8, marginTop: -4 },
  locError:          { fontSize: 12, color: RED, marginBottom: 8 },
  locSearching:      { fontSize: 12, color: MUTED, marginBottom: 8 },

  // Type selector
  typeSelector:      { flexDirection: 'row', backgroundColor: CARD, borderRadius: 10, padding: 3, marginBottom: 20 },
  typeBtn:           { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  typeBtnActive:     { backgroundColor: TEAL },
  typeBtnText:       { fontSize: 13, fontWeight: '700', color: MUTED },
  typeBtnTextActive: { color: '#000' },

  // Schedule grid
  schedGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  schedOpt:          { width: '47.5%', flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12 },
  schedOptActive:    { borderColor: TEAL, backgroundColor: '#0D2A24' },
  schedRadio:        { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: BORDER, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  schedRadioActive:  { borderColor: TEAL },
  schedRadioDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: TEAL },
  schedOptLabel:     { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 2 },
  schedOptSub:       { fontSize: 11, color: MUTED, lineHeight: 14 },

  // Alternating interval
  intervalRow:       { marginBottom: 20 },
  intervalControl:   { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  intervalBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  intervalValue:     { fontSize: 16, fontWeight: '700', color: TEXT, minWidth: 80, textAlign: 'center' },

  // Weekly day picker
  weekDayRow:        { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  weekDayBtn:        { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  weekDayBtnActive:  { backgroundColor: TEAL, borderColor: TEAL },
  weekDayBtnText:    { fontSize: 12, fontWeight: '700', color: MUTED },
  weekDayBtnTextActive: { color: '#000' },

  // Custom date chips
  chipWrap:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  dateChip:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dateChipText:      { fontSize: 12, fontWeight: '700', color: '#000' },

  // Public / Private visibility toggle
  visibilityRow:         { flexDirection: 'row', gap: 10, marginBottom: 16 },
  visBtn:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  visBtnActive:          { backgroundColor: TEAL, borderColor: TEAL },
  visBtnPrivate:         { backgroundColor: ORANGE, borderColor: ORANGE },
  visBtnText:            { fontSize: 13, fontWeight: '700', color: MUTED },
  visBtnTextActive:      { color: '#000' },

  // Invite list
  inviteSection:         { backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 14, marginBottom: 16 },
  inviteHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addInviteeBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addInviteeBtnText:     { fontSize: 12, fontWeight: '700', color: TEAL },
  inviteeList:           { gap: 8, marginBottom: 10 },
  inviteeRow:            { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 10 },
  inviteeName:           { fontSize: 14, fontWeight: '600', color: TEXT },
  inviteeContact:        { fontSize: 11, color: MUTED, marginTop: 1 },
  inviteeEmpty:          { fontSize: 12, color: MUTED, textAlign: 'center', paddingVertical: 8 },
  addInviteeForm:        { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, gap: 0 },
  fromRosterBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 4 },
  fromRosterText:        { flex: 1, fontSize: 13, fontWeight: '600', color: TEAL },
  addInviteeConfirmBtn:  { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addInviteeConfirmText: { fontSize: 14, fontWeight: '800', color: '#000' },

  // Private per-session total
  totalRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,196,180,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, marginTop: -8 },
  totalLabel:        { fontSize: 13, color: MUTED },
  totalValue:        { fontSize: 15, fontWeight: '800', color: TEAL },

  // Private notice + athlete picker
  privateNotice:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(0,196,180,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', padding: 12, marginBottom: 16 },
  privateNoticeText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 },
  playerPicker:      { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 12, overflow: 'hidden' },
  playerRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  playerRowText:     { fontSize: 14, color: TEXT },

  // Submit buttons
  submitRow:         { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 40 },
  draftBtn:          { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  draftBtnText:      { fontSize: 14, fontWeight: '700', color: MUTED },
  publishModalBtn:   { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: TEAL },
  publishModalBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
