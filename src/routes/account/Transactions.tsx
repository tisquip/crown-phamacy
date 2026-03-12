import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "@/lib/formatPrice";
import { format } from "date-fns";
import {
  Loader2,
  CreditCard,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/account/Transactions")({
  component: RouteComponent,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "paid") return <CheckCircle className="w-3 h-3 inline mr-1" />;
  if (status === "failed") return <XCircle className="w-3 h-3 inline mr-1" />;
  return <Clock className="w-3 h-3 inline mr-1" />;
};

function RouteComponent() {
  const { isLoggedIn } = useAuth();

  const transactions = useQuery(
    api.paymentFns.paymentTransactions.listMyTransactions,
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
            &gt; Payment Transactions
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            Payment Transactions
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {transactions === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No payment transactions yet.
          </p>
        ) : (
          <div className="space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {transactions.map((tx: Record<string, any>) => (
              <Link
                key={tx._id}
                to={`/account/purchase/${tx.orderId}`}
                className="block border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Transaction #
                        {(tx._id as string).slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(tx._creationTime),
                          "dd MMM yyyy, HH:mm",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="price-text text-lg">
                      {formatPrice(tx.amountInUSDCents)}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[tx.status] ?? ""}`}
                    >
                      <StatusIcon status={tx.status} />
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="capitalize">{tx.paymentMethod}</span>
                    {tx.transactionReference && (
                      <span className="font-mono">
                        Ref: {tx.transactionReference}
                      </span>
                    )}
                    {tx.orderStatus && (
                      <span>
                        Order:{" "}
                        <span className="capitalize">{tx.orderStatus}</span>
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-primary">
                    <Eye className="w-3 h-3" /> View Order
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
