import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAutoThemeColor } from '@/src/theme/auto-theme';

export default function TabLayout() {
  const color = useAutoThemeColor();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: color('#137FEC'),
        tabBarInactiveTintColor: color('#6E809A'),
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 76,
          paddingBottom: 12,
          paddingTop: 8,
          backgroundColor: color('#111B2D'),
          borderTopColor: color('#1C2B43'),
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Patients',
          tabBarButtonTestID: 'tab-patients',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarButtonTestID: 'tab-timeline',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'tab-settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
