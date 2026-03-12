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
import { Loader2, ChevronDown, ShoppingBag, FileText } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  dispatched: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  collected: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const Route = createFileRoute("/admin/Orders")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const { results, status, loadMore } = usePaginatedQuery(
    api.adminFns.receipts.listReceipts,
    {},
    { initialNumItems: 20 },
  );

  const isLoading = status === "LoadingFirstPage";

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Orders
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
          <ShoppingBag className="w-10 h-10 opacity-30" />
          <p className="text-sm">No orders yet.</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rx?</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => {
                const receipt = r as typeof r & {
                  clientName: string;
                  _id: Id<"order">;
                };
                const hasPrescription =
                  (receipt.uploadedPrescriptionIds ?? []).length > 0;
                return (
                  <TableRow
                    key={receipt._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate({
                        to: "/admin/Order/$id",
                        params: { id: receipt._id },
                      })
                    }
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {receipt._id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {receipt.clientName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(
                        new Date(receipt._creationTime),
                        "dd MMM yyyy, HH:mm",
                      )}
                    </TableCell>
                    <TableCell className="text-center text-foreground">
                      {receipt.productIds?.length ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`capitalize text-xs ${statusColors[receipt.status] ?? ""}`}
                      >
                        {receipt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hasPrescription ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <FileText className="w-3 h-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold price-text">
                      {formatPrice(receipt.totalInUSDCents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {receipt.address || "Collection"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
