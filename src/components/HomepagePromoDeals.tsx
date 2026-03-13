import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StorageImage } from "./StorageImage";
import { formatPrice } from "@/lib/formatPrice";
import { Skeleton } from "./ui/skeleton";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";
import { ProductDetailModal } from "./ProductDetailModal";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Homepage deal sections showing promo-banner products in a grid.
 * Reads from the "promoBanner" homepage section configuration in Convex.
 */
export default function HomepagePromoDeals() {
  const convex = useConvex();
  const [selectedProductId, setSelectedProductId] =
    useState<Id<"products"> | null>(null);
  const [products, setProducts] = useState<
    | FunctionReturnType<typeof api.userFns.homepage.getSectionProducts>
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex
      .query(api.userFns.homepage.getSectionProducts, {
        sectionType: "promoBanner",
      })
      .then((result) => {
        if (!cancelled) setProducts(result);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (products === undefined) {
    return (
      <div className="grid md:grid-cols-2 gap-6 py-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-4">
            <Skeleton className="h-5 w-48 mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="text-center">
                  <Skeleton className="w-full h-24 mb-2" />
                  <Skeleton className="h-3 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-8 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  // Split products into two groups for the two deal panels
  const half = Math.ceil(products.length / 2);
  const leftProducts = products.slice(0, half);
  const rightProducts = products.slice(half);

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6 py-6">
        {leftProducts.length > 0 && (
          <DealPanel
            title="Featured Deals"
            products={leftProducts}
            onQuickView={(id) => setSelectedProductId(id as Id<"products">)}
          />
        )}
        {rightProducts.length > 0 && (
          <DealPanel
            title="More Great Deals"
            products={rightProducts}
            onQuickView={(id) => setSelectedProductId(id as Id<"products">)}
          />
        )}
      </div>
      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </>
  );
}

function DealPanel({
  title,
  products,
  onQuickView,
}: {
  title: string;
  products: Array<{
    _id: string;
    name: string;
    brandName?: string | null;
    storageIdsImages?: string[];
    retailPriceInUSDCents: number;
    promotionPriceInUSDCents?: number;
  }>;
  onQuickView: (id: string) => void;
}) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <Link to="/products" className="text-xs text-primary hover:underline">
          View more
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {products.slice(0, 3).map((p) => {
          const firstImageId =
            p.storageIdsImages && p.storageIdsImages.length > 0
              ? p.storageIdsImages[0]
              : null;
          const displayPrice =
            p.promotionPriceInUSDCents ?? p.retailPriceInUSDCents;
          return (
            <div key={p._id} className="text-center">
              <button
                onClick={() => onQuickView(p._id)}
                className="w-full text-left"
                aria-label={`Quick view ${p.name}`}
              >
                <StorageImage
                  storageId={firstImageId}
                  alt={p.name}
                  className="w-full h-24 object-contain mb-2"
                />
                <p className="text-[10px] font-bold text-foreground line-clamp-1">
                  {p.name}
                </p>
                {p.brandName && (
                  <p className="text-[10px] text-muted-foreground">
                    {p.brandName}
                  </p>
                )}
                <p className="price-text text-xs mt-1">
                  {formatPrice(displayPrice)}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
