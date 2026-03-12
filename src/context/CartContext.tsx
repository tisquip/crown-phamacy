import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";

/** Shape of an enriched cart item from the Convex backend */
export interface ConvexCartItem {
  _cartItemId: string;
  quantity: number;
  product: {
    _id: Id<"products">;
    _creationTime: number;
    name: string;
    description: string;
    stockCode: string;
    retailPriceInUSDCents: number;
    promotionPriceInUSDCents?: number;
    bulkOfferPriceInUSDCents?: number;
    bulkOfferQty?: number;
    isMedicine: boolean;
    isPrescriptionControlled: boolean;
    inStock: boolean;
    storageIdsImages?: Array<Id<"_storage">>;
    brandId?: Id<"productBrand">;
    brandName: string | null;
    packSize?: string;
    [key: string]: unknown;
  };
}

/** Minimal product shape for local (non-auth) cart */
export interface LocalCartProduct {
  _id: string;
  name: string;
  retailPriceInUSDCents: number;
  promotionPriceInUSDCents?: number;
  storageIdsImages?: string[];
  brandName?: string | null;
  [key: string]: unknown;
}

export interface LocalCartItem {
  product: LocalCartProduct;
  quantity: number;
}

interface CartContextType {
  /** Cart items from Convex (empty array when not logged in or still loading) */
  items: ConvexCartItem[];
  /** Whether the cart data is still loading */
  isLoading: boolean;
  /** Manually re-fetch cart from Convex (e.g. after placeOrder clears it server-side) */
  refreshCart: () => Promise<void>;
  /** Add product to cart (Convex mutation) */
  addToCart: (productId: Id<"products">) => void;
  /** Add product to cart with an exact quantity — used by reorder (skips prescription-controlled for non-admins) */
  addToCartWithQuantity: (productId: Id<"products">, quantity: number) => void;
  /** Remove a product entirely from cart */
  removeFromCart: (productId: Id<"products">) => void;
  /** Update quantity of a product in cart */
  updateQuantity: (productId: Id<"products">, quantity: number) => void;
  /** Clear entire cart */
  clearCart: () => void;
  /** Total items count */
  totalItems: number;
  /** Total price in cents */
  totalPriceCents: number;
  /** Whether the user is logged in (cart requires auth) */
  isAuthenticated: boolean;
  // ── Local cart for non-authenticated users ───────────────────
  localItems: LocalCartItem[];
  addToLocalCart: (product: LocalCartProduct) => void;
  removeFromLocalCart: (productId: string) => void;
  updateLocalQuantity: (productId: string, quantity: number) => void;
  clearLocalCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useConvexAuth();
  const convex = useConvex();

  // ── Convex-backed cart (authenticated users) ─────────────────
  const [convexItems, setConvexItems] = useState<ConvexCartItem[]>([]);
  const [isLoadingState, setIsLoadingState] = useState(false);

  const refreshCart = useCallback(async () => {
    setIsLoadingState(true);
    try {
      const result = await convex.query(api.userFns.cart.getCart, {});
      setConvexItems(result as ConvexCartItem[]);
    } finally {
      setIsLoadingState(false);
    }
  }, [convex]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshCart();
    } else {
      setConvexItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const addMutation = useMutation(api.userFns.cart.addToCart);
  const addWithQtyMutation = useMutation(
    api.userFns.cart.addToCartWithQuantity,
  );
  const removeMutation = useMutation(api.userFns.cart.removeFromCart);
  const updateQtyMutation = useMutation(api.userFns.cart.updateQuantity);
  const clearMutation = useMutation(api.userFns.cart.clearCart);

  const addToCart = useCallback(
    (productId: Id<"products">) => {
      if (!isAuthenticated) return;
      void addMutation({ productId }).then(() => refreshCart());
    },
    [isAuthenticated, addMutation, refreshCart],
  );

  const addToCartWithQuantity = useCallback(
    (productId: Id<"products">, quantity: number) => {
      if (!isAuthenticated) return;
      void addWithQtyMutation({ productId, quantity }).then(() =>
        refreshCart(),
      );
    },
    [isAuthenticated, addWithQtyMutation, refreshCart],
  );

  const removeFromCart = useCallback(
    (productId: Id<"products">) => {
      if (!isAuthenticated) return;
      void removeMutation({ productId }).then(() => refreshCart());
    },
    [isAuthenticated, removeMutation, refreshCart],
  );

  const updateQuantity = useCallback(
    (productId: Id<"products">, quantity: number) => {
      if (!isAuthenticated) return;
      void updateQtyMutation({ productId, quantity }).then(() => refreshCart());
    },
    [isAuthenticated, updateQtyMutation, refreshCart],
  );

  const clearCart = useCallback(() => {
    if (!isAuthenticated) return;
    void clearMutation().then(() => refreshCart());
  }, [isAuthenticated, clearMutation, refreshCart]);

  // ── Local cart for non-authenticated browsing ────────────────
  const [localItems, setLocalItems] = useState<LocalCartItem[]>([]);

  const addToLocalCart = useCallback((product: LocalCartProduct) => {
    setLocalItems((prev) => {
      const existing = prev.find((i) => i.product._id === product._id);
      if (existing) {
        return prev.map((i) =>
          i.product._id === product._id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromLocalCart = useCallback((productId: string) => {
    setLocalItems((prev) => prev.filter((i) => i.product._id !== productId));
  }, []);

  const updateLocalQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setLocalItems((prev) =>
          prev.filter((i) => i.product._id !== productId),
        );
      } else {
        setLocalItems((prev) =>
          prev.map((i) =>
            i.product._id === productId ? { ...i, quantity } : i,
          ),
        );
      }
    },
    [],
  );

  const clearLocalCart = useCallback(() => setLocalItems([]), []);

  const localItemsTotal = localItems.reduce((sum, i) => sum + i.quantity, 0);
  const localTotalPrice = localItems.reduce((sum, i) => {
    const price =
      i.product.promotionPriceInUSDCents ?? i.product.retailPriceInUSDCents;
    return sum + price * i.quantity;
  }, 0);

  const totalItems = isAuthenticated
    ? convexItems.reduce((sum, i) => sum + i.quantity, 0)
    : localItemsTotal;
  const totalPriceCents = isAuthenticated
    ? convexItems.reduce((sum, i) => {
        const price =
          i.product.promotionPriceInUSDCents ?? i.product.retailPriceInUSDCents;
        return sum + price * i.quantity;
      }, 0)
    : localTotalPrice;

  return (
    <CartContext.Provider
      value={{
        items: convexItems,
        isLoading: isLoadingState,
        refreshCart,
        addToCart,
        addToCartWithQuantity,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPriceCents,
        isAuthenticated,
        localItems,
        addToLocalCart,
        removeFromLocalCart,
        updateLocalQuantity,
        clearLocalCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
