import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "@/hooks/use-toast";
import {
  Share2,
  Heart,
  Truck,
  MapPin,
  Loader2,
  Pill,
  Tag,
  Package,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StorageImage } from "@/components/StorageImage";
import { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import type { FunctionReturnType } from "convex/server";

export const Route = createFileRoute("/Product/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const convex = useConvex();
  const [product, setProduct] = useState<
    FunctionReturnType<typeof api.userFns.products.getById> | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex
      .query(api.userFns.products.getById, {
        productId: id as Id<"products">,
      })
      .then((result) => {
        if (!cancelled) setProduct(result);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const { addToCart, isAuthenticated } = useCart();
  const { isLoggedIn, isInWishlist, addToWishlist, removeFromWishlist } =
    useAuth();
  const [quantity, setQuantity] = useState(1);

  if (product === undefined) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </Layout>
    );
  }

  if (product === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Product not found
          </h1>
          <Link
            to="/products"
            className="text-primary hover:underline mt-4 inline-block"
          >
            Back to products
          </Link>
        </div>
      </Layout>
    );
  }

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
  const wishlisted = isLoggedIn && isInWishlist(product._id as Id<"products">);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your basket.",
      });
      return;
    }
    // Add the requested quantity
    for (let i = 0; i < quantity; i++) addToCart(product._id as Id<"products">);
    toast({
      title: "Added to basket",
      description: `${quantity}x ${product.name} added to your basket.`,
    });
  };

  const handleWishlist = () => {
    if (!isLoggedIn) return;
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

  return (
    <Layout>
      <div className="bg-secondary py-2">
        <div className="container mx-auto px-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>{" "}
          &gt;{" "}
          <Link to="/products" className="hover:text-primary">
            Products
          </Link>{" "}
          &gt;{" "}
          <span className="text-foreground">
            {product.brandName ?? product.name}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative">
            {hasPromo && (
              <span className="sale-badge z-10">-{promoPercent}%</span>
            )}
            <div className="bg-white rounded-lg p-8 flex items-center justify-center border border-primary">
              <StorageImage
                storageId={firstImageId}
                cdnUrl={firstCdnUrl}
                alt={product.name}
                className="max-h-72 object-contain"
              />
            </div>
          </div>

          <div>
            {product.brandName && (
              <p className="text-sm text-primary font-bold">
                {product.brandName}
              </p>
            )}
            <h1 className="text-xl font-bold text-foreground mb-2">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator
                      .share({ title: product.name, url })
                      .catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                    toast({
                      title: "Link copied",
                      description: "Product link copied to clipboard.",
                    });
                  }
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" /> Share
              </button>
              {isLoggedIn && (
                <button
                  onClick={handleWishlist}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Heart
                    className={`w-3 h-3 ${wishlisted ? "fill-price text-price" : ""}`}
                  />{" "}
                  {wishlisted ? "In wishlist" : "Add to favourites"}
                </button>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {product.description}
            </p>

            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mb-4">
              {product.isMedicine && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Medicine
                </Badge>
              )}
              {product.isPrescriptionControlled && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Rx Required
                </Badge>
              )}
              {product.stockCode && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  <Tag className="w-3 h-3 mr-1" /> {product.stockCode}
                </Badge>
              )}
              {product.packSize && (
                <Badge variant="outline">
                  <Package className="w-3 h-3 mr-1" /> {product.packSize}
                </Badge>
              )}
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="price-text text-2xl">
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

            {product.bulkOfferPriceInUSDCents && product.bulkOfferQty && (
              <p className="text-xs text-promotion font-medium mb-4">
                Buy {product.bulkOfferQty}+ for{" "}
                {formatPrice(product.bulkOfferPriceInUSDCents)} each
              </p>
            )}

            <div className="flex items-center gap-2 text-xs font-semibold mb-4">
              <span
                className={`w-2 h-2 rounded-full ${product.inStock ? "bg-accent" : "bg-destructive"}`}
              ></span>
              <span
                className={product.inStock ? "text-accent" : "text-destructive"}
              >
                {product.inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            <div className="space-y-2 mb-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>
                  <strong>Branch pick-up</strong> – Collect at any Crown
                  Pharmacy branch
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span>
                  <strong>Delivery</strong> – We deliver across Zimbabwe
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-foreground">
                Quantity
              </span>
              <div className="flex items-center border border-border rounded">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-foreground hover:bg-muted"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-sm font-medium text-foreground border-x border-border">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1.5 text-foreground hover:bg-muted"
                >
                  +
                </button>
              </div>
            </div>

            {product.isPrescriptionControlled ? (
              <div className="w-full bg-muted text-muted-foreground py-3 rounded font-semibold text-center text-sm">
                Prescription required — speak to our pharmacist
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="w-full bg-primary text-primary-foreground py-3 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {product.inStock ? "Add to basket" : "Out of Stock"}
              </button>
            )}
          </div>
        </div>

        {/* Detailed description */}
        {(product.detailedDescription || product.description) && (
          <div className="mb-12">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Product Details
            </h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
              {product.detailedDescription ?? product.description}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
