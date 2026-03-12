import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StorageImage } from "./StorageImage";
import { Skeleton } from "./ui/skeleton";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

/**
 * Displays the "Shop by Category" grid on the homepage.
 * Reads categories from the homepageSection configuration in Convex.
 */
export default function HomepageShopByCategory() {
  const convex = useConvex();
  const [categories, setCategories] = useState<
    | FunctionReturnType<typeof api.userFns.homepage.getSectionCategories>
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex.query(api.userFns.homepage.getSectionCategories).then((result) => {
      if (!cancelled) setCategories(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (categories === undefined) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4 text-foreground">
          Shop by Category
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <Skeleton className="w-16 h-16 rounded-full mb-2" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 text-foreground">
        Shop by Category
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {categories.slice(0, 4).map((cat) => (
          <Link
            key={cat._id}
            to={`/products?category=${encodeURIComponent(cat.name)}`}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors overflow-hidden">
              {cat.storageIdImage || cat.cdnImageUrl ? (
                <StorageImage
                  storageId={cat.storageIdImage}
                  cdnUrl={cat.cdnImageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-2xl">💊</span>
              )}
            </div>
            <span className="text-xs text-foreground font-medium">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
