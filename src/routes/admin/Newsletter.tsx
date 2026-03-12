import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Mail } from "lucide-react";
import { format } from "date-fns";
import { AdminDataView } from "@/components/admin/AdminDataView";

export const Route = createFileRoute("/admin/Newsletter")({
  component: RouteComponent,
});

function RouteComponent() {
  const subscribers = useQuery(api.adminFns.newsletter.list);

  const exportCsv = () => {
    if (!subscribers || subscribers.length === 0) return;
    const header = "Email,Subscribed At\n";
    const rows = subscribers
      .map(
        (s) =>
          `${s.email},${format(new Date(s._creationTime), "yyyy-MM-dd HH:mm:ss")}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
              <p className="text-sm text-muted-foreground">
                {subscribers === undefined
                  ? "Loading…"
                  : `${subscribers.length} subscriber${subscribers.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <Button
            onClick={exportCsv}
            disabled={!subscribers || subscribers.length === 0}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <AdminDataView
          items={subscribers ?? []}
          keyExtractor={(s) => s._id}
          isLoading={subscribers === undefined}
          loadingState={
            <div className="text-center py-10 text-muted-foreground">
              Loading…
            </div>
          }
          emptyState={
            <div className="text-center py-10 text-muted-foreground">
              No subscribers yet.
            </div>
          }
          renderCard={(s) => {
            const idx = (subscribers ?? []).indexOf(s);
            return (
              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(s._creationTime), "d MMM yyyy, HH:mm")}
                  </span>
                </div>
                <p className="font-medium text-sm">{s.email}</p>
              </div>
            );
          }}
          renderTable={() => (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscribed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers === undefined ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-10 text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : subscribers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No subscribers yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscribers.map((s, idx) => (
                      <TableRow key={s._id}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{s.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(
                            new Date(s._creationTime),
                            "d MMM yyyy, HH:mm",
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
    </AdminLayout>
  );
}
