import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  getClientPurchaseReceipts,
  getClientPrescriptions,
} from "@/data/dummyClientData";
import { ShoppingBag, Pill, FileText, Heart, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/Account")({
  component: RouteComponent,
});

function RouteComponent() {
  const { client, isLoggedIn } = useAuth();

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

  const receipts = getClientPurchaseReceipts(client._id);
  const prescriptions = getClientPrescriptions(client._id);

  const menuItems = [
    {
      icon: ShoppingBag,
      label: "Purchase History",
      desc: `${receipts.length} orders`,
      href: "/account/purchases",
    },
    {
      icon: ShoppingBag,
      label: "Previously Purchased Products",
      desc: "Reorder your favourites",
      href: "/account/previously-purchased",
    },
    {
      icon: Pill,
      label: "My Medication",
      desc: "Previously purchased medication",
      href: "/account/medication",
    },
    {
      icon: FileText,
      label: "My Prescriptions",
      desc: `${prescriptions.length} prescriptions`,
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
            Welcome back, {client.firstName}!
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
          <h2 className="text-lg font-bold text-foreground mb-4">My Details</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium text-foreground">
                {client.firstName} {client.lastName}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium text-foreground">
                {client.phoneNumber}
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
                {client.primaryAddress || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
