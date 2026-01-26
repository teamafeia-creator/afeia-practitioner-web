/**
 * Tabs Layout
 * Main navigation for authenticated users
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme, SafeArea } from '@/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.teal,
        tabBarInactiveTintColor: Colors.neutral.grayWarm,
        tabBarStyle: {
          backgroundColor: Colors.neutral.white,
          borderTopColor: Colors.neutral.sandDark,
          borderTopWidth: 1,
          height: SafeArea.bottomTabHeight + SafeArea.bottomInset,
          paddingBottom: SafeArea.bottomInset,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
