import { createFileRoute, Link } from "@tanstack/react-router";

import Layout from "@/components/layout/Layout";
import { useCart } from "@/context/CartContext";
import { StorageImage } from "@/components/StorageImage";
import { formatPrice } from "@/lib/formatPrice";
import {
  Truck,
  MapPin,
  RotateCcw,
  HelpCircle,
  Minus,
  Plus,
  Loader2,
  Pill,
} from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

export const Route = createFileRoute("/Cart")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    items,
    isLoading,
    updateQuantity,
    removeFromCart,
    totalPriceCents,
    totalItems,
    isAuthenticated,
  } = useCart();

  const convex = useConvex();
  const [deliverySettings, setDeliverySettings] = useState<
    | FunctionReturnType<typeof api.userFns.siteSettings.getDeliverySettings>
    | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex.query(api.userFns.siteSettings.getDeliverySettings).then((r) => {
      if (!cancelled) setDeliverySettings(r);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freeDeliveryThresholdCents =
    deliverySettings?.freeDeliveryThresholdInUSDCents ?? 5000;

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Your basket is empty
          </h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your basket, or start shopping.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/login"
              className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold hover:opacity-90"
            >
              Sign In
            </Link>
            <Link
              to="/products"
              className="border border-primary text-primary px-6 py-3 rounded font-semibold hover:bg-primary/5"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading your basket...</p>
        </div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Your basket is empty
          </h1>
          <p className="text-muted-foreground mb-6">
            Start shopping to add items to your basket.
          </p>
          <Link
            to="/products"
            className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold hover:opacity-90"
          >
            Continue Shopping
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-secondary py-2">
        <div className="container mx-auto px-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>{" "}
          &gt; Shopping basket
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Shopping basket
          </h1>
          <Link to="/products" className="text-sm text-primary hover:underline">
            Back to shopping
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-foreground">Shopping basket</h2>
                <span className="text-sm text-muted-foreground">
                  {totalItems} items
                </span>
              </div>

              {totalPriceCents < freeDeliveryThresholdCents && (
                <div className="bg-primary/5 text-xs text-primary px-4 py-2 rounded mb-4">
                  Spend{" "}
                  <strong>
                    {formatPrice(freeDeliveryThresholdCents - totalPriceCents)}
                  </strong>{" "}
                  more to get FREE standard delivery.{" "}
                  <Link to="/products" className="underline">
                    Continue shopping
                  </Link>
                </div>
              )}

              <div className="space-y-4">
                {items.map((item) => {
                  const unitPrice =
                    item.product.promotionPriceInUSDCents ??
                    item.product.retailPriceInUSDCents;
                  const firstImageId =
                    item.product.storageIdsImages &&
                    item.product.storageIdsImages.length > 0
                      ? item.product.storageIdsImages[0]
                      : null;
                  return (
                    <div
                      key={item.product._id}
                      className={`flex items-center gap-4 py-4 border-b border-border last:border-0 ${
                        item.product.isMedicine
                          ? "bg-amber-50 dark:bg-amber-950/20 -mx-6 px-6 border-l-4 border-l-amber-400"
                          : ""
                      }`}
                    >
                      <Link to={`/product/${item.product._id}`}>
                        <StorageImage
                          storageId={firstImageId}
                          alt={item.product.name}
                          className="w-16 h-16 object-contain"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        {item.product.brandName && (
                          <p className="text-sm font-bold text-foreground">
                            {item.product.brandName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {item.product.name}
                        </p>
                        {item.product.isMedicine && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                            <Pill className="w-3 h-3" /> Medication
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(unitPrice)} each
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Delivered in 1 - 2 working days.
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="price-text text-lg">
                          {formatPrice(unitPrice * item.quantity)}
                        </span>
                        <div className="flex items-center border border-border rounded">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.product._id as Id<"products">,
                                item.quantity - 1,
                              )
                            }
                            className="p-1 hover:bg-muted"
                          >
                            <Minus className="w-3 h-3 text-foreground" />
                          </button>
                          <span className="px-3 text-sm text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.product._id as Id<"products">,
                                item.quantity + 1,
                              )
                            }
                            className="p-1 hover:bg-muted"
                          >
                            <Plus className="w-3 h-3 text-foreground" />
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            removeFromCart(item.product._id as Id<"products">)
                          }
                          className="text-[10px] text-muted-foreground hover:text-destructive uppercase"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Medication note */}
              {(() => {
                const medicationItems = items.filter(
                  (item) => item.product.isMedicine,
                );
                if (medicationItems.length === 0) return null;
                const names = medicationItems.map((m) => m.product.name);
                return (
                  <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Pill className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        <strong>{names.join(", ")}</strong>{" "}
                        {names.length === 1 ? "is" : "are"} medication and{" "}
                        {names.length === 1 ? "has" : "have"} been included for
                        purchase because you have been assisted to purchase{" "}
                        {names.length === 1 ? "this" : "these"} before via
                        admin.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-primary">Total</span>
                <span className="price-text text-2xl">
                  {formatPrice(totalPriceCents)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Total includes VAT
              </p>
              <Link
                to="/checkout"
                className="block w-full bg-primary text-primary-foreground py-3 rounded font-bold text-sm hover:opacity-90 transition-opacity mb-2 text-center"
              >
                Proceed to checkout
              </Link>
              <Link
                to="/products"
                className="block text-center text-sm text-primary hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
            <div className="border border-border rounded-lg divide-y divide-border">
              {[
                {
                  icon: MapPin,
                  title: "Branch pick-up",
                  desc: "Collect at any Crown Pharmacy branch",
                  sub: "",
                },
                {
                  icon: Truck,
                  title: "Standard delivery",
                  desc: "Countrywide delivery across Zimbabwe",
                  sub: `FREE for orders over ${formatPrice(freeDeliveryThresholdCents)}`,
                },
                {
                  icon: RotateCcw,
                  title: "Returns and refunds",
                  desc: "Processed at any branch",
                  sub: "",
                },
                {
                  icon: HelpCircle,
                  title: "Any questions?",
                  desc: "Contact our nearest branch",
                  sub: "",
                },
              ].map((opt) => (
                <div key={opt.title} className="p-4 text-center">
                  <opt.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-bold text-primary">{opt.title}</p>
                  <p className="text-xs text-foreground">{opt.desc}</p>
                  {opt.sub && <p className="text-xs text-primary">{opt.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
