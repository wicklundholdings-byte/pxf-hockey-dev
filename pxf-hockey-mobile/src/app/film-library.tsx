import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput,
  Dimensions, Platform,
} from 'react-native';

// Try expo-sharing for reliable file sharing; falls back to RN Share
let Sharing: any = null;
let RNShare: any = null;
try { Sharing = require('expo-sharing'); } catch {}
try { RNShare = require('react-native').Share; } catch {}
import * as MediaLibrary from 'expo-media-library';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const ORANGE = '#F59E0B';
const PURPLE = '#7C3AED';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;

type Clip = {
  id: string;
  player_name:      string | null;
  player_id:        string | null;
  category:         string;
  notes:            string | null;
  duration_seconds: number | null;
  local_asset_id:   string | null;
  stream_video_id:  string | null;
  created_at:       string;
};

type FilterMode = 'all' | 'athletes' | string;

const CATEGORIES = ['skating', 'shooting', 'passing', 'defense', 'game', 'other'];
const CAT_LABEL: Record<string, string> = {
  skating: 'Skating', shooting: 'Shooting', passing: 'Passing',
  defense: 'Defense', game: 'Game', other: 'Other',
};
const CAT_COLOR: Record<string, string> = {
  skating: TEAL, shooting: ORANGE, passing: GREEN,
  defense: PURPLE, game: '#F97316', other: MUTED,
};

