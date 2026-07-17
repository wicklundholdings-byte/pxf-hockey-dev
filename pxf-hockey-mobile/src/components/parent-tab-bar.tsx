import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ParentTab = 'home' | 'events' | 'clubs' | 'training' | 'inbox';

const TABS: { id: ParentTab; label: string; icon: string; route: string }[] = [
  { id: 'home',     label: 'Home',     icon: 'grid-outline',        route: '/parent-home' },
  { id: 'events',   label: 'Events',   icon: 'calendar-outline',    route: '/parent-events' },
  { id: 'clubs',    label: 'My Clubs', icon: 'people-outline',      route: '/parent-clubs' },
  { id: 'training', label: 'Training', icon: 'book-outline',        route: '/parent-training' },
  { id: 'inbox',    label: 'Inbox',    icon: 'chatbubble-outline',  route: '/parent-inbox' },
];

const BG     = '#0D1117';
const BORDER = '#161B22';
const TEAL   = '#00C4B4';
const MUTED  = '#8B949E';

export function ParentTabBar({ active }: { active: ParentTab }) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: bottom }]}>
      {TABS.map(tab => {
        const focused = tab.id === active;
        const color = focused ? TEAL : MUTED;
        return (
          <TouchableOpacity
            key={tab.id}
            style={s.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon as any} size={22} color={color} />
            <Text numberOfLines={1} style={[s.label, { color }]}>{tab.label}</Text>
            {focused && <View style={s.indicator} />}
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
    paddingTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 56,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  indicator: {
    height: 2,
    width: 24,
    borderRadius: 1,
    backgroundColor: TEAL,
    marginTop: 3,
  },
});
