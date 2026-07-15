import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/integrations/supabase/db-types";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  stock: number;
};

type CartContextValue = {
  merchantId: string | null;
  items: CartItem[];
  totalCount: number;
  subtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setMerchantId: (id: string | null) => void;
  addItem: (product: Product, qty?: number) => { ok: boolean; message?: string };
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(merchantId: string) {
  return `store-cart:${merchantId}`;
}

function productImage(product: Product): string | null {
  if (product.images?.length) return product.images[0];
  return product.image_url || null;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [merchantId, setMerchantIdState] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const setMerchantId = useCallback((id: string | null) => {
    setMerchantIdState(id);
  }, []);

  useEffect(() => {
    if (!merchantId) {
      setItems([]);
      setHydrated(true);
      return;
    }
    setHydrated(false);
    try {
      const raw = localStorage.getItem(storageKey(merchantId));
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (i) =>
                i &&
                typeof i.productId === "string" &&
                typeof i.quantity === "number" &&
                i.quantity > 0,
            ),
          );
        } else setItems([]);
      } else setItems([]);
    } catch {
      setItems([]);
    }
    setHydrated(true);
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId || !hydrated) return;
    localStorage.setItem(storageKey(merchantId), JSON.stringify(items));
  }, [items, merchantId, hydrated]);

  const addItem = useCallback((product: Product, qty = 1) => {
    const stock = product.stock_quantity ?? 0;
    if (stock <= 0) return { ok: false, message: "غير متوفر" };
    const addQty = Math.max(1, Math.floor(qty));

    let result: { ok: boolean; message?: string } = { ok: true };
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      const currentQty = existing?.quantity ?? 0;
      const nextQty = currentQty + addQty;
      if (nextQty > stock) {
        result = { ok: false, message: `المتوفر ${stock} قطعة فقط` };
        if (currentQty >= stock) return prev;
        // cap at stock
        const capped = stock;
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: capped, stock } : i,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: Number(product.price),
            imageUrl: productImage(product),
            quantity: capped,
            stock,
          },
        ];
      }
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: nextQty, stock, price: Number(product.price), name: product.name }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          imageUrl: productImage(product),
          quantity: addQty,
          stock,
        },
      ];
    });
    return result;
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const q = Math.max(0, Math.min(i.stock, Math.floor(quantity)));
          return { ...i, quantity: q };
        })
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      merchantId,
      items,
      totalCount,
      subtotal,
      cartOpen,
      setCartOpen,
      setMerchantId,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [
      merchantId,
      items,
      totalCount,
      subtotal,
      cartOpen,
      setMerchantId,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