function fmtDuration(s: number | null) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Player modal ──────────────────────────────────────────────────────────────
function ClipPlayerModal({ clip, onClose, onShare, onDelete }: {
  clip: Clip | null;
  onClose: () => void;
  onShare: (uri: string) => void;
  onDelete: (id: string) => void;
}) {
  const [uri,        setUri]        = useState<string | null>(null);
  const [loadingUri, setLoadingUri] = useState(false);
  const player = useVideoPlayer(null);

  useEffect(() => {
    if (!clip) { setUri(null); return; }
    setLoadingUri(true);
    (async () => {
      try {
        if (clip.stream_video_id) {
          player.replace({ uri: clip.stream_video_id });
          setUri(clip.stream_video_id);
          player.play();
        } else if (clip.local_asset_id) {
          const info = await MediaLibrary.getAssetInfoAsync(clip.local_asset_id);
          const localUri = info.localUri ?? info.uri;
          player.replace({ uri: localUri });
          setUri(localUri);
          player.play();
        }
      } catch {
        setUri(null);
      } finally {
        setLoadingUri(false);
      }
    })();
  }, [clip?.id]);

  if (!clip) return null;

  const color = CAT_COLOR[clip.category] ?? MUTED;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Video */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {loadingUri ? (
            <ActivityIndicator color={TEAL} size="large" />
          ) : uri ? (
            <VideoView
              player={player}
              style={{ width: SW, flex: 1 }}
              contentFit="contain"
              nativeControls
            />
          ) : (
            <View style={{ alignItems: 'center', padding: 32 }}>
              <Ionicons name="videocam-off-outline" size={48} color={MUTED} style={{ marginBottom: 12 }} />
              <ThemedText style={{ color: MUTED, fontSize: 14, textAlign: 'center' }}>
                Video not available on this device
              </ThemedText>
            </View>
          )}
        </View>

        {/* Info + actions */}
        <SafeAreaView style={{ backgroundColor: '#000' }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ backgroundColor: `${color}22`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${color}44` }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color, letterSpacing: 0.5 }}>
                  {CAT_LABEL[clip.category] ?? clip.category.toUpperCase()}
                </ThemedText>
              </View>
              {clip.duration_seconds ? (
                <ThemedText style={{ fontSize: 12, color: MUTED }}>{fmtDuration(clip.duration_seconds)}</ThemedText>
              ) : null}
            </View>

            <ThemedText style={{ fontSize: 20, fontWeight: '800', color: TEXT, lineHeight: 26, marginBottom: 2 }}>
              {clip.player_name ?? 'Untagged clip'}
            </ThemedText>
            <ThemedText style={{ fontSize: 13, color: MUTED, marginBottom: clip.notes ? 8 : 0 }}>
              {fmtDate(clip.created_at)}
            </ThemedText>
            {clip.notes ? (
              <ThemedText style={{ fontSize: 13, color: MUTED, fontStyle: 'italic', marginBottom: 6 }}>
                "{clip.notes}"
              </ThemedText>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[mv.btn, { borderColor: loadingUri || !uri ? BORDER : TEAL, opacity: loadingUri || !uri ? 0.5 : 1 }]}
                onPress={() => { if (uri) onShare(uri); }}
                disabled={loadingUri || !uri}
                activeOpacity={0.8}
              >
                {loadingUri
                  ? <ActivityIndicator size="small" color={TEAL} />
                  : <Ionicons name="share-outline" size={18} color={uri ? TEAL : MUTED} />
                }
                <ThemedText style={[mv.btnText, { color: uri ? TEAL : MUTED }]}>
                  {loadingUri ? 'Loading…' : 'Save & Share'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mv.btn, { flex: 0, paddingHorizontal: 16, borderColor: RED }]}
                onPress={() => onDelete(clip.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color={RED} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Ionicons name="chevron-down" size={28} color={MUTED} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const mv = StyleSheet.create({
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    paddingVertical: 12, borderWidth: 1,
  },
  btnText: { fontSize: 14, fontWeight: '600' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function FilmLibraryScreen() {
  const router = useRouter();
  const [clips,    setClips]    = useState<Clip[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<FilterMode>('all');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Clip | null>(null);

  useEffect(() => { loadClips(); }, []);

  async function loadClips() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('clips')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });
    setClips((data ?? []) as Clip[]);
    setLoading(false);
  }

  function deleteClip(id: string) {
    Alert.alert('Delete clip?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('clips').delete().eq('id', id);
        setSelected(null);
        setClips(prev => prev.filter(c => c.id !== id));
      }},
    ]);
  }

  async function shareClip(uri: string) {
    try {
      // expo-sharing handles video files properly on both iOS and Android
      if (Sharing) {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { mimeType: 'video/mp4', dialogTitle: 'Share clip' });
          return;
        }
      }
      // Fallback: RN Share works on iOS for file:// URIs
      if (RNShare) {
        await RNShare.share({ url: uri, message: 'Hockey clip from PXF Hockey' });
      }
    } catch (e: any) {
      if (!e?.message?.includes('cancelled')) {
        Alert.alert('Share failed', e.message ?? 'Could not share this clip');
      }
    }
  }

  const visible = clips.filter(c => {
    const nameMatch = !search.trim() || c.player_name?.toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;
    if (filter === 'all')      return true;
    if (filter === 'athletes') return !!c.player_name;
    return c.category === filter;
  });

  const filterChips: { key: FilterMode; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'athletes', label: 'Athletes' },
    ...CATEGORIES.map(c => ({ key: c, label: CAT_LABEL[c] })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backText}>Business</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/record' as any)}
            style={s.newRecordBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam" size={16} color="#000" />
            <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Record</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <ThemedText style={s.screenLabel}>MEDIA</ThemedText>
          <ThemedText style={s.screenTitle}>Film Library</ThemedText>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search" size={16} color={MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, color: TEXT, fontSize: 15 }}
            placeholder="Search athletes..."
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <FlatList
          data={filterChips}
          keyExtractor={i => i.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
          style={{ maxHeight: 48, flexShrink: 0 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.chip, filter === item.key && s.chipActive]}
              onPress={() => setFilter(item.key)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.chipText, filter === item.key && s.chipTextActive]}>
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          )}
        />

        {/* Clip grid */}
        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 48 }} />
        ) : visible.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 }}>
            <Ionicons name="film-outline" size={52} color={MUTED} style={{ marginBottom: 16 }} />
            <ThemedText style={{ fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 8, lineHeight: 24 }}>
              No clips yet
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 }}>
              Tap Record to shoot and tag your first coaching clip.
            </ThemedText>
            <TouchableOpacity
              onPress={() => router.push('/record' as any)}
              style={{ marginTop: 24, backgroundColor: TEAL, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12 }}
            >
              <ThemedText style={{ fontSize: 15, fontWeight: '800', color: '#000' }}>+ Record a clip</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={c => c.id}
            numColumns={2}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
            columnWrapperStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const color = CAT_COLOR[item.category] ?? MUTED;
              return (
                <TouchableOpacity
                  style={s.clipCard}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.85}
                >
                  <View style={[s.thumbnail, { backgroundColor: `${color}18` }]}>
                    <Ionicons name="play-circle" size={36} color={color} />
                  </View>
                  <View style={{ padding: 10 }}>
                    <ThemedText style={s.clipPlayer} numberOfLines={1}>
                      {item.player_name ?? 'Untagged'}
                    </ThemedText>
                    <ThemedText style={s.clipMeta}>
                      {CAT_LABEL[item.category] ?? item.category}
                      {item.duration_seconds ? ` · ${fmtDuration(item.duration_seconds)}` : ''}
                    </ThemedText>
                    <ThemedText style={s.clipDate}>{fmtDate(item.created_at)}</ThemedText>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>

      {selected && (
        <ClipPlayerModal
          clip={selected}
          onClose={() => setSelected(null)}
          onShare={shareClip}
          onDelete={deleteClip}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  backText: { fontSize: 14, fontWeight: '600', color: TEXT },
  newRecordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  screenLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 3 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: TEXT, lineHeight: 34 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  chipActive:     { backgroundColor: '#0D2A24', borderColor: TEAL },
  chipText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  chipTextActive: { color: TEAL, fontWeight: '700' },

  clipCard: {
    width: CARD_W,
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  thumbnail: {
    width: '100%', height: CARD_W * 0.65,
    alignItems: 'center', justifyContent: 'center',
  },
  clipPlayer: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  clipMeta:   { fontSize: 12, color: MUTED, marginBottom: 2 },
  clipDate:   { fontSize: 11, color: MUTED },
});
