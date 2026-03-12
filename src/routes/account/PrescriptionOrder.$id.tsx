import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "@/hooks/use-toast";
import {
  MapPin,
  Truck,
  CreditCard,
  Loader2,
  Smartphone,
  Building2,
  Clock,
  XCircle,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useMutation, useQuery, useConvex, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/account/PrescriptionOrder/$id")({
  component: RouteComponent,
});

interface PrescriptionOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceInUSDCents: number;
  brandName: string | null;
  isMedicine?: boolean;
  isPrescriptionControlled?: boolean;
}

function RouteComponent() {
  const { id } = Route.useParams();
  const { isLoggedIn, userProfile } = useAuth();
  const navigate = useNavigate();

  const prescriptionOrder = useQuery(
    api.userFns.prescriptionOrders.getPrescriptionOrder,
    isLoggedIn ? { id: id as Id<"prescriptionOrder"> } : "skip",
  );

  const cancelOrder = useMutation(
    api.userFns.prescriptionOrders.cancelPrescriptionOrder,
  );
  const expireOrder = useMutation(
    api.userFns.prescriptionOrders.expirePrescriptionOrder,
  );
  const purchaseOrder = useMutation(
    api.userFns.prescriptionOrders.purchasePrescriptionOrder,
  );
  const createPaymentTx = useMutation(
    api.paymentFns.paymentTransactions.createPaymentTransaction,
  );
  const initiatePaynow = useAction(
    api.paymentFns.paymentActions.initiatePaynowPayment,
  );

  const convex = useConvex();
  const [deliverySettings, setDeliverySettings] = useState<any>(undefined);
  const [convexBranches, setConvexBranches] = useState<any[]>([]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const availableBranches = useMemo(
    () => convexBranches.filter((b: any) => !b.comingSoon),
    [convexBranches],
  );
  const availableCities = useMemo(() => {
    const cities = new Set(convexBranches.map((b: any) => b.city));
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

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

  // Pre-populate user info
  useEffect(() => {
    if (userProfile) {
      if (userProfile.phoneNumber && !phone) setPhone(userProfile.phoneNumber);
      if (userProfile.addresses?.length && !address)
        setAddress(userProfile.addresses[0]);
      if (userProfile.selectedCity && !selectedCity)
        setSelectedCity(userProfile.selectedCity);
    }
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (availableBranches.length > 0 && !selectedBranchId) {
      if (userProfile?.preferredBranch) {
        const exists = availableBranches.find(
          (b: any) => b._id === userProfile.preferredBranch,
        );
        if (exists) setSelectedBranchId(userProfile.preferredBranch);
        else setSelectedBranchId(availableBranches[0]._id);
      } else {
        setSelectedBranchId(availableBranches[0]._id);
      }
    }
  }, [availableBranches, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expire if order is expired
  useEffect(() => {
    if (
      prescriptionOrder?.isExpired &&
      prescriptionOrder?.status === "pending"
    ) {
      expireOrder({ id: id as Id<"prescriptionOrder"> });
    }
  }, [prescriptionOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-populate phone/address from prescription order
  useEffect(() => {
    if (prescriptionOrder) {
      if (prescriptionOrder.phoneNumber && !phone)
        setPhone(prescriptionOrder.phoneNumber);
      if (prescriptionOrder.address && !address)
        setAddress(prescriptionOrder.address);
    }
  }, [prescriptionOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLoggedIn) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
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

  if (prescriptionOrder === undefined) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (prescriptionOrder === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Prescription order not found.</p>
        </div>
      </Layout>
    );
  }

  const items: PrescriptionOrderItem[] = JSON.parse(
    prescriptionOrder.productsAsJson,
  );
  const isPending =
    prescriptionOrder.status === "pending" && !prescriptionOrder.isExpired;
  const isExpired =
    prescriptionOrder.isExpired || prescriptionOrder.status === "expired";
  const isPurchased = prescriptionOrder.status === "purchased";
  const isCancelled = prescriptionOrder.status === "cancelled";

  // Payment complete states
  if (paymentStep === "bank-redirect") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <Building2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Redirecting to PayNow
          </h1>
          <p className="text-muted-foreground mb-4">
            You will be redirected shortly to PayNow for payment.
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
          </div>
        </div>
      </Layout>
    );
  }

  if (paymentStep === "ecocash-pending") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <Smartphone className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            EcoCash Payment Initiated
          </h1>
          <p className="text-muted-foreground mb-4">
            A payment prompt will be sent to your phone number shortly.
          </p>
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
          </div>
        </div>
      </Layout>
    );
  }

  if (paymentStep === "cash-success") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Prescription Order Placed!
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

  // Delivery calculations
  const isCollection = deliveryMethod === "collection";
  const deliveryFee = isCollection
    ? 0
    : deliverySettings &&
        prescriptionOrder.subtotalInUSDCents >=
          deliverySettings.freeDeliveryThresholdInUSDCents
      ? 0
      : (deliverySettings?.deliveryPriceInUSDCents ?? 500);
  const grandTotal = prescriptionOrder.subtotalInUSDCents + deliveryFee;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelOrder({ id: id as Id<"prescriptionOrder"> });
      toast({
        title: "Prescription order cancelled",
        description:
          "You can request a new quotation from your prescriptions page.",
      });
      navigate({ to: "/account/prescriptions" });
    } catch (err) {
      toast({
        title: "Failed to cancel",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isCollection && !selectedBranchId) {
      toast({
        title: "Please select a branch",
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
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const cityForOrder = isCollection
        ? convexBranches.find((b: any) => b._id === selectedBranchId)?.city
        : selectedCity;

      const orderId = await purchaseOrder({
        prescriptionOrderId: id as Id<"prescriptionOrder">,
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

      const txId = await createPaymentTx({
        orderId,
        amountInUSDCents: grandTotal,
        paymentMethod,
      });

      if (paymentMethod === "cash") {
        setPaymentStep("cash-success");
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast({ title: "Order placed successfully!" });
      } else {
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
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setPaymentStep("cash-success");
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
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <div className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>{" "}
            &gt;{" "}
            <Link to="/account" className="hover:text-primary">
              My Account
            </Link>{" "}
            &gt;{" "}
            <Link to="/account/prescriptions" className="hover:text-primary">
              Prescriptions
            </Link>{" "}
            &gt; Prescription Order
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            Prescription Order
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Banner */}
        {isExpired && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                This prescription order has expired
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Prescription orders are valid for 24 hours. Please upload a new
                prescription or contact us for a new quotation.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              This prescription order was cancelled.
            </p>
          </div>
        )}

        {isPurchased && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                This prescription order has been purchased.
              </p>
              {prescriptionOrder.resultingOrderId && (
                <Link
                  to={`/account/purchase/${prescriptionOrder.resultingOrderId}`}
                  className="text-sm text-primary hover:underline"
                >
                  View Order →
                </Link>
              )}
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Prescription order expires{" "}
                {formatDistanceToNow(new Date(prescriptionOrder.expiresAt), {
                  addSuffix: true,
                })}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Created{" "}
                {format(
                  new Date(prescriptionOrder._creationTime),
                  "dd MMM yyyy, HH:mm",
                )}
              </p>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b border-border">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">
              Prescription Items
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 text-foreground font-medium">
                  Product
                </th>
                <th className="text-right px-4 py-2 text-foreground font-medium">
                  Qty
                </th>
                <th className="text-right px-4 py-2 text-foreground font-medium">
                  Unit Price
                </th>
                <th className="text-right px-4 py-2 text-foreground font-medium">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.brandName && (
                      <p className="text-xs text-muted-foreground">
                        {item.brandName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatPrice(item.unitPriceInUSDCents)}
                  </td>
                  <td className="px-4 py-3 text-right price-text">
                    {formatPrice(item.unitPriceInUSDCents * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td
                  colSpan={3}
                  className="px-4 py-2 text-muted-foreground text-right"
                >
                  Subtotal
                </td>
                <td className="px-4 py-2 text-right text-foreground">
                  {formatPrice(prescriptionOrder.subtotalInUSDCents)}
                </td>
              </tr>
              {isPending && deliveryFee > 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-muted-foreground text-right"
                  >
                    Delivery Fee
                  </td>
                  <td className="px-4 py-2 text-right text-foreground">
                    {formatPrice(deliveryFee)}
                  </td>
                </tr>
              )}
              {isPending && (
                <tr className="border-t-2 border-border">
                  <td
                    colSpan={3}
                    className="px-4 py-3 font-bold text-foreground text-right"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right price-text text-lg">
                    {formatPrice(grandTotal)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Checkout form - only show for pending orders */}
        {isPending && (
          <form onSubmit={handlePurchase}>
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
                          {availableCities.map((city: string) => (
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
                          {availableBranches.map((b: any) => (
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
                <div className="border border-border rounded-lg p-6 sticky top-24 space-y-4">
                  <h2 className="font-bold text-foreground">Order Summary</h2>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="text-foreground font-medium shrink-0">
                          {formatPrice(
                            item.unitPriceInUSDCents * item.quantity,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">
                        {formatPrice(prescriptionOrder.subtotalInUSDCents)}
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
                      <option value="cash">
                        Cash on Delivery / Collection
                      </option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground py-3 rounded font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 inline mr-2" />
                    )}
                    {isSubmitting ? "Placing Order..." : "Place Order"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="w-full border border-destructive text-destructive py-2 rounded text-sm hover:bg-destructive/5 transition-colors disabled:opacity-50"
                  >
                    {isCancelling ? (
                      <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 inline mr-2" />
                    )}
                    Cancel Prescription Order
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
