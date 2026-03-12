import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "./ui/skeleton";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

/**
 * Displays the "Featured Brands" section on the homepage.
 * Reads brand selection from the homepageSection configuration in Convex.
 */
export default function HomepageFeaturedBrands() {
  const convex = useConvex();
  const [brands, setBrands] = useState<
    | FunctionReturnType<typeof api.userFns.homepage.getFeaturedBrands>
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex.query(api.userFns.homepage.getFeaturedBrands).then((result) => {
      if (!cancelled) setBrands(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (brands === undefined) {
    return (
      <section className="py-8 border-t border-border">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-1 h-6 rounded-full" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </section>
    );
  }

  if (brands.length === 0) return null;

  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="block w-1 h-6 rounded-full bg-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Featured Brands
          </h2>
        </div>
        <Link
          to="/products"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all brands
        </Link>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {brands.map((brand) => (
          <Link
            key={brand._id}
            to={`/products?brand=${encodeURIComponent(brand._id)}`}
            className="px-4 py-2 rounded-full border border-border bg-card text-sm font-semibold text-muted-foreground shadow-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
          >
            {brand.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
