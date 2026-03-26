import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  useProduct,
  useProductOptionGroups,
  validateLineOptionsAndPrice,
  sumSelectedModifiersPreview,
  buildCartLineKey,
  type OptionGroupWithOptions,
  type OrderLineOptionChoice,
} from '@wokthai/shared';
import { WtButton } from '../../components/WtButton';
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

function choicesToSel(choices: OrderLineOptionChoice[]): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const c of choices) {
    const cur = m[c.groupId] ?? [];
    cur.push(c.optionId);
    m[c.groupId] = cur;
  }
  return m;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useProduct(id);
  const { data: groups = [], isLoading: optLoading } = useProductOptionGroups(id);
  const { lines, addLine, setQuantity } = useCart();
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [seededFromCart, setSeededFromCart] = useState(false);

  const base = data ? Number(data.price) : 0;

  const choices = useMemo(() => buildChoices(groups, sel), [groups, sel]);

  const lineKey = useMemo(
    () => (id ? buildCartLineKey(id, choices) : ''),
    [id, choices]
  );

  const cartQty = useMemo(
    () => (lineKey ? (lines.find((l) => l.lineKey === lineKey)?.quantity ?? 0) : 0),
    [lines, lineKey]
  );

  const previewExtra = useMemo(
    () => (groups.length ? sumSelectedModifiersPreview(groups, choices) : 0),
    [groups, choices]
  );

  const previewUnit = base + previewExtra;
  const lineSubtotal = previewUnit * cartQty;

  useEffect(() => {
    if (seededFromCart || !id || optLoading) return;
    const firstLine = lines.find((l) => l.productId === id);
    if (firstLine && firstLine.selectedOptions.length > 0) {
      setSel(choicesToSel(firstLine.selectedOptions));
    }
    setSeededFromCart(true);
  }, [id, lines, seededFromCart, optLoading]);

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

  function increment() {
    if (!data) return;
    try {
      const { unitPrice, snapshots } = validateLineOptionsAndPrice(base, groups, choices);
      addLine({
        productId: data.id,
        name: data.name,
        unitPrice,
        quantity: 1,
        selectedOptions: choices,
        optionSummary: snapshots.map((s) => s.option_name),
      });
    } catch (e: unknown) {
      Alert.alert('Options', e instanceof Error ? e.message : 'Sélection invalide');
    }
  }

  function decrement() {
    if (cartQty <= 0 || !lineKey) return;
    setQuantity(lineKey, cartQty - 1);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={wt.accent} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Produit introuvable</Text>
        <WtButton title="Retour au menu" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const product = data;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.heroWrap}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.heroImg} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderText}>Pas d’image</Text>
          </View>
        )}
      </View>

      <WtCard>
        <Text style={styles.name}>{product.name}</Text>
        {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
        <Text style={styles.price}>
          {previewUnit.toFixed(2)} TND <Text style={styles.priceHint}>/ unité</Text>
        </Text>
        {groups.length > 0 && previewExtra !== 0 ? (
          <Text style={styles.breakdown}>
            Base {base.toFixed(2)} + options {previewExtra >= 0 ? '+' : ''}
            {previewExtra.toFixed(2)}
          </Text>
        ) : null}

        {optLoading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={wt.accent} />
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
                    const label =
                      mod === 0 ? o.name : `${o.name} (+${mod.toFixed(2)} TND)`;
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
        ) : null}

        <Text style={styles.label}>Quantité dans le panier</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={decrement}
            disabled={cartQty <= 0}
            style={[styles.stepBtn, cartQty <= 0 && styles.stepBtnDisabled]}
            hitSlop={8}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <Text style={styles.stepQty}>{cartQty}</Text>
          <Pressable onPress={increment} style={styles.stepBtn} hitSlop={8}>
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.subtotalLabel}>
          Sous-total (cette ligne) :{' '}
          <Text style={styles.subtotalValue}>{lineSubtotal.toFixed(2)} TND</Text>
        </Text>
      </WtCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, backgroundColor: wt.bg },
  heroWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: wt.surfaceMuted,
  },
  heroImg: { width: '100%', height: '100%' },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  heroPlaceholderText: { fontSize: 14, color: wt.textMuted, fontWeight: '600' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: wt.bg,
  },
  errorTitle: { fontSize: 16, fontWeight: '600', color: wt.text },
  muted: { color: wt.textMuted },
  name: { fontSize: 22, fontWeight: '800', color: wt.text },
  desc: { marginTop: 8, fontSize: 15, color: wt.textMuted, lineHeight: 22 },
  price: { marginTop: 12, fontSize: 20, fontWeight: '800', color: wt.accentLight },
  priceHint: { fontSize: 14, fontWeight: '600', color: wt.textMuted },
  breakdown: { marginTop: 4, fontSize: 13, color: wt.textMuted },
  label: { marginTop: 20, fontWeight: '600', color: wt.text },
  stepper: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: wt.border,
    borderRadius: 10,
    backgroundColor: wt.surface,
  },
  stepBtn: {
    minWidth: 44,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: 20, fontWeight: '700', color: wt.accentLight, lineHeight: 24 },
  stepQty: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: wt.text,
  },
  subtotalLabel: { marginTop: 12, fontSize: 15, color: wt.textMuted },
  subtotalValue: { fontWeight: '800', color: wt.text },
  optionsBlock: { marginTop: 20, gap: 16 },
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
});
