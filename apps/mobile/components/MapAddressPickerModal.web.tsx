import { useLayoutEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REGION_MODAL } from '../lib/mapRegion';
import { reverseGeocodeToSuggestion, type MapConfirmPayload } from '../lib/reverseGeocodeToAddress';
import { WtButton } from './WtButton';
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
  }, [visible, initialLat, initialLng]);

  async function centerOnMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Activez la localisation pour utiliser votre position.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setCoord({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
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

  const hint =
    'La carte n’est pas disponible dans le navigateur. Utilisez votre position ou validez les coordonnées affichées.';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>Position pour la livraison</Text>
          <Text style={styles.subtitle}>{hint}</Text>
          <Text style={styles.subtitle2}>
            L’adresse sera complétée automatiquement après validation si les services le permettent.
          </Text>
        </View>
        <View style={styles.fallbackBody}>
          <View style={styles.coordPill}>
            <Text style={styles.coordPillText}>
              {coord.latitude.toFixed(5)}, {coord.longitude.toFixed(5)}
            </Text>
          </View>
          <WtButton title="Ma position" style={styles.btnCompact} onPress={() => void centerOnMyLocation()} />
          <WtButton
            title="Valider"
            loading={resolving}
            style={styles.btnCompact}
            onPress={() => void handleConfirm()}
          />
          <WtButton title="Annuler" variant="ghost" style={styles.btnCompact} onPress={onClose} />
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
  fallbackBody: { flex: 1, padding: 16, gap: 8, justifyContent: 'center' },
  coordPill: {
    alignSelf: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: wt.borderStrong,
    backgroundColor: wt.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coordPillText: { fontSize: 12, color: wt.textSecondary, textAlign: 'center', fontVariant: ['tabular-nums'] },
  btnCompact: { minHeight: 42, paddingVertical: 10, borderRadius: 10 },
});
