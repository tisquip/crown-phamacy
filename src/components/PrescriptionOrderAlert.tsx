import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@tanstack/react-router";
import { FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * Global alert banner that displays when the user has pending prescription
 * orders that need attention. Shown in the main layout.
 */
export function PrescriptionOrderAlert() {
  const { isLoggedIn } = useAuth();

  const pendingOrders = useQuery(
    api.userFns.prescriptionOrders.getMyPendingPrescriptionOrders,
    isLoggedIn ? {} : "skip",
  );

  if (!pendingOrders || pendingOrders.length === 0) return null;

  // Only show non-expired pending orders
  const activeOrders = pendingOrders.filter((o: any) => !o.isExpired);
  if (activeOrders.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
      <div className="container mx-auto px-4 py-2">
        {activeOrders.map((order: any) => (
          <Link
            key={order._id}
            to="/account/PrescriptionOrder/$id"
            params={{ id: order._id }}
            className="flex items-center gap-3 py-1.5 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2 shrink-0">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Prescription Order Ready
              </span>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 hidden sm:inline">
              — A prescription order has been prepared for you. Review and
              complete your purchase.
            </span>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <Clock className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Expires{" "}
                {formatDistanceToNow(new Date(order.expiresAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <span className="text-xs text-primary font-medium shrink-0">
              View →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
