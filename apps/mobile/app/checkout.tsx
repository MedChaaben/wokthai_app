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
import * as Location from 'expo-location';
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
  type PaymentStatus,
} from '@wokthai/shared';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { useCart } from '../contexts/CartContext';
import { wt } from '../lib/theme';

const CITIES: AllowedCity[] = ['Tunis', 'Ariana'];

export default function CheckoutScreen() {
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid_on_delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [showNewAddress, setShowNewAddress] = useState(false);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState<AllowedCity>('Tunis');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

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

  async function saveNewAddress() {
    if (!label.trim() || !addressLine.trim()) {
      Alert.alert('Champs requis', 'Libellé et adresse sont obligatoires.');
      return;
    }
    if (lat == null || lng == null) {
      Alert.alert('Position', 'Utilisez « Utiliser ma position » pour enregistrer lat/lng.');
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
        paymentStatus,
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

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Magasin</Text>
      {stores.isLoading ? (
        <ActivityIndicator color={wt.accent} />
      ) : (stores.data ?? []).length === 0 ? (
        <Text style={styles.body}>Aucun magasin disponible pour le moment.</Text>
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
      <View style={styles.segment}>
        <Pressable
          onPress={() => setOrderType('delivery')}
          style={[styles.segBtn, orderType === 'delivery' && styles.segActive]}
        >
          <Text style={[styles.segText, orderType === 'delivery' && styles.segTextActive]}>
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

      <Text style={styles.heading}>Paiement (espèces)</Text>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setPaymentStatus('paid_on_delivery')}
          style={[styles.segBtn, paymentStatus === 'paid_on_delivery' && styles.segActive]}
        >
          <Text
            style={[styles.segText, paymentStatus === 'paid_on_delivery' && styles.segTextActive]}
          >
            Paiement à la livraison
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPaymentStatus('unpaid')}
          style={[styles.segBtn, paymentStatus === 'unpaid' && styles.segActive]}
        >
          <Text style={[styles.segText, paymentStatus === 'unpaid' && styles.segTextActive]}>
            Non payé
          </Text>
        </Pressable>
      </View>

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
            <WtCard style={{ gap: 10 }}>
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
              <WtButton title="Enregistrer l’adresse" loading={savingAddress} onPress={saveNewAddress} />
            </WtCard>
          ) : null}
        </>
      ) : (
        <WtCard>
          <Text style={styles.body}>
            Vous récupérez la commande au magasin choisi ci-dessus.
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  coords: { fontSize: 13, color: wt.textMuted },
  body: { fontSize: 14, color: wt.textMuted, lineHeight: 20 },
  total: { fontSize: 18, fontWeight: '800', color: wt.text },
  hint: { marginTop: 6, fontSize: 13, color: wt.textSecondary },
  feeLine: { marginTop: 8, fontSize: 15, fontWeight: '600', color: wt.textMuted },
});
