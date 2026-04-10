import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCreateOrder,
  useMyAddresses,
  useMyUserProfile,
  useActiveStores,
  useDeliveryZones,
  useMyNonCancelledOrderCount,
  createAddress,
  useSupabase,
  insertAnalyticsEvent,
  getDeliveryFeeForStoreAndCity,
  formatStoreOpeningHoursLines,
  phoneDisplayToStorage,
  canonicalizePhoneDisplayInput,
  type AllowedCity,
} from '@wokthai/shared';
import { getAnalyticsDeviceId } from '../lib/analyticsDeviceId';
import { AddressMapPreview } from '../components/AddressMapPreview';
import { MapAddressPickerModal } from '../components/MapAddressPickerModal';
import { WtButton } from '../components/WtButton';
import { WtCard } from '../components/WtCard';
import { useCart } from '../contexts/CartContext';
import { isValidMapCoords } from '../lib/mapRegion';
import { wt } from '../lib/theme';

const CITIES: AllowedCity[] = ['Tunis', 'Ariana'];

function digitsLen(s: string): number {
  return s.replace(/\D/g, '').length;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const supabase = useSupabase();
  const { lines, subtotal, clear } = useCart();
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const addresses = useMyAddresses();
  const stores = useActiveStores();
  const zones = useDeliveryZones();
  const createOrder = useCreateOrder();

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const hasSession = Boolean(session);
  const orderCount = useMyNonCancelledOrderCount(hasSession);
  const myProfile = useMyUserProfile();

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

  const [guestPhone, setGuestPhone] = useState('');
  const [guestLabel, setGuestLabel] = useState('');
  const [guestAddressLine, setGuestAddressLine] = useState('');
  const [guestCity, setGuestCity] = useState<AllowedCity>('Tunis');
  const [guestLat, setGuestLat] = useState<number | null>(null);
  const [guestLng, setGuestLng] = useState<number | null>(null);

  const [showNewAddress, setShowNewAddress] = useState(false);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState<AllowedCity>('Tunis');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerForGuest, setMapPickerForGuest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const device_id = await getAnalyticsDeviceId();
        await insertAnalyticsEvent(supabase, {
          event_name: 'checkout_start',
          metadata: {
            line_count: linesRef.current.length,
            ...(device_id ? { device_id } : {}),
          },
        });
      })();
    }, [supabase])
  );

  async function saveNewAddress() {
    if (!label.trim() || !addressLine.trim()) {
      Alert.alert('Champs requis', 'Libellé et adresse sont obligatoires.');
      return;
    }
    if (!isValidMapCoords(lat, lng)) {
      Alert.alert('Position', 'Appuyez sur « Choisir sur la carte » pour indiquer où livrer.');
      return;
    }
    const latSave = lat as number;
    const lngSave = lng as number;
    setSavingAddress(true);
    try {
      const row = await createAddress(supabase, {
        label: label.trim(),
        address: addressLine.trim(),
        city,
        lat: latSave,
        lng: lngSave,
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
      Alert.alert('Restaurant', 'Choisissez le restaurant pour cette commande.');
      return;
    }

    if (!hasSession) {
      const p = phoneDisplayToStorage(guestPhone.trim()) ?? guestPhone.trim();
      if (digitsLen(p) < 8) {
        Alert.alert('Téléphone', 'Indiquez un numéro valide (au moins 8 chiffres) pour cette commande.');
        return;
      }
      if (orderType === 'delivery') {
        if (!guestLabel.trim() || !guestAddressLine.trim()) {
          Alert.alert('Adresse', 'Libellé et adresse écrite sont obligatoires.');
          return;
        }
        if (!isValidMapCoords(guestLat, guestLng)) {
          Alert.alert('Position', 'Indiquez sur la carte où livrer.');
          return;
        }
      }
    } else if (orderType === 'delivery' && !selectedAddressId) {
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
          fromUpsell: l.fromUpsell === true,
        })),
        paymentStatus: 'paid_on_delivery',
        addressId: hasSession && orderType === 'delivery' ? selectedAddressId : null,
        deliveryNotes: deliveryNotes.trim() || null,
        addressCity:
          hasSession && orderType === 'delivery' && selected?.city
            ? (selected.city as AllowedCity)
            : undefined,
        guestCheckout: !hasSession
          ? {
              phone: guestPhone,
              delivery:
                orderType === 'delivery'
                  ? {
                      label: guestLabel.trim(),
                      addressLine: guestAddressLine.trim(),
                      city: guestCity,
                      lat: guestLat!,
                      lng: guestLng!,
                    }
                  : undefined,
            }
          : undefined,
      });
      void (async () => {
        const device_id = await getAnalyticsDeviceId();
        await insertAnalyticsEvent(supabase, {
          event_name: 'order_completed',
          metadata: {
            order_id: result.order.id,
            total_price: grandTotal,
            store_id: selectedStoreId,
            ...(device_id ? { device_id } : {}),
          },
        });
      })();
      clear();
      router.replace(`/order/${result.order.id}`);
    } catch (e: unknown) {
      Alert.alert('Commande impossible', e instanceof Error ? e.message : 'Réessayez');
    }
  }

  const selectedAddr = addresses.data?.find((a) => a.id === selectedAddressId);

  const rawDeliveryFee =
    orderType === 'delivery' && selectedStoreId && zones.data?.length
      ? hasSession && selectedAddr?.city
        ? getDeliveryFeeForStoreAndCity(
            selectedStoreId,
            selectedAddr.city as AllowedCity,
            zones.data
          )
        : !hasSession
          ? getDeliveryFeeForStoreAndCity(selectedStoreId, guestCity, zones.data)
          : 0
      : 0;

  const promoAlreadyUsed = myProfile.profile?.promo_used === true;
  const isFirstOrderFree =
    hasSession &&
    orderType === 'delivery' &&
    (orderCount.data ?? 0) === 0 &&
    deliveryEnabled &&
    !promoAlreadyUsed;
  const deliveryFee = orderType === 'delivery' && isFirstOrderFree ? 0 : rawDeliveryFee;
  const grandTotal = subtotal + (orderType === 'delivery' ? deliveryFee : 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const recapThumbs = lines.slice(0, 4);
  const hasAddresses = (addresses.data?.length ?? 0) > 0;
  const hasStoreSelected = Boolean(selectedStoreId);
  const guestPhoneValid = digitsLen(phoneDisplayToStorage(guestPhone.trim()) ?? guestPhone.trim()) >= 8;
  const guestDeliveryReady =
    guestLabel.trim().length > 0 &&
    guestAddressLine.trim().length > 0 &&
    isValidMapCoords(guestLat, guestLng);
  const customerDeliveryReady = Boolean(selectedAddressId);
  const deliveryReady =
    orderType === 'pickup' || (hasSession ? customerDeliveryReady : guestDeliveryReady);
  const contactReady = hasSession || guestPhoneValid;
  const canSubmit = lines.length > 0 && hasStoreSelected && contactReady && deliveryReady;

  if (session === undefined) {
    return (
      <View style={styles.authWait}>
        <ActivityIndicator color={wt.accent} size="large" />
      </View>
    );
  }

  function openMap(forGuest: boolean) {
    setMapPickerForGuest(forGuest);
    setMapPickerVisible(true);
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Validation de commande</Text>
        <Text style={styles.heroTitle}>Paiement et livraison</Text>
        <Text style={styles.heroSub}>
          Parcours rapide et clair pour confirmer votre commande en toute confiance.
        </Text>
      </View>
      {!hasSession ? (
        <WtCard style={styles.promoCard}>
          <Text style={styles.promoTitle}>Créez un compte ou connectez-vous</Text>
          <Text style={styles.promoBullet}>• Livraison offerte sur votre première commande</Text>
          <Text style={styles.promoBullet}>
            • Programme fidélité : 1 TND dépensé (commande livrée) = 1 point
          </Text>
          <WtButton
            title="Me connecter / M’inscrire"
            variant="ghost"
            onPress={() =>
              router.push(`/login?redirect=${encodeURIComponent('/checkout')}` as never)
            }
          />
        </WtCard>
      ) : null}

      {!hasSession ? (
        <>
          <Text style={styles.heading}>Contact</Text>
          <Text style={styles.body}>Numéro de téléphone utilisé uniquement pour cette commande.</Text>
          <TextInput
            placeholder="12 34 56 78"
            placeholderTextColor={wt.placeholder}
            value={guestPhone}
            onChangeText={setGuestPhone}
            onBlur={() => setGuestPhone((p) => canonicalizePhoneDisplayInput(p))}
            keyboardType="default"
            style={styles.input}
          />
        </>
      ) : null}

      <Text style={styles.heading}>Point de vente</Text>
      {stores.isLoading ? (
        <ActivityIndicator color={wt.accent} />
      ) : (stores.data ?? []).length === 0 ? (
        <Text style={styles.body}>Aucun point de vente disponible pour le moment.</Text>
      ) : (
        (stores.data ?? []).map((s) => {
          const { lines: hourLines, isEmpty } = formatStoreOpeningHoursLines(
            s.store_opening_hours ?? undefined
          );
          const isSelected = selectedStoreId === s.id;
          return (
            <Pressable key={s.id} onPress={() => setSelectedStoreId(s.id)}>
              <WtCard
                style={[
                  styles.storeCard,
                  isSelected ? styles.storeCardSelected : undefined,
                ]}
              >
                <View style={styles.storeTopRow}>
                  <View style={styles.storeTitleWrap}>
                    <View style={[styles.storeRadio, isSelected ? styles.storeRadioSelected : null]}>
                      {isSelected ? <View style={styles.storeRadioDot} /> : null}
                    </View>
                    <Text style={styles.storeName}>{s.name}</Text>
                  </View>
                  {isSelected ? <Text style={styles.storeSelectedText}>Sélectionné</Text> : null}
                </View>
                <View style={styles.storeBadgeRow}>
                  {s.delivery_enabled !== false ? (
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>Livraison</Text>
                    </View>
                  ) : (
                    <View style={[styles.storeBadge, styles.storeBadgeMuted]}>
                      <Text style={[styles.storeBadgeText, styles.storeBadgeTextMuted]}>Retrait uniquement</Text>
                    </View>
                  )}
                </View>
                <View style={styles.storeSecondary}>
                  <Text style={styles.storeAddressLine} numberOfLines={2}>
                    {s.address} · {s.city}
                  </Text>
                  <Text
                    style={[styles.storeHoursCaption, isEmpty ? styles.storeHoursEmpty : undefined]}
                  >
                    {hourLines.join('\n')}
                  </Text>
                </View>
              </WtCard>
            </Pressable>
          );
        })
      )}

      <Text style={styles.heading}>Mode de réception</Text>
      {!deliveryEnabled ? (
        <Text style={styles.deliveryOffHint}>
          Livraison indisponible pour ce point de vente, retrait uniquement.
        </Text>
      ) : null}
      {hasSession && orderType === 'delivery' && (orderCount.data ?? 0) === 0 && deliveryEnabled ? (
        <Text style={styles.perkHint}>
          Première commande: livraison offerte.
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
            A emporter
          </Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Paiement</Text>
      <Text style={styles.body}>
        Paiement en espèces à la livraison ou sur place. Aucun frais caché.
      </Text>

      {orderType === 'delivery' ? (
        <>
          <Text style={styles.heading}>Adresse de livraison</Text>
          {hasSession ? (
            <>
              {addresses.isLoading ? <ActivityIndicator color={wt.accent} /> : null}
              {!addresses.isLoading && !hasAddresses ? (
                <Text style={styles.body}>Aucune adresse enregistrée. Ajoutez-en une pour continuer.</Text>
              ) : null}
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
                    Renseignez les informations puis confirmez le point exact sur la carte.
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
                    <AddressMapPreview
                      lat={lat}
                      lng={lng}
                      onOpenPicker={() => openMap(false)}
                    />
                    <WtButton title="Choisir sur la carte" onPress={() => openMap(false)} />
                    <Text style={[styles.coords, isValidMapCoords(lat, lng) ? styles.coordsOk : null]}>
                      {isValidMapCoords(lat, lng)
                        ? 'Position enregistrée sur la carte'
                        : 'Ouvrez la carte puis validez la position'}
                    </Text>
                  </View>
                  <WtButton title="Enregistrer l’adresse" loading={savingAddress} onPress={saveNewAddress} />
                </WtCard>
              ) : null}
            </>
          ) : (
            <WtCard style={{ gap: 12 }}>
              <Text style={styles.formHint}>
                Adresse utilisée uniquement pour cette commande.
              </Text>
              <Text style={styles.sectionLabel}>Ville</Text>
              <View style={styles.cityRow}>
                {CITIES.map((c) => (
                  <Pressable key={c} onPress={() => setGuestCity(c)} style={styles.cityChipWrap}>
                    <Text style={[styles.cityChip, guestCity === c && styles.cityChipActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionLabel}>Libellé</Text>
              <TextInput
                placeholder="Ex. Maison, Bureau"
                placeholderTextColor={wt.placeholder}
                value={guestLabel}
                onChangeText={setGuestLabel}
                style={styles.input}
              />
              <Text style={styles.sectionLabel}>Adresse écrite</Text>
              <TextInput
                placeholder="Rue, numéro, étage, digicode…"
                placeholderTextColor={wt.placeholder}
                value={guestAddressLine}
                onChangeText={setGuestAddressLine}
                style={styles.input}
              />
              <View style={styles.positionBlock}>
                <Text style={styles.sectionLabel}>Où livrer (carte)</Text>
                <AddressMapPreview
                  lat={guestLat}
                  lng={guestLng}
                  onOpenPicker={() => openMap(true)}
                />
                <WtButton title="Choisir sur la carte" onPress={() => openMap(true)} />
                <Text
                  style={[styles.coords, isValidMapCoords(guestLat, guestLng) ? styles.coordsOk : null]}
                >
                  {isValidMapCoords(guestLat, guestLng)
                    ? 'Position enregistrée sur la carte'
                    : 'Ouvrez la carte puis validez la position'}
                </Text>
              </View>
            </WtCard>
          )}
        </>
      ) : (
        <View style={styles.pickupHintRow}>
          <Text style={styles.pickupHintText}>Retrait au point de vente sélectionné.</Text>
        </View>
      )}

      <Text style={styles.heading}>Notes (optionnel)</Text>
      <TextInput
        placeholder="Instructions pour le restaurant / livreur"
        placeholderTextColor={wt.placeholder}
        value={deliveryNotes}
        onChangeText={setDeliveryNotes}
        multiline
        style={[styles.input, { minHeight: 80 }]}
      />

      <View style={styles.bottomSpacer} />

      <MapAddressPickerModal
        visible={mapPickerVisible}
        onClose={() => {
          setMapPickerVisible(false);
          setMapPickerForGuest(false);
        }}
        initialLat={mapPickerForGuest ? guestLat : lat}
        initialLng={mapPickerForGuest ? guestLng : lng}
        onConfirm={(payload) => {
          if (mapPickerForGuest) {
            setGuestLat(payload.lat);
            setGuestLng(payload.lng);
            if (payload.geocoded?.addressLine) setGuestAddressLine(payload.geocoded.addressLine);
            if (payload.geocoded?.city) setGuestCity(payload.geocoded.city);
          } else {
            setLat(payload.lat);
            setLng(payload.lng);
            if (payload.geocoded?.addressLine) setAddressLine(payload.geocoded.addressLine);
            if (payload.geocoded?.city) setCity(payload.geocoded.city);
          }
          setMapPickerVisible(false);
          setMapPickerForGuest(false);
        }}
      />
      </ScrollView>

      <View style={[styles.checkoutDock, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.recapHeader}>
          <Text style={styles.recapTitle}>Récapitulatif</Text>
          <Text style={styles.recapCount}>
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.recapThumbRow}>
          {recapThumbs.map((item) =>
            item.image_url ? (
              <Image key={item.lineKey} source={{ uri: item.image_url }} style={styles.recapThumb} resizeMode="cover" />
            ) : (
              <View key={item.lineKey} style={styles.recapThumbPlaceholder}>
                <Text style={styles.recapThumbPlaceholderText}>Photo</Text>
              </View>
            )
          )}
          {lines.length > 4 ? (
            <View style={styles.recapMoreBadge}>
              <Text style={styles.recapMoreText}>+{lines.length - 4}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.recapItemsList}>
          {lines.slice(0, 3).map((item) => (
            <View key={item.lineKey} style={styles.recapItemRow}>
              <Text numberOfLines={1} style={styles.recapItemName}>
                {item.name}
              </Text>
              <Text style={styles.recapItemQty}>x{item.quantity}</Text>
              <Text style={styles.recapItemAmount}>{(item.unitPrice * item.quantity).toFixed(2)} TND</Text>
            </View>
          ))}
          {lines.length > 3 ? (
            <Text style={styles.recapItemsMore}>+ {lines.length - 3} autre(s) article(s)</Text>
          ) : null}
        </View>

        <View style={styles.recapPanel}>
          <View style={styles.recapLine}>
            <Text style={styles.recapLabel}>Articles</Text>
            <Text style={styles.recapValue}>{subtotal.toFixed(2)} TND</Text>
          </View>
          {orderType === 'delivery' ? (
            isFirstOrderFree && rawDeliveryFee > 0 ? (
              <>
                <View style={styles.recapLine}>
                  <Text style={[styles.recapLabel, styles.recapStruck]}>
                    Livraison ({rawDeliveryFee.toFixed(2)} TND)
                  </Text>
                  <Text style={styles.recapPromo}>Offerte</Text>
                </View>
              </>
            ) : (
              <View style={styles.recapLine}>
                <Text style={styles.recapLabel}>Livraison</Text>
                <Text style={styles.recapValue}>{deliveryFee.toFixed(2)} TND</Text>
              </View>
            )
          ) : (
            <View style={styles.recapLine}>
              <Text style={styles.recapLabel}>Livraison</Text>
              <Text style={styles.recapValue}>0.00 TND</Text>
            </View>
          )}
          <View style={styles.recapDivider} />
          <View style={styles.recapLine}>
            <Text style={styles.recapTotalLabel}>Total</Text>
            <Text style={styles.recapTotalValue}>{grandTotal.toFixed(2)} TND</Text>
          </View>
        </View>

        <WtButton
          title="Valider la commande"
          loading={createOrder.isPending}
          disabled={!canSubmit}
          onPress={() => void submitOrder()}
        />
        <Text style={styles.checkoutTrust}>Paiement à la reception</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.bg },
  authWait: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wt.bg },
  screen: { padding: 16, paddingBottom: 300, gap: 12, backgroundColor: wt.bg },
  hero: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.surface,
    gap: 3,
  },
  heroEyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: wt.textSecondary,
    fontWeight: '700',
  },
  heroTitle: { fontSize: 21, color: wt.text, fontWeight: '700' },
  heroSub: { fontSize: 13, lineHeight: 18, color: wt.textSecondary },
  heading: { fontSize: 15, fontWeight: '700', color: wt.text, marginTop: 8 },
  promoCard: { gap: 8, paddingVertical: 14 },
  promoTitle: { fontSize: 15, fontWeight: '800', color: wt.text },
  promoBullet: { fontSize: 13, color: wt.textMuted, lineHeight: 19 },
  perkHint: {
    fontSize: 13,
    color: wt.accentLight,
    lineHeight: 18,
    marginBottom: 2,
    fontWeight: '600',
  },
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
  storeCard: { marginBottom: 8, paddingVertical: 14, paddingHorizontal: 14 },
  storeCardSelected: { borderColor: wt.accent, borderWidth: 1.5, backgroundColor: wt.bgElevated },
  addrCard: { marginBottom: 8 },
  addrSelected: { borderColor: wt.accent, borderWidth: 2 },
  storeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  storeTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  storeRadio: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: wt.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wt.surface,
  },
  storeRadioSelected: { borderColor: wt.accent },
  storeRadioDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: wt.accentLight },
  storeSelectedText: { fontSize: 11, color: wt.accentLight, fontWeight: '700' },
  addrTitle: { fontWeight: '700', fontSize: 16, color: wt.text },
  addrMeta: { marginTop: 4, color: wt.textMuted },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: wt.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  storeBadgeRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeBadge: {
    borderWidth: 1,
    borderColor: wt.borderStrong,
    backgroundColor: wt.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  storeBadgeMuted: {
    borderColor: wt.border,
    backgroundColor: wt.bg,
  },
  storeBadgeText: {
    fontSize: 11,
    color: wt.textMuted,
    fontWeight: '600',
  },
  storeBadgeTextMuted: {
    color: wt.textSecondary,
  },
  storeSecondary: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.07)',
    gap: 6,
  },
  storeAddressLine: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: wt.textSecondary,
  },
  storeHoursCaption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
    color: wt.placeholder,
    letterSpacing: 0.12,
  },
  storeHoursEmpty: { fontStyle: 'italic', opacity: 0.92 },
  input: {
    borderWidth: 1,
    borderColor: wt.borderStrong,
    borderRadius: 12,
    padding: 13,
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
  pickupHintRow: { paddingHorizontal: 4, paddingVertical: 2 },
  pickupHintText: { fontSize: 13, color: wt.textSecondary, lineHeight: 18 },
  total: { fontSize: 18, fontWeight: '800', color: wt.text },
  hint: { marginTop: 6, fontSize: 13, color: wt.textSecondary },
  feeLine: { marginTop: 8, fontSize: 15, fontWeight: '600', color: wt.textMuted },
  feeStruck: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: wt.textSecondary,
    textDecorationLine: 'line-through',
  },
  feePromo: { marginTop: 4, fontSize: 15, fontWeight: '700', color: wt.accentLight },
  bottomSpacer: { height: 8 },
  checkoutDock: {
    borderTopWidth: 1,
    borderTopColor: wt.border,
    backgroundColor: wt.bgElevated,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  recapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapTitle: { fontSize: 14, color: wt.text, fontWeight: '700' },
  recapCount: { fontSize: 12, color: wt.textMuted, fontWeight: '600' },
  recapThumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recapThumb: { width: 34, height: 34, borderRadius: 8, backgroundColor: wt.surfaceMuted },
  recapThumbPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: wt.surfaceMuted,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapThumbPlaceholderText: { fontSize: 7, color: wt.textMuted, fontWeight: '700' },
  recapMoreBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  recapMoreText: { fontSize: 12, color: wt.text, fontWeight: '700' },
  recapItemsList: {
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  recapItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recapItemName: { flex: 1, fontSize: 12, color: wt.text, fontWeight: '600' },
  recapItemQty: { fontSize: 12, color: wt.textMuted, minWidth: 26, textAlign: 'right' },
  recapItemAmount: { fontSize: 12, color: wt.text, fontWeight: '700', minWidth: 72, textAlign: 'right' },
  recapItemsMore: { fontSize: 11, color: wt.textSecondary },
  recapPanel: {
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
  },
  recapLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  recapLabel: { fontSize: 13, color: wt.textMuted, fontWeight: '500' },
  recapValue: { fontSize: 13, color: wt.text, fontWeight: '700' },
  recapPromo: { fontSize: 13, color: wt.accentLight, fontWeight: '700' },
  recapStruck: { textDecorationLine: 'line-through', color: wt.textSecondary },
  recapDivider: { height: 1, backgroundColor: wt.border },
  recapTotalLabel: { fontSize: 15, color: wt.text, fontWeight: '800' },
  recapTotalValue: { fontSize: 18, color: wt.text, fontWeight: '800' },
  checkoutTrust: { fontSize: 10, color: wt.textSecondary, textAlign: 'center', lineHeight: 14 },
});
