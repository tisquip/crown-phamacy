import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "@/hooks/use-toast";
import {
  RotateCcw,
  Loader2,
  X,
  ChevronsUpDown,
  Check,
  PlusCircle,
  Link2,
  ExternalLink,
  Images,
  Trash2,
} from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { StorageImage } from "@/components/StorageImage";
import { CdnImageUpload } from "@/components/CdnImageUpload";
import { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
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

type SectionType =
  | "topSellers"
  | "itemsOnPromotion"
  | "shopByCategory"
  | "promoBanner"
  | "advertBanners"
  | "fullAdvertBanners"
  | "featuredBrands";

export const Route = createFileRoute("/admin/Home-Sections")({
  component: RouteComponent,
});

function RouteComponent() {
  const [activeSection, setActiveSection] = useState<SectionType>("topSellers");

  const sections: { key: SectionType; label: string }[] = [
    { key: "topSellers", label: "Top Sellers" },
    { key: "itemsOnPromotion", label: "Items on Promotion" },
    { key: "shopByCategory", label: "Shop by Category" },
    { key: "promoBanner", label: "Promo Deals" },
    { key: "featuredBrands", label: "Featured Brands" },
    { key: "advertBanners", label: "Advert Banners" },
    { key: "fullAdvertBanners", label: "Full-Width Banners" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Homepage Sections
      </h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeSection === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "shopByCategory" ? (
        <CategorySectionEditor />
      ) : activeSection === "advertBanners" ? (
        <AdvertBannersEditor />
      ) : activeSection === "fullAdvertBanners" ? (
        <FullAdvertBannersEditor />
      ) : activeSection === "promoBanner" ? (
        <PromoBannerEditor />
      ) : activeSection === "featuredBrands" ? (
        <FeaturedBrandsEditor />
      ) : (
        <ProductSectionEditor sectionType={activeSection} />
      )}
    </AdminLayout>
  );
}

// ── Product Section Editor ──────────────────────────────────────────────────

function ProductSectionEditor({
  sectionType,
}: {
  sectionType: "topSellers" | "itemsOnPromotion";
}) {
  const products = useQuery(api.adminFns.homepageSections.listEligibleProducts);
  const sectionConfig = useQuery(api.adminFns.homepageSections.getSection, {
    sectionType,
  });
  const saveSection = useMutation(api.adminFns.homepageSections.saveSection);
  const resetTopSellers = useMutation(
    api.adminFns.homepageSections.resetTopSellers,
  );
  const resetItemsOnPromotion = useMutation(
    api.adminFns.homepageSections.resetItemsOnPromotion,
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);

  // Sync local state when section config loads/changes
  useEffect(() => {
    if (sectionConfig?.productIds) {
      setSelectedIds(sectionConfig.productIds as string[]);
    } else {
      setSelectedIds([]);
    }
  }, [sectionConfig]);

  const removeProduct = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const addProduct = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setComboOpen(false);
  };

  // Products available to add (not yet selected)
  const availableProducts = useMemo(
    () => (products ?? []).filter((p) => !selectedIds.includes(p._id)),
    [products, selectedIds],
  );

  // Selected products in order
  const selectedProducts = useMemo(
    () =>
      selectedIds
        .map((id) => (products ?? []).find((p) => p._id === id))
        .filter(Boolean),
    [products, selectedIds],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSection({
        sectionType,
        productIds: selectedIds as Array<Id<"products">>,
      });
      toast({
        title: "Section saved",
        description: `${sectionLabel} section updated successfully.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save section",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      if (sectionType === "topSellers") {
        await resetTopSellers({});
      } else if (sectionType === "itemsOnPromotion") {
        await resetItemsOnPromotion({});
      }
      toast({
        title: "Section reset",
        description: `${sectionLabel} section has been auto-populated.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to reset section",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  const sectionLabel =
    sectionType === "topSellers" ? "Top Sellers" : "Items on Promotion";

  const canReset = true;

  if (products === undefined || sectionConfig === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          <strong>{sectionLabel}</strong> &mdash; {selectedIds.length} product
          {selectedIds.length !== 1 && "s"} selected
          {sectionConfig?.isAutoGenerated && (
            <span className="ml-2 text-xs text-primary font-medium">
              (Auto-generated)
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {canReset && (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-1 px-4 py-2 rounded text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Reset to Auto
            </button>
          )}
        </div>
      </div>

      {/* Searchable combobox to add products */}
      <Popover open={comboOpen} onOpenChange={setComboOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Search and add a product"
            className="w-full md:w-96 flex items-center justify-between border border-border rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors mb-4"
          >
            Search and add a product...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full md:w-96 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name or brand..." />
            <CommandList>
              <CommandEmpty>No products found.</CommandEmpty>
              <CommandGroup>
                {availableProducts.map((p) => (
                  <CommandItem
                    key={p._id}
                    value={`${p.name} ${p.brandName ?? ""}`}
                    onSelect={() => addProduct(p._id)}
                    className="flex items-center gap-3 py-2"
                  >
                    <StorageImage
                      storageId={
                        p.storageIdsImages && p.storageIdsImages.length > 0
                          ? p.storageIdsImages[0]
                          : null
                      }
                      alt={p.name}
                      className="w-8 h-8 object-contain shrink-0 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.brandName ?? "No brand"} &middot;{" "}
                        {formatPrice(p.retailPriceInUSDCents)}
                        {p.promotionPriceInUSDCents != null && (
                          <span className="text-promotion ml-1">
                            Promo: {formatPrice(p.promotionPriceInUSDCents)}
                          </span>
                        )}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected products */}
      {selectedProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {selectedProducts.map((p) => {
            if (!p) return null;
            const firstImageId =
              p.storageIdsImages && p.storageIdsImages.length > 0
                ? p.storageIdsImages[0]
                : null;
            const hasPromo = p.promotionPriceInUSDCents != null;
            const promoPercent = hasPromo
              ? Math.round(
                  ((p.retailPriceInUSDCents - p.promotionPriceInUSDCents!) /
                    p.retailPriceInUSDCents) *
                    100,
                )
              : 0;

            return (
              <div
                key={p._id}
                className="relative border border-primary rounded-lg p-3 text-left bg-primary/5"
              >
                <button
                  onClick={() => removeProduct(p._id)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
                <StorageImage
                  storageId={firstImageId}
                  alt={p.name}
                  className="w-full h-16 object-contain mb-2"
                />
                <p className="text-[10px] font-bold text-foreground line-clamp-1">
                  {p.name}
                </p>
                {p.brandName && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {p.brandName}
                  </p>
                )}
                <p className="text-xs font-bold text-price">
                  {formatPrice(
                    hasPromo
                      ? p.promotionPriceInUSDCents!
                      : p.retailPriceInUSDCents,
                  )}
                </p>
                {hasPromo && (
                  <>
                    <p className="text-[10px] text-muted-foreground line-through">
                      {formatPrice(p.retailPriceInUSDCents)}
                    </p>
                    <span className="inline-block mt-0.5 text-[10px] font-semibold text-promotion bg-promotion/10 px-1.5 py-0.5 rounded">
                      -{promoPercent}%
                    </span>
                  </>
                )}
                {p.purchaseCount != null && p.purchaseCount > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {p.purchaseCount} sold
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg mb-6">
          No products selected. Use the search above to add products.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Selection
      </button>
    </div>
  );
}

// ── Category Section Editor ─────────────────────────────────────────────────

function CategorySectionEditor() {
  const categories = useQuery(
    api.adminFns.homepageSections.listEligibleCategories,
  );
  const sectionConfig = useQuery(api.adminFns.homepageSections.getSection, {
    sectionType: "shopByCategory",
  });
  const saveSection = useMutation(api.adminFns.homepageSections.saveSection);
  const resetShopByCategory = useMutation(
    api.adminFns.homepageSections.resetShopByCategory,
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);

  // Sync local state when section config loads/changes
  useEffect(() => {
    if (sectionConfig?.categoryIds) {
      setSelectedIds(sectionConfig.categoryIds as string[]);
    } else {
      setSelectedIds([]);
    }
  }, [sectionConfig]);

  const removeCategory = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const addCategory = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setComboOpen(false);
  };

  // Categories available to add (not yet selected)
  const availableCategories = useMemo(
    () => (categories ?? []).filter((c) => !selectedIds.includes(c._id)),
    [categories, selectedIds],
  );

  // Selected categories in order
  const selectedCategories = useMemo(
    () =>
      selectedIds
        .map((id) => (categories ?? []).find((c) => c._id === id))
        .filter(Boolean),
    [categories, selectedIds],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSection({
        sectionType: "shopByCategory",
        categoryIds: selectedIds as Array<Id<"productCategory">>,
      });
      toast({
        title: "Section saved",
        description: "Shop by Category section updated successfully.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save section",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetShopByCategory({});
      toast({
        title: "Section reset",
        description:
          "Shop by Category has been auto-populated from top-selling products.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to reset section",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  if (categories === undefined || sectionConfig === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          <strong>Shop by Category</strong> &mdash; {selectedIds.length} categor
          {selectedIds.length !== 1 ? "ies" : "y"} selected
          {sectionConfig?.isAutoGenerated && (
            <span className="ml-2 text-xs text-primary font-medium">
              (Auto-generated)
            </span>
          )}
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-1 px-4 py-2 rounded text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {resetting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          Reset to Auto
        </button>
      </div>

      {/* Searchable combobox to add categories */}
      <Popover open={comboOpen} onOpenChange={setComboOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Search and add a category"
            className="w-full md:w-96 flex items-center justify-between border border-border rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors mb-4"
          >
            Search and add a category...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full md:w-96 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>No categories found.</CommandEmpty>
              <CommandGroup>
                {availableCategories.map((cat) => (
                  <CommandItem
                    key={cat._id}
                    value={cat.name}
                    onSelect={() => addCategory(cat._id)}
                    className="flex items-center gap-3 py-2"
                  >
                    {cat.storageIdImage ? (
                      <StorageImage
                        storageId={cat.storageIdImage}
                        alt={cat.name}
                        className="w-8 h-8 object-contain shrink-0 rounded"
                      />
                    ) : (
                      <span className="text-lg w-8 h-8 flex items-center justify-center shrink-0">
                        💊
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected categories */}
      {selectedCategories.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {selectedCategories.map((cat) => {
            if (!cat) return null;
            return (
              <div
                key={cat._id}
                className="relative border border-primary rounded-lg p-4 text-center bg-primary/5"
              >
                <button
                  onClick={() => removeCategory(cat._id)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
                {cat.storageIdImage ? (
                  <StorageImage
                    storageId={cat.storageIdImage}
                    alt={cat.name}
                    className="w-10 h-10 object-contain mx-auto mb-1"
                  />
                ) : (
                  <span className="text-2xl block mb-1">💊</span>
                )}
                <span className="text-sm font-medium text-foreground">
                  {cat.name}
                </span>
                {cat.description && (
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                    {cat.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg mb-6">
          No categories selected. Use the search above to add categories.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Selection
      </button>
    </div>
  );
}

// ── Promo Banner Editor ─────────────────────────────────────────────────────

function PromoBannerEditor() {
  const config = useQuery(api.adminFns.homepageSections.getPromoBanner);
  const savePromoBanner = useMutation(
    api.adminFns.homepageSections.savePromoBanner,
  );
  const clearPromoBanner = useMutation(
    api.adminFns.homepageSections.clearPromoBanner,
  );

  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [cdnImageUrl, setCdnImageUrl] = useState<string | null>(null);
  const [cdnImageKey, setCdnImageKey] = useState<string | null>(null);
  const [badgeText, setBadgeText] = useState("");
  const [headlineText, setHeadlineText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Sync form when config loads
  useEffect(() => {
    if (config === undefined) return;
    setStorageId(config?.storageId ?? null);
    setCdnImageUrl(config?.cdnImageUrl ?? null);
    setCdnImageKey(config?.cdnImageKey ?? null);
    setBadgeText(config?.badgeText ?? "Online Only · Limited Offer");
    setHeadlineText(config?.headlineText ?? "Save up to 50%");
    setButtonText(config?.buttonText ?? "Shop now");
    setButtonLink(config?.buttonLink ?? "/products");
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePromoBanner({
        storageId: storageId ?? undefined,
        cdnImageUrl: cdnImageUrl ?? undefined,
        cdnImageKey: cdnImageKey ?? undefined,
        badgeText: badgeText || undefined,
        headlineText: headlineText || undefined,
        buttonText: buttonText || undefined,
        buttonLink: buttonLink || undefined,
      });
      toast({ title: "Promo banner saved" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save promo banner",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (config === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-muted-foreground">
        <strong>Promo Banner</strong> &mdash; the banner displayed next to "Shop
        by Category" on the homepage. Upload a background image and configure
        the overlay text.
      </p>

      {/* Background image */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Background image
        </p>
        <CdnImageUpload
          currentImageUrl={cdnImageUrl}
          cdnImageKey={cdnImageKey}
          keyPrefix="promo-banner"
          onUploadComplete={({ cdnUrl, key }) => {
            setCdnImageUrl(cdnUrl);
            setCdnImageKey(key);
          }}
          onClear={() => {
            setCdnImageUrl(null);
            setCdnImageKey(null);
          }}
        />
      </div>

      {/* Badge text */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Badge text
        </p>
        <Input
          value={badgeText}
          onChange={(e) => setBadgeText(e.target.value)}
          placeholder="Online Only · Limited Offer"
          className="text-sm"
        />
      </div>

      {/* Headline */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Headline
        </p>
        <Input
          value={headlineText}
          onChange={(e) => setHeadlineText(e.target.value)}
          placeholder="Save up to 50%"
          className="text-sm"
        />
      </div>

      {/* Button text */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Button text
        </p>
        <Input
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
          placeholder="Shop now"
          className="text-sm"
        />
      </div>

      {/* Button link */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
          <Link2 className="w-3 h-3" /> Button link
        </p>
        <Input
          value={buttonLink}
          onChange={(e) => setButtonLink(e.target.value)}
          placeholder="/products"
          className="text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Promo Banner
        </button>
        {config && (
          <button
            onClick={async () => {
              setClearing(true);
              try {
                await clearPromoBanner({});
                setStorageId(null);
                setCdnImageUrl(null);
                setCdnImageKey(null);
                setBadgeText("");
                setHeadlineText("");
                setButtonText("");
                setButtonLink("");
                toast({ title: "Promo banner cleared" });
              } catch (err: unknown) {
                toast({
                  title: "Error",
                  description:
                    err instanceof Error
                      ? err.message
                      : "Failed to clear promo banner",
                  variant: "destructive",
                });
              } finally {
                setClearing(false);
              }
            }}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium border border-destructive text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}

// ── Advert Banners Editor ───────────────────────────────────────────────────

const MAX_BANNERS = 4;

function AdvertBannersEditor() {
  const banners = useQuery(api.adminFns.advertBanners.list);
  const addBanner = useMutation(api.adminFns.advertBanners.add);
  const updateBanner = useMutation(api.adminFns.advertBanners.update);
  const removeBanner = useMutation(api.adminFns.advertBanners.remove);

  const [linkEdits, setLinkEdits] = useState<Record<string, string>>({});
  const [savingLink, setSavingLink] = useState<Record<string, boolean>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [pendingCdnUrl, setPendingCdnUrl] = useState<string | null>(null);
  const [pendingCdnKey, setPendingCdnKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [savingCarousel, setSavingCarousel] = useState<Record<string, boolean>>(
    {},
  );

  if (banners === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const handleSaveLink = async (id: Id<"advertBanner">) => {
    setSavingLink((prev) => ({ ...prev, [id]: true }));
    try {
      await updateBanner({ id, link: linkEdits[id] ?? "" });
      toast({ title: "Link saved" });
      setLinkEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save link",
        variant: "destructive",
      });
    } finally {
      setSavingLink((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRemove = async (id: Id<"advertBanner">) => {
    setRemoving((prev) => ({ ...prev, [id]: true }));
    try {
      await removeBanner({ id });
      toast({ title: "Banner removed" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove",
        variant: "destructive",
      });
    } finally {
      setRemoving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAddBanner = async () => {
    if (!pendingCdnUrl || !pendingCdnKey) return;
    setAddingNew(true);
    try {
      await addBanner({
        cdnImageUrl: pendingCdnUrl,
        cdnImageKey: pendingCdnKey,
        link: newLink || undefined,
      });
      toast({ title: "Banner added" });
      setPendingCdnUrl(null);
      setPendingCdnKey(null);
      setNewLink("");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to add banner",
        variant: "destructive",
      });
    } finally {
      setAddingNew(false);
    }
  };

  const handleToggleCarousel = async (
    id: Id<"advertBanner">,
    current: boolean,
  ) => {
    setSavingCarousel((prev) => ({ ...prev, [id]: true }));
    try {
      await updateBanner({ id, isCarousel: !current });
      toast({
        title: !current ? "Carousel enabled" : "Carousel disabled",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to toggle carousel",
        variant: "destructive",
      });
    } finally {
      setSavingCarousel((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAddCarouselImage = async (
    id: Id<"advertBanner">,
    currentImages: Array<{ cdnImageUrl: string; cdnImageKey: string }>,
    newImage: { cdnUrl: string; key: string },
  ) => {
    setSavingCarousel((prev) => ({ ...prev, [id]: true }));
    try {
      await updateBanner({
        id,
        carouselImages: [
          ...currentImages,
          { cdnImageUrl: newImage.cdnUrl, cdnImageKey: newImage.key },
        ],
      });
      toast({ title: "Carousel image added" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to add carousel image",
        variant: "destructive",
      });
    } finally {
      setSavingCarousel((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRemoveCarouselImage = async (
    id: Id<"advertBanner">,
    currentImages: Array<{ cdnImageUrl: string; cdnImageKey: string }>,
    indexToRemove: number,
  ) => {
    setSavingCarousel((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = currentImages.filter((_, i) => i !== indexToRemove);
      await updateBanner({ id, carouselImages: updated });
      toast({ title: "Carousel image removed" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Failed to remove carousel image",
        variant: "destructive",
      });
    } finally {
      setSavingCarousel((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          <strong>Advert Banners</strong> &mdash; {banners.length} /{" "}
          {MAX_BANNERS} banners. Each banner can optionally have a link that
          opens when clicked. You can also enable carousel mode to show multiple
          images that rotate.
        </p>
      </div>

      {banners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {banners.map((banner) => {
            const linkVal = linkEdits[banner._id] ?? banner.link ?? "";
            const isDirty =
              linkEdits[banner._id] !== undefined &&
              linkEdits[banner._id] !== (banner.link ?? "");
            const isCarousel = !!banner.isCarousel;
            const carouselImages = banner.carouselImages ?? [];
            return (
              <div
                key={banner._id}
                className="border border-border rounded-lg overflow-hidden bg-card"
              >
                <div className="relative">
                  <StorageImage
                    storageId={banner.storageId}
                    cdnUrl={banner.cdnImageUrl}
                    alt="Advert banner"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() =>
                      handleRemove(banner._id as Id<"advertBanner">)
                    }
                    disabled={removing[banner._id]}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
                    title="Remove banner"
                  >
                    {removing[banner._id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Replace image
                    </p>
                    <CdnImageUpload
                      currentImageUrl={banner.cdnImageUrl}
                      hidePreview
                      keyPrefix="advert-banners"
                      onUploadComplete={async ({ cdnUrl, key }) => {
                        try {
                          await updateBanner({
                            id: banner._id as Id<"advertBanner">,
                            cdnImageUrl: cdnUrl,
                            cdnImageKey: key,
                          });
                          toast({ title: "Image updated" });
                        } catch {
                          toast({
                            title: "Error",
                            description: "Failed to update image",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Click-through link
                      (optional)
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={linkVal}
                        onChange={(e) =>
                          setLinkEdits((prev) => ({
                            ...prev,
                            [banner._id]: e.target.value,
                          }))
                        }
                        placeholder="https://example.com"
                        className="text-xs h-8"
                      />
                      {isDirty && (
                        <button
                          onClick={() =>
                            handleSaveLink(banner._id as Id<"advertBanner">)
                          }
                          disabled={savingLink[banner._id]}
                          className="shrink-0 bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingLink[banner._id] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Save
                        </button>
                      )}
                      {linkVal && !isDirty && (
                        <a
                          href={linkVal}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open link in new tab"
                          className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Carousel toggle */}
                  <div className="border-t border-border pt-2 mt-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCarousel}
                        onChange={() =>
                          handleToggleCarousel(
                            banner._id as Id<"advertBanner">,
                            isCarousel,
                          )
                        }
                        disabled={savingCarousel[banner._id]}
                        className="accent-primary"
                      />
                      <Images className="w-3 h-3" />
                      Carousel mode (rotate multiple images)
                    </label>

                    {isCarousel && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[10px] text-muted-foreground">
                          The main image above is slide 1. Add more slides
                          below:
                        </p>
                        {carouselImages.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {carouselImages.map((img, idx) => (
                              <div
                                key={idx}
                                className="relative w-20 h-14 rounded border border-border overflow-hidden"
                              >
                                <img
                                  src={img.cdnImageUrl}
                                  alt={`Carousel ${idx + 2}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() =>
                                    handleRemoveCarouselImage(
                                      banner._id as Id<"advertBanner">,
                                      carouselImages,
                                      idx,
                                    )
                                  }
                                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive text-destructive-foreground hover:opacity-80"
                                  title="Remove carousel image"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                                <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/60 text-white px-1 rounded">
                                  {idx + 2}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <CdnImageUpload
                          hidePreview
                          keyPrefix="advert-banners-carousel"
                          onUploadComplete={(result) =>
                            handleAddCarouselImage(
                              banner._id as Id<"advertBanner">,
                              carouselImages,
                              result,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg mb-6">
          No advert banners yet. Upload an image below to add the first one.
        </p>
      )}

      {banners.length < MAX_BANNERS && (
        <div className="border border-dashed border-primary/50 rounded-lg p-4 bg-primary/5">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
            <PlusCircle className="w-4 h-4 text-primary" />
            Add new banner ({banners.length}/{MAX_BANNERS})
          </p>
          <CdnImageUpload
            onUploadComplete={({ cdnUrl, key }) => {
              setPendingCdnUrl(cdnUrl);
              setPendingCdnKey(key);
            }}
            currentImageUrl={pendingCdnUrl}
            keyPrefix="advert-banners"
            className="mb-3"
          />
          {pendingCdnUrl && (
            <>
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Click-through link (optional)
                </p>
                <Input
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://example.com"
                  className="text-xs h-8"
                />
              </div>
              <button
                onClick={handleAddBanner}
                disabled={addingNew}
                className="bg-primary text-primary-foreground px-5 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {addingNew ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                Add Banner
              </button>
            </>
          )}
        </div>
      )}

      {banners.length >= MAX_BANNERS && (
        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
          Maximum of {MAX_BANNERS} banners reached. Remove one to add another.
        </p>
      )}
    </div>
  );
}

// ── Featured Brands Editor ──────────────────────────────────────────────────

function FeaturedBrandsEditor() {
  const brands = useQuery(api.adminFns.homepageSections.listEligibleBrands);
  const sectionConfig = useQuery(
    api.adminFns.homepageSections.getFeaturedBrandsSection,
  );
  const saveFeaturedBrands = useMutation(
    api.adminFns.homepageSections.saveFeaturedBrands,
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);

  // Sync local state when section config loads/changes
  useEffect(() => {
    if (sectionConfig?.brandIds) {
      setSelectedIds(sectionConfig.brandIds as string[]);
    } else {
      setSelectedIds([]);
    }
  }, [sectionConfig]);

  const removeBrand = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const addBrand = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setComboOpen(false);
  };

  const availableBrands = useMemo(
    () => (brands ?? []).filter((b) => !selectedIds.includes(b._id)),
    [brands, selectedIds],
  );

  const selectedBrands = useMemo(
    () =>
      selectedIds
        .map((id) => (brands ?? []).find((b) => b._id === id))
        .filter(Boolean),
    [brands, selectedIds],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFeaturedBrands({
        brandIds: selectedIds as Array<Id<"productBrand">>,
      });
      toast({
        title: "Section saved",
        description: "Featured Brands section updated successfully.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save section",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (brands === undefined || sectionConfig === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          <strong>Featured Brands</strong> &mdash; {selectedIds.length} brand
          {selectedIds.length !== 1 && "s"} selected
        </p>
      </div>

      {/* Searchable combobox to add brands */}
      <Popover open={comboOpen} onOpenChange={setComboOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Search and add a brand"
            className="w-full md:w-80 flex items-center justify-between border border-border rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors mb-4"
          >
            Search and add a brand...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full md:w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search brands..." />
            <CommandList>
              <CommandEmpty>No brands found.</CommandEmpty>
              <CommandGroup>
                {availableBrands.map((b) => (
                  <CommandItem
                    key={b._id}
                    value={b.name}
                    onSelect={() => addBrand(b._id)}
                    className="flex items-center gap-2 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {b.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected brands */}
      {selectedBrands.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedBrands.map((b) => {
            if (!b) return null;
            return (
              <span
                key={b._id}
                className="flex items-center gap-1 bg-secondary text-foreground text-sm font-medium px-3 py-1.5 rounded-full border border-border"
              >
                {b.name}
                <button
                  onClick={() => removeBrand(b._id)}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${b.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg mb-6">
          No brands selected. Use the search above to add brands.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        Save Featured Brands
      </button>
    </div>
  );
}

// ── Full-Width Advert Banners Editor ────────────────────────────────────────

const MAX_FULL_BANNERS = 10;

function FullAdvertBannersEditor() {
  const banners = useQuery(api.adminFns.fullAdvertBanners.list);
  const addBanner = useMutation(api.adminFns.fullAdvertBanners.add);
  const updateBanner = useMutation(api.adminFns.fullAdvertBanners.update);
  const removeBanner = useMutation(api.adminFns.fullAdvertBanners.remove);

  const [linkEdits, setLinkEdits] = useState<Record<string, string>>({});
  const [savingLink, setSavingLink] = useState<Record<string, boolean>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [pendingCdnUrl, setPendingCdnUrl] = useState<string | null>(null);
  const [pendingCdnKey, setPendingCdnKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});

  if (banners === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const handleSaveLink = async (id: Id<"fullAdvertBanner">) => {
    setSavingLink((prev) => ({ ...prev, [id]: true }));
    try {
      await updateBanner({ id, link: linkEdits[id] ?? "" });
      toast({ title: "Link saved" });
      setLinkEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save link",
        variant: "destructive",
      });
    } finally {
      setSavingLink((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRemove = async (id: Id<"fullAdvertBanner">) => {
    setRemoving((prev) => ({ ...prev, [id]: true }));
    try {
      await removeBanner({ id });
      toast({ title: "Banner removed" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove",
        variant: "destructive",
      });
    } finally {
      setRemoving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAddBanner = async () => {
    if (!pendingCdnUrl || !pendingCdnKey) return;
    setAddingNew(true);
    try {
      await addBanner({
        cdnImageUrl: pendingCdnUrl,
        cdnImageKey: pendingCdnKey,
        link: newLink || undefined,
      });
      toast({ title: "Banner added" });
      setPendingCdnUrl(null);
      setPendingCdnKey(null);
      setNewLink("");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to add banner",
        variant: "destructive",
      });
    } finally {
      setAddingNew(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          <strong>Full-Width Advert Banners</strong> &mdash; {banners.length} /{" "}
          {MAX_FULL_BANNERS} banners. These display one per row at full width on
          the homepage, below Featured Brands.
        </p>
      </div>

      {banners.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 mb-6">
          {banners.map((banner) => {
            const linkVal = linkEdits[banner._id] ?? banner.link ?? "";
            const isDirty =
              linkEdits[banner._id] !== undefined &&
              linkEdits[banner._id] !== (banner.link ?? "");
            return (
              <div
                key={banner._id}
                className="border border-border rounded-lg overflow-hidden bg-card"
              >
                <div className="relative">
                  <StorageImage
                    storageId={banner.storageId}
                    cdnUrl={banner.cdnImageUrl}
                    alt="Full-width advert banner"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() =>
                      handleRemove(banner._id as Id<"fullAdvertBanner">)
                    }
                    disabled={removing[banner._id]}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
                    title="Remove banner"
                  >
                    {removing[banner._id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Replace image
                    </p>
                    <CdnImageUpload
                      currentImageUrl={banner.cdnImageUrl}
                      hidePreview
                      keyPrefix="full-advert-banners"
                      onUploadComplete={async ({ cdnUrl, key }) => {
                        try {
                          await updateBanner({
                            id: banner._id as Id<"fullAdvertBanner">,
                            cdnImageUrl: cdnUrl,
                            cdnImageKey: key,
                          });
                          toast({ title: "Image updated" });
                        } catch {
                          toast({
                            title: "Error",
                            description: "Failed to update image",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Click-through link
                      (optional)
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={linkVal}
                        onChange={(e) =>
                          setLinkEdits((prev) => ({
                            ...prev,
                            [banner._id]: e.target.value,
                          }))
                        }
                        placeholder="https://example.com"
                        className="text-xs h-8"
                      />
                      {isDirty && (
                        <button
                          onClick={() =>
                            handleSaveLink(banner._id as Id<"fullAdvertBanner">)
                          }
                          disabled={savingLink[banner._id]}
                          className="shrink-0 bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingLink[banner._id] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Save
                        </button>
                      )}
                      {linkVal && !isDirty && (
                        <a
                          href={linkVal}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open link in new tab"
                          className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg mb-6">
          No full-width banners yet. Upload an image below to add the first one.
        </p>
      )}

      {banners.length < MAX_FULL_BANNERS && (
        <div className="border border-dashed border-primary/50 rounded-lg p-4 bg-primary/5">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
            <PlusCircle className="w-4 h-4 text-primary" />
            Add new full-width banner ({banners.length}/{MAX_FULL_BANNERS})
          </p>
          <CdnImageUpload
            onUploadComplete={({ cdnUrl, key }) => {
              setPendingCdnUrl(cdnUrl);
              setPendingCdnKey(key);
            }}
            currentImageUrl={pendingCdnUrl}
            keyPrefix="full-advert-banners"
            className="mb-3"
          />
          {pendingCdnUrl && (
            <>
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Click-through link (optional)
                </p>
                <Input
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://example.com"
                  className="text-xs h-8"
                />
              </div>
              <button
                onClick={handleAddBanner}
                disabled={addingNew}
                className="bg-primary text-primary-foreground px-5 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {addingNew ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                Add Banner
              </button>
            </>
          )}
        </div>
      )}

      {banners.length >= MAX_FULL_BANNERS && (
        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
          Maximum of {MAX_FULL_BANNERS} full-width banners reached. Remove one
          to add another.
        </p>
      )}
    </div>
  );
}
