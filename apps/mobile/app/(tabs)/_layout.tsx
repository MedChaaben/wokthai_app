import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
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
          borderTopWidth: 2,
          borderTopColor: wt.border,
        },
        tabBarActiveTintColor: wt.accentLight,
        tabBarInactiveTintColor: wt.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <BrandLogo variant="header" />,
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="⌂" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          href: null,
          headerTitle: () => <BrandLogo variant="header" />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          headerTitle: () => <BrandLogo variant="header" />,
          tabBarIcon: ({ color, size }) => <TabIcon glyph="👤" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
