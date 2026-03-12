import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import ConvexProductCarousel from "./ConvexProductCarousel";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

/**
 * Homepage "Items on Promotion" section.
 * Reads from the homepageSection config, falls back to products with promotion prices.
 */
export default function HomepageItemsOnPromotion() {
  const convex = useConvex();
  const [sectionProducts, setSectionProducts] = useState<
    | FunctionReturnType<typeof api.userFns.homepage.getSectionProducts>
    | undefined
  >(undefined);
  const [fallbackProducts, setFallbackProducts] = useState<
    | FunctionReturnType<typeof api.userFns.homepage.getPromotionProducts>
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      convex.query(api.userFns.homepage.getSectionProducts, {
        sectionType: "itemsOnPromotion",
      }),
      convex.query(api.userFns.homepage.getPromotionProducts, { limit: 35 }),
    ]).then(([section, fallback]) => {
      if (!cancelled) {
        setSectionProducts(section);
        setFallbackProducts(fallback);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use section config if it has products, otherwise fallback
  const products =
    sectionProducts && sectionProducts.length > 0
      ? sectionProducts
      : fallbackProducts;

  return (
    <ConvexProductCarousel
      title="Items on Promotion"
      products={products}
      viewMoreLink="/products"
    />
  );
}
