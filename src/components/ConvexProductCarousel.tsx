import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Skeleton } from "./ui/skeleton";
import { Doc } from "../../convex/_generated/dataModel";
import ProductCard from "./ProductCard";

type ConvexProduct = Doc<"products"> & {
  brandName?: string | null;
  imageStorageId?: string | null;
};

interface ConvexProductCarouselProps {
  title: string;
  products: ConvexProduct[] | undefined;
  viewMoreLink?: string;
}

/**
 * A product carousel that displays products from Convex (not dummy data).
 * Uses StorageImage for product images and reads brand names from enriched data.
 */
export default function ConvexProductCarousel({
  title,
  products,
  viewMoreLink,
}: ConvexProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 380;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  // Loading state
  if (products === undefined) {
    return (
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="block w-1 h-6 rounded-full bg-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
        </div>
        <div className="flex gap-4 px-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[255px] max-w-[255px]">
              <div className="bg-card rounded border border-border p-3">
                <Skeleton className="w-full h-32 mb-2" />
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="block w-1 h-6 rounded-full bg-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        {viewMoreLink && (
          <Link
            to={viewMoreLink}
            className="text-xs font-medium text-primary hover:underline"
          >
            View more
          </Link>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card shadow-md rounded-full p-1 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-8"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product) => (
            <div key={product._id} className="min-w-[255px] max-w-[255px]">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card shadow-md rounded-full p-1 hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </section>
  );
}
