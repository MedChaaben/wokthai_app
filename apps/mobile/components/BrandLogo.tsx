import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const LOGO = require('../assets/wokthai-logo.png');

type Props = {
  /** En-tête navigation (onglets) */
  variant?: 'header' | 'hero';
  style?: StyleProp<ViewStyle>;
};

/**
 * Logo Wok Thaï (fond noir dans l’asset — adapté au thème sombre de l’app).
 */
export function BrandLogo({ variant = 'header', style }: Props) {
  const size = variant === 'hero' ? styles.hero : styles.header;
  return (
    <View style={[styles.wrap, style]}>
      <Image source={LOGO} style={size} resizeMode="contain" accessibilityLabel="Wok Thaï" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  header: { width: 168, height: 34, maxWidth: '100%' },
  hero: { width: 220, height: 52, maxWidth: '100%' },
});
