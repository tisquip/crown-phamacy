import { createFileRoute } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/layout/Layout";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

export const Route = createFileRoute("/Branches")({
  component: RouteComponent,
});

function RouteComponent() {
  const convex = useConvex();
  const [branches, setBranches] = useState<
    FunctionReturnType<typeof api.userFns.branches.list> | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex.query(api.userFns.branches.list).then((result) => {
      if (!cancelled) setBranches(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Our Branches
        </h1>
        <p className="text-muted-foreground mb-8">
          Find your nearest Crown Pharmacy branch.
        </p>

        {branches === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-6 animate-pulse space-y-3"
              >
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : branches.length === 0 ? (
          <p className="text-muted-foreground">No branches found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <div
                key={branch._id}
                className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-bold text-foreground mb-3">
                  {branch.name}
                </h2>

                {branch.comingSoon ? (
                  <div className="flex items-center gap-2 mt-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-accent-foreground bg-accent/20 px-2 py-0.5 rounded">
                      Coming Soon
                    </span>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(branch.address || branch.city) && (
                      <li className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        <span>
                          {[branch.address, branch.city]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </li>
                    )}
                    {branch.cell && (
                      <li className="flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0 text-primary" />
                        <a
                          href={`tel:${branch.cell}`}
                          className="hover:text-primary transition-colors"
                        >
                          {branch.cell}
                        </a>
                      </li>
                    )}
                    {branch.landline && branch.landline !== branch.cell && (
                      <li className="flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0 text-primary" />
                        <a
                          href={`tel:${branch.landline}`}
                          className="hover:text-primary transition-colors"
                        >
                          {branch.landline}
                        </a>
                      </li>
                    )}
                    {branch.email && (
                      <li className="flex items-center gap-2">
                        <Mail className="w-4 h-4 shrink-0 text-primary" />
                        <a
                          href={`mailto:${branch.email}`}
                          className="hover:text-primary transition-colors break-all"
                        >
                          {branch.email}
                        </a>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
