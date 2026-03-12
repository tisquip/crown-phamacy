import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

import logoSymbol from "@/assets/logo-symbol.png";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { environmentVariablesDefault } from "@/lib/utils";

const CONVEX_SITE_URL =
  (import.meta.env.VITE_CONVEX_SITE_URL as string) ||
  environmentVariablesDefault.VITE_CONVEX_SITE_URL;

type DisplaySlide = {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string | null;
};

export default function HeroCarousel() {
  const convex = useConvex();
  // null = still loading, [] = loaded but empty, [...] = has slides
  const [slides, setSlides] = useState<DisplaySlide[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    convex.query(api.adminFns.heroSlides.listActive).then(async (result) => {
      const mapped = await Promise.all(
        result.map(async (s) => {
          let imageUrl: string | null = null;
          // Prefer CDN URL (no fetch needed — direct URL)
          if (s.cdnImageUrl) {
            imageUrl = s.cdnImageUrl;
          } else if (s.image) {
            const url = `${CONVEX_SITE_URL}/getImage?storageId=${encodeURIComponent(s.image)}`;
            try {
              const res = await fetch(url);
              if (res.ok) {
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                objectUrls.push(objectUrl);
                imageUrl = objectUrl;
              }
            } catch {
              // leave imageUrl as null
            }
          }
          return {
            title: s.title,
            subtitle: s.subtitle,
            buttonText: s.buttonText,
            buttonLink: s.buttonLink,
            imageUrl,
          };
        }),
      );
      if (!cancelled) {
        setSlides(mapped);
      }
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heroSlides: DisplaySlide[] = slides ?? [];

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(
    () => setCurrentSlide((p) => (p + 1) % heroSlides.length),
    [heroSlides.length],
  );
  const prevSlide = useCallback(
    () =>
      setCurrentSlide((p) => (p - 1 + heroSlides.length) % heroSlides.length),
    [heroSlides.length],
  );

  // Reset to first slide when the slide list changes length
  useEffect(() => {
    setCurrentSlide(0);
  }, [heroSlides.length]);

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const slide = heroSlides[currentSlide] ?? heroSlides[0];

  // Still fetching — show skeleton
  if (slides === null) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative h-[340px] md:h-[460px] bg-muted animate-pulse">
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4 pl-20 space-y-4">
              <div className="h-4 w-24 rounded bg-muted-foreground/20" />
              <div className="h-8 w-96 rounded bg-muted-foreground/20" />
              <div className="h-4 w-64 rounded bg-muted-foreground/20" />
              <div className="h-10 w-32 rounded bg-muted-foreground/20" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Loaded but empty — render nothing
  if (heroSlides.length === 0) return null;

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[340px] md:h-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary to-primary/60" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="container mx-auto px-4 pl-20">
                <div className="max-w-lg">
                  <img
                    src={logoSymbol}
                    alt=""
                    className="w-12 h-12 mb-3 opacity-80"
                  />
                  <span className="inline-block bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded mb-3">
                    {slide.subtitle}
                  </span>
                  <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2 drop-shadow-lg">
                    {slide.title}
                  </h1>
                  <Link
                    to={slide.buttonLink}
                    className="inline-block mt-4 bg-accent text-accent-foreground px-6 py-2.5 rounded font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg"
                  >
                    {slide.buttonText}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-primary-foreground/20 hover:bg-primary-foreground/40 rounded-full p-2 transition-colors backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5 text-primary-foreground" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-primary-foreground/20 hover:bg-primary-foreground/40 rounded-full p-2 transition-colors backdrop-blur-sm"
        >
          <ChevronRight className="w-5 h-5 text-primary-foreground" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2.5 rounded-full transition-all ${i === currentSlide ? "bg-accent w-8" : "bg-primary-foreground/40 w-2.5"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
