import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  useMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  useSupabase,
  type AddressRow,
  type AllowedCity,
} from '@wokthai/shared';
import { AddressCardActions } from '../components/AddressCardActions';
import { AddressMapPreview } from '../components/AddressMapPreview';
import { MapAddressPickerModal } from '../components/MapAddressPickerModal';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { wt } from '../lib/theme';

const CITIES: AllowedCity[] = ['Tunis', 'Ariana'];

export default function AddressesScreen() {
  const supabase = useSupabase();
  const addresses = useMyAddresses();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState<AllowedCity>('Tunis');
  const [instructions, setInstructions] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  function resetForm() {
    setEditingId(null);
    setLabel('');
    setAddressLine('');
    setCity('Tunis');
    setInstructions('');
    setLat(null);
    setLng(null);
  }

  function openNewAddress() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(a: AddressRow) {
    setEditingId(a.id);
    setLabel(a.label);
    setAddressLine(a.address);
    setCity(a.city as AllowedCity);
    setInstructions(a.instructions ?? '');
    setLat(a.lat);
    setLng(a.lng);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  async function saveAddress() {
    if (!label.trim() || !addressLine.trim()) {
      Alert.alert('Champs requis', 'Libellé et adresse sont obligatoires.');
      return;
    }
    if (lat == null || lng == null) {
      Alert.alert('Position', 'Appuyez sur « Choisir sur la carte » pour indiquer où livrer.');
      return;
    }
    const instr = instructions.trim() ? instructions.trim() : null;
    setSavingAddress(true);
    try {
      if (editingId) {
        await updateAddress(supabase, editingId, {
          label: label.trim(),
          address: addressLine.trim(),
          city,
          lat,
          lng,
          instructions: instr,
        });
        Alert.alert('Adresse mise à jour', 'Les modifications ont été enregistrées.');
      } else {
        await createAddress(supabase, {
          label: label.trim(),
          address: addressLine.trim(),
          city,
          lat,
          lng,
          instructions: instr,
        });
        Alert.alert('Adresse enregistrée', 'Vous pouvez l’utiliser lors de vos commandes.');
      }
      closeForm();
      void addresses.refetch();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d’enregistrer l’adresse');
    } finally {
      setSavingAddress(false);
    }
  }

  function confirmDelete(a: AddressRow) {
    Alert.alert(
      'Supprimer l’adresse',
      `« ${a.label} » sera définitivement supprimée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => void removeAddress(a.id),
        },
      ]
    );
  }

  async function removeAddress(id: string) {
    setDeletingId(id);
    try {
      await deleteAddress(supabase, id);
      if (editingId === id) closeForm();
      void addresses.refetch();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de supprimer l’adresse');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.intro}>
        Vos adresses enregistrées pour la livraison. Ajoutez-en une nouvelle ci-dessous.
      </Text>

      {addresses.isLoading ? (
        <ActivityIndicator color={wt.accent} style={{ marginVertical: 24 }} />
      ) : (
        (addresses.data ?? []).map((a) => (
          <WtCard key={a.id} style={styles.addrCard}>
            <Text style={styles.addrTitle}>{a.label}</Text>
            <Text style={styles.addrMeta}>
              {a.address}
              {'\n'}
              {a.city}
            </Text>
            {a.instructions ? <Text style={styles.instructions}>Note : {a.instructions}</Text> : null}
            <AddressCardActions
              onEdit={() => startEdit(a)}
              onDelete={() => confirmDelete(a)}
              deleteLoading={deletingId === a.id}
            />
          </WtCard>
        ))
      )}

      <WtButton
        title={showForm ? 'Fermer le formulaire' : 'Nouvelle adresse'}
        variant="ghost"
        onPress={() => (showForm ? closeForm() : openNewAddress())}
      />

      {showForm ? (
        <WtCard style={{ gap: 12 }}>
          <Text style={styles.formTitle}>{editingId ? 'Modifier l’adresse' : 'Nouvelle adresse'}</Text>
          <Text style={styles.formHint}>
            Renseignez le texte ci-dessous, puis précisez le point exact sur la carte : l’adresse et la
            ville peuvent être complétées automatiquement à la validation.
          </Text>

          <Text style={styles.sectionLabel}>Ville</Text>
          <View style={styles.cityRow}>
            {CITIES.map((c) => (
              <Pressable key={c} onPress={() => setCity(c)} style={styles.cityChipWrap}>
                <Text style={[styles.cityChip, city === c && styles.cityChipActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Libellé</Text>
          <TextInput
            placeholder="Ex. Maison, Bureau"
            placeholderTextColor={wt.placeholder}
            value={label}
            onChangeText={setLabel}
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Adresse écrite</Text>
          <TextInput
            placeholder="Rue, numéro, étage, digicode…"
            placeholderTextColor={wt.placeholder}
            value={addressLine}
            onChangeText={setAddressLine}
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Instructions (optionnel)</Text>
          <TextInput
            placeholder="Repères pour le livreur"
            placeholderTextColor={wt.placeholder}
            value={instructions}
            onChangeText={setInstructions}
            style={styles.input}
            multiline
          />

          <View style={styles.positionBlock}>
            <Text style={styles.sectionLabel}>Où livrer (carte)</Text>
            <AddressMapPreview lat={lat} lng={lng} onOpenPicker={() => setMapPickerVisible(true)} />
            <WtButton title="Choisir sur la carte" onPress={() => setMapPickerVisible(true)} />
            <Text style={[styles.coords, lat != null && lng != null ? styles.coordsOk : null]}>
              {lat != null && lng != null
                ? `Point enregistré · ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                : 'À faire : ouvrir la carte et valider la position'}
            </Text>
          </View>

          <WtButton
            title={editingId ? 'Enregistrer les modifications' : 'Enregistrer l’adresse'}
            loading={savingAddress}
            onPress={saveAddress}
          />
          <WtButton title="Annuler" variant="ghost" onPress={closeForm} />
        </WtCard>
      ) : null}

      <MapAddressPickerModal
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        initialLat={lat}
        initialLng={lng}
        onConfirm={(payload) => {
          setLat(payload.lat);
          setLng(payload.lng);
          if (payload.geocoded?.addressLine) setAddressLine(payload.geocoded.addressLine);
          if (payload.geocoded?.city) setCity(payload.geocoded.city);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 12, backgroundColor: wt.bg },
  intro: { fontSize: 14, color: wt.textMuted, lineHeight: 20, marginBottom: 4 },
  formTitle: { fontSize: 17, fontWeight: '700', color: wt.text, marginBottom: 2 },
  formHint: { fontSize: 14, color: wt.textMuted, lineHeight: 20, marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: wt.textSecondary, marginBottom: 6 },
  positionBlock: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.surface,
    gap: 8,
  },
  addrCard: { marginBottom: 4 },
  addrTitle: { fontWeight: '700', fontSize: 16, color: wt.text },
  addrMeta: { marginTop: 6, color: wt.textMuted, lineHeight: 22 },
  instructions: { marginTop: 8, fontSize: 14, color: wt.textSecondary, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: wt.surface,
    color: wt.text,
  },
  cityRow: { flexDirection: 'row', gap: 8 },
  cityChipWrap: { flex: 1 },
  cityChip: {
    textAlign: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: wt.border,
    fontWeight: '600',
    color: wt.textMuted,
  },
  cityChipActive: { backgroundColor: wt.accentMuted, borderColor: wt.accent, color: wt.accentLight },
  coords: { fontSize: 13, color: wt.textMuted, lineHeight: 18 },
  coordsOk: { color: wt.accentLight },
});
