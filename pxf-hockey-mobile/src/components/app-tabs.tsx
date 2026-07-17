import React from 'react';
import { SymbolView } from 'expo-symbols';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

const GREEN = '#3DFF8F';
const INACTIVE = '#8B949E';

// Cast unstable-API sub-components to avoid type errors from version drift
const TLabel = NativeTabs.Trigger.Label as React.ComponentType<any>;
const TIcon  = NativeTabs.Trigger.Icon  as React.ComponentType<any>;

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#0D1117"
      indicatorColor="#161B22">
      <NativeTabs.Trigger name="index">
        <TLabel style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Home</TLabel>
        <TIcon renderingMode="template">
          <SymbolView name="house.fill" tintColor={GREEN} fallback={null} />
        </TIcon>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="drills">
        <TLabel style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Drills</TLabel>
        <TIcon renderingMode="template">
          <SymbolView name="figure.skating" tintColor={GREEN} fallback={null} />
        </TIcon>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sessions">
        <TLabel style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Sessions</TLabel>
        <TIcon renderingMode="template">
          <SymbolView name="calendar" tintColor={GREEN} fallback={null} />
        </TIcon>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <TLabel style={{ color: INACTIVE }} selectedStyle={{ color: GREEN }}>Profile</TLabel>
        <TIcon renderingMode="template">
          <SymbolView name="person.fill" tintColor={GREEN} fallback={null} />
        </TIcon>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
