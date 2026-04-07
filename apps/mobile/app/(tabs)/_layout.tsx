import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '../../components/BrandLogo';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { lines } = useCart();
  const cartCount = lines.reduce((sum, l) => sum + l.quantity, 0);

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
          borderTopWidth: 1,
          borderTopColor: wt.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: wt.accentLight,
        tabBarInactiveTintColor: wt.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <BrandLogo variant="header" />,
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'restaurant' : 'restaurant-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarLabel: 'Panier',
          headerTitle: () => <BrandLogo variant="header" />,
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabIcon name={focused ? 'cart' : 'cart-outline'} color={color} focused={focused} />
              {cartCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          headerTitle: () => <BrandLogo variant="header" />,
          tabBarLabel: 'Compte',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 30,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: wt.accentMuted,
    borderWidth: 1,
    borderColor: wt.accentBorder,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: wt.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: wt.white,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
