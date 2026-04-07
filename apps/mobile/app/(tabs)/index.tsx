import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  PanResponder,
  Dimensions,
  Easing,
} from 'react-native';
import {
  useCategories,
  useProducts,
  useProductIdsWithRequiredOptions,
  buildCartLineKey,
  validateLineOptionsAndPrice,
  sumSelectedModifiersPreview,
  type ProductRow,
  useProductOptionGroups,
  type OptionGroupWithOptions,
  type OrderLineOptionChoice,
} from '@wokthai/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartFloatingBar } from '../../components/CartFloatingBar';
import { MenuCategoryPicker } from '../../components/MenuCategoryPicker';
import { WtCard } from '../../components/WtCard';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

function buildChoices(
  groups: OptionGroupWithOptions[],
  sel: Record<string, string[]>
): OrderLineOptionChoice[] {
  const out: OrderLineOptionChoice[] = [];
  for (const g of groups) {
    const ids = sel[g.id] ?? [];
    for (const oid of ids) out.push({ groupId: g.id, optionId: oid });
  }
  return out;
}

function MenuProductRow({
  product: p,
  canQuickAdd,
  onOpenCustomize,
}: {
  product: ProductRow;
  canQuickAdd: boolean;
  onOpenCustomize: (product: ProductRow) => void;
}) {
  const { lines, addLine, setQuantity } = useCart();
  const lineKey = buildCartLineKey(p.id, []);
  const quickLine = lines.find((l) => l.lineKey === lineKey);
  const quickQty = quickLine?.quantity ?? 0;
  const totalInCart = lines
    .filter((l) => l.productId === p.id)
    .reduce((s, l) => s + l.quantity, 0);
  const displayQty = canQuickAdd ? quickQty : totalInCart;
  const base = Number(p.price);

  function goDetail() {
    onOpenCustomize(p);
  }

  function increment() {
    if (!canQuickAdd) {
      onOpenCustomize(p);
      return;
    }
    const { unitPrice } = validateLineOptionsAndPrice(base, [], []);
    addLine({
      productId: p.id,
      name: p.name,
      unitPrice,
      quantity: 1,
      selectedOptions: [],
      image_url: p.image_url,
    });
  }

  function decrement() {
    if (!canQuickAdd) {
      return;
    }
    if (quickQty <= 0) return;
    setQuantity(lineKey, quickQty - 1);
  }

  const minusDisabled = canQuickAdd ? quickQty <= 0 : totalInCart <= 0;

  return (
    <WtCard style={styles.productCard}>
      <View style={styles.productRow}>
        <Pressable onPress={goDetail} style={styles.thumbWrap}>
          {p.image_url ? (
            <Image source={{ uri: p.image_url }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={styles.thumbPlaceholderText}>Photo</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={goDetail} style={styles.productInfo}>
          <Text style={styles.productName}>{p.name}</Text>
          {p.description ? <Text style={styles.productDesc}>{p.description}</Text> : null}
          {!canQuickAdd ? (
            <Text style={styles.optionsHint}>Options sur la fiche produit</Text>
          ) : null}
        </Pressable>
      </View>
      <View style={styles.productFooter}>
        <Text style={styles.price}>{base.toFixed(2)} TND</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={decrement}
            disabled={minusDisabled}
            style={({ pressed }) => [
              styles.stepBtn,
              pressed && !minusDisabled && styles.stepBtnPressed,
              minusDisabled && styles.stepBtnDisabled,
            ]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Retirer un ${p.name}`}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <View style={styles.stepQtyBadge}>
            <Text style={styles.stepQty}>{displayQty}</Text>
          </View>
          <Pressable
            onPress={increment}
            style={({ pressed }) => [
              styles.stepBtn,
              styles.stepBtnPlus,
              pressed && styles.stepBtnPlusPressed,
            ]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter un ${p.name}`}
          >
            <Text style={[styles.stepBtnText, styles.stepBtnPlusText]}>+</Text>
          </Pressable>
        </View>
      </View>
    </WtCard>
  );
}

function ProductCustomizeModal({
  product,
  onClose,
  onConfirm,
}: {
  product: ProductRow | null;
  onClose: () => void;
  onConfirm: (choices: OrderLineOptionChoice[], optionSummary: string[], unitPrice: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const productId = product?.id ?? '';
  const { data: groups = [], isLoading } = useProductOptionGroups(productId);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const screenHeight = Dimensions.get('window').height;
  const sheetHeight = Math.round(screenHeight * 0.7);
  const sheetTranslateY = useRef(new Animated.Value(sheetHeight + 24)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    setSel({});
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    sheetTranslateY.setValue(sheetHeight + 24);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [product, sheetHeight, sheetTranslateY]);

  const choices = useMemo(() => buildChoices(groups, sel), [groups, sel]);
  const base = product ? Number(product.price) : 0;
  const previewExtra = useMemo(
    () => (groups.length ? sumSelectedModifiersPreview(groups, choices) : 0),
    [groups, choices]
  );
  const previewUnit = base + previewExtra;

  function toggleOption(g: OptionGroupWithOptions, optionId: string) {
    setSel((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.max_select <= 1) {
        const on = cur.includes(optionId);
        return { ...prev, [g.id]: on ? [] : [optionId] };
      }
      if (cur.includes(optionId)) {
        return { ...prev, [g.id]: cur.filter((x) => x !== optionId) };
      }
      if (cur.length >= g.max_select) return prev;
      return { ...prev, [g.id]: [...cur, optionId] };
    });
  }

  function confirm() {
    if (!product) return;
    try {
      const { unitPrice, snapshots } = validateLineOptionsAndPrice(base, groups, choices);
      onConfirm(
        choices,
        snapshots.map((s) => s.option_name),
        unitPrice
      );
    } catch (e: unknown) {
      Alert.alert('Options', e instanceof Error ? e.message : 'Sélection invalide');
    }
  }

  function closeWithAnimation() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(sheetTranslateY, {
      toValue: sheetHeight + 24,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      isClosingRef.current = false;
      onClose();
    });
  }

  const headerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dy) > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_evt, gestureState) => {
          if (gestureState.dy <= 0) return;
          sheetTranslateY.setValue(Math.min(gestureState.dy, sheetHeight + 24));
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dy > sheetHeight * 0.22 || gestureState.vy > 0.9) {
            closeWithAnimation();
            return;
          }
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
          }).start();
        },
      }),
    [sheetHeight, sheetTranslateY]
  );

  const backdropAnimatedStyle = {
    opacity: sheetTranslateY.interpolate({
      inputRange: [0, sheetHeight + 24],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  };

  return (
    <Modal visible={product != null} animationType="none" transparent onRequestClose={closeWithAnimation}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation}>
          <Animated.View style={[styles.modalBackdrop, backdropAnimatedStyle]} />
        </Pressable>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader} {...headerPanResponder.panHandlers}>
            <Text style={styles.modalTitle}>{product?.name ?? ''}</Text>
            <Pressable onPress={closeWithAnimation} hitSlop={8} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseIcon}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {product?.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.modalHero} resizeMode="cover" />
            ) : (
              <View style={styles.modalHeroPlaceholder}>
                <Text style={styles.modalHeroPlaceholderText}>Photo</Text>
              </View>
            )}
            {product?.description ? <Text style={styles.modalDesc}>{product.description}</Text> : null}
            {isLoading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={wt.accent} />
            ) : groups.length > 0 ? (
              <View style={styles.optionsBlock}>
                {groups.map((g) => (
                  <View key={g.id} style={styles.group}>
                    <Text style={styles.groupTitle}>
                      {g.name}
                      {g.required ? <Text style={styles.req}> *</Text> : null}
                    </Text>
                    <Text style={styles.groupSub}>
                      {g.max_select <= 1 ? '1 choix' : `Jusqu’à ${g.max_select} choix`}
                    </Text>
                    <View style={styles.chips}>
                      {g.product_options.map((o) => {
                        const picked = (sel[g.id] ?? []).includes(o.id);
                        const mod = Number(o.price_modifier);
                        const label = mod === 0 ? o.name : `${o.name} (+${mod.toFixed(2)} TND)`;
                        return (
                          <Pressable
                            key={o.id}
                            onPress={() => toggleOption(g, o.id)}
                            style={[styles.chip, picked && styles.chipOn]}
                          >
                            <Text style={[styles.chipText, picked && styles.chipTextOn]}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.modalEmpty}>Aucune option à personnaliser.</Text>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.modalTotalRow}>
              <Text style={styles.modalPriceLabel}>Total</Text>
              <Text style={styles.modalPrice}>{previewUnit.toFixed(2)} TND</Text>
            </View>
            <Pressable onPress={confirm} style={styles.modalAddBtn}>
              <Text style={styles.modalAddBtnText}>Ajouter au panier</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function HomeMenuScreen() {
  const categories = useCategories();
  const products = useProducts({ onlyAvailable: true });
  const requiredIds = useProductIdsWithRequiredOptions();
  const { addLine } = useCart();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [customizeProduct, setCustomizeProduct] = useState<ProductRow | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const c of categories.data ?? []) {
      map.set(c.id, []);
    }
    for (const p of products.data ?? []) {
      const arr = map.get(p.category_id);
      if (arr) arr.push(p);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [categories.data, products.data]);

  const categoriesWithProducts = useMemo(
    () => (categories.data ?? []).filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0),
    [categories.data, byCategory]
  );

  useEffect(() => {
    if (categoriesWithProducts.length === 0) {
      setActiveCategoryId(null);
      return;
    }
    const ok = activeCategoryId && categoriesWithProducts.some((c) => c.id === activeCategoryId);
    if (!ok) setActiveCategoryId(categoriesWithProducts[0].id);
  }, [categoriesWithProducts, activeCategoryId]);

  const requiredSet = requiredIds.data ?? null;

  const loading = categories.isLoading || products.isLoading || requiredIds.isLoading;
  const err = categories.error ?? products.error ?? requiredIds.error;

  const visibleProducts =
    activeCategoryId != null ? (byCategory.get(activeCategoryId) ?? []) : [];

  const categoryPickerItems = useMemo(
    () =>
      categoriesWithProducts.map((c) => ({
        id: c.id,
        name: c.name,
        itemCount: byCategory.get(c.id)?.length ?? 0,
      })),
    [categoriesWithProducts, byCategory]
  );

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={wt.accent} size="large" />
      ) : err ? (
        <Text style={styles.error}>{err instanceof Error ? err.message : 'Erreur de chargement'}</Text>
      ) : categoriesWithProducts.length === 0 ? (
        <Text style={styles.emptyMsg}>Aucun produit disponible pour le moment.</Text>
      ) : (
        <View style={styles.menuBody}>
          <MenuCategoryPicker
            items={categoryPickerItems}
            activeId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
          <FlatList
            data={visibleProducts}
            keyExtractor={(p) => p.id}
            style={styles.productList}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={categories.isRefetching || products.isRefetching || requiredIds.isRefetching}
                onRefresh={() => {
                  void categories.refetch();
                  void products.refetch();
                  void requiredIds.refetch();
                }}
                tintColor={wt.accent}
                colors={[wt.accent]}
              />
            }
            renderItem={({ item: p }) => {
              const canQuickAdd = requiredSet ? !requiredSet.has(p.id) : false;
              return (
                <MenuProductRow
                  product={p}
                  canQuickAdd={canQuickAdd}
                  onOpenCustomize={setCustomizeProduct}
                />
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyMsg}>Aucun produit dans cette catégorie.</Text>
            }
          />
        </View>
      )}
      <ProductCustomizeModal
        product={customizeProduct}
        onClose={() => setCustomizeProduct(null)}
        onConfirm={(choices, optionSummary, unitPrice) => {
          if (!customizeProduct) return;
          addLine({
            productId: customizeProduct.id,
            name: customizeProduct.name,
            unitPrice,
            quantity: 1,
            selectedOptions: choices,
            optionSummary,
            image_url: customizeProduct.image_url,
          });
          setCustomizeProduct(null);
        }}
      />
      <CartFloatingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: wt.bg },
  menuBody: { flex: 1 },
  productList: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 8 },
  productCard: { marginBottom: 10, padding: 12, overflow: 'hidden', gap: 10 },
  productRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  thumbWrap: { alignSelf: 'flex-start' },
  thumb: { width: 84, height: 84, borderRadius: 12, backgroundColor: wt.surfaceMuted },
  thumbPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: wt.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: { fontSize: 12, color: wt.textMuted, fontWeight: '600' },
  productInfo: { flex: 1, minWidth: 0, justifyContent: 'flex-start' },
  productName: { fontSize: 16, fontWeight: '700', color: wt.text },
  productDesc: { marginTop: 4, color: wt.textMuted, fontSize: 13, lineHeight: 18 },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  price: { fontSize: 15, fontWeight: '700', color: wt.accentLight, flexShrink: 1, marginRight: 8 },
  optionsHint: { marginTop: 4, fontSize: 11, color: wt.textSecondary, fontStyle: 'italic' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 999,
    backgroundColor: wt.surfaceMuted,
    padding: 4,
    gap: 6,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: {
    backgroundColor: wt.accent,
    borderColor: wt.accent,
  },
  stepBtnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  stepBtnPlusPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: 20, fontWeight: '700', color: wt.accentLight, lineHeight: 22 },
  stepBtnPlusText: { color: wt.bg },
  stepQtyBadge: {
    minWidth: 56,
    paddingHorizontal: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  stepQty: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: wt.text,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  modalSheet: {
    height: '70%',
    backgroundColor: wt.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: wt.borderStrong,
    marginTop: 8,
    marginBottom: 6,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: wt.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: wt.text, lineHeight: 22 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.border,
  },
  modalCloseIcon: { fontSize: 24, lineHeight: 26, color: wt.textSecondary, fontWeight: '700' },
  modalBody: { padding: 16, paddingBottom: 24 },
  modalHero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    backgroundColor: wt.surfaceMuted,
    marginBottom: 12,
  },
  modalHeroPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    backgroundColor: wt.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalHeroPlaceholderText: { fontSize: 12, color: wt.textMuted, fontWeight: '700' },
  modalDesc: { color: wt.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  modalEmpty: { color: wt.textMuted, marginTop: 8 },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: wt.border,
    gap: 10,
    backgroundColor: wt.bgElevated,
  },
  modalTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  modalPriceLabel: { fontSize: 13, color: wt.textSecondary, fontWeight: '700' },
  modalPrice: { fontSize: 22, fontWeight: '800', color: wt.accentLight },
  modalAddBtn: {
    backgroundColor: wt.accent,
    borderRadius: 14,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  modalAddBtnText: { color: wt.bg, fontWeight: '800', fontSize: 15 },
  optionsBlock: { marginTop: 8, gap: 16 },
  group: { gap: 8 },
  groupTitle: { fontSize: 16, fontWeight: '800', color: wt.text },
  req: { color: wt.errorStrong },
  groupSub: { fontSize: 12, color: wt.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: wt.border,
    backgroundColor: wt.surface,
  },
  chipOn: { borderColor: wt.accent, backgroundColor: wt.accentMuted },
  chipText: { fontSize: 14, fontWeight: '600', color: wt.textMuted },
  chipTextOn: { color: wt.accentLight },
  error: { padding: 24, color: wt.errorStrong },
  emptyMsg: { padding: 24, textAlign: 'center', color: wt.textMuted, fontSize: 15 },
});
