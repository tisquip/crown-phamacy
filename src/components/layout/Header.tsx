import {
  Search,
  MapPin,
  User,
  Heart,
  ShoppingCart,
  Upload,
  LogOut,
  X,
  Settings,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import logo from "@/assets/logo.png";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

const navItems = [
  { label: "Shop", href: "/products" },
  { label: "Upload Prescription", href: "/prescription", highlight: true },
  {
    label: "Promotions",
    href: "/Products?search=&inStock=true&onPromo=true",
  },
  { label: "Brands A-Z", href: "/products" },

  { label: "Blog", href: "/Blogs" },
  { label: "Our Branches", href: "/Branches" },
];

const Header = () => {
  const { totalItems } = useCart();
  const { isLoggedIn, client, logout, userProfile, wishlistProductIds } =
    useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const routerState = useRouterState();
  const searchParams = new URLSearchParams(routerState.location.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearchQuery(q);
  }, []);

  // Debounced auto-search — also clears search when input is empty
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        navigate({
          to: `/products?search=${encodeURIComponent(searchQuery.trim())}`,
        });
      } else if (
        window.location.pathname === "/products" &&
        searchParams.get("search")
      ) {
        navigate({ to: "/products" });
      }
    }, 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  async function checkToNavigateToAccounts() {
    if (userProfile) {
      const path = routerState.location.publicHref;
      if (path.includes("?redirect=account")) {
        if (userProfile.isAdmin) {
          await navigate({ to: "/admin" });
        } else {
          await navigate({ to: "/account" });
        }
      }
    }
  }
  useEffect(() => {
    const path = routerState.location.publicHref;
    if (path.includes("?redirect=account")) {
      checkToNavigateToAccounts();
    }
  }, [userProfile]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim()) {
      navigate({ to: `/products?search=${encodeURIComponent(searchQuery)}` });
    } else {
      navigate({ to: "/products" });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate({ to: "/products" });
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-topbar text-topbar-foreground text-sm py-1.5">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <p className="text-xs hidden md:flex">
            Shop online & get your medication delivered across Zimbabwe!
          </p>
          <div className="flex items-center justify-between md:justify-end gap-4 text-xs flex-1 md:flex-none">
            {isLoggedIn ? (
              <>
                <Link
                  to="/account"
                  className="flex items-center gap-1 hover:underline"
                >
                  <User className="w-3 h-3" /> Hi, {client?.name}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                  className="flex items-center gap-1 hover:underline"
                >
                  <LogOut className="w-3 h-3" /> Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1 hover:underline"
              >
                <User className="w-3 h-3" /> Sign in/Register
              </Link>
            )}
            <Link
              to="/prescription"
              className="hidden md:flex items-center gap-1 hover:underline"
            >
              <Upload className="w-3 h-3" /> Upload Prescription
            </Link>
            <Link
              to={isLoggedIn ? "/account/wishlist" : "/login"}
              className="flex items-center gap-1 hover:underline"
            >
              <Heart className="w-3 h-3" /> Wishlist
              {isLoggedIn && wishlistProductIds.length > 0 && (
                <span className="bg-badge-sale text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {wishlistProductIds.length}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              className="hidden md:flex items-center gap-1 hover:underline"
            >
              <ShoppingCart className="w-3 h-3" /> Basket
              {totalItems > 0 && (
                <span className="bg-badge-sale text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
            {userProfile?.isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1 hover:underline"
              >
                <Settings className="w-3 h-3" /> Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="bg-navbar border-b border-border py-3 bg-white">
        <div className="container mx-auto px-4 flex items-center gap-4 justify-between">
          <Link to="/" className="shrink-0">
            <img
              src={logo}
              alt="Crown Pharmacy"
              className="h-14 md:h-16 w-auto"
            />
          </Link>

          {isLoggedIn && (
            <Link
              to="/account"
              className="items-center gap-2 text-xs bg-primary/10 rounded-full px-4 py-1.5 cursor-pointer hover:bg-primary/20 transition-colors text-primary font-medium"
            >
              <span>👤 My Account</span>
              <span>›</span>
            </Link>
          )}

          <form
            onSubmit={handleSearch}
            className=" hidden md:flex md:flex-1 max-w-xl w-full"
          >
            <div className="flex relative w-full">
              <input
                type="text"
                placeholder="Search products, brands and categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 rounded-l border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary pr-8 bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-[72px] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="bg-accent text-accent-foreground px-5 py-2 rounded-r font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex items-center gap-3">
            <Link
              to={isLoggedIn ? "/account/wishlist" : "/login"}
              className="hidden md:flex flex-col items-center text-xs text-foreground hover:text-primary transition-colors relative"
            >
              <Heart className="w-5 h-5" />
              <span className="text-[10px]">Wishlist</span>
              {isLoggedIn && wishlistProductIds.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-badge-sale text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {wishlistProductIds.length}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              className="relative flex flex-col items-center text-xs text-foreground hover:text-primary transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[10px]">Basket</span>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-2 bg-badge-sale text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-xl md:hidden px-4 py-2 mx-auto w-full bg-white"
      >
        <div className="flex relative">
          <input
            type="text"
            placeholder="Search products, brands and categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 rounded-l border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary pr-8 bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-[72px] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="bg-accent text-accent-foreground px-5 py-2 rounded-r font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </div>
      </form>
      <div className="bg-primary">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-0 overflow-x-auto justify-between">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`px-4 text-center w-full py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  item.highlight
                    ? "bg-[#10737E] text-primary-foreground"
                    : "text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isLoggedIn && (
              <>
                <Link
                  to="/account/medication"
                  className="px-4 py-2.5 text-sm font-medium whitespace-nowrap text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                  My Medication
                </Link>
                <Link
                  to="/account"
                  className="px-4 py-2.5 text-sm font-medium whitespace-nowrap text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                  My Account
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
