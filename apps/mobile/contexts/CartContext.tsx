import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  }, []);

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((p) => p.lineKey !== lineKey);
      return prev.map((p) => (p.lineKey === lineKey ? { ...p, quantity } : p));
    });
  }, []);

  const removeLine = useCallback((lineKey: string) => {
    setLines((prev) => prev.filter((p) => p.lineKey !== lineKey));
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
