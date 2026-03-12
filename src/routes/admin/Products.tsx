import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { CdnImageUpload } from "@/components/CdnImageUpload";
import { StorageImage } from "@/components/StorageImage";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  ChevronsUpDown,
  Check,
  X,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// ── Search params schema ──────────────────────────────────────────────────────
const sortOptions = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "newest",
  "oldest",
] as const;

const adminProductSearchSchema = z.object({
  search: fallback(z.string(), "").default(""),
  brandId: fallback(z.string(), "").default(""),
  categoryId: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(sortOptions), "newest").default("newest"),
  medication: fallback(z.boolean(), false).default(false),
  prescribed: fallback(z.boolean(), false).default(false),
  activeOnly: fallback(z.boolean(), false).default(false),
  inStock: fallback(z.boolean(), false).default(false),
  hasPromo: fallback(z.boolean(), false).default(false),
  hasBulkPrice: fallback(z.boolean(), false).default(false),
});

type AdminProductSearch = z.infer<typeof adminProductSearchSchema>;

export const Route = createFileRoute("/admin/Products")({
  validateSearch: zodValidator(adminProductSearchSchema),
  component: RouteComponent,
});

// ── Zod schema ────────────────────────────────────────────────────────────────
const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  stockCode: z.string().min(1, "Stock code is required"),
  description: z.string().min(1, "Description is required"),
  detailedDescription: z.string().optional(),
  barcode: z.string().optional(),
  brandId: z.string().optional(),
  productCategoryIds: z.array(z.string()).optional(),
  retailPriceUSD: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: "Enter a valid price",
    }),
  promotionPriceUSD: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), {
      message: "Enter a valid price",
    }),
  bulkOfferPriceUSD: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), {
      message: "Enter a valid price",
    }),
  bulkOfferQty: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(parseInt(v)) && parseInt(v) > 0), {
      message: "Enter a valid quantity",
    }),
  packSize: z.string().optional(),
  isMedicine: z.boolean(),
  isPrescriptionControlled: z.boolean(),
  inStock: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;
type ProductDoc = Doc<"products">;
type BrandDoc = Doc<"productBrand">;
type CategoryDoc = Doc<"productCategory">;

// ── Dollar ↔ cents helpers ────────────────────────────────────────────────────
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: string): number {
  return Math.round(parseFloat(dollars) * 100);
}

