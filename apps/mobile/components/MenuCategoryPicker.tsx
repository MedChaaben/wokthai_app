import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wt } from '../lib/theme';

export type MenuCategoryPickerItem = {
  id: string;
  name: string;
};

type MenuCategoryPickerProps = {
  items: MenuCategoryPickerItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function MenuCategoryPicker({ items, activeId, onSelect }: MenuCategoryPickerProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const active = useMemo(
    () => items.find((c) => c.id === activeId) ?? items[0],
    [items, activeId]
  );

  const close = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect]
  );

  if (!active) return null;

  const sheetMaxH = Math.round(Dimensions.get('window').height * 0.72);
  /** Espace réservé au titre + sous-titre + marges de la feuille (liste scrollable en dessous). */
  const sheetHeaderBlockH = 118;

  const openerLabel =
    items.length > 1
      ? `${active.name}. Appuyez pour ouvrir la liste des catégories.`
      : `${active.name}.`;

  const categoriesCountLabel =
    items.length > 1 ? `${items.length} catégories disponibles` : '1 catégorie disponible';

  const barContent = (
    <>
      <View style={styles.barTextBlock}>
        <View style={styles.barTitleRow}>
          <Text style={styles.barTitle} numberOfLines={1}>
            {active.name}
          </Text>
          {items.length > 1 ? (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{items.length}</Text>
            </View>
          ) : null}
        </View>
        {items.length > 1 ? (
          <Text style={styles.barHint} numberOfLines={2}>
            Touchez pour voir les autres catégories du menu
          </Text>
        ) : null}
      </View>
      {items.length > 1 ? (
        <View style={styles.barChevronWrap}>
          <Ionicons name="chevron-down" size={22} color={wt.accentLight} accessibilityElementsHidden />
        </View>
      ) : null}
    </>
  );

  return (
    <>
      <View style={styles.bar} accessibilityElementsHidden={open}>
        {items.length > 1 ? (
          <Pressable
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.barPressable, pressed && styles.barPressablePressed]}
            accessibilityRole="button"
            accessibilityLabel={openerLabel}
            accessibilityHint="Ouvre la liste complète des catégories"
            accessibilityValue={{ text: categoriesCountLabel }}
          >
            {barContent}
          </Pressable>
        ) : (
          <View style={styles.barPressable} accessibilityRole="header" accessibilityLabel={openerLabel}>
            {barContent}
          </View>
        )}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        accessibilityViewIsModal
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          />
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                maxHeight: sheetMaxH,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Catégories</Text>
              <Pressable
                onPress={close}
                hitSlop={12}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Fermer la liste des catégories"
              >
                <Ionicons name="close" size={26} color={wt.text} />
              </Pressable>
            </View>
            <Text style={styles.sheetSubtitle}>Toutes les catégories</Text>
            <FlatList
              data={items}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              style={[styles.list, { maxHeight: Math.max(sheetMaxH - sheetHeaderBlockH, 200) }]}
              contentContainerStyle={styles.listContent}
              renderItem={({ item: c }) => {
                const selected = c.id === activeId;
                return (
                  <Pressable
                    onPress={() => handleSelect(c.id)}
                    style={({ pressed }) => [
                      styles.row,
                      selected && styles.rowSelected,
                      pressed && styles.rowPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={c.name}
                  >
                    <View style={styles.rowMain}>
                      <Text style={[styles.rowTitle, selected && styles.rowTitleSelected]} numberOfLines={2}>
                        {c.name}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={24} color={wt.accentLight} />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={wt.textMuted} />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: wt.border,
    backgroundColor: wt.bgElevated,
  },
  barPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minHeight: 48,
  },
  barPressablePressed: {
    backgroundColor: wt.surfaceMuted,
  },
  barTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  barTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
    color: wt.text,
    letterSpacing: -0.2,
  },
  countPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wt.accentMuted,
    borderWidth: 1,
    borderColor: wt.accentBorder,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: wt.accentLight,
  },
  barHint: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
    color: wt.textMuted,
  },
  barChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.accentBorder,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: wt.bgElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: wt.border,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: wt.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
  },
  closeBtnPressed: {
    backgroundColor: wt.surfaceMuted,
  },
  sheetSubtitle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
    color: wt.textMuted,
    fontWeight: '500',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: wt.surface,
    borderWidth: 1,
    borderColor: wt.border,
    gap: 12,
    minHeight: 52,
  },
  rowSelected: {
    backgroundColor: wt.accentMuted,
    borderColor: wt.accentBorder,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wt.text,
  },
  rowTitleSelected: {
    color: wt.accentLight,
  },
});
