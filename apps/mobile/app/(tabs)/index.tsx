import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useCategories,
  useProducts,
  useProductIdsWithRequiredOptions,
  buildCartLineKey,
  validateLineOptionsAndPrice,
  type ProductRow,
} from '@wokthai/shared';
import { CartFloatingBar } from '../../components/CartFloatingBar';
import { MenuCategoryPicker } from '../../components/MenuCategoryPicker';
import { WtCard } from '../../components/WtCard';
import { useCart } from '../../contexts/CartContext';
import { wt } from '../../lib/theme';

function MenuProductRow({
  product: p,
  canQuickAdd,
}: {
  product: ProductRow;
  canQuickAdd: boolean;
}) {
  const router = useRouter();
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
    router.push(`/product/${p.id}`);
  }

  function increment() {
    if (!canQuickAdd) {
      goDetail();
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
      if (totalInCart > 0) router.push('/(tabs)/cart');
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
            style={[styles.stepBtn, minusDisabled && styles.stepBtnDisabled]}
            hitSlop={8}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <Text style={styles.stepQty}>{displayQty}</Text>
          <Pressable onPress={increment} style={styles.stepBtn} hitSlop={8}>
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
    </WtCard>
  );
}

export default function HomeMenuScreen() {
  const categories = useCategories();
  const products = useProducts({ onlyAvailable: true });
  const requiredIds = useProductIdsWithRequiredOptions();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

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
              return <MenuProductRow product={p} canQuickAdd={canQuickAdd} />;
            }}
            ListEmptyComponent={
              <Text style={styles.emptyMsg}>Aucun produit dans cette catégorie.</Text>
            }
          />
        </View>
      )}
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
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 999,
    backgroundColor: wt.surface,
  },
  stepBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: 18, fontWeight: '700', color: wt.accentLight, lineHeight: 20 },
  stepQty: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: wt.text,
  },
  error: { padding: 24, color: wt.errorStrong },
  emptyMsg: { padding: 24, textAlign: 'center', color: wt.textMuted, fontSize: 15 },
});
