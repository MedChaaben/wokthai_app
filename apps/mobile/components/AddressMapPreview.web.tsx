import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isValidMapCoords } from '../lib/mapRegion';
import { wt } from '../lib/theme';

const PREVIEW_HEIGHT = 152;

type Props = {
  lat: number | null;
  lng: number | null;
  onOpenPicker: () => void;
  compact?: boolean;
  interactive?: boolean;
  square?: boolean;
};

/** Pas de react-native-maps sur web : même repli que l’aperçu « carte indisponible ». */
export function AddressMapPreview({
  lat,
  lng,
  onOpenPicker,
  compact = false,
  interactive = true,
  square = false,
}: Props) {
  const hasPoint = isValidMapCoords(lat, lng);
  const previewHeight = square ? 108 : compact ? 88 : PREVIEW_HEIGHT;

  return (
    <Pressable
      onPress={interactive ? onOpenPicker : undefined}
      accessibilityRole="button"
      accessibilityLabel={interactive ? 'Définir la position' : 'Aperçu de la position de livraison'}
      disabled={!interactive}
      style={[styles.fallback, { height: previewHeight }, square ? styles.squareBox : null]}
    >
      <Text style={styles.fallbackEmoji}>🗺️</Text>
      <Text style={styles.fallbackText}>
        {hasPoint
          ? 'Position indiquée sur la carte'
          : interactive
          ? 'La carte n’est pas disponible sur le web. Touchez pour définir la position.'
          : 'La carte n’est pas disponible sur le web.'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  squareBox: { width: 108, alignSelf: 'flex-start' },
  fallback: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  fallbackEmoji: { fontSize: 28 },
  fallbackText: { fontSize: 13, color: wt.textMuted, textAlign: 'center', lineHeight: 18 },
});
