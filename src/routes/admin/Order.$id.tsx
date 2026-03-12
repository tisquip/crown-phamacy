import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { format } from "date-fns";
import { formatPrice } from "@/lib/formatPrice";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Package,
  FileText,
  ShieldCheck,
  Loader2,
  CalendarClock,
  CreditCard,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/Order/$id")({
  component: RouteComponent,
});

// ── Prescription preview ──────────────────────────────────────────────────────

function PrescriptionPreview({
  url,
  fileType,
  fileName,
}: {
  url: string | null;
  fileType?: string | null;
  fileName?: string | null;
}) {
  if (!url) return null;
  if (fileType === "pdf") {
    return (
      <iframe
        src={url}
        title={fileName ?? "Prescription PDF"}
        className="w-full h-80 rounded-lg border border-border"
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt={fileName ?? "Prescription"}
        className="w-full max-h-80 object-contain rounded-lg border border-border bg-muted cursor-zoom-in"
      />
    </a>
  );
}

// ── Product snapshot row ──────────────────────────────────────────────────────

// New-format snapshot (from unified order)
interface NewSnapshotItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceInUSDCents: number;
  brandName?: string | null;
}

// Old-format snapshot (from legacy purchaseReceipt — array of product objects)
interface OldSnapshotProduct {
  _id: string;
  name: string;
  stockCode?: string;
  retailPriceInUSDCents: number;
  promotionPriceInUSDCents?: number;
  isMedicine?: boolean;
  isPrescriptionControlled?: boolean;
  packSize?: string;
}

