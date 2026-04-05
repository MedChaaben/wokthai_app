import { Pressable, StyleSheet, Text, View } from 'react-native';
import { wt } from '../lib/theme';

const PREVIEW_HEIGHT = 152;

type Props = {
  lat: number | null;
  lng: number | null;
  onOpenPicker: () => void;
};

/** Pas de react-native-maps sur web : même repli que l’aperçu « carte indisponible ». */
export function AddressMapPreview({ lat, lng, onOpenPicker }: Props) {
  const hasPoint = lat != null && lng != null;

  return (
    <Pressable
      onPress={onOpenPicker}
      accessibilityRole="button"
      accessibilityLabel="Définir la position"
      style={[styles.fallback, { height: PREVIEW_HEIGHT }]}
    >
      <Text style={styles.fallbackEmoji}>🗺️</Text>
      <Text style={styles.fallbackText}>
        {hasPoint
          ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`
          : 'La carte n’est pas disponible sur le web. Touchez pour définir la position (GPS).'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
