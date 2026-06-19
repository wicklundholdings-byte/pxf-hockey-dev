import { SymbolView } from 'expo-symbols';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

const GREEN = '#3DFF8F';
const INACTIVE = '#8B949E';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#0D1117"
      indicatorColor="#161B22">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template">
          <SymbolView name="house.fill" tintColor={GREEN} fallback={null} />
        </NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="drills">
        <NativeTabs.Trigger.Label style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Drills</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template">
          <SymbolView name="figure.skating" tintColor={GREEN} fallback={null} />
        </NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sessions">
        <NativeTabs.Trigger.Label style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Sessions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template">
          <SymbolView name="calendar" tintColor={GREEN} fallback={null} />
        </NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template">
          <SymbolView name="person.fill" tintColor={GREEN} fallback={null} />
        </NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
