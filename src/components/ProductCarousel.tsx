import { Product } from "@/data/products";
import ProductCard from "./ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

interface ProductCarouselProps {
  title: string;
  products: Product[];
  viewMoreLink?: string;
}

const ProductCarousel = ({ title, products, viewMoreLink }: ProductCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 250;
      scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {viewMoreLink && <a href={viewMoreLink} className="text-xs text-primary hover:underline">View more</a>}
      </div>
      <div className="relative">
        <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card shadow-md rounded-full p-1 hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide px-8" style={{ scrollbarWidth: "none" }}>
          {products.map((product) => (
            <div key={product._id} className="min-w-[170px] max-w-[170px]">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
        <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card shadow-md rounded-full p-1 hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </section>
  );
};

export default ProductCarousel;
