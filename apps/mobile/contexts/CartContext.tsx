import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { CartLine } from '@wokthai/shared';
import { buildCartLineKey } from '@wokthai/shared';

type CartContextValue = {
  lines: CartLine[];
  addLine: (
    line: Omit<CartLine, 'quantity' | 'lineKey'> & { quantity?: number }
  ) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeLine: (lineKey: string) => void;
  clear: () => void;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function triggerCartHaptic(kind: 'add' | 'remove') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'add') {
      void Haptics.selectionAsync();
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Ignore haptics failures to keep cart actions reliable.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addLine = useCallback((line: Omit<CartLine, 'quantity' | 'lineKey'> & { quantity?: number }) => {
    const q = line.quantity ?? 1;
    const lineKey = buildCartLineKey(line.productId, line.selectedOptions);
    setLines((prev) => {
      const i = prev.findIndex((p) => p.lineKey === lineKey);
      if (i === -1) {
        return [
          ...prev,
          {
            ...line,
            lineKey,
            quantity: q,
            selectedOptions: line.selectedOptions ?? [],
            optionSummary: line.optionSummary,
          },
        ];
      }
      const next = [...prev];
      const cur = next[i];
      next[i] = { ...cur, quantity: cur.quantity + q };
      return next;
    });
    triggerCartHaptic('add');
  }, []);

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    setLines((prev) => {
      const current = prev.find((p) => p.lineKey === lineKey);
      if (!current) return prev;
      if (quantity <= 0) {
        triggerCartHaptic('remove');
        return prev.filter((p) => p.lineKey !== lineKey);
      }
      if (quantity < current.quantity) {
        triggerCartHaptic('remove');
      } else if (quantity > current.quantity) {
        triggerCartHaptic('add');
      }
      return prev.map((p) => (p.lineKey === lineKey ? { ...p, quantity } : p));
    });
  }, []);

  const removeLine = useCallback((lineKey: string) => {
    setLines((prev) => {
      const exists = prev.some((p) => p.lineKey === lineKey);
      if (exists) triggerCartHaptic('remove');
      return prev.filter((p) => p.lineKey !== lineKey);
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [lines]
  );

  const value = useMemo(
    () => ({ lines, addLine, setQuantity, removeLine, clear, subtotal }),
    [lines, addLine, setQuantity, removeLine, clear, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('CartProvider est requis');
  return ctx;
}
