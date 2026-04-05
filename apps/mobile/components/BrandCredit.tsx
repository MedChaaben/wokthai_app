import { View, Text, StyleSheet, Linking } from 'react-native';
import { wt } from '../lib/theme';

const BUILDMYBRAND_URL = 'https://buildmybrand.art';

export type BrandCreditVariant = 'default' | 'footer';

type BrandCreditProps = {
  variant?: BrandCreditVariant;
};

export function BrandCredit({ variant = 'default' }: BrandCreditProps) {
  const footer = variant === 'footer';
  return (
    <View style={[styles.wrap, footer && styles.wrapFooter]}>
      <Text style={styles.row}>
        <Text style={styles.muted}>Développé par </Text>
        <Text
          onPress={() => void Linking.openURL(BUILDMYBRAND_URL)}
          style={styles.link}
          accessibilityRole="link"
          accessibilityLabel="buildmybrand.art, site externe"
        >
          buildmybrand.art
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  wrapFooter: {
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    paddingTop: 4,
    paddingBottom: 0,
  },
  row: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  muted: {
    color: wt.textSecondary,
    opacity: 0.88,
    fontWeight: '400',
  },
  link: {
    color: wt.accentLight,
    opacity: 0.92,
    fontWeight: '500',
  },
});
