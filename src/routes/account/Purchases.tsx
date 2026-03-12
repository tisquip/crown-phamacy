import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/account/Purchases")({
  component: RouteComponent,
});

interface OrderSnapshot {
  productId: string;
  name: string;
  quantity: number;
  unitPriceInUSDCents: number;
  brandName: string | null;
  isMedicine?: boolean;
  isPrescriptionControlled?: boolean;
}

const RX_SYMBOL = "℞ Prescription Item";

function censorName(item: OrderSnapshot): string {
  if (item.isMedicine || item.isPrescriptionControlled) return RX_SYMBOL;
  return item.name;
}

function RouteComponent() {
  const { isLoggedIn } = useAuth();
  const { addToCartWithQuantity, isAuthenticated } = useCart();
  const navigate = Route.useNavigate();

  const orders = useQuery(
    api.userFns.orders.listMyOrders,
    isLoggedIn ? {} : "skip",
  );

  if (!isLoggedIn) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
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

  const reorder = (order: any) => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in", description: "Sign in to reorder." });
      return;
    }
    const items: OrderSnapshot[] = JSON.parse(
      order.productsAsJsonOnDateOfPurchase,
    );
    let addedCount = 0;
    for (const item of items) {
      // Skip medication and prescription items — they can't be re-ordered
      if (item.isMedicine || item.isPrescriptionControlled) continue;
      addToCartWithQuantity(item.productId as Id<"products">, item.quantity);
      addedCount++;
    }
    if (addedCount === 0) {
      toast({
        title: "No items to reorder",
        description:
          "This order only contained prescription items which cannot be reordered directly.",
      });
      return;
    }
    toast({
      title: "Reorder added to basket",
      description: `${addedCount} item(s) added to your basket.`,
    });
    navigate({ to: "/cart" });
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      dispatched: "Dispatched",
      delivered: "Delivered",
      collected: "Collected",
      cancelled: "Cancelled",
    };
    return labels[status] ?? status;
  };

  return (
    <Layout>
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <div className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>{" "}
            &gt;{" "}
            <Link to="/account" className="hover:text-primary">
              My Account
            </Link>{" "}
            &gt; Purchase History
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            Purchase History
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {orders === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No purchases yet.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const items: OrderSnapshot[] = JSON.parse(
                order.productsAsJsonOnDateOfPurchase,
              );
              return (
                <div
                  key={order._id}
                  className="border border-border rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Order #{(order._id as string).slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(order._creationTime),
                          "dd MMM yyyy, HH:mm",
                        )}
                      </p>
                      <p className="text-xs mt-1">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {statusLabel(order.status)}
                        </span>
                      </p>
                      {order.address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Delivered to: {order.address}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="price-text text-lg">
                        {formatPrice(order.totalInUSDCents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {items.map((item, idx) => {
                      const isCensored =
                        item.isMedicine || item.isPrescriptionControlled;
                      const displayName = censorName(item);
                      return isCensored ? (
                        <span
                          key={idx}
                          className="flex items-center gap-2 border border-border rounded px-2 py-1 text-xs text-muted-foreground italic"
                        >
                          {displayName}{" "}
                          {item.quantity > 1 ? `×${item.quantity}` : ""}
                        </span>
                      ) : (
                        <Link
                          key={idx}
                          to={`/product/${item.productId}`}
                          className="flex items-center gap-2 border border-border rounded px-2 py-1 hover:bg-muted text-xs"
                        >
                          <span className="text-foreground">
                            {displayName}{" "}
                            {item.quantity > 1 ? `×${item.quantity}` : ""}
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/account/purchase/${order._id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Eye className="w-3 h-3" /> View Details
                    </Link>
                    <button
                      onClick={() => reorder(order)}
                      className="flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" /> Reorder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
