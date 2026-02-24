import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from '@/src/i18n/LocaleProvider';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#137FEC',
        tabBarInactiveTintColor: '#6E809A',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 76,
          paddingBottom: 12,
          paddingTop: 8,
          backgroundColor: '#111B2D',
          borderTopColor: '#1C2B43',
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
          title: t('tabs.patients'),
          tabBarButtonTestID: 'tab-patients',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: t('tabs.timeline'),
          tabBarButtonTestID: 'tab-timeline',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarButtonTestID: 'tab-settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
