import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView,
  StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const CARD = '#0F1923';
const CARD2 = '#161B22';
const GREEN = '#3DFF8F';
const TEAL = '#00C4B4';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const SEARCH_BG = '#161B22';
const BORDER = '#1A2A1E';
const BORDER2 = '#21262D';
const RED = '#EF4444';

type Drill = {
  id: string;
  title: string;
  difficulty_level: string;
  age_group: string;
  duration_minutes: number;
  video_url: string | null;
};

type Category = {
  id: string;
  title: string;
  description: string;
  drills: Drill[];
};

type Folder = {
  id: string;
  name: string;
  drillIds: string[];
};

type FilterTab = 'all' | 'favorites';

export default function DrillsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const handledTabParam = useRef(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderPickerDrillId, setFolderPickerDrillId] = useState<string | null>(null);

  // Session picker state
  const [sessionPickerDrillId, setSessionPickerDrillId] = useState<string | null>(null);
  const [userSessions, setUserSessions] = useState<{ id: string; title: string; drill_count: number }[]>([]);
  const [addingToSession, setAddingToSession] = useState<string | null>(null);
  const [addedToSessionIds, setAddedToSessionIds] = useState<string[]>([]);

  useEffect(() => { fetchDrills(); }, []);

  useFocusEffect(useCallback(() => {
    if (params.tab === 'favorites' && !handledTabParam.current) {
      handledTabParam.current = true;
      setFilterTab('favorites');
    }
    fetchFavorites();
    fetchFolders();
  }, [params.tab]));

  async function fetchDrills() {
    const { data: cats } = await supabase
      .from('drill_categories').select('id, title, description').order('sort_order');
    const { data: drills } = await supabase
      .from('drills')
      .select('id, title, difficulty_level, age_group, duration_minutes, video_url, category_id')
      .eq('is_published', true);
    if (cats && drills) {
      setCategories(cats.map(cat => ({
        ...cat,
        drills: drills.filter((d: any) => d.category_id === cat.id),
      })).filter(cat => cat.drills.length > 0));
    }
    setLoading(false);
  }

  async function fetchFavorites() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('drill_favorites').select('drill_id').eq('user_id', user.id);
    if (data) setFavoriteIds(data.map((r: any) => r.drill_id));
  }

  async function fetchFolders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('favorite_folders')
      .select('id, name, favorite_folder_drills(drill_id)')
      .eq('user_id', user.id).order('created_at');
    if (data) {
      setFolders(data.map((f: any) => ({
        id: f.id, name: f.name,
        drillIds: (f.favorite_folder_drills ?? []).map((d: any) => d.drill_id),
      })));
    }
  }

  async function toggleFavorite(drillId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (favoriteIds.includes(drillId)) {
      await supabase.from('drill_favorites').delete().eq('user_id', user.id).eq('drill_id', drillId);
      setFavoriteIds(prev => prev.filter(id => id !== drillId));
    } else {
      await supabase.from('drill_favorites').insert({ user_id: user.id, drill_id: drillId });
      setFavoriteIds(prev => [...prev, drillId]);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setSavingFolder(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setSavingFolder(false);
    const { data } = await supabase.from('favorite_folders')
      .insert({ user_id: user.id, name: newFolderName.trim() }).select().single();
    if (data) {
      setFolders(prev => [...prev, { id: data.id, name: data.name, drillIds: [] }]);
      setNewFolderName('');
      setShowNewFolder(false);
    }
    setSavingFolder(false);
  }

  async function deleteFolder(folderId: string) {
    Alert.alert('Delete Folder', 'This will remove the folder but not the drills.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('favorite_folders').delete().eq('id', folderId);
          setFolders(prev => prev.filter(f => f.id !== folderId));
          if (selectedFolderId === folderId) setSelectedFolderId(null);
        },
      },
    ]);
  }

  async function toggleDrillInFolder(folderId: string, drillId: string) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    if (folder.drillIds.includes(drillId)) {
      await supabase.from('favorite_folder_drills').delete()
        .eq('folder_id', folderId).eq('drill_id', drillId);
      setFolders(prev => prev.map(f =>
        f.id === folderId ? { ...f, drillIds: f.drillIds.filter(id => id !== drillId) } : f
      ));
    } else {
      await supabase.from('favorite_folder_drills').insert({ folder_id: folderId, drill_id: drillId });
      setFolders(prev => prev.map(f =>
        f.id === folderId ? { ...f, drillIds: [...f.drillIds, drillId] } : f
      ));
    }
  }

  async function openSessionPicker(drillId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('sessions').select('id, title, session_drills(count)')
      .eq('coach_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setUserSessions(data.map((s: any) => ({
        id: s.id, title: s.title,
        drill_count: s.session_drills?.[0]?.count ?? 0,
      })));
    }
    setAddedToSessionIds([]);
    setSessionPickerDrillId(drillId);
  }

  async function addDrillToChosenSession(targetSessionId: string) {
    if (!sessionPickerDrillId || addingToSession) return;
    setAddingToSession(targetSessionId);
    const { data: countData } = await supabase
      .from('session_drills').select('id').eq('session_id', targetSessionId);
    await supabase.from('session_drills').insert({
      session_id: targetSessionId,
      drill_id: sessionPickerDrillId,
      sort_order: countData?.length ?? 0,
    });
    setAddedToSessionIds(prev => [...prev, targetSessionId]);
    setAddingToSession(null);
  }

  // Filtering
  const searched = search.trim()
    ? categories.map(cat => ({
        ...cat,
        drills: cat.drills.filter(d => d.title.toLowerCase().includes(search.toLowerCase())),
      })).filter(cat => cat.drills.length > 0)
    : categories;

  const selectedFolder = folders.find(f => f.id === selectedFolderId) ?? null;

  const filtered = filterTab === 'favorites'
    ? selectedFolder
      ? searched.map(cat => ({
          ...cat,
          drills: cat.drills.filter(d => selectedFolder.drillIds.includes(d.id)),
        })).filter(cat => cat.drills.length > 0)
      : searched.map(cat => ({
          ...cat,
          drills: cat.drills.filter(d => favoriteIds.includes(d.id)),
        })).filter(cat => cat.drills.length > 0)
    : searched;

  const totalFavorites = categories.flatMap(c => c.drills).filter(d => favoriteIds.includes(d.id)).length;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Logo header */}
          <View style={styles.logoHeader}>
            <View>
              <GradientText style={styles.logoText} colors={[TEAL, GREEN]}>PXF</GradientText>
              <GradientText style={styles.logoSub} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
            </View>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.header}>
            <ThemedText style={styles.headerLabel}>DRILL LIBRARY</ThemedText>
            <ThemedText style={styles.headerTitle}>Drills</ThemedText>
          </View>

          {/* Filter tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity style={styles.filterTab} onPress={() => { setFilterTab('all'); setSelectedFolderId(null); }}>
              <ThemedText style={[styles.filterTabText, filterTab === 'all' && styles.filterTabTextActive]}>ALL DRILLS</ThemedText>
              {filterTab === 'all' && (
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.filterTabUnderline} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterTab} onPress={() => { setFilterTab('favorites'); setSelectedFolderId(null); }}>
              <View style={styles.filterTabInner}>
                <Ionicons name="heart" size={12} color={filterTab === 'favorites' ? RED : TEXT_MUTED} />
                <ThemedText style={[styles.filterTabText, filterTab === 'favorites' && styles.filterTabTextFav]}> FAVORITES</ThemedText>
                {totalFavorites > 0 && (
                  <View style={styles.favBadge}>
                    <ThemedText style={styles.favBadgeText}>{totalFavorites}</ThemedText>
                  </View>
                )}
              </View>
              {filterTab === 'favorites' && (
                <LinearGradient colors={[RED, '#FF6B6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.filterTabUnderline} />
              )}
            </TouchableOpacity>
          </View>

          {/* Folder bar — shown in favorites tab */}
          {filterTab === 'favorites' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderBar} contentContainerStyle={styles.folderBarContent}>
              <TouchableOpacity style={styles.newFolderChip} onPress={() => setShowNewFolder(true)}>
                <Ionicons name="add" size={14} color={TEAL} />
                <ThemedText style={styles.newFolderText}> NEW FOLDER</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.folderChip, !selectedFolderId && styles.folderChipActive]}
                onPress={() => setSelectedFolderId(null)}
              >
                <Ionicons name="heart" size={12} color={!selectedFolderId ? '#000' : RED} />
                <ThemedText style={[styles.folderChipText, !selectedFolderId && styles.folderChipTextActive]}> All</ThemedText>
              </TouchableOpacity>
              {folders.map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.folderChip, selectedFolderId === folder.id && styles.folderChipActive]}
                  onPress={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                  onLongPress={() => deleteFolder(folder.id)}
                >
                  <Ionicons name="folder" size={12} color={selectedFolderId === folder.id ? '#000' : TEAL} />
                  <ThemedText style={[styles.folderChipText, selectedFolderId === folder.id && styles.folderChipTextActive]}>
                    {' '}{folder.name}
                  </ThemedText>
                  {folder.drillIds.length > 0 && (
                    <ThemedText style={[styles.folderChipCount, selectedFolderId === folder.id && styles.folderChipTextActive]}>
                      {' '}· {folder.drillIds.length}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={TEXT_MUTED} />
              <TextInput
                placeholder="Search drills, skills, tags..."
                placeholderTextColor={TEXT_MUTED}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="options-outline" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 && filterTab === 'favorites' ? (
            <View style={styles.emptyFavs}>
              {selectedFolder ? (
                <>
                  <Ionicons name="folder-open-outline" size={36} color={TEXT_MUTED} />
                  <ThemedText style={styles.emptyFavsText}>Folder is empty</ThemedText>
                  <ThemedText style={styles.emptyFavsSub}>Tap the folder icon on any favorite to add it here.</ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="heart-outline" size={36} color={TEXT_MUTED} />
                  <ThemedText style={styles.emptyFavsText}>No favorites yet</ThemedText>
                  <ThemedText style={styles.emptyFavsSub}>Tap the heart on any drill to save it here.</ThemedText>
                </>
              )}
            </View>
          ) : (
            filtered.map(section => (
              <View key={section.id}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryHeaderLeft}>
                    <ThemedText style={styles.categoryTitle}>{section.title.toUpperCase()}</ThemedText>
                    <ThemedText style={styles.categoryDesc}>{section.description}</ThemedText>
                  </View>
                  <ThemedText style={styles.drillCount}>{section.drills.length} drills</ThemedText>
                </View>

                {section.drills.map(drill => {
                  const isFav = favoriteIds.includes(drill.id);
                  return (
                    <TouchableOpacity
                      key={drill.id}
                      style={styles.drillCard}
                      onPress={() => router.push(`/drill/${drill.id}`)}
                    >
                      <View style={styles.thumbnail}>
                        <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playCircle}>
                          <Ionicons name="play" size={14} color="#000" />
                        </LinearGradient>
                      </View>

                      <View style={styles.drillInfo}>
                        <ThemedText style={styles.drillCategory}>{section.title.toUpperCase()}</ThemedText>
                        <ThemedText style={styles.drillTitle}>{drill.title}</ThemedText>
                        <View style={styles.drillMeta}>
                          <Ionicons name="bar-chart-outline" size={11} color={TEXT_MUTED} />
                          <ThemedText style={styles.metaText}> {drill.difficulty_level}</ThemedText>
                          <ThemedText style={styles.metaDot}>·</ThemedText>
                          <Ionicons name="people-outline" size={11} color={TEXT_MUTED} />
                          <ThemedText style={styles.metaText}> {drill.age_group}</ThemedText>
                          {!!drill.duration_minutes && (
                            <>
                              <ThemedText style={styles.metaDot}>·</ThemedText>
                              <Ionicons name="time-outline" size={11} color={TEXT_MUTED} />
                              <ThemedText style={styles.metaText}> {drill.duration_minutes} min</ThemedText>
                            </>
                          )}
                        </View>
                      </View>

                      <View style={styles.drillActions}>
                        {filterTab === 'favorites' && isFav && (
                          <TouchableOpacity
                            style={styles.folderBtn}
                            onPress={e => { e.stopPropagation(); setFolderPickerDrillId(drill.id); }}
                          >
                            <Ionicons name="folder-outline" size={14} color={TEAL} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.favoriteBtn}
                          onPress={e => { e.stopPropagation(); toggleFavorite(drill.id); }}
                        >
                          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={15} color={isFav ? RED : TEXT_MUTED} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={e => { e.stopPropagation(); openSessionPicker(drill.id); }}
                        >
                          <Ionicons name="add" size={18} color={GREEN} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}

        </ScrollView>
      </SafeAreaView>

      {/* New Folder Modal */}
      <Modal visible={showNewFolder} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => { setShowNewFolder(false); setNewFolderName(''); }}>
          <Pressable style={styles.newFolderSheet} onPress={e => e.stopPropagation()}>
            <ThemedText style={styles.newFolderLabel}>FOLDER NAME</ThemedText>
            <TextInput
              style={styles.newFolderInput}
              placeholder="e.g. Tuesday Practice"
              placeholderTextColor={TEXT_MUTED}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.newFolderBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                <ThemedText style={styles.cancelText}>CANCEL</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createFolder} disabled={savingFolder}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                  {savingFolder
                    ? <ActivityIndicator size="small" color="#000" />
                    : <ThemedText style={styles.saveText}>CREATE</ThemedText>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Folder Picker Modal */}
      <Modal visible={!!folderPickerDrillId} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setFolderPickerDrillId(null)}>
          <Pressable style={styles.folderPickerSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.folderPickerHeader}>
              <ThemedText style={styles.folderPickerTitle}>Add to Folder</ThemedText>
              <TouchableOpacity onPress={() => setFolderPickerDrillId(null)}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
            {folders.length === 0 ? (
              <View style={styles.noFoldersHint}>
                <ThemedText style={styles.noFoldersText}>No folders yet.</ThemedText>
                <TouchableOpacity onPress={() => { setFolderPickerDrillId(null); setShowNewFolder(true); }}>
                  <ThemedText style={styles.noFoldersCreate}>+ Create your first folder</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              folders.map(folder => {
                const inFolder = folderPickerDrillId ? folder.drillIds.includes(folderPickerDrillId) : false;
                return (
                  <TouchableOpacity
                    key={folder.id}
                    style={styles.folderPickerRow}
                    onPress={() => { if (folderPickerDrillId) toggleDrillInFolder(folder.id, folderPickerDrillId); }}
                  >
                    <View style={styles.folderPickerLeft}>
                      <Ionicons name="folder" size={18} color={TEAL} />
                      <ThemedText style={styles.folderPickerName}>{folder.name}</ThemedText>
                      <ThemedText style={styles.folderPickerCount}>{folder.drillIds.length} drills</ThemedText>
                    </View>
                    <View style={[styles.folderCheckbox, inFolder && styles.folderCheckboxActive]}>
                      {inFolder && <Ionicons name="checkmark" size={14} color="#000" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <TouchableOpacity style={styles.newFolderRow} onPress={() => { setFolderPickerDrillId(null); setShowNewFolder(true); }}>
              <Ionicons name="add-circle-outline" size={18} color={TEAL} />
              <ThemedText style={styles.newFolderRowText}> New Folder</ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Session Picker Modal */}
      <Modal visible={!!sessionPickerDrillId} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setSessionPickerDrillId(null)}>
          <Pressable style={styles.folderPickerSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.folderPickerHeader}>
              <ThemedText style={styles.folderPickerTitle}>Add to Session</ThemedText>
              <TouchableOpacity style={styles.sessionPickerDone} onPress={() => setSessionPickerDrillId(null)}>
                <ThemedText style={styles.sessionPickerDoneText}>Done</ThemedText>
              </TouchableOpacity>
            </View>
            {userSessions.length === 0 ? (
              <View style={styles.noFoldersHint}>
                <ThemedText style={styles.noFoldersText}>No sessions yet.</ThemedText>
                <TouchableOpacity onPress={() => { setSessionPickerDrillId(null); router.navigate('/sessions'); }}>
                  <ThemedText style={styles.noFoldersCreate}>+ Create a session first</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              userSessions.map(session => {
                const alreadyAdded = addedToSessionIds.includes(session.id);
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.folderPickerRow}
                    onPress={() => addDrillToChosenSession(session.id)}
                    disabled={!!addingToSession}
                  >
                    <View style={styles.folderPickerLeft}>
                      <Ionicons name="calendar-outline" size={18} color={TEAL} />
                      <View>
                        <ThemedText style={styles.folderPickerName}>{session.title}</ThemedText>
                        <ThemedText style={styles.folderPickerCount}>{session.drill_count} drills</ThemedText>
                      </View>
                    </View>
                    {addingToSession === session.id ? (
                      <ActivityIndicator size="small" color={TEAL} />
                    ) : alreadyAdded ? (
                      <View style={styles.addedSessionBadge}>
                        <Ionicons name="checkmark" size={13} color="#000" />
                        <ThemedText style={styles.addedSessionText}> Added</ThemedText>
                      </View>
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color={TEAL} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  logoText: { fontSize: 28, fontWeight: '800', color: TEAL, letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 5, lineHeight: 18 },
  bellBtn: { marginTop: 8 },

  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 42 },

  filterTabs: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterTab: { marginRight: 24, paddingBottom: 10, alignItems: 'center' },
  filterTabInner: { flexDirection: 'row', alignItems: 'center' },
  filterTabText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },
  filterTabTextActive: { color: TEAL },
  filterTabTextFav: { color: RED },
  filterTabUnderline: { height: 2, width: '100%', borderRadius: 1, position: 'absolute', bottom: 0 },
  favBadge: { marginLeft: 5, backgroundColor: '#3A1A1A', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  favBadgeText: { fontSize: 9, fontWeight: '800', color: RED },

  folderBar: { borderBottomWidth: 1, borderBottomColor: BORDER },
  folderBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  newFolderChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: TEAL, borderStyle: 'dashed', paddingHorizontal: 12, paddingVertical: 6 },
  newFolderText: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  folderChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: BORDER2, backgroundColor: CARD2, paddingHorizontal: 12, paddingVertical: 6 },
  folderChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  folderChipText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },
  folderChipTextActive: { color: '#000' },
  folderChipCount: { fontSize: 11, color: TEXT_MUTED },

  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8, marginTop: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: SEARCH_BG, borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 8 },
  searchInput: { flex: 1, color: TEXT, fontSize: 15 },
  filterBtn: { backgroundColor: SEARCH_BG, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  categoryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  categoryHeaderLeft: { flex: 1 },
  categoryTitle: { fontSize: 12, fontWeight: '800', color: TEAL, letterSpacing: 2, marginBottom: 2 },
  categoryDesc: { fontSize: 13, color: TEXT_MUTED },
  drillCount: { fontSize: 12, color: TEXT_MUTED, paddingTop: 1 },

  drillCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: BORDER },

  thumbnail: { width: 72, height: 72, backgroundColor: '#0A1F15', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  playCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  drillInfo: { flex: 1 },
  drillCategory: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, marginBottom: 3 },
  drillTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },
  drillMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: TEXT_MUTED },
  metaDot: { fontSize: 11, color: TEXT_MUTED, marginHorizontal: 4 },

  drillActions: { gap: 8, marginLeft: 8, alignItems: 'center' },
  addBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  favoriteBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER2, alignItems: 'center', justifyContent: 'center' },
  folderBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: TEAL, backgroundColor: '#0D2A24', alignItems: 'center', justifyContent: 'center' },

  emptyFavs: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyFavsText: { fontSize: 17, fontWeight: '700', color: TEXT },
  emptyFavsSub: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  newFolderSheet: { backgroundColor: CARD2, borderRadius: 20, padding: 24, width: '85%', borderWidth: 1, borderColor: BORDER2 },
  newFolderLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 10 },
  newFolderInput: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER2, color: TEXT, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  newFolderBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER2, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  saveBtn: { flex: 1.5, borderRadius: 10, overflow: 'hidden' },
  saveGradient: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 12, fontWeight: '800', color: '#000' },

  folderPickerSheet: { backgroundColor: CARD2, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: BORDER2, width: '100%', position: 'absolute', bottom: 0, paddingBottom: 40 },
  folderPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: BORDER2 },
  folderPickerTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  folderPickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER2 },
  folderPickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  folderPickerName: { fontSize: 15, fontWeight: '600', color: TEXT },
  folderPickerCount: { fontSize: 12, color: TEXT_MUTED },
  folderCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: BORDER2, alignItems: 'center', justifyContent: 'center' },
  folderCheckboxActive: { backgroundColor: TEAL, borderColor: TEAL },
  noFoldersHint: { padding: 24, alignItems: 'center', gap: 8 },
  noFoldersText: { fontSize: 14, color: TEXT_MUTED },
  noFoldersCreate: { fontSize: 14, fontWeight: '700', color: TEAL },
  newFolderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  newFolderRowText: { fontSize: 14, fontWeight: '600', color: TEAL },

  sessionPickerDone: { backgroundColor: '#0D2A24', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: TEAL },
  sessionPickerDoneText: { fontSize: 13, fontWeight: '700', color: TEAL },
  addedSessionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: TEAL, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  addedSessionText: { fontSize: 12, fontWeight: '700', color: '#000' },
});
