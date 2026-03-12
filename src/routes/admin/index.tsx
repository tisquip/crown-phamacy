import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "@/lib/formatPrice";
import { format } from "date-fns";
import {
  ShoppingBag,
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminDataView } from "@/components/admin/AdminDataView";

export const Route = createFileRoute("/admin/")({
  component: RouteComponent,
});

// ── Status styling ────────────────────────────────────────────────────────────

const orderStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  dispatched: "bg-purple-100 text-purple-800",
};

const prescriptionStatusColors: Record<string, string> = {
  Uploaded: "bg-yellow-100 text-yellow-800",
  "Quotation Sent": "bg-blue-100 text-blue-800",
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  attention,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  attention?: boolean;
}) {
  return (
    <div
      className={`bg-card border rounded-lg p-4 ${attention ? "border-yellow-400 ring-1 ring-yellow-200" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <Icon className={`w-6 h-6 ${color}`} />
        {attention && value > 0 && (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate();
  const dashboard = useQuery(api.adminFns.dashboard.getDashboardSummary);

  const prevPendingCount = useRef<number | null>(null);
  const [showPendingAlert, setShowPendingAlert] = useState(false);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!dashboard) return;
    const current = dashboard.orderCounts.pending;
    if (
      prevPendingCount.current !== null &&
      current > prevPendingCount.current
    ) {
      setShowPendingAlert(true);
    }
    prevPendingCount.current = current;
  }, [dashboard]);

  useEffect(() => {
    if (showPendingAlert) {
      const audio = new Audio("/alert.mp3");
      audio.loop = true;
      audio.play().catch(() => {
        /* autoplay blocked – user will see the visual alert */
      });
      alertAudioRef.current = audio;
    } else {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current.currentTime = 0;
        alertAudioRef.current = null;
      }
    }
    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current = null;
      }
    };
  }, [showPendingAlert]);

  if (!dashboard) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const {
    orderCounts,
    prescriptionCounts,
    recentOrdersNeedingAttention,
    recentPrescriptionsNeedingAttention,
  } = dashboard;

  const ordersNeedingAttention =
    orderCounts.pending + orderCounts.confirmed + orderCounts.processing;
  const prescriptionsNeedingAttention =
    prescriptionCounts.Uploaded + prescriptionCounts.QuotationSent;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      {showPendingAlert && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-base">New Pending Order</p>
              <p className="text-sm text-red-700">
                A new pending order has been placed and requires your attention.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPendingAlert(false)}
            className="shrink-0 rounded-full p-1 hover:bg-red-200 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Attention Required ─────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold text-foreground mb-3">
        Needs Attention
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Orders Needing Attention"
          value={ordersNeedingAttention}
          icon={ShoppingBag}
          color="text-yellow-600"
          attention
        />
        <StatCard
          label="Prescriptions Needing Attention"
          value={prescriptionsNeedingAttention}
          icon={FileText}
          color="text-yellow-600"
          attention
        />
        <StatCard
          label="Pending Orders"
          value={orderCounts.pending}
          icon={Clock}
          color="text-yellow-500"
          attention
        />
        <StatCard
          label="Uploaded Prescriptions"
          value={prescriptionCounts.Uploaded}
          icon={FileText}
          color="text-yellow-500"
          attention
        />
      </div>

      {/* ── Order Status Breakdown ─────────────────────────────────────── */}
      <h2 className="text-lg font-semibold text-foreground mb-3">
        Order Status Breakdown
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pending"
          value={orderCounts.pending}
          icon={Clock}
          color="text-yellow-500"
        />
        <StatCard
          label="Confirmed"
          value={orderCounts.confirmed}
          icon={CheckCircle2}
          color="text-blue-500"
        />
        <StatCard
          label="Processing"
          value={orderCounts.processing}
          icon={Package}
          color="text-indigo-500"
        />
        <StatCard
          label="Dispatched"
          value={orderCounts.dispatched}
          icon={Truck}
          color="text-purple-500"
        />
      </div>

      {/* ── Tables side by side ────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders Needing Attention */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Recent Orders Needing Attention
          </h2>
          <AdminDataView
            items={recentOrdersNeedingAttention}
            keyExtractor={(order) => order._id}
            emptyState={
              <div className="text-center text-muted-foreground py-6">
                No orders need attention right now.
              </div>
            }
            renderCard={(order) => (
              <div
                className="bg-card border border-border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  navigate({
                    to: "/admin/Order/$id",
                    params: { id: order._id },
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {order._id.slice(-8).toUpperCase()}
                  </span>
                  <Badge
                    className={orderStatusColors[order.status] ?? "bg-gray-100"}
                  >
                    {order.status}
                  </Badge>
                </div>
                <p className="font-medium text-sm">{order.clientName}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {format(new Date(order._creationTime), "dd MMM, HH:mm")}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatPrice(order.totalInUSDCents)}
                  </span>
                </div>
              </div>
            )}
            renderTable={() => (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrdersNeedingAttention.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-6"
                        >
                          No orders need attention right now.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentOrdersNeedingAttention.map((order) => (
                        <TableRow
                          key={order._id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            navigate({
                              to: "/admin/Order/$id",
                              params: { id: order._id },
                            })
                          }
                        >
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">
                              {order._id.slice(-8).toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(
                                new Date(order._creationTime),
                                "dd MMM, HH:mm",
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {order.clientName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                orderStatusColors[order.status] ?? "bg-gray-100"
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatPrice(order.totalInUSDCents)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          />
        </div>

        {/* Recent Prescriptions Needing Attention */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Recent Prescriptions Needing Attention
          </h2>
          <AdminDataView
            items={recentPrescriptionsNeedingAttention}
            keyExtractor={(pres) => pres._id}
            emptyState={
              <div className="text-center text-muted-foreground py-6">
                No prescriptions need attention right now.
              </div>
            }
            renderCard={(pres) => (
              <div
                className="bg-card border border-border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  navigate({
                    to: "/admin/Prescription/$id",
                    params: { id: pres._id },
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {pres._id.slice(-8).toUpperCase()}
                  </span>
                  <Badge
                    className={
                      prescriptionStatusColors[pres.status] ?? "bg-gray-100"
                    }
                  >
                    {pres.status}
                  </Badge>
                </div>
                <p className="font-medium text-sm">{pres.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(pres._creationTime), "dd MMM, HH:mm")}
                </p>
              </div>
            )}
            renderTable={() => (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPrescriptionsNeedingAttention.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-6"
                        >
                          No prescriptions need attention right now.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPrescriptionsNeedingAttention.map((pres) => (
                        <TableRow
                          key={pres._id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            navigate({
                              to: "/admin/Prescription/$id",
                              params: { id: pres._id },
                            })
                          }
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {pres._id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {pres.clientName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                prescriptionStatusColors[pres.status] ??
                                "bg-gray-100"
                              }
                            >
                              {pres.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(
                              new Date(pres._creationTime),
                              "dd MMM, HH:mm",
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
