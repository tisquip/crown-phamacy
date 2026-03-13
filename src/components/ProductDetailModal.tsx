import { useConvex } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { StorageImage } from "@/components/StorageImage";
import { formatPrice } from "@/lib/formatPrice";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Heart,
  Truck,
  MapPin,
  Loader2,
  Pill,
  Tag,
  Package,
  Share2,
  ExternalLink,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FunctionReturnType } from "convex/server";

type ProductDetail = FunctionReturnType<typeof api.userFns.products.getById>;

interface ProductDetailModalProps {
  productId: Id<"products"> | null;
  onClose: () => void;
}

export function ProductDetailModal({
  productId,
  onClose,
}: ProductDetailModalProps) {
  const convex = useConvex();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, isAuthenticated } = useCart();
  const { isLoggedIn, isInWishlist, addToWishlist, removeFromWishlist } =
    useAuth();

  useEffect(() => {
    if (!productId) {
      setProduct(undefined);
      setQuantity(1);
      return;
    }
    setProduct(undefined);
    setQuantity(1);
    let cancelled = false;
    convex.query(api.userFns.products.getById, { productId }).then((result) => {
      if (!cancelled) setProduct(result);
    });
    return () => {
      cancelled = true;
    };
  }, [convex, productId]);

  const isOpen = productId !== null;

  const handleAddToCart = () => {
    if (!product) return;
    if (!isAuthenticated) {
      onClose();
      void navigate({ to: "/Login" });
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addToCart(product._id as Id<"products">);
    }
    toast({
      title: "Added to basket",
      description: `${quantity}× ${product.name} added to your basket.`,
    });
  };

  const handleWishlist = () => {
    if (!product) return;
    if (!isLoggedIn) {
      onClose();
      void navigate({ to: "/Login" });
      return;
    }
    const wishlisted = isInWishlist(product._id as Id<"products">);
    if (wishlisted) {
      removeFromWishlist(product._id as Id<"products">);
      toast({
        title: "Removed from wishlist",
        description: `${product.name} removed from your wishlist.`,
      });
    } else {
      addToWishlist(product._id as Id<"products">);
      toast({
        title: "Added to wishlist",
        description: `${product.name} added to your wishlist.`,
      });
    }
  };

  const handleShare = () => {
    if (!product) return;
    const url = `${window.location.origin}/Product/${product._id}`;
    if (navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Product link copied to clipboard.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          // Mobile: full-screen sheet from bottom
          "fixed inset-x-0 bottom-0 top-auto translate-x-0 translate-y-0 left-0 w-full rounded-t-2xl max-h-[92dvh] overflow-y-auto p-0",
          // Desktop: centered dialog
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl sm:rounded-xl sm:max-h-[90vh]",
          // Remove default gap
          "gap-0",
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Close button */}
        <DialogClose className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground hover:text-foreground shadow-sm">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        {product === undefined ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading product…</p>
          </div>
        ) : product === null ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Product not found.</p>
          </div>
        ) : (
          <ProductModalContent
            product={product}
            quantity={quantity}
            setQuantity={setQuantity}
            onAddToCart={handleAddToCart}
            onWishlist={handleWishlist}
            onShare={handleShare}
            onClose={onClose}
            isLoggedIn={isLoggedIn}
            isWishlisted={
              isLoggedIn && isInWishlist(product._id as Id<"products">)
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Inner content extracted to keep render readable ──────────────────────────

interface ContentProps {
  product: NonNullable<ProductDetail>;
  quantity: number;
  setQuantity: (q: number) => void;
  onAddToCart: () => void;
  onWishlist: () => void;
  onShare: () => void;
  onClose: () => void;
  isLoggedIn: boolean;
  isWishlisted: boolean;
}

function ProductModalContent({
  product,
  quantity,
  setQuantity,
  onAddToCart,
  onWishlist,
  onShare,
  onClose,
  isLoggedIn,
  isWishlisted,
}: ContentProps) {
  const displayPrice =
    product.promotionPriceInUSDCents ?? product.retailPriceInUSDCents;
  const hasPromo = product.promotionPriceInUSDCents != null;
  const promoPercent = hasPromo
    ? Math.round(
        ((product.retailPriceInUSDCents - product.promotionPriceInUSDCents!) /
          product.retailPriceInUSDCents) *
          100,
      )
    : 0;

  const firstImageId =
    product.storageIdsImages && product.storageIdsImages.length > 0
      ? product.storageIdsImages[0]
      : null;
  const firstCdnUrl =
    product.cdnImages && product.cdnImages.length > 0
      ? product.cdnImages[0].url
      : null;

  return (
    <div className="flex flex-col sm:flex-row overflow-hidden">
      {/* ── Image panel ── */}
      <div className="relative bg-white sm:w-72 sm:shrink-0 flex items-center justify-center p-6 sm:p-8 border-b sm:border-b-0 sm:border-r border-border">
        {hasPromo && <span className="sale-badge z-10">-{promoPercent}%</span>}
        {!product.inStock && (
          <span className="absolute top-3 left-3 z-10 bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
            Out of Stock
          </span>
        )}
        <StorageImage
          storageId={firstImageId}
          cdnUrl={firstCdnUrl}
          alt={product.name}
          className={cn(
            "w-40 h-40 sm:w-52 sm:h-52 object-contain",
            !product.inStock && "grayscale opacity-75",
          )}
        />
      </div>

      {/* ── Info panel ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {/* Brand + Name */}
        {product.brandName && (
          <p className="text-xs font-bold text-primary">{product.brandName}</p>
        )}
        <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
          {product.name}
        </h2>

        {/* Action row: share / wishlist / full page */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <button
            onClick={onShare}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          {isLoggedIn && (
            <button
              onClick={onWishlist}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Heart
                className={cn(
                  "w-3.5 h-3.5",
                  isWishlisted ? "fill-price text-price" : "",
                )}
              />
              {isWishlisted ? "In wishlist" : "Add to favourites"}
            </button>
          )}
          <Link
            to="/Product/$id"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            params={{ id: product._id } as any}
            onClick={onClose}
            className="flex items-center gap-1 hover:text-foreground ml-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Full page
          </Link>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {product.isMedicine && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 text-xs"
            >
              <Pill className="w-3 h-3" /> Medicine
            </Badge>
          )}
          {product.isPrescriptionControlled && (
            <Badge variant="outline" className="text-xs">
              Rx Required
            </Badge>
          )}
          {product.stockCode && (
            <Badge variant="outline" className="font-mono text-[10px]">
              <Tag className="w-3 h-3 mr-1" /> {product.stockCode}
            </Badge>
          )}
          {product.packSize && (
            <Badge variant="outline" className="text-xs">
              <Package className="w-3 h-3 mr-1" /> {product.packSize}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {product.description}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="price-text text-xl">
            {formatPrice(displayPrice)}
          </span>
          {hasPromo && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.retailPriceInUSDCents)}
              </span>
              <span className="text-sm text-promotion font-semibold">
                -{promoPercent}% Off
              </span>
            </>
          )}
        </div>

        {/* Bulk offer */}
        {product.bulkOfferPriceInUSDCents && product.bulkOfferQty && (
          <p className="text-xs text-promotion font-medium">
            Buy {product.bulkOfferQty}+ for{" "}
            {formatPrice(product.bulkOfferPriceInUSDCents)} each
          </p>
        )}

        {/* Stock status */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`w-2 h-2 rounded-full ${product.inStock ? "bg-accent" : "bg-destructive"}`}
          />
          <span
            className={product.inStock ? "text-accent" : "text-destructive"}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        {/* Delivery info */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              <strong>Branch pick-up</strong> – Collect at any Crown Pharmacy
              branch
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              <strong>Delivery</strong> – We deliver across Zimbabwe
            </span>
          </div>
        </div>

        {/* Quantity + CTA */}
        {!product.isPrescriptionControlled && (
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center border border-border rounded">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={!product.inStock}
                className="px-3 py-1.5 text-foreground hover:bg-muted disabled:opacity-40"
              >
                -
              </button>
              <span className="px-4 py-1.5 text-sm font-medium text-foreground border-x border-border select-none">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                disabled={!product.inStock}
                className="px-3 py-1.5 text-foreground hover:bg-muted disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              onClick={onAddToCart}
              disabled={!product.inStock}
              className={cn(
                "flex-1 py-2 rounded font-semibold text-sm transition-opacity",
                product.inStock
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60",
              )}
            >
              {product.inStock ? "Add to basket" : "Out of Stock"}
            </button>
          </div>
        )}

        {product.isPrescriptionControlled && (
          <div className="w-full bg-muted text-muted-foreground py-2.5 rounded font-semibold text-center text-sm">
            Prescription required — speak to our pharmacist
          </div>
        )}

        {/* Detailed description */}
        {product.detailedDescription && (
          <div className="border-t border-border pt-3 mt-1">
            <p className="text-xs font-semibold text-foreground mb-1">
              Product Details
            </p>
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
              {product.detailedDescription}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
