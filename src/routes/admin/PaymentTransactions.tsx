import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AdminLayout from "../../components/layout/AdminLayout";
import { formatPrice } from "@/lib/formatPrice";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ChevronDown, CreditCard } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { AdminDataView } from "@/components/admin/AdminDataView";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export const Route = createFileRoute("/admin/PaymentTransactions")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const { results, status, loadMore } = usePaginatedQuery(
    api.paymentFns.paymentTransactions.listAllTransactions,
    {},
    { initialNumItems: 20 },
  );

  const isLoading = status === "LoadingFirstPage";

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Payment Transactions
            {!isLoading && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({results.length}
                {status === "CanLoadMore" ? "+" : ""})
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
          <CreditCard className="w-10 h-10 opacity-30" />
          <p className="text-sm">No payment transactions yet.</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <AdminDataView
          items={results}
          keyExtractor={(tx) => tx._id}
          renderCard={(tx: Record<string, any>) => (
            <div
              className="bg-card border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                navigate({ to: "/admin/Order/$id", params: { id: tx.orderId } })
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  {(tx._id as string).slice(-8).toUpperCase()}
                </span>
                <Badge
                  className={`capitalize text-xs ${statusColors[tx.status] ?? ""}`}
                >
                  {tx.status}
                </Badge>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">
                  {tx.userName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx._creationTime), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">{tx.paymentMethod}</span>
                <span className="font-mono">
                  {tx.transactionReference ?? "—"}
                </span>
              </div>
              <div className="border-t border-border pt-2 text-right">
                <span className="font-semibold price-text">
                  {formatPrice(tx.amountInUSDCents)}
                </span>
              </div>
            </div>
          )}
          renderTable={() => (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {results.map((tx: Record<string, any>) => (
                    <TableRow
                      key={tx._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        navigate({
                          to: "/admin/Order/$id",
                          params: { id: tx.orderId },
                        })
                      }
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {(tx._id as string).slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {tx.userName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(
                          new Date(tx._creationTime),
                          "dd MMM yyyy, HH:mm",
                        )}
                      </TableCell>
                      <TableCell className="capitalize text-foreground text-sm">
                        {tx.paymentMethod}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`capitalize text-xs ${statusColors[tx.status] ?? ""}`}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold price-text">
                        {formatPrice(tx.amountInUSDCents)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tx.transactionReference ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        />
      )}

      {/* Load more */}
      {status === "CanLoadMore" && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => loadMore(20)}
            disabled={status !== "CanLoadMore"}
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            Load more
          </Button>
        </div>
      )}
      {status === "LoadingMore" && (
        <div className="flex justify-center mt-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </AdminLayout>
  );
}
