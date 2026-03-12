import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  ShoppingBag,
  FileText,
  Heart,
  Upload,
  Pencil,
  X,
  Check,
  CreditCard,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/account/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { client, isLoggedIn, userProfile } = useAuth();

  const orders = useQuery(
    api.userFns.orders.listMyOrders,
    isLoggedIn ? {} : "skip",
  );
  const prescriptions = useQuery(
    api.userFns.prescriptions.getMyPrescriptions,
    isLoggedIn ? {} : "skip",
  );
  const updateProfile = useMutation(api.userFns.userProfile.updateUserProfile);

  // Fetch branches from Convex
  const convexBranches = useQuery(api.userFns.branches.list) ?? [];
  const availableBranches = useMemo(
    () => convexBranches.filter((b) => !b.comingSoon),
    [convexBranches],
  );
  const availableCities = useMemo(() => {
    const cities = new Set(convexBranches.map((b) => b.city));
    return Array.from(cities).sort();
  }, [convexBranches]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPreferredBranch, setEditPreferredBranch] = useState<
    Id<"branch"> | ""
  >("");
  const [editSelectedCity, setEditSelectedCity] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEditStart = () => {
    setEditName(userProfile?.name ?? client?.name ?? "");
    setEditPhone(userProfile?.phoneNumber ?? "");
    setEditAddress(userProfile?.addresses?.[0] ?? "");
    setEditPreferredBranch(userProfile?.preferredBranch ?? "");
    setEditSelectedCity(userProfile?.selectedCity ?? "");
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handlePreferredBranchChange = (branchId: string) => {
    setEditPreferredBranch(branchId as Id<"branch"> | "");
    // Auto-populate city from branch
    if (branchId) {
      const branch = convexBranches.find((b) => b._id === branchId);
      if (branch) {
        setEditSelectedCity(branch.city);
      }
    }
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: editName || undefined,
        phoneNumber: editPhone || undefined,
        addresses: editAddress ? [editAddress] : undefined,
        preferredBranch: editPreferredBranch
          ? (editPreferredBranch as Id<"branch">)
          : undefined,
        selectedCity: editSelectedCity || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoggedIn || !client) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">
            Please sign in to view your account.
          </p>
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

  const orderCount = orders?.length ?? 0;
  const prescriptionCount = prescriptions?.length ?? 0;
  const displayName = userProfile?.name ?? client.name ?? "there";

  const menuItems = [
    {
      icon: ShoppingBag,
      label: "Purchase History",
      desc:
        orders === undefined
          ? "Loading..."
          : `${orderCount} order${orderCount !== 1 ? "s" : ""}`,
      href: "/account/purchases",
    },
    {
      icon: CreditCard,
      label: "Payment Transactions",
      desc: "View your payment history",
      href: "/account/transactions",
    },
    {
      icon: FileText,
      label: "My Prescriptions",
      desc:
        prescriptions === undefined
          ? "Loading..."
          : `${prescriptionCount} prescription${prescriptionCount !== 1 ? "s" : ""}`,
      href: "/account/prescriptions",
    },
    {
      icon: Heart,
      label: "My Wishlist",
      desc: "Saved products",
      href: "/account/wishlist",
    },
    {
      icon: Upload,
      label: "Upload Prescription",
      desc: "Get a quote & delivery",
      href: "/prescription",
    },
  ];

  return (
    <Layout>
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <div className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>{" "}
            &gt; My Account
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            Welcome back, {displayName}!
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow flex items-start gap-4 group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">My Details</h2>
            {!isEditing ? (
              <button
                onClick={handleEditStart}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditCancel}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSaving}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium text-foreground">
                  {userProfile?.name ?? client.name ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <span className="font-medium text-foreground">
                  {userProfile?.phoneNumber || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium text-foreground">
                  {client.email || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Address:</span>{" "}
                <span className="font-medium text-foreground">
                  {userProfile?.addresses?.[0] || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Preferred Branch:</span>{" "}
                <span className="font-medium text-foreground">
                  {userProfile?.preferredBranch
                    ? (convexBranches.find(
                        (b) => b._id === userProfile.preferredBranch,
                      )?.name ?? "—")
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">City:</span>{" "}
                <span className="font-medium text-foreground">
                  {userProfile?.selectedCity || "—"}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Your name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Phone number"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={client.email ?? ""}
                  disabled
                  placeholder="Email address"
                  className="border border-border rounded px-3 py-1.5 text-sm bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Delivery address"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Preferred Branch
                </label>
                <select
                  title="Preferred Branch"
                  value={editPreferredBranch}
                  onChange={(e) => handlePreferredBranchChange(e.target.value)}
                  className="border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">No preference</option>
                  {availableBranches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} — {b.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">
                  City
                </label>
                <select
                  title="City"
                  value={editSelectedCity}
                  onChange={(e) => setEditSelectedCity(e.target.value)}
                  className="border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select a city</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
