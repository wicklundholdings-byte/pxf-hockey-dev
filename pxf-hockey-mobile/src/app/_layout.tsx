import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

const TEAL = '#00C4B4';
const GREEN = '#3DFF8F';
const INACTIVE = '#8B949E';
const BG = '#0D1117';
const BORDER = '#161B22';

type TabIconProps = {
  ionName?: string;
  materialName?: string;
  label: string;
  focused: boolean;
};

function TabIcon({ ionName, materialName, label, focused }: TabIconProps) {
  const color = focused ? TEAL : INACTIVE;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6, width: 70 }}>
      {materialName
        ? <MaterialCommunityIcons name={materialName as any} size={22} color={color} />
        : <Ionicons name={ionName as any} size={22} color={color} />
      }
      <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color, marginTop: 3 }}>{label}</Text>
      {focused && (
        <LinearGradient
          colors={[TEAL, GREEN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 2, width: 28, borderRadius: 1, marginTop: 3 }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 0,
          paddingTop: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon ionName="home" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="drills"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon materialName="hockey-puck" label="Drills" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon ionName="calendar-outline" label="Sessions" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon ionName="person-outline" label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="drill/[id]" options={{ href: null }} />
      <Tabs.Screen name="auth/sign-in" options={{ href: null }} />
      <Tabs.Screen name="auth/sign-up" options={{ href: null }} />
    </Tabs>
  );
}
