import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "grid";

interface AdminDataViewProps<T> {
  /** The data items to display */
  items: T[];
  /** Unique key extractor */
  keyExtractor: (item: T) => string;
  /** Render the table (list) view — includes the full <Table> wrapper */
  renderTable: () => React.ReactNode;
  /** Render a single card for grid view */
  renderCard: (item: T) => React.ReactNode;
  /** Optional: content to show when there are no items (used in grid mode) */
  emptyState?: React.ReactNode;
  /** Optional: content to show when loading (used in grid mode) */
  loadingState?: React.ReactNode;
  /** Whether data is still loading */
  isLoading?: boolean;
}

export function AdminDataView<T>({
  items,
  keyExtractor,
  renderTable,
  renderCard,
  emptyState,
  loadingState,
  isLoading,
}: AdminDataViewProps<T>) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Default to grid on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode("grid");
    }
  }, [isMobile]);

  return (
    <div>
      {/* View toggle buttons */}
      <div className="flex items-center justify-end gap-1 mb-3">
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMode("list")}
          title="List view"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === "grid" ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMode("grid")}
          title="Grid view"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
      </div>

      {/* List (table) view */}
      {viewMode === "list" && renderTable()}

      {/* Grid (card) view */}
      {viewMode === "grid" && (
        <>
          {isLoading && loadingState}
          {!isLoading && items.length === 0 && emptyState}
          {!isLoading && items.length > 0 && (
            <div
              className={cn(
                "grid gap-4",
                isMobile
                  ? "grid-cols-1"
                  : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              )}
            >
              {items.map((item) => (
                <div key={keyExtractor(item)}>{renderCard(item)}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
