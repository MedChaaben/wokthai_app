import { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import {
  useCreateOrder,
  useMyAddresses,
  useActiveStores,
  useDeliveryZones,
  createAddress,
  useSupabase,
  getDeliveryFeeForStoreAndCity,
  type AllowedCity,
} from '@wokthai/shared';
import { AddressMapPreview } from '../components/AddressMapPreview';
import { MapAddressPickerModal } from '../components/MapAddressPickerModal';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { useCart } from '../contexts/CartContext';
import { useRequireSession } from '../hooks/useRequireSession';
import { wt } from '../lib/theme';

const CITIES: AllowedCity[] = ['Tunis', 'Ariana'];

export default function CheckoutScreen() {
  const sessionOk = useRequireSession('/checkout');
  const router = useRouter();
  const supabase = useSupabase();
  const { lines, subtotal, clear } = useCart();
  const addresses = useMyAddresses();
  const stores = useActiveStores();
  const zones = useDeliveryZones();
  const createOrder = useCreateOrder();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');

  useEffect(() => {
    const list = stores.data;
    if (!list?.length || selectedStoreId) return;
    setSelectedStoreId(list[0].id);
  }, [stores.data, selectedStoreId]);

  const selectedStore = stores.data?.find((s) => s.id === selectedStoreId);
  const deliveryEnabled = selectedStore?.delivery_enabled !== false;

  useEffect(() => {
    if (!deliveryEnabled && orderType === 'delivery') {
      setOrderType('pickup');
    }
  }, [deliveryEnabled, orderType]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [showNewAddress, setShowNewAddress] = useState(false);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState<AllowedCity>('Tunis');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  async function saveNewAddress() {
    if (!label.trim() || !addressLine.trim()) {
      Alert.alert('Champs requis', 'Libellé et adresse sont obligatoires.');
      return;
    }
    if (lat == null || lng == null) {
      Alert.alert('Position', 'Appuyez sur « Choisir sur la carte » pour indiquer où livrer.');
      return;
    }
    setSavingAddress(true);
    try {
      const row = await createAddress(supabase, {
        label: label.trim(),
        address: addressLine.trim(),
        city,
        lat,
        lng,
        instructions: null,
      });
      setSelectedAddressId(row.id);
      setShowNewAddress(false);
      void addresses.refetch();
      Alert.alert('Adresse enregistrée', row.label);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d’enregistrer l’adresse');
    } finally {
      setSavingAddress(false);
    }
  }

  async function submitOrder() {
    if (lines.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits avant de commander.');
      return;
    }
    if (!selectedStoreId) {
      Alert.alert('Magasin', 'Choisissez le magasin pour cette commande.');
      return;
    }
    if (orderType === 'delivery' && !selectedAddressId) {
      Alert.alert('Adresse', 'Sélectionnez ou créez une adresse de livraison.');
      return;
    }
    try {
      const selected = addresses.data?.find((a) => a.id === selectedAddressId);
      const result = await createOrder.mutateAsync({
        type: orderType,
        storeId: selectedStoreId,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          selectedOptions: l.selectedOptions,
        })),
        paymentStatus: 'paid_on_delivery',
        addressId: orderType === 'delivery' ? selectedAddressId : null,
        deliveryNotes: deliveryNotes.trim() || null,
        addressCity:
          orderType === 'delivery' && selected?.city
            ? (selected.city as AllowedCity)
            : undefined,
      });
      clear();
      router.replace(`/order/${result.order.id}`);
    } catch (e: unknown) {
      Alert.alert('Commande impossible', e instanceof Error ? e.message : 'Réessayez');
    }
  }

  const selectedAddr = addresses.data?.find((a) => a.id === selectedAddressId);
  const deliveryFee =
    orderType === 'delivery' &&
    selectedStoreId &&
    selectedAddr?.city &&
    zones.data?.length
      ? getDeliveryFeeForStoreAndCity(
          selectedStoreId,
          selectedAddr.city as AllowedCity,
          zones.data
        )
      : 0;
  const grandTotal = subtotal + (orderType === 'delivery' ? deliveryFee : 0);

  if (!sessionOk) {
    return (
      <View style={styles.authWait}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Point de vente</Text>
      {stores.isLoading ? (
        <ActivityIndicator color={wt.accent} />
      ) : (stores.data ?? []).length === 0 ? (
        <Text style={styles.body}>Aucun point de vente disponible pour le moment.</Text>
      ) : (
        (stores.data ?? []).map((s) => (
          <Pressable key={s.id} onPress={() => setSelectedStoreId(s.id)}>
            <WtCard
              style={[
                styles.addrCard,
                selectedStoreId === s.id ? styles.addrSelected : undefined,
              ]}
            >
              <Text style={styles.addrTitle}>{s.name}</Text>
              <Text style={styles.addrMeta}>
                {s.address} — {s.city}
              </Text>
            </WtCard>
          </Pressable>
        ))
      )}

      <Text style={styles.heading}>Type</Text>
      {!deliveryEnabled ? (
        <Text style={styles.deliveryOffHint}>
          Livraison momentanément indisponible pour ce point de vente — retrait sur place uniquement.
        </Text>
      ) : null}
      <View style={styles.segment}>
        <Pressable
          onPress={() => deliveryEnabled && setOrderType('delivery')}
          disabled={!deliveryEnabled}
          style={[
            styles.segBtn,
            orderType === 'delivery' && styles.segActive,
            !deliveryEnabled && styles.segDisabled,
          ]}
        >
          <Text
            style={[
              styles.segText,
              orderType === 'delivery' && styles.segTextActive,
              !deliveryEnabled && styles.segTextDisabled,
            ]}
          >
            Livraison
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setOrderType('pickup')}
          style={[styles.segBtn, orderType === 'pickup' && styles.segActive]}
        >
          <Text style={[styles.segText, orderType === 'pickup' && styles.segTextActive]}>
            À emporter
          </Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Paiement</Text>
      <Text style={styles.body}>
        Paiement en espèces à la livraison ou sur place (à l’enlèvement).
      </Text>

      {orderType === 'delivery' ? (
        <>
          <Text style={styles.heading}>Adresse</Text>
          {addresses.isLoading ? <ActivityIndicator color={wt.accent} /> : null}
          {(addresses.data ?? []).map((a) => (
            <Pressable key={a.id} onPress={() => setSelectedAddressId(a.id)}>
              <WtCard
                style={[
                  styles.addrCard,
                  selectedAddressId === a.id ? styles.addrSelected : undefined,
                ]}
              >
                <Text style={styles.addrTitle}>{a.label}</Text>
                <Text style={styles.addrMeta}>
                  {a.address} — {a.city}
                </Text>
              </WtCard>
            </Pressable>
          ))}
          <WtButton
            title={showNewAddress ? 'Fermer le formulaire' : 'Nouvelle adresse'}
            variant="ghost"
            onPress={() => setShowNewAddress((v) => !v)}
          />
          {showNewAddress ? (
            <WtCard style={{ gap: 12 }}>
              <Text style={styles.formHint}>
                Renseignez le texte, puis indiquez le point exact sur la carte en dessous.
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
              <WtButton title="Enregistrer l’adresse" loading={savingAddress} onPress={saveNewAddress} />
            </WtCard>
          ) : null}
        </>
      ) : (
        <WtCard>
          <Text style={styles.body}>
            Vous récupérez la commande au point de vente choisi ci-dessus.
          </Text>
        </WtCard>
      )}

      <Text style={styles.heading}>Notes</Text>
      <TextInput
        placeholder="Instructions pour le restaurant / livreur"
        placeholderTextColor={wt.placeholder}
        value={deliveryNotes}
        onChangeText={setDeliveryNotes}
        multiline
        style={[styles.input, { minHeight: 80 }]}
      />

      <WtCard>
        <Text style={styles.total}>Articles : {subtotal.toFixed(2)} TND</Text>
        {orderType === 'delivery' ? (
          <>
            <Text style={styles.feeLine}>Livraison : {deliveryFee.toFixed(2)} TND</Text>
            <Text style={styles.total}>Total : {grandTotal.toFixed(2)} TND</Text>
          </>
        ) : null}
        {orderType === 'pickup' ? (
          <Text style={styles.hint}>Pas de frais de livraison (à emporter).</Text>
        ) : null}
      </WtCard>

      <WtButton
        title="Valider la commande"
        loading={createOrder.isPending}
        onPress={() => void submitOrder()}
      />

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
  authWait: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  screen: { padding: 16, paddingBottom: 40, gap: 12, backgroundColor: wt.bg },
  heading: { fontSize: 16, fontWeight: '800', color: wt.text, marginTop: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    backgroundColor: wt.surface,
  },
  segActive: { borderColor: wt.accent, backgroundColor: wt.accentMuted },
  segText: { fontWeight: '600', color: wt.textMuted, fontSize: 13, textAlign: 'center' },
  segTextActive: { color: wt.accentLight },
  segDisabled: { opacity: 0.45 },
  segTextDisabled: { color: wt.textMuted },
  deliveryOffHint: {
    fontSize: 13,
    color: wt.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  addrCard: { marginBottom: 8 },
  addrSelected: { borderColor: wt.accent, borderWidth: 2 },
  addrTitle: { fontWeight: '700', fontSize: 16, color: wt.text },
  addrMeta: { marginTop: 4, color: wt.textMuted },
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
  formHint: { fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: wt.textSecondary, marginBottom: 6 },
  positionBlock: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.surface,
    gap: 8,
  },
  coords: { fontSize: 13, color: wt.textMuted, lineHeight: 18 },
  coordsOk: { color: wt.accentLight },
  body: { fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  total: { fontSize: 18, fontWeight: '800', color: wt.text },
  hint: { marginTop: 6, fontSize: 13, color: wt.textSecondary },
  feeLine: { marginTop: 8, fontSize: 15, fontWeight: '600', color: wt.textMuted },
});
