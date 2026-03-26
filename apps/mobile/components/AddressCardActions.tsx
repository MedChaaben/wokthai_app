import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { wt } from '../lib/theme';

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  deleteLoading?: boolean;
};

/**
 * Barre d’actions type « liste iOS / Material » : deux zones tactiles égales, séparateur au-dessus.
 */
export function AddressCardActions({ onEdit, onDelete, deleteLoading }: Props) {
  const busy = !!deleteLoading;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modifier cette adresse"
          onPress={onEdit}
          disabled={busy}
          style={({ pressed }) => [
            styles.btn,
            styles.btnEdit,
            pressed && styles.pressed,
            busy && styles.btnDisabled,
          ]}
        >
          <Text style={styles.glyphEdit} accessibilityElementsHidden>
            ✎
          </Text>
          <Text style={styles.labelEdit}>Modifier</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supprimer cette adresse"
          onPress={onDelete}
          disabled={busy}
          style={({ pressed }) => [
            styles.btn,
            styles.btnDelete,
            pressed && styles.pressed,
            busy && styles.btnDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={wt.error} size="small" />
          ) : (
            <>
              <Text style={styles.glyphDelete} accessibilityElementsHidden>
                ✕
              </Text>
              <Text style={styles.labelDelete}>Supprimer</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: wt.border,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnEdit: {
    backgroundColor: wt.surfaceMuted,
    borderColor: wt.borderStrong,
  },
  btnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  pressed: {
    opacity: 0.78,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  glyphEdit: {
    fontSize: 15,
    color: wt.accentLight,
    fontWeight: '600',
    marginTop: -1,
  },
  labelEdit: {
    fontSize: 14,
    fontWeight: '600',
    color: wt.text,
    letterSpacing: 0.2,
  },
  glyphDelete: {
    fontSize: 13,
    fontWeight: '500',
    color: wt.error,
    opacity: 0.95,
    marginTop: 0,
  },
  labelDelete: {
    fontSize: 14,
    fontWeight: '600',
    color: wt.error,
    letterSpacing: 0.2,
  },
});
