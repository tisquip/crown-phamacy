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
import { Pill, Calendar, Loader2 } from "lucide-react";
import { StorageImage } from "@/components/StorageImage";

export const Route = createFileRoute("/account/Medication")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoggedIn } = useAuth();
  const { addToCart, isAuthenticated } = useCart();

  const medications = useQuery(
    api.userFns.orders.getMyPurchasedMedications,
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

  const handleAddToCart = (med: { _id: string; name: string }) => {
    if (!isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "Sign in to add items to your basket.",
      });
      return;
    }
    addToCart(med._id as Id<"products">);
    toast({
      title: "Added to basket",
      description: `${med.name} has been added to your basket.`,
    });
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
            &gt; My Medication
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            My Medication
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Medication you've previously purchased
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {medications === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : medications.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No medication purchase history found.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {medications.map((med: any) => {
              const displayPrice =
                med.promotionPriceInUSDCents ?? med.retailPriceInUSDCents;
              return (
                <div
                  key={med._id}
                  className="border border-border rounded-lg p-4 flex gap-4"
                >
                  <div className="w-20 h-20 shrink-0">
                    <Link to={`/product/${med._id}`}>
                      {med.storageIdsImages?.[0] ? (
                        <StorageImage
                          storageId={med.storageIdsImages[0]}
                          alt={med.name}
                          className="w-20 h-20 object-contain rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                          <Pill className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </Link>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill className="w-4 h-4 text-primary" />
                      <Link
                        to={`/product/${med._id}`}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {med.name}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {med.brandName ?? ""}
                      {med.packSize ? ` · ${med.packSize}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {med.description}
                    </p>

                    {med.lastPurchaseDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3 h-3" />
                        Last purchased:{" "}
                        {format(new Date(med.lastPurchaseDate), "dd MMM yyyy")}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="price-text">
                        {formatPrice(displayPrice)}
                      </span>
                      {med.isPrescriptionControlled ? (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                          Prescription Required — Upload to reorder
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(med)}
                          className="bg-primary text-primary-foreground text-xs px-4 py-1.5 rounded hover:opacity-90 font-medium"
                        >
                          Add to basket
                        </button>
                      )}
                    </div>
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
