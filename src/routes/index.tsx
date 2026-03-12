import { createFileRoute, Link } from "@tanstack/react-router";

import Layout from "@/components/layout/Layout";
import { Truck, ShieldCheck, Pill, Upload } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import HomepageShopByCategory from "@/components/HomepageShopByCategory";
import HomepagePromoBanner from "@/components/HomepagePromoBanner";
import HomepageTopSellers from "@/components/HomepageTopSellers";
import HomepageItemsOnPromotion from "@/components/HomepageItemsOnPromotion";
import HomepagePromoDeals from "@/components/HomepagePromoDeals";
import HomepageAdvertBanners from "@/components/HomepageAdvertBanners";
import HomepageFeaturedBrands from "@/components/HomepageFeaturedBrands";
import HomepageBlogHighlights from "@/components/HomepageBlogHighlights";
import HomepageFullAdvertBanners from "@/components/HomepageFullAdvertBanners";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatPrice } from "@/lib/formatPrice";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

const services = [
  {
    icon: Pill,
    title: "FREE Medication Delivery",
    desc: "On all chronic medication",
    link: "Find out more",
    href: "/prescription",
  },
  {
    icon: Upload,
    title: "Upload Prescription",
    desc: "Get a quote & we deliver",
    link: "Upload now",
    href: "/prescription",
  },
  {
    icon: ShieldCheck,
    title: "Licensed Pharmacists",
    desc: "Professional care at every branch",
    link: "Our branches",
    href: "/Branches",
  },
];

function RouteComponent() {
  const convex = useConvex();
  const [deliverySettings, setDeliverySettings] = useState<
    | FunctionReturnType<typeof api.userFns.siteSettings.getDeliverySettings>
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex
      .query(api.userFns.siteSettings.getDeliverySettings)
      .then((result) => {
        if (!cancelled) setDeliverySettings(result);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freeThreshold =
    deliverySettings?.freeDeliveryThresholdInUSDCents ?? 5000;

  const allServices = [
    ...services,
    {
      icon: Truck,
      title: "Free Delivery",
      desc: `On orders over ${formatPrice(freeThreshold)}`,
      link: "Shop now",
      href: "/products",
    },
  ];

  return (
    <Layout>
      <HeroCarousel />

      {/* Categories + Promo */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          <HomepageShopByCategory />
          <HomepagePromoBanner />
        </div>
        {/* Advert Banners */}
        <HomepageAdvertBanners />
        <HomepageItemsOnPromotion />
        <HomepageTopSellers />

        {/* Deal Sections */}
        <HomepagePromoDeals />

        {/* Services */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
          {allServices.map((service) => (
            <div
              key={service.title}
              className="border border-border rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <service.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                {service.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {service.desc}
              </p>
              <Link
                to={service.href}
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                {service.link}
              </Link>
            </div>
          ))}
        </div>

        <HomepageFeaturedBrands />

        <HomepageFullAdvertBanners />

        {/* Blog Highlights */}
        <HomepageBlogHighlights />
      </div>
    </Layout>
  );
}
