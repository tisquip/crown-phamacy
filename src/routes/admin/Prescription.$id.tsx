import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  SendHorizonal,
  ShoppingCart,
  Loader2,
  Plus,
  Minus,
  Trash2,
  ChevronsUpDown,
  FileText,
  Clock,
  PackageCheck,
} from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/Prescription/$id")({
  component: RouteComponent,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PrescriptionStatus =
  | "Uploaded"
  | "Quotation Sent"
  | "Purchased"
  | "Cancelled";

const STATUS_BADGE: Record<
  PrescriptionStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  Uploaded: { variant: "secondary", label: "Uploaded" },
  "Quotation Sent": { variant: "outline", label: "Quotation Sent" },
  Purchased: { variant: "default", label: "Purchased" },
  Cancelled: { variant: "destructive", label: "Cancelled" },
};

// ── Line-item type used in the purchase builder ───────────────────────────────

interface LineItem {
  productId: Id<"products">;
  qty: number;
}

// ── Purchase form schema ──────────────────────────────────────────────────────

const purchaseSchema = z.object({
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
});
type PurchaseFormValues = z.infer<typeof purchaseSchema>;

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
  if (!url) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg text-muted-foreground text-sm">
        No preview available
      </div>
    );
  }
  if (fileType === "pdf") {
    return (
      <iframe
        src={url}
        title={fileName ?? "Prescription PDF"}
        className="w-full h-96 rounded-lg border border-border"
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt={fileName ?? "Prescription"}
        className="w-full max-h-96 object-contain rounded-lg border border-border bg-muted cursor-zoom-in"
      />
    </a>
  );
}

// ── Receipt line-item row ──────────────────────────────────────────────────────