interface GroupedLine {
  id: string;
  name: string;
  stockCode?: string;
  packSize?: string;
  isMedicine?: boolean;
  isPrescriptionControlled?: boolean;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

function parseSnapshot(raw: string): GroupedLine[] {
  let parsed: unknown[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  // Detect new vs old format based on the presence of "quantity" key
  const first = parsed[0] as Record<string, unknown>;

  if ("quantity" in first && "unitPriceInUSDCents" in first) {
    // New format — already grouped with quantity
    return (parsed as NewSnapshotItem[]).map((item) => ({
      id: item.productId,
      name: item.name,
      qty: item.quantity,
      unitPrice: item.unitPriceInUSDCents,
      lineTotal: item.unitPriceInUSDCents * item.quantity,
    }));
  }

  // Old format — array of individual product objects, need to group
  const map = new Map<string, GroupedLine>();
  for (const p of parsed as OldSnapshotProduct[]) {
    const unitPrice = p.promotionPriceInUSDCents ?? p.retailPriceInUSDCents;
    if (map.has(p._id)) {
      const entry = map.get(p._id)!;
      entry.qty += 1;
      entry.lineTotal += unitPrice;
    } else {
      map.set(p._id, {
        id: p._id,
        name: p.name,
        stockCode: p.stockCode,
        packSize: p.packSize,
        isMedicine: p.isMedicine,
        isPrescriptionControlled: p.isPrescriptionControlled,
        qty: 1,
        unitPrice,
        lineTotal: unitPrice,
      });
    }
  }
  return Array.from(map.values());
}

// ── Detail section wrapper ────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main route component ──────────────────────────────────────────────────────

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "dispatched",
  "delivered",
  "collected",
  "cancelled",
] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  dispatched: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  collected: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function RouteComponent() {
  const { id } = Route.useParams();
  const orderId = id as Id<"order">;

  const data = useQuery(api.adminFns.receipts.getReceiptById, {
    id: orderId,
  });

  const paymentTx = useQuery(
    api.paymentFns.paymentTransactions.getTransactionByOrderIdAdmin,
    { orderId },
  );
  const pollPaynow = useAction(api.paymentFns.paymentActions.pollPaynowStatus);
  const [isPolling, setIsPolling] = useState(false);

  const updateOrderStatus = useMutation(
    api.adminFns.receipts.updateOrderStatus,
  );

  const updateCashTxStatus = useMutation(
    api.paymentFns.paymentTransactions.adminUpdateCashTransactionStatus,
  );
  const [isUpdatingCashTx, setIsUpdatingCashTx] = useState(false);

  async function handleCashTxStatusChange(newStatus: string) {
    if (!paymentTx) return;
    setIsUpdatingCashTx(true);
    try {
      await updateCashTxStatus({
        transactionId: paymentTx._id as Id<"paymentTransaction">,
        status: newStatus as "pending" | "paid" | "failed",
      });
      toast.success(`Payment status updated to "${newStatus}"`);
    } catch {
      toast.error("Failed to update payment status");
    } finally {
      setIsUpdatingCashTx(false);
    }
  }

  const handlePollStatus = async () => {
    if (!paymentTx || isPolling) return;
    setIsPolling(true);
    try {
      const result = await pollPaynow({
        transactionId: paymentTx._id as Id<"paymentTransaction">,
      });
      if (result.success) {
        toast.success(`Payment status: ${result.status}`);
      } else {
        toast.error(result.error ?? "Failed to check status");
      }
    } catch {
      toast.error("Failed to poll payment status");
    } finally {
      setIsPolling(false);
    }
  };

  async function handleStatusChange(newStatus: string) {
    try {
      await updateOrderStatus({
        orderId: orderId,
        status: newStatus as (typeof ORDER_STATUSES)[number],
      });
      toast.success(`Order status updated to "${newStatus}"`);
    } catch (error) {
      toast.error("Failed to update order status");
      console.error(error);
    }
  }

  if (data === undefined) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (data === null) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
          <ShoppingBag className="w-10 h-10 opacity-30" />
          <p>Order not found.</p>
          <Link to="/admin/Orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Orders
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { receipt, clientProfile, adminProfile, prescriptions, branchDetails } =
    data as {
      receipt: {
        _id: Id<"order">;
        _creationTime: number;
        clientId: Id<"users">;
        productIds: Array<Id<"products">>;
        adminWhoCreatedOrder?: Id<"users">;
        productsAsJsonOnDateOfPurchase: string;
        subtotalInUSDCents: number;
        deliveryFeeInUSDCents: number;
        totalInUSDCents: number;
        uploadedPrescriptionIds?: Array<Id<"uploadedPrescription">>;
        phoneNumber?: string;
        address?: string;
        status: string;
        deliveryMethod?: string;
        branchCollection?: Id<"branch">;
        orderIsCollection?: boolean;
        paymentMethod?: string;
        notes?: string;
      };
      clientProfile: {
        name?: string;
        userId: Id<"users">;
        email?: string | null;
        phoneNumber?: string | null;
      } | null;
      adminProfile: { name?: string } | null;
      prescriptions: Array<{
        _id: Id<"uploadedPrescription">;
        storageUrl: string | null;
        fileName?: string;
        fileType?: string;
        status: string;
        notes?: string;
        _creationTime: number;
      }>;
      branchDetails: {
        _id: Id<"branch">;
        name: string;
        address: string;
        city: string;
        cell: string;
        landline: string;
        email: string;
      } | null;
    };

  let snapshotLines: GroupedLine[] = [];
  try {
    snapshotLines = parseSnapshot(receipt.productsAsJsonOnDateOfPurchase);
  } catch {
    // If JSON is malformed we show an empty list
  }
  const grouped = snapshotLines;

  return (
    <AdminLayout>
      {/* Back nav */}
      <div className="mb-5">
        <Link to="/admin/Orders">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Orders
          </Button>
        </Link>
      </div>

      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Order{" "}
            <span className="font-mono text-lg text-muted-foreground">
              #{orderId.slice(-8).toUpperCase()}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            {format(
              new Date(receipt._creationTime),
              "EEEE, dd MMMM yyyy 'at' HH:mm",
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Order Total
          </p>
          <p className="text-3xl font-bold price-text">
            {formatPrice(receipt.totalInUSDCents)}
          </p>
        </div>
      </div>

      {/* Order Status */}
      <div className="flex items-center gap-4 mb-6 bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Status:
          </span>
          <Badge className={`capitalize ${statusColors[receipt.status] ?? ""}`}>
            {receipt.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Change to:</span>
          <Select value={receipt.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column – products + prescriptions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Products */}
          <Section title="Products Ordered" icon={Package}>
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No product snapshot available.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {grouped.map((line) => {
                  return (
                    <div
                      key={line.id}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {line.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {line.stockCode && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {line.stockCode}
                            </span>
                          )}
                          {line.packSize && (
                            <span className="text-xs text-muted-foreground">
                              {line.packSize}
                            </span>
                          )}
                          {line.isMedicine && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1 py-0"
                            >
                              Medicine
                            </Badge>
                          )}
                          {line.isPrescriptionControlled && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0"
                            >
                              Rx
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatPrice(line.unitPrice)} × {line.qty}
                        </p>
                      </div>
                      <p className="font-semibold text-sm text-foreground shrink-0">
                        {formatPrice(line.lineTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <Separator className="my-4" />
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(receipt.subtotalInUSDCents)}</span>
            </div>
            {receipt.deliveryFeeInUSDCents > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span>Delivery</span>
                <span>{formatPrice(receipt.deliveryFeeInUSDCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold mt-1">
              <span>Total</span>
              <span className="price-text">
                {formatPrice(receipt.totalInUSDCents)}
              </span>
            </div>
          </Section>

          {/* Prescriptions */}
          {prescriptions.length > 0 && (
            <Section title="Linked Prescriptions" icon={FileText}>
              <div className="space-y-5">
                {prescriptions.map((pres) => (
                  <div key={pres._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {pres.fileName ?? "Prescription"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {pres.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(pres._creationTime), "dd MMM yyyy")}
                      </span>
                    </div>
                    {pres.notes && (
                      <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded">
                        {pres.notes}
                      </p>
                    )}
                    <PrescriptionPreview
                      url={pres.storageUrl}
                      fileType={pres.fileType}
                      fileName={pres.fileName}
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right column – client, admin, delivery */}
        <div className="space-y-5">
          {/* Client details */}
          <Section title="Client" icon={User}>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                {clientProfile?.name ?? "Unknown client"}
              </p>
              {clientProfile?.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {clientProfile.email}
                </p>
              )}
              {clientProfile?.phoneNumber && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {clientProfile.phoneNumber}
                </p>
              )}
              <p className="text-xs text-muted-foreground font-mono break-all">
                ID: {receipt.clientId}
              </p>
              {clientProfile && (
                <Link to="/admin/Client/$id" params={{ id: receipt.clientId }}>
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    <User className="w-3.5 h-3.5 mr-1" />
                    View Client Profile
                  </Button>
                </Link>
              )}
            </div>
          </Section>

          {/* Delivery info */}
          <Section title="Delivery Details" icon={MapPin}>
            <div className="space-y-3 text-sm">
              {/* Order type badge */}
              <div className="flex items-center gap-2">
                {receipt.orderIsCollection ? (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                    Branch Collection
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                    Delivery
                  </span>
                )}
                {receipt.orderIsCollection && (
                  <span className="text-xs text-green-600 font-medium">
                    Delivery fee waived
                  </span>
                )}
              </div>

              {/* Branch details for collection */}
              {receipt.orderIsCollection && branchDetails && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Collection Branch
                  </p>
                  <p className="font-medium text-foreground">
                    {branchDetails.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {branchDetails.address}, {branchDetails.city}
                  </p>
                  <div className="flex gap-4 mt-1">
                    {branchDetails.cell && (
                      <p className="text-xs text-muted-foreground">
                        Cell: {branchDetails.cell}
                      </p>
                    )}
                    {branchDetails.landline && (
                      <p className="text-xs text-muted-foreground">
                        Tel: {branchDetails.landline}
                      </p>
                    )}
                  </div>
                  {branchDetails.email && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {branchDetails.email}
                    </p>
                  )}
                </div>
              )}

              {/* Address (delivery address or branch address) */}
              {!receipt.orderIsCollection && receipt.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Delivery Address
                    </p>
                    <p className="text-foreground">{receipt.address}</p>
                  </div>
                </div>
              )}

              {receipt.phoneNumber && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Phone
                    </p>
                    <p className="text-foreground">{receipt.phoneNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Created by admin */}
          {adminProfile && (
            <Section title="Created by Admin" icon={ShieldCheck}>
              <p className="text-sm text-foreground font-medium">
                {adminProfile.name ?? "Admin"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manually created on behalf of client
              </p>
            </Section>
          )}

          {/* Payment Transaction */}
          {paymentTx && (
            <Section title="Payment Transaction" icon={CreditCard}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium text-foreground capitalize">
                    {paymentTx.paymentMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(paymentTx.amountInUSDCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    className={`capitalize ${
                      paymentTx.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : paymentTx.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {paymentTx.status === "paid" && (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    )}
                    {paymentTx.status === "failed" && (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {paymentTx.status === "pending" && (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {paymentTx.status}
                  </Badge>
                </div>
                {paymentTx.transactionReference && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-xs text-foreground">
                      {paymentTx.transactionReference}
                    </span>
                  </div>
                )}
                {paymentTx.processedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Processed</span>
                    <span className="text-foreground text-xs">
                      {format(
                        new Date(paymentTx.processedAt),
                        "dd MMM yyyy, HH:mm",
                      )}
                    </span>
                  </div>
                )}
                {paymentTx.errorMessage && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-red-600">
                      Error: {paymentTx.errorMessage}
                    </p>
                  </div>
                )}
                {paymentTx.status === "pending" && paymentTx.pollUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handlePollStatus}
                    disabled={isPolling}
                  >
                    {isPolling ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    )}
                    {isPolling ? "Checking..." : "Check Payment Status"}
                  </Button>
                )}
                {paymentTx.paymentMethod === "cash" &&
                  (() => {
                    const isLocked =
                      paymentTx.status === "paid" ||
                      paymentTx.status === "failed";
                    return (
                      <div className="pt-3 border-t border-border mt-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          Update cash payment status:
                        </p>
                        <Select
                          value={paymentTx.status}
                          onValueChange={handleCashTxStatusChange}
                          disabled={isUpdatingCashTx || isLocked}
                        >
                          <SelectTrigger className="w-full">
                            {isUpdatingCashTx ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                        {isLocked && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            This transaction is finalised and cannot be changed.
                          </p>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </Section>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
