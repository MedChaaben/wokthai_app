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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useCategories,
  useProducts,
  useSupabase,
  useProductIdsWithRequiredOptions,
  buildCartLineKey,
  validateLineOptionsAndPrice,
  type ProductRow,
} from '@wokthai/shared';
import { WtCard } from '../components/WtCard';
import { useCart } from '../contexts/CartContext';

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
    });
  }

  function decrement() {
    if (!canQuickAdd) {
      if (totalInCart > 0) router.push('/cart');
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
          {p.description ? (
            <Text style={styles.productDesc} numberOfLines={2}>
              {p.description}
            </Text>
          ) : null}
          <Text style={styles.price}>{base.toFixed(2)} TND</Text>
          {!canQuickAdd ? (
            <Text style={styles.optionsHint}>Options sur la fiche produit</Text>
          ) : null}
        </Pressable>
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

export default function MenuScreen() {
  const router = useRouter();
  const supabase = useSupabase();
  const { subtotal, lines } = useCart();
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

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarMain}>
          <Pressable onPress={() => router.push('/cart')} style={styles.toolbarBtn}>
            <Text style={styles.toolbarText}>Panier ({lines.length})</Text>
            {subtotal > 0 ? <Text style={styles.toolbarSub}>{subtotal.toFixed(2)} TND</Text> : null}
          </Pressable>
          <Pressable onPress={() => router.push('/orders')} style={styles.ordersBtn}>
            <Text style={styles.ordersBtnText}>Mes commandes</Text>
          </Pressable>
        </View>
        <Pressable onPress={signOut} accessibilityRole="button">
          <Text style={styles.signOut}>Déconnexion</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#ea580c" size="large" />
      ) : err ? (
        <Text style={styles.error}>{err instanceof Error ? err.message : 'Erreur de chargement'}</Text>
      ) : categoriesWithProducts.length === 0 ? (
        <Text style={styles.emptyMsg}>Aucun produit disponible pour le moment.</Text>
      ) : (
        <View style={styles.menuBody}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarInner}
            style={styles.tabBar}
          >
            {categoriesWithProducts.map((c) => {
              const count = byCategory.get(c.id)?.length ?? 0;
              const active = c.id === activeCategoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setActiveCategoryId(c.id)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[styles.tabCount, active && styles.tabCountActive]}>({count})</Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fafaf9' },
  menuBody: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    backgroundColor: '#fff',
  },
  toolbarMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarBtn: { flexShrink: 1 },
  ordersBtn: { paddingVertical: 4 },
  ordersBtnText: { fontWeight: '700', color: '#ea580c', fontSize: 14 },
  toolbarText: { fontWeight: '700', color: '#1c1917', fontSize: 15 },
  toolbarSub: { color: '#78716c', marginTop: 2, fontSize: 13 },
  signOut: { color: '#ea580c', fontWeight: '600', fontSize: 14 },
  tabBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    backgroundColor: '#fff',
  },
  tabBarInner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f5f5f4',
  },
  tabActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tabText: { fontSize: 14, fontWeight: '700', color: '#57534e', maxWidth: 140 },
  tabTextActive: { color: '#c2410c' },
  tabCount: { fontSize: 12, fontWeight: '600', color: '#78716c' },
  tabCountActive: { color: '#ea580c' },
  productList: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 8 },
  productCard: { marginBottom: 10, padding: 12, overflow: 'hidden' },
  productRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  thumbWrap: { alignSelf: 'flex-start' },
  thumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#f5f5f4' },
  thumbPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: { fontSize: 12, color: '#a8a29e', fontWeight: '600' },
  productInfo: { flex: 1, minWidth: 0, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: '700', color: '#1c1917' },
  productDesc: { marginTop: 4, color: '#57534e', fontSize: 13 },
  price: { marginTop: 6, fontSize: 15, fontWeight: '700', color: '#ea580c' },
  optionsHint: { marginTop: 4, fontSize: 11, color: '#a8a29e', fontStyle: 'italic' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  stepBtn: {
    minWidth: 40,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: 20, fontWeight: '700', color: '#ea580c', lineHeight: 24 },
  stepQty: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1917',
  },
  error: { padding: 24, color: '#b91c1c' },
  emptyMsg: { padding: 24, textAlign: 'center', color: '#78716c', fontSize: 15 },
});
