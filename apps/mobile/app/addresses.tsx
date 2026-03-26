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
import * as Location from 'expo-location';
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

  async function captureLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Activez la localisation pour enregistrer les coordonnées.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(pos.coords.latitude);
    setLng(pos.coords.longitude);
  }

  async function saveAddress() {
    if (!label.trim() || !addressLine.trim()) {
      Alert.alert('Champs requis', 'Libellé et adresse sont obligatoires.');
      return;
    }
    if (lat == null || lng == null) {
      Alert.alert('Position', 'Utilisez « Utiliser ma position » pour enregistrer lat/lng.');
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
        <WtCard style={{ gap: 10 }}>
          <Text style={styles.formTitle}>{editingId ? 'Modifier l’adresse' : 'Nouvelle adresse'}</Text>
          <TextInput
            placeholder="Libellé (ex. Maison)"
            placeholderTextColor={wt.placeholder}
            value={label}
            onChangeText={setLabel}
            style={styles.input}
          />
          <TextInput
            placeholder="Adresse complète"
            placeholderTextColor={wt.placeholder}
            value={addressLine}
            onChangeText={setAddressLine}
            style={styles.input}
          />
          <TextInput
            placeholder="Instructions pour le livreur (optionnel)"
            placeholderTextColor={wt.placeholder}
            value={instructions}
            onChangeText={setInstructions}
            style={styles.input}
            multiline
          />
          <View style={styles.cityRow}>
            {CITIES.map((c) => (
              <Pressable key={c} onPress={() => setCity(c)} style={styles.cityChipWrap}>
                <Text style={[styles.cityChip, city === c && styles.cityChipActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <WtButton title="Utiliser ma position (lat/lng)" variant="ghost" onPress={captureLocation} />
          <Text style={styles.coords}>
            {lat != null && lng != null
              ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : 'Position non enregistrée'}
          </Text>
          <WtButton
            title={editingId ? 'Enregistrer les modifications' : 'Enregistrer l’adresse'}
            loading={savingAddress}
            onPress={saveAddress}
          />
          <WtButton title="Annuler" variant="ghost" onPress={closeForm} />
        </WtCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 12, backgroundColor: wt.bg },
  intro: { fontSize: 14, color: wt.textMuted, lineHeight: 20, marginBottom: 4 },
  formTitle: { fontSize: 17, fontWeight: '700', color: wt.text, marginBottom: 4 },
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
  coords: { fontSize: 13, color: wt.textMuted },
});
