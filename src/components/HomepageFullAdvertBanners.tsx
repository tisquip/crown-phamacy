import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { environmentVariablesDefault } from "@/lib/utils";

const CONVEX_SITE_URL =
  (import.meta.env.VITE_CONVEX_SITE_URL as string) ||
  environmentVariablesDefault.VITE_CONVEX_SITE_URL;

type DisplayBanner = {
  id: string;
  imageUrl: string;
  link: string | undefined;
};

/**
 * Displays full-width advert banner images in a single-column layout (1 per row).
 * Each image is clickable (if a link is set) and has a hover zoom + rotate effect.
 * Renders nothing when there are no banners configured.
 */
export default function HomepageFullAdvertBanners() {
  const convex = useConvex();
  const [banners, setBanners] = useState<DisplayBanner[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    convex
      .query(api.userFns.fullAdvertBanners.listActive)
      .then(async (result) => {
        const mapped = await Promise.all(
          result.map(async (b) => {
            let imageUrl: string;
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
            return {
              id: b._id,
              imageUrl,
              link: b.link,
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

  if (!banners || banners.length === 0) return null;

  return (
    <section className="py-8">
      <div className="grid grid-cols-1 gap-4">
        {banners.map((banner) => {
          const inner = (
            <div className="overflow-hidden rounded-lg shadow-md">
              <img
                src={banner.imageUrl}
                alt="Advertisement"
                className="w-full h-full object-cover transition-transform duration-500 ease-in-out hover:scale-105 block"
              />
            </div>
          );

          if (banner.link) {
            return (
              <a
                key={banner.id}
                href={banner.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden aspect-[16/5] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Advertisement"
              >
                {inner}
              </a>
            );
          }

          return (
            <div
              key={banner.id}
              className="block rounded-lg overflow-hidden aspect-[16/5]"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
