import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { StorageImage } from "@/components/StorageImage";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SkipForward,
  UploadCloud,
  Loader2,
  CheckCircle2,
  X,
  Images,
  Tag,
  Building2,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// ── Search params schema ──────────────────────────────────────────────────────
const sortOptions = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "newest",
  "oldest",
] as const;

const searchSchema = z.object({
  search: fallback(z.string(), "").default(""),
  brandId: fallback(z.string(), "").default(""),
  categoryId: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(sortOptions), "name-asc").default("name-asc"),
  medication: fallback(z.boolean(), false).default(false),
  prescribed: fallback(z.boolean(), false).default(false),
  activeOnly: fallback(z.boolean(), true).default(true),
  inStock: fallback(z.boolean(), false).default(false),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/admin/ProductBulkOps")({
  validateSearch: zodValidator(searchSchema),
  component: RouteComponent,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type ProductDoc = Doc<"products">;
type BrandDoc = Doc<"productBrand">;
type CategoryDoc = Doc<"productCategory">;

// ── Helpers ───────────────────────────────────────────────────────────────────
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function hasImage(p: ProductDoc): boolean {
  return !!(p.cdnImages?.length || p.storageIdsImages?.length);
}

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

// ── Product thumbnail ─────────────────────────────────────────────────────────
function ProductThumb({
  product,
  size = "sm",
}: {
  product: ProductDoc;
  size?: "sm" | "lg";
}) {
  const cls = size === "lg" ? "w-20 h-20" : "w-10 h-10";
  if (product.cdnImages?.length) {
    return (
      <img
        src={product.cdnImages[0].url}
        alt={product.name}
        className={cn(cls, "rounded-md object-cover border border-border")}
      />
    );
  }
  if (product.storageIdsImages?.length) {
    return (
      <StorageImage
        storageId={product.storageIdsImages[0]}
        className={cn(cls, "rounded-md object-cover border border-border")}
      />
    );
  }
  return (
    <StorageImage
      storageId={null}
      className={cn(
        cls,
        "rounded-md object-cover border border-border opacity-40",
      )}
    />
  );
}

// ── Shared filter panel ───────────────────────────────────────────────────────
function FilterPanel({
  searchParams,
  searchInput,
  onSearchInput,
  activeBrands,
  activeCategories,
  setParam,
  toggleBoolParam,
  clearAllFilters,
  hasActiveFilters,
}: {
  searchParams: SearchParams;
  searchInput: string;
  onSearchInput: (v: string) => void;
  activeBrands: BrandDoc[];
  activeCategories: CategoryDoc[];
  setParam: <K extends keyof SearchParams>(
    key: K,
    value: SearchParams[K],
  ) => void;
  toggleBoolParam: (key: keyof SearchParams) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search by name, stock code, or barcode…"
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
          />
        </div>

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

        <div className="w-[200px]">
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

        <div className="w-[160px]">
          <Select
            value={searchParams.sort}
            onValueChange={(val) =>
              setParam("sort", val as SearchParams["sort"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A→Z</SelectItem>
              <SelectItem value="name-desc">Name Z→A</SelectItem>
              <SelectItem value="price-asc">Price Low→High</SelectItem>
              <SelectItem value="price-desc">Price High→Low</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
    </div>
  );
}

// ── Bulk Image Upload tab ─────────────────────────────────────────────────────
function BulkImageUploadTab({
  filteredProducts,
}: {
  filteredProducts: ProductDoc[];
}) {
  const uploadFile = useAction(api.cdn.uploadFile);
  const patchCdnImages = useMutation(api.adminFns.products.patchCdnImages);

  const [hideWithImages, setHideWithImages] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<Id<"products">[]>([]);
  const [skipped, setSkipped] = useState<Id<"products">[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const queue = useMemo(() => {
    if (hideWithImages) {
      return filteredProducts.filter((p) => !hasImage(p));
    }
    return filteredProducts;
  }, [filteredProducts, hideWithImages]);

  // Reset session when queue or hideWithImages changes (new filter applied)
  const prevQueueRef = useRef(queue);
  useEffect(() => {
    if (prevQueueRef.current !== queue) {
      prevQueueRef.current = queue;
      if (started) {
        setConfirmReset(true);
      }
    }
  }, [queue, started]);

  function doReset() {
    setStarted(false);
    setCurrentIndex(0);
    setDone([]);
    setSkipped([]);
  }

  const currentProduct = started ? queue[currentIndex] : null;
  const isFinished = started && currentIndex >= queue.length;
  const progressPct =
    queue.length > 0 ? Math.round((currentIndex / queue.length) * 100) : 0;

  function handleStart() {
    if (queue.length === 0) {
      toast.info("No products in the queue.");
      return;
    }
    setCurrentIndex(0);
    setDone([]);
    setSkipped([]);
    setStarted(true);
  }

  function advance() {
    setCurrentIndex((i) => i + 1);
    // Auto-open file picker for next product after a brief tick
    setTimeout(() => inputRef.current?.click(), 150);
  }

  function handleSkip() {
    if (!currentProduct) return;
    setSkipped((s) => [...s, currentProduct._id]);
    advance();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentProduct) return;

    // Reset the input so the same file can be selected again if needed
    if (inputRef.current) inputRef.current.value = "";

    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `products/${Date.now()}-${sanitizedName}`;

      const result = await uploadFile({
        key,
        base64Data,
        contentType: file.type,
      });

      // Preserve any existing images and prepend the new one
      const existing = currentProduct.cdnImages ?? [];
      await patchCdnImages({
        id: currentProduct._id,
        cdnImages: [{ url: result.cdnUrl, key: result.key }, ...existing],
      });

      setDone((d) => [...d, currentProduct._id]);
      toast.success(`Saved image for "${currentProduct.name}"`);
      advance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Options */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="hide-with-images"
          checked={hideWithImages}
          onCheckedChange={(v) => setHideWithImages(!!v)}
          disabled={started && !isFinished}
        />
        <Label htmlFor="hide-with-images" className="cursor-pointer">
          Only show products without images
        </Label>
        <span className="text-xs text-muted-foreground ml-2">
          ({queue.length} product{queue.length !== 1 ? "s" : ""} in queue)
        </span>
      </div>

      {/* Not started */}
      {!started && (
        <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
          <Images className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {queue.length === 0
              ? "No products match the current filters."
              : `Ready to upload images for ${queue.length} product${queue.length !== 1 ? "s" : ""}.`}
          </p>
          <Button onClick={handleStart} disabled={queue.length === 0}>
            Start Uploading
          </Button>
        </div>
      )}

      {/* All done */}
      {isFinished && (
        <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
          <p className="font-semibold">All done!</p>
          <p className="text-sm text-muted-foreground">
            {done.length} uploaded, {skipped.length} skipped
          </p>
          <Button variant="outline" onClick={doReset}>
            Start Over
          </Button>
        </div>
      )}

      {/* Active upload session */}
      {started && !isFinished && currentProduct && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Product {currentIndex + 1} of {queue.length}
              </span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          {/* Current product card */}
          <div className="rounded-lg border-2 border-primary bg-card p-5 space-y-4">
            <div className="flex gap-4 items-start">
              <ProductThumb product={currentProduct} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base leading-tight">
                  {currentProduct.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentProduct.stockCode}
                  {currentProduct.barcode ? ` · ${currentProduct.barcode}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${centsToDollars(currentProduct.retailPriceInUSDCents)}
                </p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {currentProduct.isMedicine && (
                    <Badge variant="secondary" className="text-[10px]">
                      Medicine
                    </Badge>
                  )}
                  {currentProduct.isPrescriptionControlled && (
                    <Badge variant="outline" className="text-[10px]">
                      Rx
                    </Badge>
                  )}
                  {hasImage(currentProduct) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-green-600 border-green-400"
                    >
                      Has image
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Upload area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                uploading
                  ? "border-border opacity-60 cursor-not-allowed"
                  : "border-primary/50 hover:border-primary hover:bg-primary/5",
              )}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (!uploading && (e.key === "Enter" || e.key === " ")) {
                  inputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Select image file to upload"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Uploading…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-8 h-8 text-primary" />
                  <p className="text-sm font-medium">
                    Click or tap to select image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    for <strong>{currentProduct.name}</strong>
                  </p>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              aria-label="Upload image file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                disabled={uploading}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip this product
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmReset(true)}
                disabled={uploading}
                className="text-muted-foreground"
              >
                Cancel session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress log */}
      {started && (done.length > 0 || skipped.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Session Log
          </p>
          <ScrollArea className="h-48 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-1">
              {queue.slice(0, currentIndex).map((p) => {
                const wasDone = done.includes(p._id);
                return (
                  <div key={p._id} className="flex items-center gap-2 text-xs">
                    {wasDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={
                        wasDone
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      }
                    >
                      {p.name}
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {wasDone ? "uploaded" : "skipped"}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Confirm reset dialog */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset upload session?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress ({done.length} uploaded, {skipped.length} skipped)
              will be lost and the queue will restart from the beginning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                doReset();
                setConfirmReset(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Bulk Brand Assign tab ─────────────────────────────────────────────────────
function BulkBrandTab({
  filteredProducts,
  brands,
}: {
  filteredProducts: ProductDoc[];
  brands: BrandDoc[];
}) {
  const patchBrand = useMutation(api.adminFns.products.patchBrand);
  const activeBrands = useMemo(
    () =>
      brands
        .filter((b) => !b.isDeleted)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [brands],
  );

  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<
    { product: ProductDoc; success: boolean }[]
  >([]);
  const [confirmed, setConfirmed] = useState(false);

  const selectedBrand = activeBrands.find((b) => b._id === selectedBrandId);

  async function handleApply() {
    if (!selectedBrandId || filteredProducts.length === 0) return;
    setApplying(true);
    setResults([]);
    const batch: { product: ProductDoc; success: boolean }[] = [];
    for (const product of filteredProducts) {
      try {
        await patchBrand({
          id: product._id,
          brandId: selectedBrandId as Id<"productBrand">,
        });
        batch.push({ product, success: true });
      } catch {
        batch.push({ product, success: false });
      }
    }
    setResults(batch);
    setApplying(false);
    setConfirmed(false);
    const successCount = batch.filter((r) => r.success).length;
    toast.success(
      `Brand assigned to ${successCount} of ${batch.length} products`,
    );
  }

  return (
    <div className="space-y-5">
      {/* Brand picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select brand to assign</Label>
        <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Choose a brand…" />
          </SelectTrigger>
          <SelectContent>
            {activeBrands.map((b) => (
              <SelectItem key={b._id} value={b._id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">
          This will assign brand <strong>{selectedBrand?.name ?? "—"}</strong>{" "}
          to <strong>{filteredProducts.length}</strong> product
          {filteredProducts.length !== 1 ? "s" : ""} matching the current
          filters.
        </p>
        <ScrollArea className="h-48">
          <div className="space-y-1 pr-2">
            {filteredProducts.map((p) => {
              const result = results.find((r) => r.product._id === p._id);
              return (
                <div key={p._id} className="flex items-center gap-2 text-xs">
                  {result ? (
                    result.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                    )
                  ) : (
                    <span className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <ProductThumb product={p} />
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {p.stockCode}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <Button
        onClick={() => setConfirmed(true)}
        disabled={!selectedBrandId || filteredProducts.length === 0 || applying}
      >
        {applying ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Building2 className="w-4 h-4 mr-2" />
        )}
        {applying
          ? "Applying…"
          : `Assign to ${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`}
      </Button>

      {results.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ✓ {results.filter((r) => r.success).length} succeeded ·{" "}
          {results.filter((r) => !r.success).length} failed
        </p>
      )}

      <AlertDialog open={confirmed} onOpenChange={setConfirmed}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign brand in bulk?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the brand to <strong>{selectedBrand?.name}</strong>{" "}
              on <strong>{filteredProducts.length}</strong> product
              {filteredProducts.length !== 1 ? "s" : ""}. Products that already
              have a brand will have it replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Bulk Category Add tab ─────────────────────────────────────────────────────
function BulkCategoryTab({
  filteredProducts,
  categories,
}: {
  filteredProducts: ProductDoc[];
  categories: CategoryDoc[];
}) {
  const addToCategory = useMutation(api.adminFns.products.addToCategory);
  const activeCategories = useMemo(
    () =>
      categories
        .filter((c) => !c.isDeleted)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<
    { product: ProductDoc; success: boolean; alreadyHad: boolean }[]
  >([]);
  const [confirmed, setConfirmed] = useState(false);

  const selectedCategory = activeCategories.find(
    (c) => c._id === selectedCategoryId,
  );

  async function handleApply() {
    if (!selectedCategoryId || filteredProducts.length === 0) return;
    setApplying(true);
    setResults([]);
    const batch: {
      product: ProductDoc;
      success: boolean;
      alreadyHad: boolean;
    }[] = [];
    for (const product of filteredProducts) {
      const alreadyHad =
        product.productCategoryIds?.includes(
          selectedCategoryId as Id<"productCategory">,
        ) ?? false;
      try {
        await addToCategory({
          id: product._id,
          categoryId: selectedCategoryId as Id<"productCategory">,
        });
        batch.push({ product, success: true, alreadyHad });
      } catch {
        batch.push({ product, success: false, alreadyHad });
      }
    }
    setResults(batch);
    setApplying(false);
    setConfirmed(false);
    const successCount = batch.filter((r) => r.success).length;
    toast.success(
      `Category added to ${successCount} of ${batch.length} products`,
    );
  }

  return (
    <div className="space-y-5">
      {/* Category picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Select category to add products to
        </Label>
        <Select
          value={selectedCategoryId}
          onValueChange={setSelectedCategoryId}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Choose a category…" />
          </SelectTrigger>
          <SelectContent>
            {activeCategories.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">
          This will add category{" "}
          <strong>{selectedCategory?.name ?? "—"}</strong> to{" "}
          <strong>{filteredProducts.length}</strong> product
          {filteredProducts.length !== 1 ? "s" : ""} matching the current
          filters. Products already in the category will be unaffected.
        </p>
        <ScrollArea className="h-48">
          <div className="space-y-1 pr-2">
            {filteredProducts.map((p) => {
              const alreadyIn =
                selectedCategoryId &&
                (p.productCategoryIds?.includes(
                  selectedCategoryId as Id<"productCategory">,
                ) ??
                  false);
              const result = results.find((r) => r.product._id === p._id);
              return (
                <div key={p._id} className="flex items-center gap-2 text-xs">
                  {result ? (
                    result.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                    )
                  ) : (
                    <span className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <ProductThumb product={p} />
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {p.stockCode}
                  </span>
                  {alreadyIn && !result && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      already in
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <Button
        onClick={() => setConfirmed(true)}
        disabled={
          !selectedCategoryId || filteredProducts.length === 0 || applying
        }
      >
        {applying ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Tag className="w-4 h-4 mr-2" />
        )}
        {applying
          ? "Applying…"
          : `Add to ${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`}
      </Button>

      {results.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ✓ {results.filter((r) => r.success).length} succeeded ·{" "}
          {results.filter((r) => !r.success).length} failed
        </p>
      )}

      <AlertDialog open={confirmed} onOpenChange={setConfirmed}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add category in bulk?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add the category{" "}
              <strong>{selectedCategory?.name}</strong> to{" "}
              <strong>{filteredProducts.length}</strong> product
              {filteredProducts.length !== 1 ? "s" : ""}. Products already in
              this category will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main route component ──────────────────────────────────────────────────────
function RouteComponent() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const navigateSearch = useCallback(
    (search: Partial<SearchParams>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (navigate as any)({
        to: "/admin/ProductBulkOps",
        search,
        replace: true,
      });
    },
    [navigate],
  );

  const products = useQuery(api.adminFns.products.list, {
    includeDeleted: false,
  }) as ProductDoc[] | undefined;

  const brands = useQuery(api.adminFns.brands.list, {
    includeDeleted: false,
  }) as BrandDoc[] | undefined;

  const categories = useQuery(api.adminFns.productCategories.list, {
    includeDeleted: false,
  }) as CategoryDoc[] | undefined;

  const [searchInput, setSearchInput] = useState(searchParams.search);

  useEffect(() => {
    setSearchInput(searchParams.search);
  }, [searchParams.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParams.search) {
        navigateSearch({ ...searchParams, search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, navigateSearch]);

  function setParam<K extends keyof SearchParams>(
    key: K,
    value: SearchParams[K],
  ) {
    const next = { ...searchParams, [key]: value } as Record<string, unknown>;
    if (next[key] === "" || next[key] === false || next[key] === undefined) {
      delete next[key];
    }
    if (next.sort === "name-asc") delete next.sort;
    navigateSearch(next as Partial<SearchParams>);
  }

  function toggleBoolParam(key: keyof SearchParams) {
    const current = searchParams[key];
    setParam(key, !current as SearchParams[typeof key]);
  }

  const hasActiveFilters =
    searchParams.search !== "" ||
    searchParams.brandId !== "" ||
    searchParams.categoryId !== "" ||
    searchParams.sort !== "name-asc" ||
    searchParams.medication ||
    searchParams.prescribed ||
    !searchParams.activeOnly ||
    searchParams.inStock;

  function clearAllFilters() {
    setSearchInput("");
    navigateSearch({ activeOnly: true });
  }

  const activeBrands = useMemo(
    () => (brands ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [brands],
  );
  const activeCategories = useMemo(
    () => (categories ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    let result = products ?? [];

    if (searchParams.search) {
      const q = searchParams.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.stockCode.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      );
    }

    if (searchParams.brandId) {
      result = result.filter((p) => p.brandId === searchParams.brandId);
    }

    if (searchParams.categoryId) {
      result = result.filter((p) =>
        p.productCategoryIds?.includes(
          searchParams.categoryId as Id<"productCategory">,
        ),
      );
    }

    if (searchParams.medication) result = result.filter((p) => p.isMedicine);
    if (searchParams.prescribed)
      result = result.filter((p) => p.isPrescriptionControlled);
    if (searchParams.activeOnly) result = result.filter((p) => !p.isDeleted);
    if (searchParams.inStock) result = result.filter((p) => p.inStock);

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

  const isLoading = products === undefined;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bulk Product Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Filter products, then bulk-upload images or assign brands &amp;
            categories
          </p>
        </div>
        {!isLoading && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {filteredProducts.length} product
            {filteredProducts.length !== 1 ? "s" : ""} selected
          </Badge>
        )}
      </div>

      {/* Filter panel */}
      <FilterPanel
        searchParams={searchParams}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        activeBrands={activeBrands}
        activeCategories={activeCategories}
        setParam={setParam}
        toggleBoolParam={toggleBoolParam}
        clearAllFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {isLoading ? (
        <div className="text-center text-muted-foreground py-16">
          Loading products…
        </div>
      ) : (
        <Tabs defaultValue="images" className="mt-2">
          <TabsList className="mb-5">
            <TabsTrigger value="images">
              <Images className="w-4 h-4 mr-2" />
              Upload Images
            </TabsTrigger>
            <TabsTrigger value="brand">
              <Building2 className="w-4 h-4 mr-2" />
              Assign Brand
            </TabsTrigger>
            <TabsTrigger value="category">
              <Tag className="w-4 h-4 mr-2" />
              Add to Category
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images">
            <BulkImageUploadTab filteredProducts={filteredProducts} />
          </TabsContent>

          <TabsContent value="brand">
            <BulkBrandTab
              filteredProducts={filteredProducts}
              brands={brands ?? []}
            />
          </TabsContent>

          <TabsContent value="category">
            <BulkCategoryTab
              filteredProducts={filteredProducts}
              categories={categories ?? []}
            />
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
}
