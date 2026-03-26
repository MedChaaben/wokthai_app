import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

/** Icônes texte uniquement (pas @expo/vector-icons) pour éviter une 2ᵉ résolution React avec pnpm. */
function TabIcon({ glyph, color, size }: { glyph: string; color: string; size: number }) {
  return <Text style={{ color, fontSize: size * 0.9, fontWeight: '700' }}>{glyph}</Text>;
}

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { lines } = useCart();
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <View style={[styles.cartIconWrap, { width: size + 8, height: size + 8 }]}>
      <TabIcon glyph="🛒" color={color} size={size} />
      {count > 0 ? (
        <View style={styles.badge} accessibilityLabel={`${count} article${count > 1 ? 's' : ''} dans le panier`}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {count > 99 ? '99+' : String(count)}
          </Text>
        </View>
      ) : null}
    </View>
  );
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
          tabBarIcon: ({ color, size }) => <CartTabIcon color={color} size={size} />,
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: wt.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: wt.bgElevated,
  },
  badgeText: {
    color: wt.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
