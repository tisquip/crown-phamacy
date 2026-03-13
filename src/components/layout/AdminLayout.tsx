import { useState } from "react";
import {
  LayoutDashboard,
  Image,
  Package,
  FileText,
  ShoppingBag,
  ArrowLeft,
  Home,
  Tag,
  Building2,
  MapPin,
  Users,
  FileSpreadsheet,
  Settings,
  Newspaper,
  CreditCard,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
} from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import Loading from "../Loading";

const SIDEBAR_KEY = "admin-sidebar-collapsed";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Carousel", href: "/admin/carousel", icon: Image },
  { label: "Homepage Sections", href: "/admin/home-sections", icon: Home },
  {
    label: "Products",
    href: "/admin/products?activeOnly=true&sort=name-asc",
    icon: Package,
  },
  { label: "Categories", href: "/admin/ProductCategories", icon: Tag },
  { label: "Brands", href: "/admin/Brands", icon: Building2 },
  { label: "Branches", href: "/admin/Branches", icon: MapPin },
  { label: "Prescriptions", href: "/admin/prescriptions", icon: FileText },
  { label: "Orders", href: "/admin/Orders", icon: ShoppingBag },
  { label: "Payments", href: "/admin/PaymentTransactions", icon: CreditCard },
  { label: "Clients", href: "/admin/Clients", icon: Users },
  { label: "Blog Posts", href: "/admin/BlogPosts", icon: Newspaper },
  { label: "Newsletter", href: "/admin/Newsletter", icon: Mail },
  { label: "Bulk Upload", href: "/admin/BulkUpload", icon: FileSpreadsheet },
  {
    label: "Bulk Product Ops",
    href: "/admin/ProductBulkOps",
    icon: Layers,
  },
  { label: "Settings", href: "/admin/Settings", icon: Settings },
];

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "true",
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {!collapsed && (
        <aside className="w-56 bg-primary text-primary-foreground shrink-0 flex flex-col">
          <div className="p-4 border-b border-primary-foreground/20">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm hover:opacity-80"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </Link>
            <div className="flex items-center gap-2 mt-3">
              <img
                src={logoSymbol}
                alt=""
                className="w-8 h-8 brightness-0 invert shrink-0"
              />
              <div>
                <p className="text-lg font-bold">Admin Panel</p>
                <p className="text-xs text-primary-foreground/70">
                  Crown Pharmacy
                </p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-primary-foreground/20 font-bold"
                    : "hover:bg-primary-foreground/10"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
      )}
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex items-center gap-2 px-6 pt-4">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
