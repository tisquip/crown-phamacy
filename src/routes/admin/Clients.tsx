import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users, ChevronDown, UserCircle2 } from "lucide-react";
import { format } from "date-fns";
import { AdminDataView } from "@/components/admin/AdminDataView";

export const Route = createFileRoute("/admin/Clients")({
  component: RouteComponent,
});

// ── Helper to render a profile row ───────────────────────────────────────────

function ClientRow({
  profile,
  onClick,
}: {
  profile: {
    _id: string;
    _creationTime: number;
    userId: Id<"users">;
    name?: string;
    isAdmin?: boolean;
    addresses?: string[];
    email?: string | null;
    phoneNumber?: string | null;
  };
  onClick: () => void;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell>
        <div className="flex items-center gap-2">
          <UserCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground leading-tight">
              {profile.name ?? (
                <span className="italic text-muted-foreground">No name</span>
              )}
            </span>
            {profile.email && (
              <span className="text-xs text-muted-foreground">
                {profile.email}
              </span>
            )}
          </div>
          {profile.isAdmin && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
              Admin
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {profile.phoneNumber ?? (
          <span className="italic text-muted-foreground/50">&ndash;</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(profile._creationTime), "dd MMM yyyy")}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm text-center">
        {profile.addresses?.length ?? 0}
      </TableCell>
    </TableRow>
  );
}

// ── Main route component ──────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  // Debounced search value — only update after the user pauses typing
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchChange(value: string) {
    setSearchInput(value);
    // Debounce via a simple timeout pattern:
    clearTimeout(
      (
        window as unknown as {
          _clientSearchTimer?: ReturnType<typeof setTimeout>;
        }
      )._clientSearchTimer,
    );
    (
      window as unknown as {
        _clientSearchTimer?: ReturnType<typeof setTimeout>;
      }
    )._clientSearchTimer = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  }

  const isSearching = searchQuery.trim().length > 0;

  // Full-text search results (used when there's a search query)
  const searchResults = useQuery(api.adminFns.clients.searchClients, {
    query: searchQuery,
  });

  // Paginated list (used when there's no search query)
  const {
    results: pagedResults,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.adminFns.clients.listClients,
    {},
    { initialNumItems: 25 },
  );

  const isLoading = isSearching
    ? searchResults === undefined
    : status === "LoadingFirstPage";

  const displayedProfiles = isSearching ? (searchResults ?? []) : pagedResults;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && displayedProfiles.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <Users className="w-10 h-10 opacity-30" />
          <p className="text-sm">
            {isSearching
              ? `No clients found for "${searchQuery}"`
              : "No clients yet."}
          </p>
        </div>
      )}

      {!isLoading && displayedProfiles.length > 0 && (
        <AdminDataView
          items={displayedProfiles}
          keyExtractor={(profile) => profile._id}
          renderCard={(profile) => (
            <div
              className="bg-card border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                navigate({
                  to: "/admin/Client/$id",
                  params: { id: profile.userId },
                })
              }
            >
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-foreground text-sm truncate">
                    {profile.name ?? (
                      <span className="italic text-muted-foreground">
                        No name
                      </span>
                    )}
                  </span>
                  {profile.email && (
                    <span className="text-xs text-muted-foreground truncate">
                      {profile.email}
                    </span>
                  )}
                </div>
                {profile.isAdmin && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1 py-0 ml-auto"
                  >
                    Admin
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Phone: {profile.phoneNumber ?? "\u2013"}</p>
                <p>
                  Joined:{" "}
                  {format(new Date(profile._creationTime), "dd MMM yyyy")}
                </p>
                <p>Addresses: {profile.addresses?.length ?? 0}</p>
              </div>
            </div>
          )}
          renderTable={() => (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name &amp; Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Addresses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProfiles.map((profile) => (
                    <ClientRow
                      key={profile._id}
                      profile={
                        profile as typeof profile & {
                          _id: string;
                          _creationTime: number;
                          userId: Id<"users">;
                          name?: string;
                          isAdmin?: boolean;
                          addresses?: string[];
                          email?: string | null;
                          phoneNumber?: string | null;
                        }
                      }
                      onClick={() =>
                        navigate({
                          to: "/admin/Client/$id",
                          params: { id: profile.userId },
                        })
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        />
      )}

      {/* Load more (only in browse / non-search mode) */}
      {!isSearching && status === "CanLoadMore" && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => loadMore(25)}>
            <ChevronDown className="w-4 h-4 mr-2" />
            Load more
          </Button>
        </div>
      )}
      {!isSearching && status === "LoadingMore" && (
        <div className="flex justify-center mt-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Search result hint */}
      {isSearching && !isLoading && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Showing {displayedProfiles.length} result
          {displayedProfiles.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}
          &rdquo;
        </p>
      )}
    </AdminLayout>
  );
}
