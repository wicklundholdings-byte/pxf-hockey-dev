import { useEffect, useState } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

const TEAL = '#00C4B4';
const INACTIVE = '#8B949E';
const BG = '#0D1117';
const BORDER = '#161B22';

type UserRole = 'elite' | 'team' | 'parent' | 'staff' | null;

const COACH_TABS = [
  { name: 'index',    icon: 'grid-outline',       label: 'Dashboard' },
  { name: 'business', icon: 'briefcase-outline',  label: 'Business'  },
  { name: 'teams',    icon: 'people-outline',     label: 'Teams'     },
  { name: 'playbook', icon: 'book-outline',       label: 'Playbook'  },
  { name: 'inbox',    icon: 'chatbubble-outline', label: 'Inbox'     },
] as const;

// Screens that should NEVER show the coach tab bar
// (they're parent/TC/auth flows, or fully immersive screens)
const NO_TAB_BAR = new Set([
  'onboarding',
  'film', 'film-library', 'film-review', 'record',
  'session-runner/[sessionId]',
  'session-plan/[id]',
  'pick-drills/[sessionId]',
  'dryland',
  'parent-home', 'parent-events', 'parent-clubs', 'parent-training',
  'parent-inbox', 'parent-profile', 'parent-team/[id]', 'parent-tournament/[id]',
  'enrollment/[id]',
  'auth/sign-in', 'auth/sign-up', 'auth/forgot-password', 'auth/reset-password',
  'tc-home', 'tc-teams', 'tc-sessions', 'tc-drills', 'tc-inbox',
  'staff-home',
]);

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const currentName = state.routes[state.index]?.name;

  // Hide for immersive / parent / TC / auth screens
  if (NO_TAB_BAR.has(currentName)) return null;

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: BG,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      paddingBottom: insets.bottom,
    }}>
      {COACH_TABS.map(tab => {
        // When on a detail screen, keep the last-visited main tab highlighted
        const focused = currentName === tab.name;
        const color = focused ? TEAL : INACTIVE;
        return (
          <TouchableOpacity
            key={tab.name}
            style={{ flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon} size={22} color={color} />
            <Text style={{ fontSize: 10, fontWeight: '600', color }}>{tab.label}</Text>
            {focused && <View style={{ height: 2, width: 20, borderRadius: 1, backgroundColor: TEAL }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch role from profiles whenever the logged-in user changes
  useEffect(() => {
    if (!session?.user?.id) {
      setUserRole(null);
      setRoleLoaded(true);
      return;
    }
    setRoleLoaded(false);
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserRole((data?.role as UserRole) ?? null);
        setRoleLoaded(true);
      });
  }, [session?.user?.id]);

  // Route based on session + role
  useEffect(() => {
    if (!initialized || !roleLoaded) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      router.replace('/auth/sign-in');
      return;
    }

    if (session && inAuthGroup) {
      if (!userRole || (userRole as string) === 'coach') {
        // 'coach' is a placeholder set by the DB trigger from user_metadata.
        // It means the real plan (elite/team) hasn't been chosen yet — send to onboarding.
        // Exception: if user signed up as 'parent', route straight to parent home.
        const metaRole = session.user?.user_metadata?.role;
        if (metaRole === 'parent') {
          // Ensure profile has the correct role, then route
          supabase.from('profiles').upsert({
            id: session.user.id,
            role: 'parent',
            full_name: session.user.user_metadata?.full_name ?? null,
          });
          router.replace('/parent-home' as any);
        } else {
          // No real role yet — go through onboarding to pick elite/team
          router.replace('/onboarding' as any);
        }
      } else if (userRole === 'parent') {
        router.replace('/parent-home' as any);
      } else if (userRole === 'team') {
        router.replace('/tc-home' as any);
      } else if (userRole === 'staff') {
        router.replace('/staff-home' as any);
      } else {
        // 'elite' or unrecognised → Elite Coach dashboard
        router.replace('/');
      }
    }
  }, [session, initialized, roleLoaded, segments]);

  // Hold the splash until auth AND role are both resolved
  if (!initialized || (session && !roleLoaded)) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index"    options={{}} />
        <Tabs.Screen name="business" options={{}} />
        <Tabs.Screen name="teams"    options={{}} />
        <Tabs.Screen name="playbook" options={{}} />
        <Tabs.Screen name="inbox"    options={{}} />

        {/* Hidden screens */}
        <Tabs.Screen name="camps" options={{ href: null }} />
        <Tabs.Screen name="events" options={{ href: null }} />
        <Tabs.Screen name="schedule" options={{ href: null }} />
        <Tabs.Screen name="camp/[id]" options={{ href: null }} />
        <Tabs.Screen name="camp-day/[planId]" options={{ href: null }} />
        <Tabs.Screen name="series/[id]" options={{ href: null }} />
        <Tabs.Screen name="team/[id]" options={{ href: null }} />
        <Tabs.Screen name="tournament/[id]" options={{ href: null }} />
        <Tabs.Screen name="drills" options={{ href: null }} />
        <Tabs.Screen name="sessions" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="gameiq" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="drill/[id]" options={{ href: null }} />
        <Tabs.Screen name="financials" options={{ href: null }} />
        <Tabs.Screen name="game/[id]" options={{ href: null }} />
        <Tabs.Screen name="attendance/[sessionId]" options={{ href: null }} />
        <Tabs.Screen name="session/[id]" options={{ href: null }} />
        <Tabs.Screen name="session-plan/[id]" options={{ href: null }} />
        <Tabs.Screen name="pick-drills/[sessionId]" options={{ href: null }} />
        <Tabs.Screen name="session-runner/[sessionId]" options={{ href: null }} />
        {/* Coach screens */}
        <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="dryland"        options={{ href: null }} />
        <Tabs.Screen name="contacts"       options={{ href: null }} />
        <Tabs.Screen name="campaigns"      options={{ href: null }} />
        <Tabs.Screen name="ice-management" options={{ href: null }} />
        <Tabs.Screen name="staff"          options={{ href: null }} />
        <Tabs.Screen name="team-fees/[teamId]" options={{ href: null }} />
        <Tabs.Screen name="film"         options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="film-library" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="film-review"  options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="record"       options={{ href: null, tabBarStyle: { display: 'none' } }} />
        {/* Parent screens — hide coach tab bar, each has its own ParentTabBar */}
        <Tabs.Screen name="parent-home"     options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="parent-events"   options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="parent-clubs"    options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="parent-training" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="parent-inbox"    options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="parent-profile"  options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="parent-team/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="parent-tournament/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="enrollment/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="auth/sign-in"          options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="auth/sign-up"          options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="auth/forgot-password"  options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="auth/reset-password"   options={{ href: null, tabBarStyle: { display: 'none' } }} />
        {/* Team Coach screens — hide coach tab bar, each has its own TeamCoachTabBar */}
        <Tabs.Screen name="tc-home"     options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="tc-teams"    options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="tc-sessions" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="tc-drills"   options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="tc-inbox"    options={{ href: null, tabBarStyle: { display: 'none' } }} />
        {/* Staff screens — hide coach tab bar, staff-home has its own inline tab bar */}
        <Tabs.Screen name="staff-home"  options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
    </GestureHandlerRootView>
  );
}
