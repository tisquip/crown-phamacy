import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AdminDataView } from "@/components/admin/AdminDataView";

export const Route = createFileRoute("/admin/Brands")({
  component: RouteComponent,
});

const brandSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

type BrandFormValues = z.infer<typeof brandSchema>;
type BrandDoc = Doc<"productBrand">;

function BrandFormDialog({
  open,
  onOpenChange,
  editItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: BrandDoc | null;
}) {
  const createBrand = useMutation(api.adminFns.brands.create);
  const updateBrand = useMutation(api.adminFns.brands.update);
  const isEditing = !!editItem;

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    values: {
      name: editItem?.name ?? "",
    },
  });

  async function onSubmit(values: BrandFormValues) {
    try {
      if (isEditing && editItem) {
        await updateBrand({ id: editItem._id, name: values.name });
        toast.success("Brand updated successfully");
      } else {
        await createBrand({ name: values.name });
        toast.success("Brand created successfully");
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Brand" : "Add Brand"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Panado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Brand"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RouteComponent() {
  const brands = useQuery(api.adminFns.brands.list, {
    includeDeleted: true,
  }) as BrandDoc[] | undefined;

  const softDelete = useMutation(api.adminFns.brands.softDelete);
  const restore = useMutation(api.adminFns.brands.restore);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<BrandDoc | null>(null);
  const [deleteItem, setDeleteItem] = useState<BrandDoc | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 1000);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredBrands = (brands ?? []).filter((b) => {
    if (!debouncedSearch) return true;
    return b.name.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  function handleEdit(item: BrandDoc) {
    setEditItem(item);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditItem(null);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditItem(null);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await softDelete({ id: deleteItem._id });
      toast.success("Brand deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setDeleteItem(null);
    }
  }

  async function handleRestore(item: BrandDoc) {
    try {
      await restore({ id: item._id });
      toast.success("Brand restored");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Brands</h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search brands…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <AdminDataView
        items={filteredBrands}
        keyExtractor={(brand) => brand._id}
        isLoading={brands === undefined}
        loadingState={
          <div className="text-center text-muted-foreground py-8">
            Loading...
          </div>
        }
        emptyState={
          <div className="text-center text-muted-foreground py-8">
            {debouncedSearch
              ? "No brands match your search."
              : "No brands yet. Add one to get started."}
          </div>
        }
        renderCard={(brand) => (
          <div
            className={`bg-card border border-border rounded-lg p-4 space-y-3 ${brand.isDeleted ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{brand.name}</h3>
              {brand.isDeleted ? (
                <Badge variant="destructive">Deleted</Badge>
              ) : (
                <Badge variant="secondary">Active</Badge>
              )}
            </div>
            <div className="flex items-center justify-end gap-1 pt-2 border-t border-border">
              {brand.isDeleted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRestore(brand)}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(brand)}
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteItem(brand)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        renderTable={() => (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands === undefined ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredBrands.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      {debouncedSearch
                        ? "No brands match your search."
                        : "No brands yet. Add one to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrands.map((brand) => (
                    <TableRow
                      key={brand._id}
                      className={brand.isDeleted ? "opacity-50" : ""}
                    >
                      <TableCell className="font-medium">
                        {brand.name}
                      </TableCell>
                      <TableCell>
                        {brand.isDeleted ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {brand.isDeleted ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestore(brand)}
                              title="Restore"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(brand)}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteItem(brand)}
                                title="Delete"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      />

      <BrandFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editItem={editItem}
      />

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteItem?.name}</span>? This
              action can be undone by restoring the brand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
