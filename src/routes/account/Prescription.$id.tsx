import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText,
  Loader2,
  MessageSquare,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { PrescriptionImage } from "@/components/PrescriptionImage";

export const Route = createFileRoute("/account/Prescription/$id")({
  component: RouteComponent,
});

const statusColor: Record<string, string> = {
  Uploaded: "bg-blue-100 text-blue-700",
  "Quotation Sent": "bg-yellow-100 text-yellow-700",
  Purchased: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-xs text-muted-foreground w-40 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();

  const prescription = useQuery(api.userFns.prescriptions.getPrescriptionById, {
    id: id as Id<"uploadedPrescription">,
  });

  const linkedOrderId = useQuery(
    api.userFns.orders.getOrderForPrescription,
    prescription && prescription.status === "Purchased"
      ? { prescriptionId: prescription._id }
      : "skip",
  );

  const prescriptionOrder = useQuery(
    api.userFns.prescriptionOrders.getOrderForPrescription,
    prescription && prescription.status === "Quotation Sent"
      ? { prescriptionId: prescription._id }
      : "skip",
  );

  if (prescription === undefined) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (prescription === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Prescription not found.</p>
          <Link
            to="/account/Prescriptions"
            className="text-primary hover:underline text-sm mt-3 inline-block"
          >
            ← Back to My Prescriptions
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
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
            &gt;{" "}
            <Link to="/account/Prescriptions" className="hover:text-primary">
              Prescriptions
            </Link>{" "}
            &gt; Prescription
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-primary">Prescription</h1>
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${statusColor[prescription.status] ?? ""}`}
            >
              {prescription.status}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Prescription preview */}
        <section className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b border-border">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Prescription File
            </span>
          </div>
          <PrescriptionImage
            prescriptionId={prescription._id}
            className="w-full max-h-[500px] object-contain bg-muted"
          />
        </section>

        {/* Submission metadata */}
        <section className="border border-border rounded-lg p-5 space-y-1.5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Submission Details
          </h2>
          <DetailRow
            label="Submitted"
            value={format(
              new Date(prescription._creationTime),
              "dd MMM yyyy, HH:mm",
            )}
          />
          <DetailRow label="Status" value={prescription.status} />
        </section>

        {/* Link to order when purchased */}
        {prescription.status === "Purchased" && linkedOrderId && (
          <section className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg p-5">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  This prescription has been purchased
                </p>
                <Link
                  to="/account/Purchase/$id"
                  params={{ id: linkedOrderId as string }}
                  className="text-sm text-primary hover:underline mt-1 inline-block"
                >
                  View Order →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Link to prescription order when quotation sent */}
        {prescription.status === "Quotation Sent" && prescriptionOrder && (
          <section className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-5">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Your prescription order is ready for checkout
                </p>
                {!prescriptionOrder.isExpired ? (
                  <>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Expires{" "}
                      {formatDistanceToNow(
                        new Date(prescriptionOrder.expiresAt),
                        { addSuffix: true },
                      )}
                    </p>
                    <Link
                      to="/account/PrescriptionOrder/$id"
                      params={{ id: prescriptionOrder._id }}
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Complete Purchase →
                    </Link>
                  </>
                ) : (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    This order has expired.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Notes */}
        {prescription.notes && (
          <section className="border border-border rounded-lg p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <MessageSquare className="w-4 h-4 text-primary" /> Additional
              Notes
            </h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {prescription.notes}
            </p>
          </section>
        )}

        <div className="pb-4">
          <Link
            to="/account/Prescriptions"
            className="text-sm text-primary hover:underline"
          >
            ← Back to My Prescriptions
          </Link>
        </div>
      </div>
    </Layout>
  );
}
