import { useLayoutEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Platform, Alert } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WtButton } from './WtButton';
import { isNativeMapsAvailable } from '../lib/nativeMapsAvailable';
import { wt } from '../lib/theme';

const TUNIS_CENTER: Region = {
  latitude: 36.8065,
  longitude: 10.1815,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (lat: number, lng: number) => void;
};

export function MapAddressPickerModal({
  visible,
  onClose,
  initialLat,
  initialLng,
  onConfirm,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [mapKey, setMapKey] = useState(0);
  const [coord, setCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: TUNIS_CENTER.latitude,
    longitude: TUNIS_CENTER.longitude,
  });

  useLayoutEffect(() => {
    if (!visible) return;
    const lat = initialLat ?? TUNIS_CENTER.latitude;
    const lng = initialLng ?? TUNIS_CENTER.longitude;
    setCoord({ latitude: lat, longitude: lng });
    setMapKey((k) => k + 1);
  }, [visible, initialLat, initialLng]);

  async function centerOnMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Activez la localisation pour utiliser votre position.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    const next = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
    setCoord(next);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...next,
          latitudeDelta: TUNIS_CENTER.latitudeDelta,
          longitudeDelta: TUNIS_CENTER.longitudeDelta,
        },
        400
      );
    }
  }

  function handleConfirm() {
    onConfirm(coord.latitude, coord.longitude);
    onClose();
  }

  const mapsOk = isNativeMapsAvailable();

  if (!mapsOk) {
    const hint =
      Platform.OS === 'web'
        ? 'La carte n’est pas disponible ici. Ouvrez l’app sur un téléphone pour placer le point, ou utilisez la position ci-dessous.'
        : 'Expo Go n’inclut pas la carte native. Créez un development build (EAS / expo prebuild) pour la carte, ou utilisez le bouton ci-dessous pour prendre votre position.';

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Position pour la livraison</Text>
            <Text style={styles.subtitle}>{hint}</Text>
          </View>
          <View style={styles.fallbackBody}>
            <Text style={styles.coordsLine}>
              {coord.latitude.toFixed(5)}, {coord.longitude.toFixed(5)}
            </Text>
            <WtButton title="Utiliser ma position" onPress={() => void centerOnMyLocation()} />
            <WtButton title="Valider cette position" onPress={handleConfirm} />
            <WtButton title="Annuler" variant="ghost" onPress={onClose} />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Position sur la carte</Text>
          <Text style={styles.subtitle}>
            Déplacez l’épingle pour indiquer l’entrée ou l’emplacement exact pour la livraison.
          </Text>
        </View>
        <MapView
          key={mapKey}
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: coord.latitude,
            longitude: coord.longitude,
            latitudeDelta: TUNIS_CENTER.latitudeDelta,
            longitudeDelta: TUNIS_CENTER.longitudeDelta,
          }}
          showsUserLocation
        >
          <Marker
            draggable
            coordinate={coord}
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setCoord({ latitude, longitude });
            }}
          />
        </MapView>
        <View style={styles.actions}>
          <WtButton
            title="Centrer sur ma position"
            variant="ghost"
            onPress={() => void centerOnMyLocation()}
          />
          <WtButton title="Valider cette position" onPress={handleConfirm} />
          <WtButton title="Annuler" variant="ghost" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wt.bg },
  header: { paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  title: { fontSize: 18, fontWeight: '800', color: wt.text },
  subtitle: { fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  map: { flex: 1, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  actions: { padding: 16, gap: 10 },
  fallbackBody: { flex: 1, padding: 16, gap: 12, justifyContent: 'center' },
  coordsLine: { fontSize: 15, color: wt.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
