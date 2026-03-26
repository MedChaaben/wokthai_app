import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { wt } from '../../lib/theme';

/** Icônes texte uniquement (pas @expo/vector-icons) pour éviter une 2ᵉ résolution React avec pnpm. */
function TabIcon({ glyph, color, size }: { glyph: string; color: string; size: number }) {
  return <Text style={{ color, fontSize: size * 0.9, fontWeight: '700' }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: wt.bgElevated },
        headerTintColor: wt.accentLight,
        headerTitleStyle: { fontWeight: '700', color: wt.text },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: wt.bgElevated,
          borderTopColor: wt.border,
        },
        tabBarActiveTintColor: wt.accentLight,
        tabBarInactiveTintColor: wt.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Menu',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="⌂" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Panier',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="🛒" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="👤" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
