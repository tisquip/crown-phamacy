import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Loader2, ChevronDown } from "lucide-react";
import { AdminDataView } from "@/components/admin/AdminDataView";

export const Route = createFileRoute("/admin/Prescriptions")({
  component: RouteComponent,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PrescriptionStatus =
  | "Uploaded"
  | "Quotation Sent"
  | "Purchased"
  | "Cancelled";

const ALL_STATUSES: Array<PrescriptionStatus> = [
  "Uploaded",
  "Quotation Sent",
  "Purchased",
  "Cancelled",
];

const STATUS_BADGE: Record<
  PrescriptionStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  Uploaded: { variant: "secondary", label: "Uploaded" },
  "Quotation Sent": { variant: "outline", label: "Quotation Sent" },
  Purchased: { variant: "default", label: "Purchased" },
  Cancelled: { variant: "destructive", label: "Cancelled" },
};

// ── Main route component ──────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "all">(
    "all",
  );

  const queryStatus =
    statusFilter === "all" ? undefined : (statusFilter as PrescriptionStatus);

  const { results, status, loadMore } = usePaginatedQuery(
    api.adminFns.prescriptions.listPrescriptions,
    { status: queryStatus },
    { initialNumItems: 20 },
  );

  // Collect unique client IDs for name look-up
  const uniqueClientIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: Array<Id<"users">> = [];
    for (const p of results) {
      if (!seen.has(p.clientId)) {
        seen.add(p.clientId);
        ids.push(p.clientId as Id<"users">);
      }
    }
    return ids;
  }, [results]);

  const clientNames =
    useQuery(
      api.adminFns.prescriptions.getClientNamesForPrescriptions,
      uniqueClientIds.length > 0 ? { clientIds: uniqueClientIds } : "skip",
    ) ?? {};

  const isLoading = status === "LoadingFirstPage";

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Prescriptions
          {!isLoading && (
            <span className="text-base font-normal text-muted-foreground ml-2">
              ({results.length}
              {status !== "Exhausted" ? "+" : ""})
            </span>
          )}
        </h1>

        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as PrescriptionStatus | "all")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table / Grid */}
      <AdminDataView
        items={results as Array<Doc<"uploadedPrescription">>}
        keyExtractor={(p) => p._id}
        isLoading={isLoading}
        loadingState={
          <div className="text-center py-10">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        }
        emptyState={
          <div className="text-center py-10 text-muted-foreground text-sm">
            No prescriptions found.
          </div>
        }
        renderCard={(p) => {
          const statusInfo =
            STATUS_BADGE[p.status as PrescriptionStatus] ??
            STATUS_BADGE["Uploaded"];
          return (
            <div
              className="bg-card border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                navigate({
                  to: "/admin/Prescription/$id",
                  params: { id: p._id },
                })
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                    {p._id}
                  </span>
                </div>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <div className="text-sm">
                <p className="font-medium">
                  {(clientNames as Record<string, string>)[p.clientId] ??
                    p.clientId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(p._creationTime), "dd MMM yyyy")}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                File: {p.fileName ?? "—"}
              </div>
            </div>
          );
        }}
        renderTable={() => (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && results.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      No prescriptions found.
                    </TableCell>
                  </TableRow>
                )}
                {(results as Array<Doc<"uploadedPrescription">>).map((p) => {
                  const statusInfo =
                    STATUS_BADGE[p.status as PrescriptionStatus] ??
                    STATUS_BADGE["Uploaded"];
                  return (
                    <TableRow
                      key={p._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        navigate({
                          to: "/admin/Prescription/$id",
                          params: { id: p._id },
                        })
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                            {p._id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {(clientNames as Record<string, string>)[p.clientId] ??
                          p.clientId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(p._creationTime), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.fileName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      />

      {/* Load more */}
      {status === "CanLoadMore" && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => loadMore(20)}
            className="gap-2"
          >
            <ChevronDown className="w-4 h-4" />
            Load More
          </Button>
        </div>
      )}

      {status === "LoadingMore" && (
        <div className="flex justify-center mt-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </AdminLayout>
  );
}