// ── Combobox: single select ───────────────────────────────────────────────────
function SingleCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? selected.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4 text-muted-foreground" />
                  Clear selection
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Combobox: multi-select ────────────────────────────────────────────────────
function MultiCombobox({
  values,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }

  const selectedLabels = options
    .filter((o) => values.includes(o.value))
    .map((o) => o.label);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {values.length === 0 ? placeholder : `${values.length} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        values.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((label, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {label}
              <button
                type="button"
                title={`Remove ${label}`}
                onClick={() =>
                  toggle(options.find((o) => o.label === label)!.value)
                }
                className="rounded-sm hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product form sheet ────────────────────────────────────────────────────────
function ProductFormSheet({
  open,
  onOpenChange,
  editItem,
  brands,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: ProductDoc | null;
  brands: BrandDoc[];
  categories: CategoryDoc[];
}) {
  const createProduct = useMutation(api.adminFns.products.create);
  const updateProduct = useMutation(api.adminFns.products.update);
  const deleteCdnFile = useAction(api.cdn.deleteFile);
  const isEditing = !!editItem;

  const activeBrands = brands
    .filter((b) => !b.isDeleted)
    .sort((a, b) => a.name.localeCompare(b.name));
  const activeCategories = categories.filter((c) => !c.isDeleted);

  const brandOptions = activeBrands.map((b) => ({
    label: b.name,
    value: b._id,
  }));
  const categoryOptions = activeCategories.map((c) => ({
    label: c.name,
    value: c._id,
  }));

  const [storageIdsImages, setStorageIdsImages] = useState<Id<"_storage">[]>(
    editItem?.storageIdsImages ?? [],
  );
  const [cdnImages, setCdnImages] = useState<
    Array<{ url: string; key: string }>
  >(editItem?.cdnImages ?? []);

  // Sync image state when editItem changes
  useEffect(() => {
    setStorageIdsImages(editItem?.storageIdsImages ?? []);
    setCdnImages(editItem?.cdnImages ?? []);
  }, [editItem]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    values: editItem
      ? {
          name: editItem.name,
          stockCode: editItem.stockCode,
          description: editItem.description,
          detailedDescription: editItem.detailedDescription ?? "",
          barcode: editItem.barcode ?? "",
          brandId: editItem.brandId ?? "",
          productCategoryIds: editItem.productCategoryIds ?? [],
          retailPriceUSD: centsToDollars(editItem.retailPriceInUSDCents),
          promotionPriceUSD: editItem.promotionPriceInUSDCents
            ? centsToDollars(editItem.promotionPriceInUSDCents)
            : "",
          bulkOfferPriceUSD: editItem.bulkOfferPriceInUSDCents
            ? centsToDollars(editItem.bulkOfferPriceInUSDCents)
            : "",
          bulkOfferQty: editItem.bulkOfferQty
            ? String(editItem.bulkOfferQty)
            : "",
          packSize: editItem.packSize ?? "",
          isMedicine: editItem.isMedicine,
          isPrescriptionControlled: editItem.isPrescriptionControlled,
          inStock: editItem.inStock,
        }
      : {
          name: "",
          stockCode: "",
          description: "",
          detailedDescription: "",
          barcode: "",
          brandId: "",
          productCategoryIds: [],
          retailPriceUSD: "",
          promotionPriceUSD: "",
          bulkOfferPriceUSD: "",
          bulkOfferQty: "",
          packSize: "",
          isMedicine: false,
          isPrescriptionControlled: false,
          inStock: true,
        },
  });

  async function onSubmit(values: ProductFormValues) {
    try {
      const payload = {
        name: values.name,
        stockCode: values.stockCode,
        description: values.description,
        detailedDescription: values.detailedDescription || undefined,
        barcode: values.barcode || undefined,
        brandId: (values.brandId || undefined) as
          | Id<"productBrand">
          | undefined,
        productCategoryIds: (values.productCategoryIds?.length
          ? values.productCategoryIds
          : undefined) as Array<Id<"productCategory">> | undefined,
        storageIdsImages: storageIdsImages.length
          ? storageIdsImages
          : undefined,
        cdnImages: cdnImages.length ? cdnImages : undefined,
        retailPriceInUSDCents: dollarsToCents(values.retailPriceUSD),
        promotionPriceInUSDCents: values.promotionPriceUSD
          ? dollarsToCents(values.promotionPriceUSD)
          : undefined,
        bulkOfferPriceInUSDCents: values.bulkOfferPriceUSD
          ? dollarsToCents(values.bulkOfferPriceUSD)
          : undefined,
        bulkOfferQty: values.bulkOfferQty
          ? parseInt(values.bulkOfferQty)
          : undefined,
        packSize: values.packSize || undefined,
        isMedicine: values.isMedicine,
        isPrescriptionControlled: values.isPrescriptionControlled,
        inStock: values.inStock,
      };

      if (isEditing && editItem) {
        await updateProduct({ id: editItem._id, ...payload });
        toast.success("Product updated successfully");
      } else {
        await createProduct(payload);
        toast.success("Product created successfully");
      }
      form.reset();
      setStorageIdsImages([]);
      setCdnImages([]);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Product" : "Add Product"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form
              id="product-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5 pb-6"
            >
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Panado 500mg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stockCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PAN500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short description..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="detailedDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional detailed description..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brand & Categories */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <SingleCombobox
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          options={brandOptions}
                          placeholder="Select brand..."
                          searchPlaceholder="Search brands..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="packSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pack Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 20 tablets" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="productCategoryIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categories</FormLabel>
                    <FormControl>
                      <MultiCombobox
                        values={field.value ?? []}
                        onChange={field.onChange}
                        options={categoryOptions}
                        placeholder="Select categories..."
                        searchPlaceholder="Search categories..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="retailPriceUSD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retail Price (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-6"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="promotionPriceUSD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promo Price (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Optional"
                            className="pl-6"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bulkOfferPriceUSD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bulk Price (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Optional"
                            className="pl-6"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bulkOfferQty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bulk Min Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Optional"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Flags */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="inStock"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        In Stock
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isMedicine"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Is Medicine
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isPrescriptionControlled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="font-normal cursor-pointer">
                          Prescription Controlled
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Requires a valid prescription to purchase.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Product Images */}
              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">
                  Product Images
                </p>
                {/* Legacy storage images (read-only display for old products) */}
                {storageIdsImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {storageIdsImages.map((id, idx) => (
                      <div key={id} className="relative">
                        <StorageImage
                          storageId={id}
                          className="w-20 h-20 rounded-md object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setStorageIdsImages((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow hover:bg-destructive/90 transition-colors"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* CDN images */}
                {cdnImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {cdnImages.map((img, idx) => (
                      <div key={img.key} className="relative">
                        <img
                          src={img.url}
                          alt="Product"
                          className="w-20 h-20 rounded-md object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            void deleteCdnFile({ key: img.key }).catch(
                              () => {},
                            );
                            setCdnImages((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                          }}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow hover:bg-destructive/90 transition-colors"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <CdnImageUpload
                  hidePreview
                  keyPrefix="products"
                  onUploadComplete={(result) =>
                    setCdnImages((prev) => [
                      ...prev,
                      { url: result.cdnUrl, key: result.key },
                    ])
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="product-form"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : isEditing
                      ? "Save Changes"
                      : "Create Product"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Main route component ──────────────────────────────────────────────────────
function RouteComponent() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();

  // Typed helper – works around TanStack Router generic inference limitations
  // when the route uses zodValidator with default values.
  const navigateSearch = useCallback(
    (search: Partial<AdminProductSearch>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (navigate as any)({
        to: "/admin/Products",
        search,
        replace: true,
      });
    },
    [navigate],
  );

  const products = useQuery(api.adminFns.products.list, {
    includeDeleted: true,
  }) as ProductDoc[] | undefined;

  const brands = useQuery(api.adminFns.brands.list, {
    includeDeleted: true,
  }) as BrandDoc[] | undefined;

  const categories = useQuery(api.adminFns.productCategories.list, {
    includeDeleted: true,
  }) as CategoryDoc[] | undefined;

  const softDelete = useMutation(api.adminFns.products.softDelete);
  const restore = useMutation(api.adminFns.products.restore);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductDoc | null>(null);
  const [deleteItem, setDeleteItem] = useState<ProductDoc | null>(null);

  // Local input state for debounced search
  const [searchInput, setSearchInput] = useState(searchParams.search);

  // Sync local input when URL search param changes externally (e.g. clear all)
  useEffect(() => {
    setSearchInput(searchParams.search);
  }, [searchParams.search]);

  // Debounce: push search text to URL after 400ms of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParams.search) {
        navigateSearch({ ...searchParams, search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, navigateSearch]);

  // Helper to update a single search param
  function setParam<K extends keyof AdminProductSearch>(
    key: K,
    value: AdminProductSearch[K],
  ) {
    const next = { ...searchParams, [key]: value };
    // Remove falsy values to keep URL clean
    if (next[key] === "" || next[key] === false || next[key] === undefined) {
      delete (next as Record<string, unknown>)[key];
    }
    // Remove defaults to keep URL clean
    if (next.sort === "newest") delete (next as Record<string, unknown>).sort;
    navigateSearch(next);
  }

  // Toggle a boolean filter chip
  function toggleBoolParam(key: keyof AdminProductSearch) {
    const current = searchParams[key];
    setParam(key, !current as AdminProductSearch[typeof key]);
  }

  // Check if any filters/search are active
  const hasActiveFilters =
    searchParams.search !== "" ||
    searchParams.brandId !== "" ||
    searchParams.categoryId !== "" ||
    searchParams.sort !== "newest" ||
    searchParams.medication ||
    searchParams.prescribed ||
    searchParams.activeOnly ||
    searchParams.inStock ||
    searchParams.hasPromo ||
    searchParams.hasBulkPrice;

  function clearAllFilters() {
    setSearchInput("");
    navigateSearch({});
  }

  // Active (non-deleted) brands and categories for filter dropdowns
  const activeBrands = useMemo(
    () => (brands ?? []).filter((b) => !b.isDeleted),
    [brands],
  );
  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => !c.isDeleted),
    [categories],
  );

  // Brand map for display
  const brandMap = useMemo(
    () => new Map<string, string>((brands ?? []).map((b) => [b._id, b.name])),
    [brands],
  );

  // Category map for display
  const categoryMap = useMemo(
    () =>
      new Map<string, string>((categories ?? []).map((c) => [c._id, c.name])),
    [categories],
  );

  // Filter + sort products
  const filteredProducts = useMemo(() => {
    let result = products ?? [];

    // Text search
    if (searchParams.search) {
      const q = searchParams.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.stockCode.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      );
    }

    // Brand filter
    if (searchParams.brandId) {
      result = result.filter((p) => p.brandId === searchParams.brandId);
    }

    // Category filter
    if (searchParams.categoryId) {
      result = result.filter((p) =>
        p.productCategoryIds?.includes(
          searchParams.categoryId as Id<"productCategory">,
        ),
      );
    }

    // Boolean filters
    if (searchParams.medication) result = result.filter((p) => p.isMedicine);
    if (searchParams.prescribed)
      result = result.filter((p) => p.isPrescriptionControlled);
    if (searchParams.activeOnly) result = result.filter((p) => !p.isDeleted);
    if (searchParams.inStock) result = result.filter((p) => p.inStock);
    if (searchParams.hasPromo)
      result = result.filter((p) => !!p.promotionPriceInUSDCents);
    if (searchParams.hasBulkPrice)
      result = result.filter((p) => !!p.bulkOfferPriceInUSDCents);

    // Sort
    const sorted = [...result];
    switch (searchParams.sort) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        sorted.sort(
          (a, b) => a.retailPriceInUSDCents - b.retailPriceInUSDCents,
        );
        break;
      case "price-desc":
        sorted.sort(
          (a, b) => b.retailPriceInUSDCents - a.retailPriceInUSDCents,
        );
        break;
      case "oldest":
        sorted.sort((a, b) => a._creationTime - b._creationTime);
        break;
      case "newest":
      default:
        sorted.sort((a, b) => b._creationTime - a._creationTime);
        break;
    }

    return sorted;
  }, [products, searchParams]);

  function handleEdit(item: ProductDoc) {
    setEditItem(item);
    setSheetOpen(true);
  }

  function handleAdd() {
    setEditItem(null);
    setSheetOpen(true);
  }

  function handleSheetClose(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditItem(null);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await softDelete({ id: deleteItem._id });
      toast.success("Product deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setDeleteItem(null);
    }
  }

  async function handleRestore(item: ProductDoc) {
    try {
      await restore({ id: item._id });
      toast.success("Product restored");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Search, Sort & Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search input */}
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="Search by name, stock code, or barcode…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Brand filter */}
          <div className="w-[180px]">
            <Select
              value={searchParams.brandId || "__all__"}
              onValueChange={(val) =>
                setParam("brandId", val === "__all__" ? "" : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Brands</SelectItem>
                {activeBrands.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category filter */}
          <div className="w-[180px]">
            <Select
              value={searchParams.categoryId || "__all__"}
              onValueChange={(val) =>
                setParam("categoryId", val === "__all__" ? "" : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {activeCategories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="w-[180px]">
            <Select
              value={searchParams.sort}
              onValueChange={(val) =>
                setParam("sort", val as AdminProductSearch["sort"])
              }
            >
              <SelectTrigger>
                <ArrowUpDown className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A → Z</SelectItem>
                <SelectItem value="name-desc">Name Z → A</SelectItem>
                <SelectItem value="price-asc">Price Low → High</SelectItem>
                <SelectItem value="price-desc">Price High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium mr-1">
            Filters:
          </span>
          <FilterChip
            label="Medication"
            active={searchParams.medication}
            onToggle={() => toggleBoolParam("medication")}
          />
          <FilterChip
            label="Prescribed"
            active={searchParams.prescribed}
            onToggle={() => toggleBoolParam("prescribed")}
          />
          <FilterChip
            label="Active only"
            active={searchParams.activeOnly}
            onToggle={() => toggleBoolParam("activeOnly")}
          />
          <FilterChip
            label="In Stock"
            active={searchParams.inStock}
            onToggle={() => toggleBoolParam("inStock")}
          />
          <FilterChip
            label="Has Promo"
            active={searchParams.hasPromo}
            onToggle={() => toggleBoolParam("hasPromo")}
          />
          <FilterChip
            label="Has Bulk Price"
            active={searchParams.hasBulkPrice}
            onToggle={() => toggleBoolParam("hasBulkPrice")}
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>

        {/* Active filter summary */}
        {(searchParams.brandId || searchParams.categoryId) && (
          <div className="flex flex-wrap gap-1.5">
            {searchParams.brandId && brandMap.get(searchParams.brandId) && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Brand: {brandMap.get(searchParams.brandId)}
                <button
                  type="button"
                  title="Remove brand filter"
                  onClick={() => setParam("brandId", "")}
                  className="rounded-sm hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {searchParams.categoryId &&
              categoryMap.get(searchParams.categoryId) && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Category: {categoryMap.get(searchParams.categoryId)}
                  <button
                    type="button"
                    title="Remove category filter"
                    onClick={() => setParam("categoryId", "")}
                    className="rounded-sm hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Images</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products === undefined ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  {products.length === 0
                    ? "No products yet. Add one to get started."
                    : "No products match your search or filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow
                  key={product._id}
                  className={product.isDeleted ? "opacity-50" : ""}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {product.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-medium">Brand:</span>{" "}
                        {product.brandId
                          ? (brandMap.get(product.brandId) ?? "—")
                          : "—"}
                      </div>
                      <div>
                        <span className="font-medium">Stock Code:</span>{" "}
                        {product.stockCode}
                      </div>
                      <div>
                        <span className="font-medium">Barcode:</span>{" "}
                        {product.barcode ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Pack Size:</span>{" "}
                        {product.packSize ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Medication:</span>{" "}
                        {product.isMedicine ? "Yes" : "No"}
                      </div>
                      <div>
                        <span className="font-medium">Prescribed:</span>{" "}
                        {product.isPrescriptionControlled ? "Yes" : "No"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="space-y-0.5">
                      <div>
                        ${centsToDollars(product.retailPriceInUSDCents)}
                      </div>
                      {product.promotionPriceInUSDCents ? (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Promo:</span> $
                          {centsToDollars(product.promotionPriceInUSDCents)}
                        </div>
                      ) : null}
                      {product.bulkOfferPriceInUSDCents ? (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Bulk:</span> $
                          {centsToDollars(product.bulkOfferPriceInUSDCents)}
                          {product.bulkOfferQty
                            ? ` (min ${product.bulkOfferQty})`
                            : ""}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.cdnImages?.length ||
                    product.storageIdsImages?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {product.cdnImages?.map((img) => (
                          <img
                            key={img.key}
                            src={img.url}
                            alt="Product"
                            className="w-10 h-10 rounded-md object-cover border border-border"
                          />
                        ))}
                        {product.storageIdsImages?.map((id) => (
                          <StorageImage
                            key={id}
                            storageId={id}
                            className="w-10 h-10 rounded-md object-cover border border-border"
                          />
                        ))}
                      </div>
                    ) : (
                      <StorageImage
                        storageId={null}
                        className="w-10 h-10 rounded-md object-cover border border-border opacity-40"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.inStock ? "outline" : "secondary"}>
                      {product.inStock ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.isDeleted ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {product.isDeleted ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestore(product)}
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItem(product)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Result count */}
      {products !== undefined && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      )}

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        editItem={editItem}
        brands={brands ?? []}
        categories={categories ?? []}
      />

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteItem?.name}</span>? This
              action can be undone by restoring the product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
