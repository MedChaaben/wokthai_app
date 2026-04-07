import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '../../components/BrandLogo';
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
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: wt.accentLight,
        tabBarInactiveTintColor: wt.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <BrandLogo variant="header" />,
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, focused }) => <TabIcon name="restaurant-outline" color={color} focused={focused} />,
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
          tabBarLabel: 'Compte',
          tabBarIcon: ({ color, focused }) => <TabIcon name="person-outline" color={color} focused={focused} />,
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
});
