import { createFileRoute, Link } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { format } from "date-fns";
import { FileText, Eye, Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/account/Prescriptions")({
  component: RouteComponent,
});

const statusColor: Record<string, string> = {
  Uploaded: "bg-blue-100 text-blue-700",
  "Quotation Sent": "bg-yellow-100 text-yellow-700",
  Purchased: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

function RouteComponent() {
  const prescriptions = useQuery(api.userFns.prescriptions.getMyPrescriptions);
  const isLoading = prescriptions === undefined;

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
            &gt; My Prescriptions
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            My Prescriptions
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
          <Link
            to="/Prescription"
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-semibold hover:opacity-90 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Upload New Prescription
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !prescriptions || prescriptions.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">
              No prescriptions uploaded yet.
            </p>
            <Link
              to="/Prescription"
              className="bg-primary text-primary-foreground px-5 py-2 rounded text-sm font-semibold hover:opacity-90"
            >
              Upload Your First Prescription
            </Link>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 text-foreground font-medium">
                    File
                  </th>
                  <th className="text-left px-4 py-3 text-foreground font-medium">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-foreground font-medium">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-foreground font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr
                    key={p._id}
                    className="border-t border-border hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span
                          className="truncate max-w-[160px]"
                          title={p.fileName ?? p._id}
                        >
                          {p.fileName ?? p._id.slice(0, 8) + "…"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(p._creationTime), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${statusColor[p.status] ?? ""}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/account/Prescription/$id"
                        params={{ id: p._id as string }}
                        className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
