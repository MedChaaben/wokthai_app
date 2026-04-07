import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { useRequireSession } from '../hooks/useRequireSession';
import { wt } from '../lib/theme';

const CITIES: AllowedCity[] = ['Tunis', 'Ariana'];

export default function AddressesScreen() {
  const sessionOk = useRequireSession('/addresses');
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
  const list = addresses.data ?? [];

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

  function openMapPickerFromForm() {
    // Evite les conflits de superposition entre modales sur mobile.
    setShowForm(false);
    setMapPickerVisible(true);
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

  if (!sessionOk) {
    return (
      <View style={styles.authWait}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Mes adresses</Text>
        <Text style={styles.intro}>
          Gérez vos points de livraison pour commander plus vite. Vérifiez la position sur la carte pour une
          livraison sans appel.
        </Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.countBadge}>
            {list.length} adresse{list.length > 1 ? 's' : ''} enregistrée{list.length > 1 ? 's' : ''}
          </Text>
          <WtButton
            title="Nouvelle adresse"
            variant="ghost"
            onPress={openNewAddress}
          />
        </View>
      </View>

      {addresses.isLoading ? (
        <ActivityIndicator color={wt.accent} style={{ marginVertical: 24 }} />
      ) : list.length === 0 ? (
        <WtCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucune adresse enregistrée</Text>
          <Text style={styles.emptyText}>
            Ajoutez votre adresse principale pour accélérer le passage en caisse et éviter les erreurs de
            localisation.
          </Text>
          {!showForm ? <WtButton title="Ajouter ma première adresse" onPress={openNewAddress} /> : null}
        </WtCard>
      ) : (
        list.map((a) => (
          <WtCard key={a.id} style={styles.addrCard}>
            <View style={styles.addrHeader}>
              <Text style={styles.addrTitle}>{a.label}</Text>
              <Text style={styles.cityPill}>{a.city}</Text>
            </View>
            <Text style={styles.addrMeta}>
              {a.address}
            </Text>
            <Text style={styles.coordsMuted}>
              {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
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

      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
        presentationStyle="overFullScreen"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>{editingId ? 'Modifier l’adresse' : 'Nouvelle adresse'}</Text>
                <Text style={styles.modalSubtitle}>
                  Complétez les infos puis validez le point précis sur la carte.
                </Text>
              </View>
              <Pressable onPress={closeForm} style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
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
                <AddressMapPreview lat={lat} lng={lng} onOpenPicker={openMapPickerFromForm} />
                <Pressable
                  onPress={openMapPickerFromForm}
                  style={({ pressed }) => [styles.mapBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.mapBtnText}>Choisir sur la carte</Text>
                </Pressable>
                <Text style={[styles.coords, lat != null && lng != null ? styles.coordsOk : null]}>
                  {lat != null && lng != null
                    ? `Point enregistré · ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                    : 'À faire : ouvrir la carte et valider la position'}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeForm}
                  disabled={savingAddress}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnGhost,
                    pressed && styles.pressed,
                    savingAddress && styles.actionBtnDisabled,
                  ]}
                >
                  <Text style={styles.actionBtnGhostText}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={() => void saveAddress()}
                  disabled={savingAddress}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnPrimary,
                    pressed && styles.pressed,
                    savingAddress && styles.actionBtnDisabled,
                  ]}
                >
                  {savingAddress ? (
                    <ActivityIndicator color={wt.white} size="small" />
                  ) : (
                    <Text style={styles.actionBtnPrimaryText}>
                      {editingId ? 'Enregistrer' : 'Ajouter'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <MapAddressPickerModal
        visible={mapPickerVisible}
        onClose={() => {
          setMapPickerVisible(false);
          setShowForm(true);
        }}
        initialLat={lat}
        initialLng={lng}
        onConfirm={(payload) => {
          setLat(payload.lat);
          setLng(payload.lng);
          if (payload.geocoded?.addressLine) setAddressLine(payload.geocoded.addressLine);
          if (payload.geocoded?.city) setCity(payload.geocoded.city);
          setShowForm(true);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authWait: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  screen: { padding: 16, paddingBottom: 40, gap: 12, backgroundColor: wt.bg },
  hero: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.bgElevated,
    gap: 8,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: wt.text },
  intro: { fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  heroMetaRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  countBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: wt.accentLight,
    borderWidth: 1,
    borderColor: wt.accentBorder,
    backgroundColor: wt.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  emptyCard: { gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: wt.text },
  emptyText: { fontSize: 14, lineHeight: 20, color: wt.textMuted },
  formTitle: { fontSize: 17, fontWeight: '700', color: wt.text, marginBottom: 2 },
  formHint: { fontSize: 14, color: wt.textMuted, lineHeight: 20, marginBottom: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    backgroundColor: wt.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: wt.borderStrong,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  modalTitleWrap: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: wt.text },
  modalSubtitle: { marginTop: 3, fontSize: 13, color: wt.textSecondary, lineHeight: 18 },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: wt.borderStrong,
    backgroundColor: wt.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: wt.text, fontSize: 16, fontWeight: '700' },
  modalBody: { gap: 12, paddingBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionBtnGhost: {
    borderColor: wt.borderStrong,
    backgroundColor: wt.surfaceMuted,
  },
  actionBtnPrimary: {
    borderColor: wt.accentBorder,
    backgroundColor: wt.accent,
  },
  actionBtnDisabled: { opacity: 0.65 },
  actionBtnGhostText: { color: wt.textMuted, fontSize: 14, fontWeight: '700' },
  actionBtnPrimaryText: { color: wt.white, fontSize: 14, fontWeight: '800' },
  mapBtn: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: wt.borderStrong,
    backgroundColor: wt.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapBtnText: { color: wt.text, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.86 },
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
  addrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  addrTitle: { fontWeight: '700', fontSize: 16, color: wt.text },
  cityPill: {
    fontSize: 11,
    fontWeight: '800',
    color: wt.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    backgroundColor: wt.accentMuted,
    borderColor: wt.accentBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  addrMeta: { marginTop: 8, color: wt.textMuted, lineHeight: 22 },
  coordsMuted: { marginTop: 2, fontSize: 12, color: wt.textSecondary },
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
