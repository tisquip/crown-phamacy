import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { formatPrice } from "@/lib/formatPrice";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  User,
  MapPin,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ChevronsUpDown,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Phone,
  Mail,
  CalendarClock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/Client/$id")({
  component: RouteComponent,
});

// ── Purchase form schema ──────────────────────────────────────────────────────

const purchaseSchema = z.object({
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
});
type PurchaseFormValues = z.infer<typeof purchaseSchema>;

// ── Line-item type ────────────────────────────────────────────────────────────

interface LineItem {
  productId: Id<"products">;
  qty: number;
}

// ── Product combobox ──────────────────────────────────────────────────────────

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

// ── Line-item row ─────────────────────────────────────────────────────────────

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

      <p className="text-sm font-semibold text-foreground w-20 text-right shrink-0">
        {formatPrice(lineTotal)}
      </p>

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

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main route component ──────────────────────────────────────────────────────

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const userId = id as Id<"users">;

  const clientProfile = useQuery(api.adminFns.clients.getClientById, {
    userId,
  });

  const {
    results: receipts,
    status: receiptsStatus,
    loadMore: loadMoreReceipts,
  } = usePaginatedQuery(
    api.adminFns.clients.listClientReceipts,
    { clientId: userId },
    { initialNumItems: 10 },
  );

  const rawProducts = useQuery(api.adminFns.products.list, {}) as
    | Array<Doc<"products">>
    | undefined;
  const allProducts = useMemo(() => rawProducts ?? [], [rawProducts]);

  const createPurchase = useMutation(
    api.adminFns.clients.createDirectPurchaseForClient,
  );

  // ── Purchase builder state ────────────────────────────────────────────────

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

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { phoneNumber: "", address: "" },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  async function onSubmitPurchase(values: PurchaseFormValues) {
    if (lineItems.length === 0) {
      toast.error("Add at least one product to create a purchase");
      return;
    }

    const productIds = lineItems.flatMap((li) =>
      Array(li.qty).fill(li.productId),
    ) as Array<Id<"products">>;

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
        },
      ];
    });

    try {
      const orderId = await createPurchase({
        clientId: userId,
        productIds,
        productsAsJsonOnDateOfPurchase: JSON.stringify(snapshot),
        subtotalInUSDCents: totalCents,
        deliveryFeeInUSDCents: 0,
        totalInUSDCents: totalCents,
        phoneNumber: values.phoneNumber || undefined,
        address: values.address || undefined,
      });
      toast.success("Purchase receipt created successfully");
      setLineItems([]);
      form.reset();
      navigate({ to: "/admin/Order/$id", params: { id: orderId } });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create purchase",
      );
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (clientProfile === undefined) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (clientProfile === null) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <User className="w-10 h-10 opacity-30" />
          <p>Client not found.</p>
          <Link to="/admin/Clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Clients
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isReceiptsLoading = receiptsStatus === "LoadingFirstPage";

  return (
    <AdminLayout>
      {/* Back nav */}
      <div className="mb-5">
        <Link to="/admin/Clients">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Clients
          </Button>
        </Link>
      </div>

      {/* Page title */}
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          {clientProfile.name ?? "Unnamed Client"}
        </h1>
        {clientProfile.isAdmin && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Admin
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column – purchase history + new purchase */}
        <div className="lg:col-span-2 space-y-5">
          {/* Purchase history */}
          <Section
            title={`Purchase History (${receipts.length}${receiptsStatus === "CanLoadMore" ? "+" : ""})`}
            icon={ShoppingBag}
          >
            {isReceiptsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isReceiptsLoading && receipts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No purchases yet.
              </p>
            )}
            {!isReceiptsLoading && receipts.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead>Rx?</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((r) => {
                      const receipt = r as typeof r & {
                        _id: Id<"order">;
                        _creationTime: number;
                        productIds: Array<Id<"products">>;
                        uploadedPrescriptionIds?: Array<
                          Id<"uploadedPrescription">
                        >;
                        totalInUSDCents: number;
                      };
                      const hasPrescription =
                        (receipt.uploadedPrescriptionIds ?? []).length > 0;
                      return (
                        <TableRow
                          key={receipt._id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            navigate({
                              to: "/admin/Order/$id",
                              params: { id: receipt._id },
                            })
                          }
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {receipt._id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarClock className="w-3.5 h-3.5" />
                              {format(
                                new Date(receipt._creationTime),
                                "dd MMM yyyy, HH:mm",
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-foreground">
                            {receipt.productIds?.length ?? 0}
                          </TableCell>
                          <TableCell>
                            {hasPrescription ? (
                              <span className="inline-flex items-center gap-1 text-xs text-primary">
                                <FileText className="w-3 h-3" /> Yes
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold price-text text-sm">
                            {formatPrice(receipt.totalInUSDCents)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {receiptsStatus === "CanLoadMore" && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadMoreReceipts(10)}
                    >
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Load more orders
                    </Button>
                  </div>
                )}
                {receiptsStatus === "LoadingMore" && (
                  <div className="flex justify-center mt-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </Section>

          {/* New purchase builder */}
          <Section
            title="Create Purchase on Behalf of Client"
            icon={ShoppingBag}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitPurchase)}
                className="space-y-4"
              >
                {/* Product picker */}
                <ProductCombobox
                  products={allProducts.filter(
                    (p) => !p.isDeleted && p.inStock,
                  )}
                  selectedIds={selectedIds}
                  onSelect={addProduct}
                />

                {/* Line items */}
                {lineItems.length > 0 && (
                  <div className="border border-border rounded-lg px-3">
                    {lineItems.map((item) => {
                      const product = productMap.get(item.productId);
                      if (!product) return null;
                      return (
                        <ReceiptLineItem
                          key={item.productId}
                          item={item}
                          product={product}
                          onQtyChange={updateQty}
                          onRemove={removeProduct}
                        />
                      );
                    })}
                    <div className="flex justify-between items-center py-3 font-semibold text-sm">
                      <span>Subtotal</span>
                      <span className="price-text">
                        {formatPrice(totalCents)}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Phone + address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          Phone number
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
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
                        <FormLabel className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          Delivery address
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Leave blank for collection"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={lineItems.length === 0}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Create Purchase Receipt &mdash; {formatPrice(totalCents)}
                </Button>
              </form>
            </Form>
          </Section>
        </div>

        {/* Right column – client profile details */}
        <div className="space-y-5">
          {/* Profile info */}
          <Section title="Client Details" icon={User}>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Name
                </p>
                <p className="font-medium text-foreground">
                  {clientProfile.name ?? (
                    <span className="italic text-muted-foreground">
                      No name set
                    </span>
                  )}
                </p>
              </div>
              {(clientProfile as Record<string, unknown>).email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Email
                    </p>
                    <p className="text-foreground break-all">
                      {
                        (clientProfile as Record<string, unknown>)
                          .email as string
                      }
                    </p>
                  </div>
                </div>
              )}
              {(clientProfile as Record<string, unknown>).phoneNumber && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Phone
                    </p>
                    <p className="text-foreground">
                      {
                        (clientProfile as Record<string, unknown>)
                          .phoneNumber as string
                      }
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  User ID
                </p>
                <p className="font-mono text-xs text-muted-foreground break-all">
                  {clientProfile.userId}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Joined
                </p>
                <p className="text-foreground">
                  {format(new Date(clientProfile._creationTime), "dd MMM yyyy")}
                </p>
              </div>
            </div>
          </Section>

          {/* Saved addresses */}
          {clientProfile.addresses && clientProfile.addresses.length > 0 && (
            <Section title="Saved Addresses" icon={MapPin}>
              <ul className="space-y-2">
                {clientProfile.addresses.map((addr, i) => (
                  <li
                    key={i}
                    className="text-sm text-foreground flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    {addr}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
