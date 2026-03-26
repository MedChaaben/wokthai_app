import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { regionForPreview } from '../lib/mapRegion';
import { isNativeMapsAvailable } from '../lib/nativeMapsAvailable';
import { wt } from '../lib/theme';

const PREVIEW_HEIGHT = 152;

type Props = {
  lat: number | null;
  lng: number | null;
  onOpenPicker: () => void;
};

export function AddressMapPreview({ lat, lng, onOpenPicker }: Props) {
  const hasPoint = lat != null && lng != null;
  const mapsOk = isNativeMapsAvailable();
  const region = regionForPreview(lat, lng);
  const mapKey = hasPoint ? `${lat}-${lng}` : 'empty';

  if (mapsOk) {
    return (
      <Pressable
        onPress={onOpenPicker}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir la carte pour choisir la position"
        style={styles.pressable}
      >
        <View style={styles.mapClip}>
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
            {hasPoint ? <Marker coordinate={{ latitude: lat, longitude: lng }} /> : null}
          </MapView>
        </View>
        <Text style={styles.tapHint}>Toucher l’aperçu pour agrandir</Text>
      </Pressable>
    );
  }

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
          ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : 'Aperçu carte indisponible (Expo Go). Touchez pour placer le point.'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { gap: 6 },
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
