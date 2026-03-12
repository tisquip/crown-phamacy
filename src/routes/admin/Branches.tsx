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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminDataView } from "@/components/admin/AdminDataView";

export const Route = createFileRoute("/admin/Branches")({
  component: RouteComponent,
});

// ── Zod schema ─────────────────────────────────────────────────────────────────

const branchSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  cell: z.string(),
  landline: z.string(),
  email: z.string(),
  comingSoon: z.boolean(),
});

type BranchFormValues = z.infer<typeof branchSchema>;
type BranchDoc = Doc<"branch">;

// ── Form Dialog ────────────────────────────────────────────────────────────────

function BranchFormDialog({
  open,
  onOpenChange,
  editItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: BranchDoc | null;
}) {
  const createBranch = useMutation(api.adminFns.branches.create);
  const updateBranch = useMutation(api.adminFns.branches.update);
  const isEditing = !!editItem;

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    values: {
      name: editItem?.name ?? "",
      address: editItem?.address ?? "",
      city: editItem?.city ?? "",
      cell: editItem?.cell ?? "",
      landline: editItem?.landline ?? "",
      email: editItem?.email ?? "",
      comingSoon: editItem?.comingSoon ?? false,
    },
  });

  async function onSubmit(values: BranchFormValues) {
    const payload = {
      name: values.name ?? "",
      address: values.address ?? "",
      city: values.city ?? "",
      cell: values.cell ?? "",
      landline: values.landline ?? "",
      email: values.email ?? "",
      comingSoon: values.comingSoon ?? false,
    };
    try {
      if (isEditing && editItem) {
        await updateBranch({ id: editItem._id, ...payload });
        toast.success("Branch updated successfully");
      } else {
        await createBranch(payload);
        toast.success("Branch created successfully");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Branch" : "Add Branch"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Crown Pharmacy Fifth" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Harare" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cell"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cell</FormLabel>
                    <FormControl>
                      <Input placeholder="+263 7xx xxx xxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="landline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landline</FormLabel>
                    <FormControl>
                      <Input placeholder="+263 2xx xxx xxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="branch@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comingSoon"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Coming Soon</FormLabel>
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
                    : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

function RouteComponent() {
  const branches = useQuery(api.adminFns.branches.list) as
    | BranchDoc[]
    | undefined;
  const removeBranch = useMutation(api.adminFns.branches.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<BranchDoc | null>(null);
  const [deleteItem, setDeleteItem] = useState<BranchDoc | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredBranches = (branches ?? []).filter((b) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  });

  function handleEdit(item: BranchDoc) {
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
      await removeBranch({ id: deleteItem._id });
      toast.success("Branch deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setDeleteItem(null);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Branches</h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search branches…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <AdminDataView
        items={filteredBranches}
        keyExtractor={(branch) => branch._id}
        isLoading={branches === undefined}
        loadingState={
          <div className="text-center text-muted-foreground py-8">Loading…</div>
        }
        emptyState={
          <div className="text-center text-muted-foreground py-8">
            {debouncedSearch
              ? "No branches match your search."
              : "No branches yet. Add one to get started."}
          </div>
        }
        renderCard={(branch) => (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{branch.name}</h3>
              {branch.comingSoon ? (
                <Badge variant="outline">Coming Soon</Badge>
              ) : (
                <Badge variant="secondary">Active</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{branch.city}</p>
              <p>{branch.cell || "—"}</p>
              <p>{branch.email || "—"}</p>
            </div>
            <div className="flex items-center justify-end gap-1 pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(branch)}
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteItem(branch)}
                title="Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        renderTable={() => (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Cell</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches === undefined ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {debouncedSearch
                        ? "No branches match your search."
                        : "No branches yet. Add one to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch._id}>
                      <TableCell className="font-medium">
                        {branch.name}
                      </TableCell>
                      <TableCell>{branch.city}</TableCell>
                      <TableCell>{branch.cell || "—"}</TableCell>
                      <TableCell>{branch.email || "—"}</TableCell>
                      <TableCell>
                        {branch.comingSoon ? (
                          <Badge variant="outline">Coming Soon</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(branch)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItem(branch)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      <BranchFormDialog
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
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteItem?.name}</span>? This
              action cannot be undone.
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
