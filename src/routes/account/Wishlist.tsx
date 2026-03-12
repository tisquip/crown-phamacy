import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "@/hooks/use-toast";
import { Heart, Trash2, Loader2 } from "lucide-react";
import { StorageImage } from "@/components/StorageImage";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/account/Wishlist")({
  component: RouteComponent,
});

function RouteComponent() {
  const { client, isLoggedIn, removeFromWishlist } = useAuth();
  const { addToCart } = useCart();
  const wishlistProducts = useQuery(
    api.userFns.wishlist.getWishlistProducts,
    isLoggedIn ? {} : "skip",
  );

  if (!isLoggedIn || !client) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Link
            to="/login"
            className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold"
          >
            Sign In
          </Link>
        </div>
      </Layout>
    );
  }

  const isLoading = wishlistProducts === undefined;

  const handleAddToCart = (
    product: typeof wishlistProducts extends Array<infer T> ? T : never,
  ) => {
    addToCart(product._id as Id<"products">);
    removeFromWishlist(product._id as Id<"products">);
    toast({
      title: "Moved to basket",
      description: `${product.name} has been moved from wishlist to your basket.`,
    });
  };

  const handleRemove = (product: { _id: string; name: string }) => {
    removeFromWishlist(product._id as Id<"products">);
    toast({
      title: "Removed from wishlist",
      description: `${product.name} removed from your wishlist.`,
    });
  };

  return (
    <Layout>
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <div className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>{" "}
            &gt;{" "}
            <Link to="/account" className="hover:text-primary">
              My Account
            </Link>{" "}
            &gt; Wishlist
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1 flex items-center gap-2">
            <Heart className="w-6 h-6" /> My Wishlist
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Loading wishlist...</p>
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-4">
              Your wishlist is empty.
            </p>
            <Link
              to="/products"
              className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {wishlistProducts.map((product: any) => {
              const displayPrice =
                product.promotionPriceInUSDCents ??
                product.retailPriceInUSDCents;
              const hasPromo = product.promotionPriceInUSDCents != null;
              const firstImageId =
                product.storageIdsImages && product.storageIdsImages.length > 0
                  ? product.storageIdsImages[0]
                  : null;
              return (
                <div
                  key={product._id}
                  className="border border-border rounded-lg p-4 flex items-center gap-4"
                >
                  <Link to={`/product/${product._id}`}>
                    <StorageImage
                      storageId={firstImageId}
                      alt={product.name}
                      className="w-16 h-16 object-contain"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${product._id}`}>
                      {product.brandName && (
                        <p className="text-sm font-bold text-foreground">
                          {product.brandName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {product.name}
                      </p>
                    </Link>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="price-text">
                        {formatPrice(displayPrice)}
                      </span>
                      {hasPromo && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.retailPriceInUSDCents)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-primary text-primary-foreground text-xs px-4 py-2 rounded hover:opacity-90 font-medium"
                    >
                      Add to basket
                    </button>
                    <button
                      onClick={() => handleRemove(product)}
                      className="text-muted-foreground hover:text-destructive p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
