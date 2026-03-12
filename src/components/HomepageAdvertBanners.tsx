import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { environmentVariablesDefault } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CONVEX_SITE_URL =
  (import.meta.env.VITE_CONVEX_SITE_URL as string) ||
  environmentVariablesDefault.VITE_CONVEX_SITE_URL;

type DisplayBanner = {
  id: string;
  imageUrl: string;
  link: string | undefined;
  isCarousel: boolean;
  carouselImageUrls: string[];
};

/**
 * Displays up to 4 advert banner images in a responsive 2-column grid.
 * Each banner can be a single image or a carousel of multiple images.
 * Each image is clickable (if a link is set) and has a hover zoom + rotate effect.
 * Renders nothing when there are no banners configured.
 */
export default function HomepageAdvertBanners() {
  const convex = useConvex();
  // null = loading, [] = loaded but empty
  const [banners, setBanners] = useState<DisplayBanner[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    convex.query(api.userFns.advertBanners.listActive).then(async (result) => {
      const mapped = await Promise.all(
        result.map(async (b) => {
          let imageUrl: string;
          // Prefer CDN URL (no fetch needed)
          if (b.cdnImageUrl) {
            imageUrl = b.cdnImageUrl;
          } else if (b.storageId) {
            const url = `${CONVEX_SITE_URL}/getImage?storageId=${encodeURIComponent(b.storageId)}`;
            imageUrl = url;
            try {
              const res = await fetch(url);
              if (res.ok) {
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                objectUrls.push(objectUrl);
                imageUrl = objectUrl;
              }
            } catch {
              // leave imageUrl as the direct URL
            }
          } else {
            imageUrl = "/noimage.jpg";
          }

          const carouselImageUrls = (b.carouselImages ?? []).map(
            (ci) => ci.cdnImageUrl,
          );

          return {
            id: b._id,
            imageUrl,
            link: b.link,
            isCarousel: !!(b.isCarousel && carouselImageUrls.length > 0),
            carouselImageUrls,
          };
        }),
      );
      if (!cancelled) {
        setBanners(mapped);
      }
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't render anything while loading or when there are no banners
  if (!banners || banners.length === 0) return null;

  return (
    <section className="py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {banners.map((banner) =>
          banner.isCarousel ? (
            <BannerCarousel key={banner.id} banner={banner} />
          ) : (
            <BannerSingle key={banner.id} banner={banner} />
          ),
        )}
      </div>
    </section>
  );
}

function BannerSingle({ banner }: { banner: DisplayBanner }) {
  const inner = (
    <div className="overflow-hidden rounded-lg shadow-md">
      <img
        src={banner.imageUrl}
        alt="Advertisement"
        className="w-full h-full object-cover transition-transform duration-500 ease-in-out hover:scale-110 hover:rotate-2 block"
      />
    </div>
  );

  if (banner.link) {
    return (
      <a
        href={banner.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden aspect-[16/7] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Advertisement"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="block rounded-lg overflow-hidden aspect-[16/7]">
      {inner}
    </div>
  );
}

function BannerCarousel({ banner }: { banner: DisplayBanner }) {
  // Combine primary image with carousel images
  const allImages = [banner.imageUrl, ...banner.carouselImageUrls];
  const [current, setCurrent] = useState(0);

  const next = useCallback(
    () => setCurrent((p) => (p + 1) % allImages.length),
    [allImages.length],
  );
  const prev = useCallback(
    () => setCurrent((p) => (p - 1 + allImages.length) % allImages.length),
    [allImages.length],
  );

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, allImages.length]);

  const wrapper = (children: React.ReactNode) => {
    if (banner.link) {
      return (
        <a
          href={banner.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden aspect-[16/7] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative group"
          aria-label="Advertisement"
        >
          {children}
        </a>
      );
    }
    return (
      <div className="block rounded-lg overflow-hidden aspect-[16/7] relative group">
        {children}
      </div>
    );
  };

  return wrapper(
    <>
      <div className="overflow-hidden rounded-lg shadow-md w-full h-full">
        <img
          src={allImages[current]}
          alt="Advertisement"
          className="w-full h-full object-cover transition-all duration-500 ease-in-out block"
        />
      </div>
      {allImages.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrent(i);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </>,
  );
}
