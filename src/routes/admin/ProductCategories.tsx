import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { CdnImageUpload } from "@/components/CdnImageUpload";
import { StorageImage } from "@/components/StorageImage";
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
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/admin/ProductCategories")({
  component: RouteComponent,
});

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type CategoryDoc = Doc<"productCategory">;

function CategoryFormDialog({
  open,
  onOpenChange,
  editItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: CategoryDoc | null;
}) {
  const createCategory = useMutation(api.adminFns.productCategories.create);
  const updateCategory = useMutation(api.adminFns.productCategories.update);
  const isEditing = !!editItem;

  const [storageIdImage, setStorageIdImage] = useState<Id<"_storage"> | null>(
    editItem?.storageIdImage ?? null,
  );
  const [cdnImageUrl, setCdnImageUrl] = useState<string | null>(
    editItem?.cdnImageUrl ?? null,
  );
  const [cdnImageKey, setCdnImageKey] = useState<string | null>(
    editItem?.cdnImageKey ?? null,
  );

  // Sync image state when editItem changes (e.g. opening a different item)
  useEffect(() => {
    setStorageIdImage(editItem?.storageIdImage ?? null);
    setCdnImageUrl(editItem?.cdnImageUrl ?? null);
    setCdnImageKey(editItem?.cdnImageKey ?? null);
  }, [editItem]);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    values: {
      name: editItem?.name ?? "",
      description: editItem?.description ?? "",
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    try {
      if (isEditing && editItem) {
        await updateCategory({
          id: editItem._id,
          name: values.name,
          description: values.description || undefined,
          storageIdImage: storageIdImage ?? undefined,
          cdnImageUrl: cdnImageUrl ?? undefined,
          cdnImageKey: cdnImageKey ?? undefined,
        });
        toast.success("Category updated successfully");
      } else {
        await createCategory({
          name: values.name,
          description: values.description || undefined,
          storageIdImage: storageIdImage ?? undefined,
          cdnImageUrl: cdnImageUrl ?? undefined,
          cdnImageKey: cdnImageKey ?? undefined,
        });
        toast.success("Category created successfully");
      }
      form.reset();
      setStorageIdImage(null);
      setCdnImageUrl(null);
      setCdnImageKey(null);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "Add Category"}
          </DialogTitle>
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
                    <Input placeholder="e.g. Pain Relief" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Category Image</p>
              <CdnImageUpload
                currentImageUrl={cdnImageUrl}
                cdnImageKey={cdnImageKey}
                keyPrefix="categories"
                onUploadComplete={({ cdnUrl, key }) => {
                  setCdnImageUrl(cdnUrl);
                  setCdnImageKey(key);
                }}
                onClear={() => {
                  setCdnImageUrl(null);
                  setCdnImageKey(null);
                }}
              />
            </div>
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
                    : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RouteComponent() {
  const categories = useQuery(api.adminFns.productCategories.list, {
    includeDeleted: true,
  }) as CategoryDoc[] | undefined;

  const softDelete = useMutation(api.adminFns.productCategories.softDelete);
  const restore = useMutation(api.adminFns.productCategories.restore);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CategoryDoc | null>(null);
  const [deleteItem, setDeleteItem] = useState<CategoryDoc | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 1000);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredCategories = (categories ?? []).filter((c) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  });

  function handleEdit(item: CategoryDoc) {
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
      toast.success("Category deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setDeleteItem(null);
    }
  }

  async function handleRestore(item: CategoryDoc) {
    try {
      await restore({ id: item._id });
      toast.success("Category restored");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Product Categories
        </h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search categories…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories === undefined ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  {debouncedSearch
                    ? "No categories match your search."
                    : "No categories yet. Add one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((cat) => (
                <TableRow
                  key={cat._id}
                  className={cat.isDeleted ? "opacity-50" : ""}
                >
                  <TableCell>
                    <StorageImage
                      storageId={cat.storageIdImage}
                      cdnUrl={cat.cdnImageUrl}
                      alt={cat.name}
                      className="w-10 h-10 rounded-md object-cover border border-border"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {cat.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    {cat.isDeleted ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {cat.isDeleted ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestore(cat)}
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(cat)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItem(cat)}
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

      <CategoryFormDialog
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteItem?.name}</span>? This
              action can be undone by restoring the category.
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
