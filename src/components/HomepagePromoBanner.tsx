import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StorageImage } from "./StorageImage";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

/**
 * Promo banner displayed next to "Shop by Category" on the homepage.
 * Only renders when the admin has configured it via the Homepages section.
 */
export default function HomepagePromoBanner() {
  const convex = useConvex();
  const [config, setConfig] = useState<
    FunctionReturnType<typeof api.userFns.homepage.getPromoBanner> | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex.query(api.userFns.homepage.getPromoBanner).then((result) => {
      if (!cancelled) setConfig(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) return null;

  return (
    <div className="relative rounded-lg overflow-hidden h-48">
      {config.cdnImageUrl || config.storageId ? (
        <StorageImage
          storageId={config.storageId}
          cdnUrl={config.cdnImageUrl}
          alt="Promo banner"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-primary/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center px-6">
        <div>
          {config.badgeText && (
            <p className="text-primary-foreground text-xs font-bold uppercase">
              {config.badgeText}
            </p>
          )}
          {config.headlineText && (
            <p className="text-primary-foreground text-2xl font-bold">
              {config.headlineText}
            </p>
          )}
          {config.buttonText && config.buttonLink && (
            <Link
              to={config.buttonLink}
              className="inline-block mt-2 bg-accent text-accent-foreground px-4 py-1.5 rounded text-xs font-semibold"
            >
              {config.buttonText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
