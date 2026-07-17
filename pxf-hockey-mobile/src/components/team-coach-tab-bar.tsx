import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

const TEAL   = '#00C4B4';
const MUTED  = '#8B949E';
const BG     = '#0D1117';
const BORDER = '#21262D';

export type TeamCoachTab = 'home' | 'teams' | 'schedule' | 'playbook' | 'inbox';

const TABS: { key: TeamCoachTab; label: string; icon: string; activeIcon: string; route: string }[] = [
  { key: 'home',     label: 'Home',     icon: 'home-outline',         activeIcon: 'home',          route: '/tc-home' },
  { key: 'teams',    label: 'Teams',    icon: 'people-outline',       activeIcon: 'people',        route: '/tc-teams' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline',     activeIcon: 'calendar',      route: '/tc-sessions' },
  { key: 'playbook', label: 'Playbook', icon: 'book-outline',         activeIcon: 'book',          route: '/tc-drills' },
  { key: 'inbox',    label: 'Inbox',    icon: 'chatbubble-outline',   activeIcon: 'chatbubble',    route: '/tc-inbox' },
];

export function TeamCoachTabBar({ active, unreadInbox = false }: { active: TeamCoachTab; unreadInbox?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            activeOpacity={0.7}
            onPress={() => !isActive && router.push(tab.route as any)}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons
                name={(isActive ? tab.activeIcon : tab.icon) as any}
                size={22}
                color={isActive ? TEAL : MUTED}
              />
              {tab.key === 'inbox' && unreadInbox && (
                <View style={s.badge} />
              )}
            </View>
            <ThemedText style={[s.label, { color: isActive ? TEAL : MUTED }]}>
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 10, fontWeight: '600' },
  badge: {
    position: 'absolute', top: -2, right: -4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: BG,
  },
});
