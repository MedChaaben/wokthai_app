import { useLayoutEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REGION_MODAL } from '../lib/mapRegion';
import { reverseGeocodeToSuggestion, type MapConfirmPayload } from '../lib/reverseGeocodeToAddress';
import { WtButton } from './WtButton';
import { isNativeMapsAvailable } from '../lib/nativeMapsAvailable';
import { wt } from '../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (payload: MapConfirmPayload) => void;
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
  const [resolving, setResolving] = useState(false);
  const [coord, setCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: REGION_MODAL.latitude,
    longitude: REGION_MODAL.longitude,
  });

  useLayoutEffect(() => {
    if (!visible) return;
    const lat = initialLat ?? REGION_MODAL.latitude;
    const lng = initialLng ?? REGION_MODAL.longitude;
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
          latitudeDelta: REGION_MODAL.latitudeDelta,
          longitudeDelta: REGION_MODAL.longitudeDelta,
        },
        400
      );
    }
  }

  async function handleConfirm() {
    const lat = coord.latitude;
    const lng = coord.longitude;
    setResolving(true);
    try {
      const geocoded = await reverseGeocodeToSuggestion(lat, lng);
      onConfirm({ lat, lng, geocoded });
      onClose();
    } finally {
      setResolving(false);
    }
  }

  const mapsOk = isNativeMapsAvailable();

  if (!mapsOk) {
    const hint =
      'Expo Go n’inclut pas la carte native. Créez un development build (EAS / expo prebuild) pour la carte, ou utilisez le bouton ci-dessous pour prendre votre position.';

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Position pour la livraison</Text>
            <Text style={styles.subtitle}>{hint}</Text>
            <Text style={styles.subtitle2}>
              L’adresse sera complétée automatiquement après validation si les services le permettent.
            </Text>
          </View>
          <View style={styles.fallbackBody}>
            <WtButton title="Utiliser ma position" onPress={() => void centerOnMyLocation()} />
            <WtButton
              title="Valider cette position"
              loading={resolving}
              onPress={() => void handleConfirm()}
            />
            <WtButton title="Annuler" variant="ghost" onPress={onClose} />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>Position sur la carte</Text>
          <Text style={styles.subtitle}>
            Déplacez l’épingle pour indiquer l’entrée ou l’emplacement exact pour la livraison.
          </Text>
          <Text style={styles.subtitle2}>
            L’adresse écrite et la ville seront remplies automatiquement ; vous pourrez les corriger
            ensuite.
          </Text>
        </View>
        <MapView
          key={mapKey}
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: coord.latitude,
            longitude: coord.longitude,
            latitudeDelta: REGION_MODAL.latitudeDelta,
            longitudeDelta: REGION_MODAL.longitudeDelta,
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
          <WtButton title="Ma position" variant="ghost" style={styles.btnCompact} onPress={() => void centerOnMyLocation()} />
          <WtButton
            title="Valider"
            loading={resolving}
            style={styles.btnCompact}
            onPress={() => void handleConfirm()}
          />
          <WtButton title="Annuler" variant="ghost" style={styles.btnCompact} onPress={onClose} disabled={resolving} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wt.bg },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: wt.borderStrong,
    marginTop: 6,
    marginBottom: 8,
  },
  header: { paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  title: { fontSize: 18, fontWeight: '800', color: wt.text },
  subtitle: { fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  subtitle2: { fontSize: 13, color: wt.textSecondary, lineHeight: 18 },
  map: { flex: 1, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  actions: { padding: 16, gap: 8 },
  btnCompact: { minHeight: 42, paddingVertical: 10, borderRadius: 10 },
  fallbackBody: { flex: 1, padding: 16, gap: 12, justifyContent: 'center' },
});
