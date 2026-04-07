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
            pressed && styles.pressed,
            busy && styles.btnDisabled,
          ]}
        >
          <Text style={styles.labelEdit}>Modifier</Text>
        </Pressable>

        <Text style={styles.separator}>•</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supprimer cette adresse"
          onPress={onDelete}
          disabled={busy}
          style={({ pressed }) => [
            styles.btn,
            pressed && styles.pressed,
            busy && styles.btnDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={wt.error} size="small" />
          ) : (
            <Text style={styles.labelDelete}>Supprimer</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    paddingTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  btn: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    paddingHorizontal: 1,
  },
  pressed: {
    opacity: 0.84,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  labelEdit: {
    fontSize: 12,
    fontWeight: '600',
    color: wt.accentLight,
  },
  separator: {
    fontSize: 10,
    color: wt.textSecondary,
    marginTop: -1,
  },
  labelDelete: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fda4af',
  },
});
