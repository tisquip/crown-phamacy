import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Star, Heart } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "@tanstack/react-router";
import { StorageImage } from "./StorageImage";
import { Doc, Id } from "../../convex/_generated/dataModel";

type ConvexProduct = Doc<"products"> & {
  brandName?: string | null;
};

interface ProductCardProps {
  product: ConvexProduct;
  compact?: boolean;
  onQuickView?: (id: Id<"products">) => void;
}

const ProductCard = ({
  product,
  compact = false,
  onQuickView,
}: ProductCardProps) => {
  const { addToCart, isAuthenticated } = useCart();
  const { isLoggedIn, isInWishlist, addToWishlist, removeFromWishlist } =
    useAuth();
  const navigate = useNavigate();
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
  const wishlisted = isLoggedIn && isInWishlist(product._id as Id<"products">);
  const firstImageId =
    product.storageIdsImages && product.storageIdsImages.length > 0
      ? product.storageIdsImages[0]
      : null;
  const firstCdnUrl =
    product.cdnImages && product.cdnImages.length > 0
      ? product.cdnImages[0].url
      : null;

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate({ to: "/Login" });
      return;
    }
    addToCart(product._id as Id<"products">);
    toast({
      title: "Added to basket",
      description: `${product.name} has been added to your basket.`,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      navigate({ to: "/Login" });
      return;
    }
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

  const imageArea = onQuickView ? (
    <button
      onClick={() => onQuickView(product._id as Id<"products">)}
      className="relative p-4 flex items-center justify-center w-full"
      aria-label={`Quick view ${product.name}`}
    >
      {hasPromo && <span className="sale-badge z-10">-{promoPercent}%</span>}
      <StorageImage
        storageId={firstImageId}
        cdnUrl={firstCdnUrl}
        alt={product.name}
        className="w-full h-48 object-contain group-hover:scale-105 transition-transform"
      />
      <span
        role="button"
        tabIndex={-1}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(e) => {
          e.stopPropagation();
          handleWishlist(e);
        }}
        className="absolute top-2 right-2 z-10"
      >
        <Heart
          className={`w-4 h-4 ${wishlisted ? "fill-price text-price" : "text-muted-foreground hover:text-price"}`}
        />
      </span>
    </button>
  ) : (
    <Link
      to={`/product/${product._id}`}
      className="relative p-4 flex items-center justify-center"
    >
      {hasPromo && <span className="sale-badge z-10">-{promoPercent}%</span>}
      <StorageImage
        storageId={firstImageId}
        cdnUrl={firstCdnUrl}
        alt={product.name}
        className="w-full h-48 object-contain group-hover:scale-105 transition-transform"
      />
      <button
        onClick={handleWishlist}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute top-2 right-2 z-10"
      >
        <Heart
          className={`w-4 h-4 ${wishlisted ? "fill-price text-price" : "text-muted-foreground hover:text-price"}`}
        />
      </button>
    </Link>
  );

  const nameArea = onQuickView ? (
    <button
      onClick={() => onQuickView(product._id as Id<"products">)}
      aria-label={`View details for ${product.name}`}
      className="text-left"
    >
      <p className="text-xs font-bold text-foreground line-clamp-2 mb-0.5">
        {product.name}
      </p>
      {product.brandName && (
        <p className="text-[10px] text-muted-foreground mb-1">
          {product.brandName}
        </p>
      )}
    </button>
  ) : (
    <Link to={`/product/${product._id}`}>
      <p className="text-xs font-bold text-foreground line-clamp-2 mb-0.5">
        {product.name}
      </p>
      {product.brandName && (
        <p className="text-[10px] text-muted-foreground mb-1">
          {product.brandName}
        </p>
      )}
    </Link>
  );

  return (
    <div className="bg-card rounded border border-border flex flex-col h-full group hover:shadow-md transition-shadow">
      {imageArea}

      <div className="px-3 pb-3 flex flex-col flex-1">
        {nameArea}

        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="price-text text-sm">
              {formatPrice(displayPrice)}
            </span>
            {hasPromo && (
              <span className="text-[10px] text-muted-foreground line-through">
                {formatPrice(product.retailPriceInUSDCents)}
              </span>
            )}
          </div>
          {hasPromo && (
            <span className="text-[10px] text-promotion font-medium">
              -{promoPercent}% Off
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          className="mt-2 w-full bg-primary text-primary-foreground text-xs py-1.5 rounded hover:opacity-90 transition-opacity font-medium"
        >
          Add to basket
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
