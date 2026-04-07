import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTopBanner } from '../contexts/AppTopBannerContext';

/**
 * Les bannières en tête (annonce, commande en cours) gèrent déjà la zone sûre supérieure.
 * Sans ce correctif, le header natif des écrans réapplique `insets.top` et crée un vide
 * entre la bannière et le logo.
 */
export function StackWithInsetOverride({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { announcementVisible, ongoingOrderVisible } = useAppTopBanner();
  const suppressTop = announcementVisible || ongoingOrderVisible;

  const value = useMemo(
    () => ({
      ...insets,
      top: suppressTop ? 0 : insets.top,
    }),
    [insets, suppressTop]
  );

  return (
    <SafeAreaInsetsContext.Provider value={value}>
      <View style={styles.stackWrap}>{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

const styles = StyleSheet.create({
  stackWrap: { flex: 1, minHeight: 0 },
});
