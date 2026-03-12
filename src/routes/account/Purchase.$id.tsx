import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  RotateCcw,
  Loader2,
  FileText,
  CreditCard,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/account/Purchase/$id")({
  component: RouteComponent,
});

interface OrderSnapshot {
  productId: string;
  name: string;
  quantity: number;
  unitPriceInUSDCents: number;
  brandName: string | null;
  isMedicine?: boolean;
  isPrescriptionControlled?: boolean;
}

const RX_SYMBOL = "℞ Prescription Item";

function censorName(item: OrderSnapshot): string {
  if (item.isMedicine || item.isPrescriptionControlled) return RX_SYMBOL;
  return item.name;
}

function censorBrand(item: OrderSnapshot): string | null {
  if (item.isMedicine || item.isPrescriptionControlled) return null;
  return item.brandName;
}

function RouteComponent() {
  const { id } = Route.useParams();
  const { isLoggedIn } = useAuth();
  const { addToCartWithQuantity, isAuthenticated } = useCart();
  const navigate = Route.useNavigate();

  const order = useQuery(
    api.userFns.orders.getOrder,
    isLoggedIn ? { orderId: id as Id<"order"> } : "skip",
  );

  const paymentTx = useQuery(
    api.paymentFns.paymentTransactions.getTransactionByOrderId,
    isLoggedIn ? { orderId: id as Id<"order"> } : "skip",
  );
  const pollPaynow = useAction(api.paymentFns.paymentActions.pollPaynowStatus);
  const [isPolling, setIsPolling] = useState(false);

  const handlePollStatus = async () => {
    if (!paymentTx || isPolling) return;
    setIsPolling(true);
    try {
      const result = await pollPaynow({
        transactionId: paymentTx._id as Id<"paymentTransaction">,
      });
      if (result.success) {
        toast({
          title: "Payment status updated",
          description: `Status: ${result.status}`,
        });
      } else {
        toast({
          title: "Failed to check status",
          description: result.error ?? "Try again later.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to poll payment status.",
        variant: "destructive",
      });
    } finally {
      setIsPolling(false);
    }
  };

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

  if (order === undefined) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (order === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Order not found.</p>
        </div>
      </Layout>
    );
  }

  const items: OrderSnapshot[] = JSON.parse(
    order.productsAsJsonOnDateOfPurchase,
  );
  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      dispatched: "Dispatched",
      delivered: "Delivered",
      collected: "Collected",
      cancelled: "Cancelled",
    };
    return labels[status] ?? status;
  };

  const reorder = () => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in", description: "Sign in to reorder." });
      return;
    }
    let addedCount = 0;
    for (const item of items) {
      // Skip medication and prescription items — they can't be re-ordered
      if (item.isMedicine || item.isPrescriptionControlled) continue;
      addToCartWithQuantity(item.productId as Id<"products">, item.quantity);
      addedCount++;
    }
    if (addedCount === 0) {
      toast({
        title: "No items to reorder",
        description:
          "This order only contained prescription items which cannot be reordered directly.",
      });
      return;
    }
    toast({
      title: "Reorder added to basket",
      description: `${addedCount} item(s) added to your basket.`,
    });
    navigate({ to: "/cart" });
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
            <Link to="/account/purchases" className="hover:text-primary">
              Purchases
            </Link>{" "}
            &gt; Order #{(order._id as string).slice(-8).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            Order #{(order._id as string).slice(-8).toUpperCase()}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="border border-border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">Date:</span>{" "}
              <span className="font-medium text-foreground">
                {format(new Date(order._creationTime), "dd MMM yyyy, HH:mm")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                {statusLabel(order.status)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Order Type:</span>{" "}
              <span className="font-medium text-foreground capitalize">
                {order.orderIsCollection ? "Branch Collection" : "Delivery"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Payment:</span>{" "}
              <span className="font-medium text-foreground capitalize">
                {order.paymentMethod}
              </span>
            </div>
            {order.orderIsCollection && order.branchDetails && (
              <div className="col-span-2 bg-muted/50 rounded-lg p-3">
                <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
                  Collection Branch
                </span>
                <p className="font-medium text-foreground">
                  {order.branchDetails.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.branchDetails.address}, {order.branchDetails.city}
                </p>
                {order.branchDetails.cell && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tel: {order.branchDetails.cell}
                  </p>
                )}
              </div>
            )}
            {!order.orderIsCollection && order.address && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Delivery address:</span>{" "}
                <span className="font-medium text-foreground">
                  {order.address}
                </span>
              </div>
            )}
            {order.phoneNumber && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Phone:</span>{" "}
                <span className="font-medium text-foreground">
                  {order.phoneNumber}
                </span>
              </div>
            )}
            {order.orderIsCollection && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Delivery Fee:</span>{" "}
                <span className="font-medium text-green-600">
                  FREE (Collection)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Prescription info */}
        {order.uploadedPrescriptionIds &&
          order.uploadedPrescriptionIds.length > 0 && (
            <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-5 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  This order is linked to a prescription
                </h3>
              </div>
              <div className="space-y-1">
                {order.uploadedPrescriptionIds.map(
                  (presId: string, idx: number) => (
                    <Link
                      key={presId}
                      to="/account/Prescription/$id"
                      params={{ id: presId }}
                      className="text-sm text-primary hover:underline block"
                    >
                      View Prescription{" "}
                      {order.uploadedPrescriptionIds.length > 1
                        ? `#${idx + 1}`
                        : ""}{" "}
                      →
                    </Link>
                  ),
                )}
              </div>
            </div>
          )}

        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 text-foreground font-medium">
                  Product
                </th>
                <th className="text-right px-4 py-3 text-foreground font-medium">
                  Qty
                </th>
                <th className="text-right px-4 py-3 text-foreground font-medium">
                  Unit Price
                </th>
                <th className="text-right px-4 py-3 text-foreground font-medium">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div>
                      <p
                        className={`font-medium ${item.isMedicine || item.isPrescriptionControlled ? "text-muted-foreground italic" : "text-foreground"}`}
                      >
                        {censorName(item)}
                      </p>
                      {censorBrand(item) && (
                        <p className="text-xs text-muted-foreground">
                          {censorBrand(item)}
                        </p>
                      )}
                    </div>
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
                  {formatPrice(order.subtotalInUSDCents)}
                </td>
              </tr>
              {order.deliveryFeeInUSDCents > 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-muted-foreground text-right"
                  >
                    Delivery Fee
                  </td>
                  <td className="px-4 py-2 text-right text-foreground">
                    {formatPrice(order.deliveryFeeInUSDCents)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-border">
                <td
                  colSpan={3}
                  className="px-4 py-3 font-bold text-foreground text-right"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right price-text text-lg">
                  {formatPrice(order.totalInUSDCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Transaction */}
        {paymentTx && (
          <div className="border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Payment Transaction</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-muted-foreground">Method:</span>{" "}
                <span className="font-medium text-foreground capitalize">
                  {paymentTx.paymentMethod}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{" "}
                <span className="font-medium text-foreground">
                  {formatPrice(paymentTx.amountInUSDCents)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    paymentTx.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : paymentTx.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {paymentTx.status === "paid" && (
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                  )}
                  {paymentTx.status === "failed" && (
                    <XCircle className="w-3 h-3 inline mr-1" />
                  )}
                  {paymentTx.status === "pending" && (
                    <Clock className="w-3 h-3 inline mr-1" />
                  )}
                  {paymentTx.status.charAt(0).toUpperCase() +
                    paymentTx.status.slice(1)}
                </span>
              </div>
              {paymentTx.transactionReference && (
                <div>
                  <span className="text-muted-foreground">Reference:</span>{" "}
                  <span className="font-medium text-foreground font-mono text-xs">
                    {paymentTx.transactionReference}
                  </span>
                </div>
              )}
              {paymentTx.processedAt && (
                <div>
                  <span className="text-muted-foreground">Processed:</span>{" "}
                  <span className="font-medium text-foreground">
                    {format(
                      new Date(paymentTx.processedAt),
                      "dd MMM yyyy, HH:mm",
                    )}
                  </span>
                </div>
              )}
              {paymentTx.errorMessage && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Error:</span>{" "}
                  <span className="text-red-600 text-xs">
                    {paymentTx.errorMessage}
                  </span>
                </div>
              )}
            </div>
            {paymentTx.status === "pending" && paymentTx.pollUrl && (
              <button
                onClick={handlePollStatus}
                disabled={isPolling}
                className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
              >
                {isPolling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isPolling ? "Checking..." : "Check Payment Status"}
              </button>
            )}
          </div>
        )}

        <button
          onClick={reorder}
          className="flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded font-semibold hover:opacity-90"
        >
          <RotateCcw className="w-4 h-4" /> Reorder
        </button>
      </div>
    </Layout>
  );
}
