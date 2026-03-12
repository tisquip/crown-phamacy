import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "@/hooks/use-toast";
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle,
  Loader2,
  Smartphone,
  Building2,
  Clock,
} from "lucide-react";
import { useMutation, useConvex, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StorageImage } from "@/components/StorageImage";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/Checkout")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    items,
    totalPriceCents,
    isLoading: cartLoading,
    isAuthenticated,
  } = useCart();
  const { client, isLoggedIn, userProfile } = useAuth();
  const navigate = useNavigate();
  const placeOrderMutation = useMutation(api.userFns.orders.placeOrder);
  const createPaymentTx = useMutation(
    api.paymentFns.paymentTransactions.createPaymentTransaction,
  );
  const initiatePaynow = useAction(
    api.paymentFns.paymentActions.initiatePaynowPayment,
  );

  const convex = useConvex();
  const [deliverySettings, setDeliverySettings] = useState<
    | Awaited<
        ReturnType<
          typeof convex.query<
            typeof api.userFns.siteSettings.getDeliverySettings
          >
        >
      >
    | undefined
  >(undefined);
  const [convexBranches, setConvexBranches] = useState<
    Awaited<ReturnType<typeof convex.query<typeof api.userFns.branches.list>>>
  >([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      convex.query(api.userFns.siteSettings.getDeliverySettings),
      convex.query(api.userFns.branches.list),
    ]).then(([settings, branches]) => {
      if (!cancelled) {
        setDeliverySettings(settings);
        setConvexBranches(branches);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableBranches = useMemo(
    () => convexBranches.filter((b) => !b.comingSoon),
    [convexBranches],
  );
  const availableCities = useMemo(() => {
    const cities = new Set(convexBranches.map((b) => b.city));
    return Array.from(cities).sort();
  }, [convexBranches]);

  const [deliveryMethod, setDeliveryMethod] = useState<
    "delivery" | "collection"
  >("delivery");
  const [selectedBranchId, setSelectedBranchId] = useState<Id<"branch"> | "">(
    "",
  );
  const [selectedCity, setSelectedCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "ecocash" | "bank"
  >("ecocash");
  const [notes, setNotes] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment flow states
  const [paymentStep, setPaymentStep] = useState<
    "checkout" | "bank-redirect" | "ecocash-pending" | "cash-success"
  >("checkout");
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string | null>(
    null,
  );
  const [paymentOrderId, setPaymentOrderId] = useState<Id<"order"> | null>(
    null,
  );

  useEffect(() => {
    if (paymentRedirectUrl) {
      window.location.href = paymentRedirectUrl;
    }
  }, [paymentRedirectUrl]);

  // Pre-populate phone, address, city, and preferred branch from user profile
  useEffect(() => {
    if (userProfile) {
      if (userProfile.phoneNumber && !phone) {
        setPhone(userProfile.phoneNumber);
      }
      if (
        userProfile.addresses &&
        userProfile.addresses.length > 0 &&
        !address
      ) {
        setAddress(userProfile.addresses[0]);
      }
      if (userProfile.selectedCity && !selectedCity) {
        setSelectedCity(userProfile.selectedCity);
      }
    }
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-select the preferred branch once branches are loaded
  useEffect(() => {
    if (availableBranches.length > 0 && !selectedBranchId) {
      if (userProfile?.preferredBranch) {
        const exists = availableBranches.find(
          (b) => b._id === userProfile.preferredBranch,
        );
        if (exists) {
          setSelectedBranchId(userProfile.preferredBranch);
        } else {
          setSelectedBranchId(availableBranches[0]._id);
        }
      } else {
        setSelectedBranchId(availableBranches[0]._id);
      }
    }
  }, [availableBranches, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated || !isLoggedIn) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">
            Please sign in to checkout.
          </p>
          <Link
            to="/login"
            className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold"
          >
            Sign In
          </Link>
        </div>
      </Layout>
    );
  }

  if (cartLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </Layout>
    );
  }

  if (items.length === 0 && !orderPlaced) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">Your basket is empty.</p>
          <Link
            to="/products"
            className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold"
          >
            Continue Shopping
          </Link>
        </div>
      </Layout>
    );
  }

  if (orderPlaced) {
    // Bank redirect UI
    if (paymentStep === "bank-redirect") {
      return (
        <Layout>
          <div className="container mx-auto px-4 py-16 text-center max-w-md">
            <Building2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Redirecting to PayNow
            </h1>
            <p className="text-muted-foreground mb-4">
              You will be redirected shortly to PayNow where you can complete
              your purchase via bank transfer.
            </p>
            {paymentRedirectUrl && (
              <a
                href={paymentRedirectUrl}
                className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold hover:opacity-90 inline-flex items-center gap-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <CreditCard className="w-4 h-4" />
                Go to PayNow
              </a>
            )}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span>Your order is on hold until payment is confirmed.</span>
              </div>
            </div>
            <div className="mt-4 flex gap-3 justify-center">
              <Link
                to={
                  paymentOrderId
                    ? `/account/purchase/${paymentOrderId}`
                    : "/account/purchases"
                }
                className="text-sm text-primary hover:underline"
              >
                View Order →
              </Link>
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:underline"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </Layout>
      );
    }

    // EcoCash pending UI
    if (paymentStep === "ecocash-pending") {
      return (
        <Layout>
          <div className="container mx-auto px-4 py-16 text-center max-w-md">
            <Smartphone className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              EcoCash Payment Initiated
            </h1>
            <p className="text-muted-foreground mb-4">
              A payment prompt will be sent to your phone number shortly. Please
              enter your EcoCash PIN to complete the payment.
            </p>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                Check your phone for the EcoCash payment prompt
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span>Your order is on hold until payment is confirmed.</span>
              </div>
            </div>
            <div className="mt-4 flex gap-3 justify-center">
              <Link
                to={
                  paymentOrderId
                    ? `/account/purchase/${paymentOrderId}`
                    : "/account/purchases"
                }
                className="text-sm text-primary hover:underline"
              >
                View Order →
              </Link>
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:underline"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </Layout>
      );
    }

    // Default cash/success
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Order Placed!
          </h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your order. We'll contact you shortly to confirm.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to={
                paymentOrderId
                  ? `/account/purchase/${paymentOrderId}`
                  : "/account/purchases"
              }
              className="bg-primary text-primary-foreground px-6 py-3 rounded font-semibold hover:opacity-90 inline-block"
            >
              View Order
            </Link>
            <Link
              to="/"
              className="bg-muted text-foreground px-6 py-3 rounded font-semibold hover:opacity-90 inline-block"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const isCollection = deliveryMethod === "collection";
  const deliveryFee = isCollection
    ? 0
    : deliverySettings &&
        totalPriceCents >= deliverySettings.freeDeliveryThresholdInUSDCents
      ? 0
      : (deliverySettings?.deliveryPriceInUSDCents ?? 500);
  const grandTotal = totalPriceCents + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (isCollection && !selectedBranchId) {
      toast({
        title: "Please select a branch",
        description: "A branch must be selected for collection orders.",
        variant: "destructive",
      });
      return;
    }
    if (!isCollection && !address) {
      toast({
        title: "Please enter a delivery address",
        variant: "destructive",
      });
      return;
    }
    if (!isCollection && !selectedCity) {
      toast({
        title: "Please select a city",
        description: "A city is required for delivery orders.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Resolve city for the order: for collection, use the branch city
      const cityForOrder = isCollection
        ? convexBranches.find((b) => b._id === selectedBranchId)?.city
        : selectedCity;

      // 1. Place the order (creates order, clears cart)
      const orderId = await placeOrderMutation({
        deliveryMethod,
        branchCollection: isCollection
          ? (selectedBranchId as Id<"branch">)
          : undefined,
        address: !isCollection ? address : undefined,
        selectedCity: cityForOrder || undefined,
        phoneNumber: phone || undefined,
        paymentMethod,
        notes: notes || undefined,
      });

      setPaymentOrderId(orderId);

      // 2. Create a payment transaction
      const txId = await createPaymentTx({
        orderId,
        amountInUSDCents: grandTotal,
        paymentMethod,
      });

      // 3. Handle based on payment method
      if (paymentMethod === "cash") {
        // Cash payment — normal success flow
        setPaymentStep("cash-success");
        setOrderPlaced(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast({
          title: "Order placed successfully!",
          description: "We'll be in touch shortly.",
        });
      } else {
        // EcoCash or Bank — initiate PayNow
        const phoneForPayment =
          paymentMethod === "ecocash"
            ? phone || userProfile?.phoneNumber || ""
            : undefined;

        const result = await initiatePaynow({
          transactionId: txId,
          phoneNumber: phoneForPayment,
        });

        if (result.success) {
          if (paymentMethod === "bank" && result.redirectUrl) {
            setPaymentRedirectUrl(result.redirectUrl);
            setPaymentStep("bank-redirect");
          } else {
            setPaymentStep("ecocash-pending");
          }
          setOrderPlaced(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast({
            title: "Payment initiated!",
            description:
              paymentMethod === "bank"
                ? "Redirecting to PayNow..."
                : "Check your phone for EcoCash prompt.",
          });
        } else {
          // PayNow initiation failed — still show order but warn
          setPaymentStep("cash-success");
          setOrderPlaced(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast({
            title: "Order placed, but payment setup failed",
            description:
              result.error ?? "Please contact us to arrange payment.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Failed to place order:", error);
      toast({
        title: "Failed to place order",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="bg-secondary py-2">
        <div className="container mx-auto px-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>{" "}
          &gt;{" "}
          <Link to="/cart" className="hover:text-primary">
            Basket
          </Link>{" "}
          &gt; Checkout
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Checkout</h1>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {/* Delivery Method */}
              <div className="border border-border rounded-lg p-6">
                <h2 className="font-bold text-foreground mb-4">
                  Delivery Method
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("delivery")}
                    className={`border rounded-lg p-4 text-center transition-colors ${deliveryMethod === "delivery" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  >
                    <Truck className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-bold text-foreground">
                      Delivery
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("collection")}
                    className={`border rounded-lg p-4 text-center transition-colors ${deliveryMethod === "collection" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  >
                    <MapPin className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-bold text-foreground">
                      Branch Collection
                    </p>
                    <p className="text-xs text-muted-foreground">FREE</p>
                  </button>
                </div>

                {deliveryMethod === "delivery" ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        City *
                      </label>
                      <select
                        required
                        title="Select a city"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Select a city</option>
                        {availableCities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Delivery Address *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your delivery address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Select Branch *
                      </label>
                      <select
                        required
                        title="Select a branch"
                        value={selectedBranchId}
                        onChange={(e) =>
                          setSelectedBranchId(e.target.value as Id<"branch">)
                        }
                        className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Select a branch</option>
                        {availableBranches.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name} — {b.address}, {b.city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Optional — for order updates"
                        className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="border border-border rounded-lg p-6">
                <h2 className="font-bold text-foreground mb-4">
                  Payment Method
                </h2>
                <div className="space-y-2">
                  {[
                    {
                      value: "ecocash",
                      label: "EcoCash",
                      desc: "Pay via EcoCash mobile money",
                    },
                    {
                      value: "bank",
                      label: "PayNow",
                      desc: "for bank transfers, visa, mastercard etc",
                    },
                    {
                      value: "cash",
                      label: "Cash on Delivery/Collection",
                      desc: "Pay when you receive",
                    },
                  ].map((pm) => (
                    <label
                      key={pm.value}
                      className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${paymentMethod === pm.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={pm.value}
                        checked={paymentMethod === pm.value}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as any)
                        }
                        className="accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {pm.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pm.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="border border-border rounded-lg p-6">
                <h2 className="font-bold text-foreground mb-4">
                  Additional Notes
                </h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any special instructions..."
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="border border-border rounded-lg p-6 sticky top-24">
                <h2 className="font-bold text-foreground mb-4">
                  Order Summary
                </h2>
                <div className="space-y-2 mb-4">
                  {items.map((item) => {
                    const unitPrice =
                      item.product.promotionPriceInUSDCents ??
                      item.product.retailPriceInUSDCents;
                    return (
                      <div
                        key={item.product._id}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground truncate mr-2">
                          {item.product.name} x{item.quantity}
                        </span>
                        <span className="text-foreground font-medium shrink-0">
                          {formatPrice(unitPrice * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">
                      {formatPrice(totalPriceCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-foreground">
                      {isCollection
                        ? "Collection — FREE"
                        : deliveryFee === 0
                          ? "FREE"
                          : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border mt-2">
                    <span className="text-primary">Total</span>
                    <span className="price-text">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>
                {/* Payment method quick-select */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Payment Method
                  </label>
                  <select
                    title="Select payment method"
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "cash" | "ecocash" | "bank",
                      )
                    }
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="ecocash">EcoCash</option>
                    <option value="bank">PayNow (Bank / Card)</option>
                    <option value="cash">Cash on Delivery / Collection</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground py-3 rounded font-bold text-sm hover:opacity-90 transition-opacity mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 inline mr-2" />
                  )}
                  {isSubmitting ? "Placing Order..." : "Place Order"}
                </button>
                <Link
                  to="/cart"
                  className="block text-center text-sm text-primary hover:underline mt-2"
                >
                  Back to basket
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