function ReceiptLineItem({
  item,
  product,
  onQtyChange,
  onRemove,
}: {
  item: LineItem;
  product: Doc<"products">;
  onQtyChange: (productId: Id<"products">, qty: number) => void;
  onRemove: (productId: Id<"products">) => void;
}) {
  const unitPrice =
    product.promotionPriceInUSDCents ?? product.retailPriceInUSDCents;
  const lineTotal = unitPrice * item.qty;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {product.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatPrice(unitPrice)} each
          {product.isMedicine && (
            <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
              Medicine
            </Badge>
          )}
          {product.isPrescriptionControlled && (
            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
              Rx
            </Badge>
          )}
        </p>
      </div>

      {/* Qty stepper */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onQtyChange(item.productId, item.qty - 1)}
          disabled={item.qty <= 1}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="number"
          min={1}
          value={item.qty}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 1) onQtyChange(item.productId, v);
          }}
          className="h-7 w-14 text-center text-sm px-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onQtyChange(item.productId, item.qty + 1)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Line total */}
      <p className="text-sm font-semibold text-foreground w-20 text-right shrink-0">
        {formatPrice(lineTotal)}
      </p>

      {/* Remove */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onRemove(item.productId)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Product search combobox ───────────────────────────────────────────────────

function ProductCombobox({
  products,
  selectedIds,
  onSelect,
}: {
  products: Array<Doc<"products">>;
  selectedIds: Set<string>;
  onSelect: (product: Doc<"products">) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="text-muted-foreground">
            Search and add a product…
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products…" />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => {
                const alreadyAdded = selectedIds.has(product._id);
                const unitPrice =
                  product.promotionPriceInUSDCents ??
                  product.retailPriceInUSDCents;
                return (
                  <CommandItem
                    key={product._id}
                    value={`${product.name} ${product.stockCode}`}
                    onSelect={() => {
                      if (!alreadyAdded) onSelect(product);
                      setOpen(false);
                    }}
                    className={cn(alreadyAdded && "opacity-50")}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {product.stockCode}
                        </span>
                        {product.isMedicine && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px] px-1 py-0"
                          >
                            Medicine
                          </Badge>
                        )}
                        {product.isPrescriptionControlled && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-[10px] px-1 py-0"
                          >
                            Rx
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">
                        {formatPrice(unitPrice)}
                      </span>
                      {alreadyAdded && (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Main route component ──────────────────────────────────────────────────────

// ── Quotation view (shown when status is "Quotation Sent") ────────────────────

interface QuotationLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceInUSDCents: number;
  brandName: string | null;
  isMedicine?: boolean;
  isPrescriptionControlled?: boolean;
}

function QuotationView({
  prescriptionOrder,
}: {
  prescriptionOrder: Record<string, unknown> | null | undefined;
}) {
  if (!prescriptionOrder) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-center h-40 text-sm text-muted-foreground">
        No quotation data found.
      </div>
    );
  }

  const items: QuotationLineItem[] = (() => {
    try {
      return JSON.parse(prescriptionOrder.productsAsJson as string);
    } catch {
      return [];
    }
  })();

  const totalCents = prescriptionOrder.totalInUSDCents as number;
  const subtotalCents = prescriptionOrder.subtotalInUSDCents as number;
  const status = prescriptionOrder.status as string;
  const expiresAt = prescriptionOrder.expiresAt as number;
  const isExpired = Date.now() > expiresAt;
  const resultingOrderId = prescriptionOrder.resultingOrderId as
    | Id<"order">
    | undefined;

  const statusColors: Record<string, string> = {
    pending:
      "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
    purchased:
      "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
    cancelled:
      "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
    expired:
      "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400",
  };
  const statusLabel: Record<string, string> = {
    pending: isExpired
      ? "Expired (awaiting cleanup)"
      : "Pending — awaiting client action",
    purchased: "Purchased",
    cancelled: "Cancelled by client",
    expired: "Expired",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-5">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">
          Quotation Sent to Client
        </h2>
      </div>

      <Separator />

      {/* Status badge */}
      <div
        className={`flex items-center gap-2 text-xs font-medium rounded-lg border px-3 py-2 ${statusColors[status] ?? statusColors.expired}`}
      >
        {status === "purchased" ? (
          <PackageCheck className="w-4 h-4 shrink-0" />
        ) : status === "pending" && !isExpired ? (
          <Clock className="w-4 h-4 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 shrink-0" />
        )}
        <span>{statusLabel[status] ?? status}</span>
        {status === "pending" && !isExpired && (
          <span className="ml-auto text-muted-foreground font-normal">
            Expires{" "}
            {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {resultingOrderId && (
        <Link
          to={`/admin/Order/${resultingOrderId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <PackageCheck className="w-3.5 h-3.5" />
          View resulting order →
        </Link>
      )}

      {/* Line items */}
      <div className="bg-muted/40 rounded-lg border border-border">
        <div className="px-4">
          {items.map((item, i) => {
            const lineTotal = item.unitPriceInUSDCents * item.quantity;
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatPrice(item.unitPriceInUSDCents)} each
                    {item.isMedicine && (
                      <Badge
                        variant="secondary"
                        className="ml-2 text-[10px] px-1 py-0"
                      >
                        Medicine
                      </Badge>
                    )}
                    {item.isPrescriptionControlled && (
                      <Badge
                        variant="outline"
                        className="ml-1 text-[10px] px-1 py-0"
                      >
                        Rx
                      </Badge>
                    )}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground w-10 text-center shrink-0">
                  ×{item.quantity}
                </p>
                <p className="text-sm font-semibold text-foreground w-20 text-right shrink-0">
                  {formatPrice(lineTotal)}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-b-lg border-t border-border">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">
            {formatPrice(totalCents)}
          </span>
        </div>
      </div>

      {/* Contact details */}
      {(prescriptionOrder.phoneNumber || prescriptionOrder.address) && (
        <dl className="text-sm space-y-1">
          {prescriptionOrder.phoneNumber && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">Phone</dt>
              <dd className="text-foreground">
                {prescriptionOrder.phoneNumber as string}
              </dd>
            </div>
          )}
          {prescriptionOrder.address && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">Address</dt>
              <dd className="text-foreground">
                {prescriptionOrder.address as string}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="text-xs text-muted-foreground">
        Sent{" "}
        {format(
          new Date(prescriptionOrder._creationTime as number),
          "dd MMM yyyy HH:mm",
        )}
      </div>
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const prescriptionId = id as Id<"uploadedPrescription">;

  const data = useQuery(api.adminFns.prescriptions.getPrescriptionWithClient, {
    id: prescriptionId,
  });

  const existingPrescriptionOrder = useQuery(
    api.adminFns.prescriptions.getPrescriptionOrderForPrescription,
    { prescriptionId },
  );

  const rawProducts = useQuery(api.adminFns.products.list, {}) as
    | Array<Doc<"products">>
    | undefined;
  const allProducts = useMemo(() => rawProducts ?? [], [rawProducts]);

  const updateStatus = useMutation(
    api.adminFns.prescriptions.updatePrescriptionStatus,
  );
  const createPrescriptionOrder = useMutation(
    api.adminFns.prescriptions.createPrescriptionOrder,
  );

  // ── Purchase builder state ──────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState<Array<LineItem>>([]);

  const selectedIds = useMemo(
    () => new Set(lineItems.map((li) => li.productId as string)),
    [lineItems],
  );

  const productMap = useMemo(() => {
    const map = new Map<string, Doc<"products">>();
    for (const p of allProducts) map.set(p._id, p);
    return map;
  }, [allProducts]);

  const totalCents = useMemo(
    () =>
      lineItems.reduce((sum, li) => {
        const product = productMap.get(li.productId);
        if (!product) return sum;
        const unitPrice =
          product.promotionPriceInUSDCents ?? product.retailPriceInUSDCents;
        return sum + unitPrice * li.qty;
      }, 0),
    [lineItems, productMap],
  );

  // ── Form ────────────────────────────────────────────────────────────────────
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { phoneNumber: "", address: "" },
  });

  // Pre-populate phone/address from the client's profile
  useEffect(() => {
    if (data) {
      if (data.clientPhoneNumber && !form.getValues("phoneNumber")) {
        form.setValue("phoneNumber", data.clientPhoneNumber);
      }
      if (data.clientAddress && !form.getValues("address")) {
        form.setValue("address", data.clientAddress);
      }
    }
  }, [data, form]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function addProduct(product: Doc<"products">) {
    setLineItems((prev) => [...prev, { productId: product._id, qty: 1 }]);
  }

  function updateQty(productId: Id<"products">, qty: number) {
    setLineItems((prev) =>
      prev.map((li) => (li.productId === productId ? { ...li, qty } : li)),
    );
  }

  function removeProduct(productId: Id<"products">) {
    setLineItems((prev) => prev.filter((li) => li.productId !== productId));
  }

  async function handleStatusChange(status: "Uploaded" | "Cancelled") {
    try {
      await updateStatus({ id: prescriptionId, status });
      toast.success(`Status updated to "${status}"`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  }

  async function onSubmitPurchase(values: PurchaseFormValues) {
    if (lineItems.length === 0) {
      toast.error("Add at least one product to create a prescription order");
      return;
    }

    const productIds = lineItems.flatMap((li) =>
      Array(li.qty).fill(li.productId),
    ) as Array<Id<"products">>;

    // Build snapshot using new grouped format
    const snapshot = lineItems.flatMap((li) => {
      const product = productMap.get(li.productId);
      if (!product) return [];
      const unitPrice =
        product.promotionPriceInUSDCents ?? product.retailPriceInUSDCents;
      return [
        {
          productId: product._id,
          name: product.name,
          quantity: li.qty,
          unitPriceInUSDCents: unitPrice,
          brandName: product.brandName ?? null,
          isMedicine: product.isMedicine,
          isPrescriptionControlled: product.isPrescriptionControlled,
        },
      ];
    });

    try {
      await createPrescriptionOrder({
        prescriptionId,
        productIds,
        productsAsJson: JSON.stringify(snapshot),
        subtotalInUSDCents: totalCents,
        totalInUSDCents: totalCents,
        phoneNumber: values.phoneNumber || undefined,
        address: values.address || undefined,
      });
      toast.success("Prescription order created — quotation sent to client");
      setLineItems([]);
      form.reset();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create prescription order",
      );
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────

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
        <div className="py-16 text-center">
          <p className="text-muted-foreground mb-4">Prescription not found.</p>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/admin/Prescriptions" })}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Prescriptions
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const prescription = data.prescription as Doc<"uploadedPrescription">;
  const statusInfo =
    STATUS_BADGE[prescription.status as PrescriptionStatus] ??
    STATUS_BADGE["Uploaded"];
  const isPurchased = prescription.status === "Purchased";
  const isCancelled = prescription.status === "Cancelled";
  const isActionable = !isPurchased && !isCancelled;

  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link
          to="/admin/Prescriptions"
          className="hover:text-foreground transition-colors"
        >
          Prescriptions
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-xs">
          {prescription._id}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: details + preview ── */}
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Prescription Details
                </h1>
                <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                  {prescription._id}
                </p>
              </div>
              <Badge variant={statusInfo.variant} className="shrink-0">
                {statusInfo.label}
              </Badge>
            </div>

            <Separator />

            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-32 shrink-0">Client</dt>
                <dd className="font-medium text-foreground">
                  {data.clientName ?? prescription.clientId}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-32 shrink-0">
                  Submitted
                </dt>
                <dd className="text-foreground">
                  {format(
                    new Date(prescription._creationTime),
                    "dd MMM yyyy HH:mm",
                  )}
                </dd>
              </div>
              {prescription.fileName && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-32 shrink-0">File</dt>
                  <dd className="text-foreground">{prescription.fileName}</dd>
                </div>
              )}
              {prescription.notes && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-32 shrink-0">Notes</dt>
                  <dd className="text-foreground bg-muted rounded px-2 py-1 text-xs flex-1">
                    {prescription.notes}
                  </dd>
                </div>
              )}
            </dl>

            {/* Status actions */}
            {isActionable && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusChange("Cancelled")}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancel Prescription
                  </Button>
                </div>
              </>
            )}

            {isPurchased && (
              <div className="flex items-center gap-2 text-sm text-green-600 pt-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Purchase complete — no further changes allowed.
              </div>
            )}

            {isCancelled && (
              <div className="flex items-center gap-2 text-sm text-destructive pt-1">
                <XCircle className="w-4 h-4 shrink-0" />
                This prescription has been cancelled.
              </div>
            )}
          </div>

          {/* Preview card */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Prescription Image / Document
            </h2>
            <PrescriptionPreview
              url={data.storageUrl ?? null}
              fileType={prescription.fileType}
              fileName={prescription.fileName}
            />
          </div>
        </div>

        {/* ── Right column: quotation view or purchase builder ── */}
        <div>
          {prescription.status === "Quotation Sent" && isActionable ? (
            <QuotationView
              prescriptionOrder={
                existingPrescriptionOrder as
                  | Record<string, unknown>
                  | null
                  | undefined
              }
            />
          ) : isActionable ? (
            <div className="bg-card border border-border rounded-lg p-5 space-y-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  Create Prescription Order
                </h2>
              </div>

              <Separator />

              {/* Product search */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Add Products
                </p>
                <ProductCombobox
                  products={allProducts}
                  selectedIds={selectedIds}
                  onSelect={addProduct}
                />
              </div>

              {/* Receipt */}
              {lineItems.length > 0 ? (
                <div className="bg-muted/40 rounded-lg border border-border">
                  {/* Line items */}
                  <div className="px-4">
                    {lineItems.map((li) => {
                      const product = productMap.get(li.productId);
                      if (!product) return null;
                      return (
                        <ReceiptLineItem
                          key={li.productId}
                          item={li}
                          product={product}
                          onQtyChange={updateQty}
                          onRemove={removeProduct}
                        />
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-b-lg border-t border-border">
                    <span className="text-sm font-semibold text-foreground">
                      Total
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {formatPrice(totalCents)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground">
                  No products added yet
                </div>
              )}

              {/* Contact details form */}
              <Form {...form}>
                <form
                  id="purchase-form"
                  onSubmit={form.handleSubmit(onSubmitPurchase)}
                  className="space-y-3"
                >
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 555 000 0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Leave blank for collection"
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              <Separator />

              <Button
                form="purchase-form"
                type="submit"
                className="w-full"
                disabled={lineItems.length === 0 || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4 mr-2" />
                )}
                Send Prescription Order — {formatPrice(totalCents)}
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-center h-40 text-sm text-muted-foreground">
              {isPurchased
                ? "Purchase has been completed for this prescription."
                : "This prescription has been cancelled."}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
