import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

/** Icônes texte uniquement (pas @expo/vector-icons) pour éviter une 2ᵉ résolution React avec pnpm. */
function TabIcon({ glyph, color, size }: { glyph: string; color: string; size: number }) {
  return <Text style={{ color, fontSize: size * 0.9, fontWeight: '700' }}>{glyph}</Text>;
}

function CartTabIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={[styles.cartIconWrap, { width: size + 10, height: size + 10 }]}>
      <TabIcon glyph="🛒" color={color} size={size} />
    </View>
  );
}

export default function TabsLayout() {
  const { lines } = useCart();
  const cartCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

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
          title: 'Menu',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => <TabIcon glyph="⌂" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Panier',
          tabBarIcon: ({ color, size }) => <CartTabIcon color={color} size={size} />,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: wt.accent,
            color: wt.white,
            fontSize: 11,
            fontWeight: '800',
            minWidth: 20,
            lineHeight: 16,
          },
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

const styles = StyleSheet.create({
  cartIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
