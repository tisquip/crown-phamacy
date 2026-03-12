import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ProductCard from "@/components/ProductCard";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/account/PreviouslyPurchased")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoggedIn } = useAuth();

  const purchasedProducts = useQuery(
    api.userFns.orders.getMyPurchasedProducts,
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
            &gt; Previously Purchased
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            Previously Purchased Products
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Products you've bought before — at today's prices
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {purchasedProducts === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : purchasedProducts.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No previously purchased products found.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {purchasedProducts.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
