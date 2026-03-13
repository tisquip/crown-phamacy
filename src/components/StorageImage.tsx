import { Id } from "../../convex/_generated/dataModel";
import { cn, environmentVariablesDefault } from "@/lib/utils";

/**
 * Derive the Convex HTTP-action base URL from the client URL.
 * Client URL:  https://xyz.convex.cloud
 * HTTP URL:    https://xyz.convex.site
 */

const CONVEX_SITE_URL =
  (import.meta.env.VITE_CONVEX_SITE_URL as string) ||
  environmentVariablesDefault.VITE_CONVEX_SITE_URL;

interface StorageImageProps {
  /** Convex storage ID. Pass null or undefined to show the default image. */
  storageId?: Id<"_storage"> | string | null;
  /** CDN URL — used in preference to storageId when available. */
  cdnUrl?: string | null;
  /** Alt text for the image element. */
  alt?: string;
  /** Extra Tailwind classes forwarded to the <img> element. */
  className?: string;
}

/**
 * Reusable image display component.
 *
 * Prefers `cdnUrl` when provided. Otherwise resolves a Convex storage ID
 * to a URL via the `/getImage` HTTP action. Falls back to `/noimage.jpg`
 * when neither is supplied or if the image fails to load.
 */
export function StorageImage({
  storageId,
  cdnUrl,
  alt = "Image",
  className,
}: StorageImageProps) {
  const src = cdnUrl
    ? cdnUrl
    : storageId
      ? `${CONVEX_SITE_URL}/getImage?storageId=${encodeURIComponent(storageId)}`
      : "/noimage.jpg";

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src !== window.location.origin + "/noimage.jpg") {
          img.src = "/noimage.jpg";
        }
      }}
    />
  );
}
