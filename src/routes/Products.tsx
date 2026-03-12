import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import Layout from "@/components/layout/Layout";
import { StorageImage } from "@/components/StorageImage";
import { formatPrice } from "@/lib/formatPrice";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { toast } from "@/hooks/use-toast";
import { Heart, X, Search, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Search params schema ──────────────────────────────────────────────────────
const sortOptions = [
  "relevance",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "newest",
] as const;

const productsSearchSchema = z.object({
  search: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  brand: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(sortOptions), "relevance").default("relevance"),
  inStock: fallback(z.boolean(), false).default(false),
  onPromo: fallback(z.boolean(), false).default(false),
});

type ProductsSearch = z.infer<typeof productsSearchSchema>;

export const Route = createFileRoute("/Products")({
  validateSearch: zodValidator(productsSearchSchema),
  component: RouteComponent,
});

// ── Enriched product type from the Convex query ───────────────────────────────
type EnrichedProduct = Doc<"products"> & {
  brandName: string | null;
  categoryNames: string[];
};

// ── Reusable product card for real data ───────────────────────────────────────
function RealProductCard({ product }: { product: EnrichedProduct }) {
  const { addToCart, isAuthenticated } = useCart();
  const { isLoggedIn, isInWishlist, addToWishlist, removeFromWishlist } =
    useAuth();
  const navigate = useNavigate();

  const displayPrice =
    product.promotionPriceInUSDCents ?? product.retailPriceInUSDCents;
  const hasPromo = product.promotionPriceInUSDCents != null;
  const promoPercent = hasPromo
    ? Math.round(
        ((product.retailPriceInUSDCents - product.promotionPriceInUSDCents!) /
          product.retailPriceInUSDCents) *
          100,
      )
    : 0;
  const wishlisted = isLoggedIn && isInWishlist(product._id as Id<"products">);

  const firstImageId =
    product.storageIdsImages && product.storageIdsImages.length > 0
      ? product.storageIdsImages[0]
      : null;
  const firstCdnUrl =
    product.cdnImages && product.cdnImages.length > 0
      ? product.cdnImages[0].url
      : null;

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate({ to: "/Login" });
      return;
    }
    addToCart(product._id as Id<"products">);
    toast({
      title: "Added to basket",
      description: `${product.name} has been added to your basket.`,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      navigate({ to: "/Login" });
      return;
    }
    if (wishlisted) {
      removeFromWishlist(product._id as Id<"products">);
      toast({
        title: "Removed from wishlist",
        description: `${product.name} removed from your wishlist.`,
      });
    } else {
      addToWishlist(product._id as Id<"products">);
      toast({
        title: "Added to wishlist",
        description: `${product.name} added to your wishlist.`,
      });
    }
  };

  return (
    <div
      className={cn(
        "bg-card rounded border border-border flex flex-col h-full group hover:shadow-md transition-shadow",
        !product.inStock && "opacity-75",
      )}
    >
      <Link
        to="/Product/$id"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params={{ id: product._id } as any}
        className="relative p-4 flex items-center justify-center"
      >
        {hasPromo && <span className="sale-badge z-10">-{promoPercent}%</span>}
        {!product.inStock && (
          <span className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
            Out of Stock
          </span>
        )}
        <StorageImage
          storageId={firstImageId}
          cdnUrl={firstCdnUrl}
          alt={product.name}
          className={cn(
            "w-full h-32 object-contain transition-transform",
            product.inStock && "group-hover:scale-105",
            !product.inStock && "grayscale",
          )}
        />
        <button
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2 right-2 z-10"
        >
          <Heart
            className={`w-4 h-4 ${wishlisted ? "fill-price text-price" : "text-muted-foreground hover:text-price"}`}
          />
        </button>
      </Link>

      <div className="px-3 pb-3 flex flex-col flex-1">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link to="/Product/$id" params={{ id: product._id } as any}>
          {product.brandName && (
            <p className="text-xs font-bold text-foreground">
              {product.brandName}
            </p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
            {product.name}
          </p>
        </Link>

        {product.packSize && (
          <p className="text-[10px] text-muted-foreground mb-1">
            {product.packSize}
          </p>
        )}

        {product.isMedicine && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mb-1">
            <Pill className="w-2.5 h-2.5" />
            Medicine
          </span>
        )}

        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="price-text text-sm">
              {formatPrice(displayPrice)}
            </span>
            {hasPromo && (
              <span className="text-[10px] text-muted-foreground line-through">
                {formatPrice(product.retailPriceInUSDCents)}
              </span>
            )}
          </div>
          {hasPromo && (
            <span className="text-[10px] text-promotion font-medium">
              -{promoPercent}% Off
            </span>
          )}
          {!product.inStock && (
            <span className="text-[10px] text-destructive font-medium block">
              Out of stock
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className={cn(
            "mt-2 w-full text-xs py-1.5 rounded font-medium transition-opacity",
            product.inStock
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {product.inStock ? "Add to basket" : "Out of stock"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function RouteComponent() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();

  const navigateSearch = useCallback(
    (search: Partial<ProductsSearch>) => {
      // Cast required to work around TanStack Router generic inference with zodValidator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (navigate as any)({
        to: "/Products",
        search,
        replace: true,
      });
    },
    [navigate],
  );

  // ── Convex data ──────────────────────────────────────────────────────
  const convex = useConvex();
  const [products, setProducts] = useState<EnrichedProduct[] | undefined>(
    undefined,
  );
  const [brands, setBrands] = useState<Doc<"productBrand">[] | undefined>(
    undefined,
  );
  const [categories, setCategories] = useState<
    Doc<"productCategory">[] | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      convex.query(api.userFns.products.listPublic),
      convex.query(api.userFns.products.listBrands),
      convex.query(api.userFns.products.listCategories),
    ]).then(([p, b, c]) => {
      if (!cancelled) {
        setProducts(p as EnrichedProduct[]);
        setBrands(b as Doc<"productBrand">[]);
        setCategories(c as Doc<"productCategory">[]);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Local search input with debounce ─────────────────────────────────
  const [searchInput, setSearchInput] = useState(searchParams.search);

  useEffect(() => {
    setSearchInput(searchParams.search);
  }, [searchParams.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParams.search) {
        navigateSearch({
          ...searchParams,
          search: searchInput || undefined,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, navigateSearch]);

  // ── Set a single search param ────────────────────────────────────────
  function setParam<K extends keyof ProductsSearch>(
    key: K,
    value: ProductsSearch[K],
  ) {
    const next = { ...searchParams, [key]: value };
    if (next[key] === "" || next[key] === false || next[key] === undefined) {
      delete (next as Record<string, unknown>)[key];
    }
    if (next.sort === "relevance")
      delete (next as Record<string, unknown>).sort;
    navigateSearch(next);
  }

  function clearAllFilters() {
    setSearchInput("");
    navigateSearch({});
  }

  // ── Derived sidebar data ─────────────────────────────────────────────
  const brandMap = useMemo(
    () => new Map((brands ?? []).map((b) => [b._id as string, b.name])),
    [brands],
  );
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c._id as string, c.name])),
    [categories],
  );

  const activeBrandIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of products ?? []) {
      if (p.brandId) ids.add(p.brandId);
    }
    return ids;
  }, [products]);

  const activeCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of products ?? []) {
      if (p.productCategoryIds) {
        for (const cId of p.productCategoryIds) ids.add(cId);
      }
    }
    return ids;
  }, [products]);

  const sidebarBrands = useMemo(
    () => (brands ?? []).filter((b) => activeBrandIds.has(b._id)),
    [brands, activeBrandIds],
  );
  const sidebarCategories = useMemo(
    () => (categories ?? []).filter((c) => activeCategoryIds.has(c._id)),
    [categories, activeCategoryIds],
  );

  const hasActiveFilters =
    searchParams.search !== "" ||
    searchParams.category !== "" ||
    searchParams.brand !== "" ||
    searchParams.sort !== "relevance" ||
    searchParams.inStock ||
    searchParams.onPromo;

  // ── Filtering + sorting ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = products ?? [];

    if (searchParams.search) {
      const q = searchParams.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.stockCode.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.brandName?.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (searchParams.category) {
      result = result.filter((p) =>
        p.productCategoryIds?.includes(
          searchParams.category as Id<"productCategory">,
        ),
      );
    }

    if (searchParams.brand) {
      result = result.filter((p) => p.brandId === searchParams.brand);
    }

    if (searchParams.inStock) {
      result = result.filter((p) => p.inStock);
    }

    if (searchParams.onPromo) {
      result = result.filter((p) => !!p.promotionPriceInUSDCents);
    }

    const sorted = [...result];
    switch (searchParams.sort) {
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
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        sorted.sort((a, b) => b._creationTime - a._creationTime);
        break;
      case "relevance":
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [products, searchParams]);

  const activeCategoryName = searchParams.category
    ? categoryMap.get(searchParams.category)
    : undefined;

  return (
    <Layout>
      {/* Breadcrumb + heading */}
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <div className="text-xs text-muted-foreground">
            Home &gt; Products {activeCategoryName && `> ${activeCategoryName}`}
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            {activeCategoryName ||
              (searchParams.search
                ? `Search: "${searchParams.search}"`
                : "All Products")}
          </h1>
        </div>
      </div>

      <div className="bg-[#FAFAFA] min-h-screen">
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="hidden md:block w-56 shrink-0 space-y-6">
              {/* Search */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">
                  Search
                </h3>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search products…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Category filter */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">
                  Category
                </h3>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setParam("category", "")}
                      className={`text-xs w-full text-left py-1 ${
                        !searchParams.category
                          ? "text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All
                    </button>
                  </li>
                  {sidebarCategories.map((cat) => (
                    <li key={cat._id}>
                      <button
                        onClick={() => setParam("category", cat._id)}
                        className={`text-xs w-full text-left py-1 ${
                          searchParams.category === cat._id
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Brand filter */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">
                  Shop By Brand
                </h3>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setParam("brand", "")}
                      className={`text-xs w-full text-left py-1 ${
                        !searchParams.brand
                          ? "text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Brands
                    </button>
                  </li>
                  {sidebarBrands.map((b) => (
                    <li key={b._id}>
                      <button
                        onClick={() => setParam("brand", b._id)}
                        className={`text-xs w-full text-left py-1 ${
                          searchParams.brand === b._id
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {b.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick filters */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">
                  Quick Filters
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setParam("inStock", !searchParams.inStock)}
                    className={`text-xs w-full text-left py-1 ${
                      searchParams.inStock
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    In Stock Only
                  </button>
                  <button
                    onClick={() => setParam("onPromo", !searchParams.onPromo)}
                    className={`text-xs w-full text-left py-1 ${
                      searchParams.onPromo
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    On Promotion
                  </button>
                </div>
              </div>

              {/* Clear all */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="w-full text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All Filters
                </Button>
              )}
            </aside>

            {/* Main content */}
            <div className="flex-1">
              {/* Active filter badges */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {searchParams.search && (
                    <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                      Search: &quot;{searchParams.search}&quot;
                      <button
                        type="button"
                        aria-label="Clear search filter"
                        onClick={() => {
                          setSearchInput("");
                          setParam("search", "");
                        }}
                        className="rounded-sm hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchParams.category &&
                    categoryMap.get(searchParams.category) && (
                      <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                        {categoryMap.get(searchParams.category)}
                        <button
                          type="button"
                          aria-label="Clear category filter"
                          onClick={() => setParam("category", "")}
                          className="rounded-sm hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  {searchParams.brand && brandMap.get(searchParams.brand) && (
                    <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                      {brandMap.get(searchParams.brand)}
                      <button
                        type="button"
                        aria-label="Clear brand filter"
                        onClick={() => setParam("brand", "")}
                        className="rounded-sm hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchParams.inStock && (
                    <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                      In Stock
                      <button
                        type="button"
                        aria-label="Clear in-stock filter"
                        onClick={() => setParam("inStock", false)}
                        className="rounded-sm hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchParams.onPromo && (
                    <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                      On Promotion
                      <button
                        type="button"
                        aria-label="Clear promotion filter"
                        onClick={() => setParam("onPromo", false)}
                        className="rounded-sm hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Toolbar: result count + sort */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted-foreground">
                  {products === undefined
                    ? "Loading…"
                    : `${filtered.length} products`}
                </p>
                <select
                  aria-label="Sort products"
                  value={searchParams.sort}
                  onChange={(e) =>
                    setParam("sort", e.target.value as ProductsSearch["sort"])
                  }
                  className="text-xs border border-border rounded px-3 py-1.5 bg-card text-foreground"
                >
                  <option value="relevance">Sort by: Relevance</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A → Z</option>
                  <option value="name-desc">Name: Z → A</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {/* Product grid */}
              {products === undefined ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-card rounded border border-border h-64 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filtered.map((product) => (
                      <RealProductCard key={product._id} product={product} />
                    ))}
                  </div>

                  {filtered.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground">
                        No products found matching your criteria.
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="link"
                          onClick={clearAllFilters}
                          className="mt-2 text-sm"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex gap-2 z-40">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <select
          aria-label="Sort products"
          value={searchParams.sort}
          onChange={(e) =>
            setParam("sort", e.target.value as ProductsSearch["sort"])
          }
          className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground h-8"
        >
          <option value="relevance">Relevance</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="newest">Newest</option>
        </select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-xs px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </Layout>
  );
}
