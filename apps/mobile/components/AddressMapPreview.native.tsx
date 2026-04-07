import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { isValidMapCoords, regionForPreview } from '../lib/mapRegion';
import { isNativeMapsAvailable } from '../lib/nativeMapsAvailable';
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

export function AddressMapPreview({
  lat,
  lng,
  onOpenPicker,
  compact = false,
  interactive = true,
  square = false,
}: Props) {
  const hasPoint = isValidMapCoords(lat, lng);
  const mapsOk = isNativeMapsAvailable();
  const region = regionForPreview(lat, lng);
  const mapKey = hasPoint ? `${lat}-${lng}` : 'empty';
  const previewHeight = square ? 108 : compact ? 88 : PREVIEW_HEIGHT;
  const pressableLabel = interactive
    ? 'Ouvrir la carte pour choisir la position'
    : 'Aperçu de la position de livraison';

  if (mapsOk) {
    return (
      <Pressable
        onPress={interactive ? onOpenPicker : undefined}
        accessibilityRole="button"
        accessibilityLabel={pressableLabel}
        disabled={!interactive}
        style={[styles.pressable, square ? styles.squareBox : null]}
      >
        <View style={[styles.mapClip, { height: previewHeight }]}>
          <MapView
            key={mapKey}
            style={styles.map}
            pointerEvents="none"
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            toolbarEnabled={false}
            initialRegion={region}
          >
            {hasPoint ? <Marker coordinate={{ latitude: lat!, longitude: lng! }} /> : null}
          </MapView>
        </View>
        {interactive ? <Text style={styles.tapHint}>Toucher l’aperçu pour agrandir</Text> : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={interactive ? onOpenPicker : undefined}
      accessibilityRole="button"
      accessibilityLabel={pressableLabel}
      disabled={!interactive}
      style={[styles.fallback, { height: previewHeight }, square ? styles.squareBox : null]}
    >
      <Text style={styles.fallbackEmoji}>🗺️</Text>
      <Text style={styles.fallbackText}>
        {hasPoint
          ? 'Position indiquée sur la carte'
          : interactive
          ? 'Aperçu carte indisponible (Expo Go). Touchez pour placer le point.'
          : 'Aperçu carte indisponible.'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { gap: 6 },
  squareBox: { width: 108, alignSelf: 'flex-start' },
  mapClip: {
    height: PREVIEW_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: wt.border,
  },
  map: { flex: 1 },
  tapHint: { fontSize: 12, color: wt.textMuted, textAlign: 'center' },
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
