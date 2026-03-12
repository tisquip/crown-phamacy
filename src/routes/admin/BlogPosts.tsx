import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Pencil, Trash2, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import { AdminDataView } from "@/components/admin/AdminDataView";

export const Route = createFileRoute("/admin/BlogPosts")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const posts = useQuery(api.adminFns.blogPosts.list) ?? [];
  const removePost = useMutation(api.adminFns.blogPosts.remove);
  const restorePost = useMutation(api.adminFns.blogPosts.restore);

  const [deleteId, setDeleteId] = useState<Id<"blogPost"> | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [previewPost, setPreviewPost] = useState<(typeof posts)[0] | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredPosts = posts.filter((p) => {
    if (!debouncedSearch) return true;
    return (
      p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  });

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await removePost({ id: deleteId });
      toast.success("Blog post deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setDeleteId(null);
    }
  }

  async function handleRestore(id: Id<"blogPost">) {
    try {
      await restorePost({ id });
      toast.success("Blog post restored");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
        <Button
          onClick={() =>
            navigate({ to: "/admin/BlogPost/$id", params: { id: "new" } })
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search blog posts…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Posts Table / Grid */}
      <AdminDataView
        items={filteredPosts}
        keyExtractor={(post) => post._id}
        isLoading={posts === undefined}
        loadingState={
          <div className="text-center text-muted-foreground py-8">
            Loading...
          </div>
        }
        emptyState={
          <div className="text-center text-muted-foreground py-8">
            {debouncedSearch
              ? "No posts match your search."
              : "No blog posts yet. Create your first post!"}
          </div>
        }
        renderCard={(post) => (
          <div
            className={`bg-card border border-border rounded-lg p-4 space-y-3 ${post.isDeleted ? "opacity-50" : ""}`}
          >
            <StorageImage
              storageId={post.storageIdImage}
              alt={post.title}
              className="w-full h-32 rounded object-cover"
            />
            <div>
              <h3 className="font-medium text-sm truncate">{post.title}</h3>
              <p className="text-xs text-muted-foreground">
                {post.authorName ?? "Unknown"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                {post.isDeleted ? (
                  <Badge variant="destructive">Deleted</Badge>
                ) : post.isPublished ? (
                  <Badge className="bg-green-600">Published</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
              {post.isDeleted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRestore(post._id)}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewPost(post)}
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigate({
                        to: "/admin/BlogPost/$id",
                        params: { id: post._id },
                      })
                    }
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(post._id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
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
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="w-[160px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts === undefined ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {debouncedSearch
                        ? "No posts match your search."
                        : "No blog posts yet. Create your first post!"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow
                      key={post._id}
                      className={post.isDeleted ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <StorageImage
                          storageId={post.storageIdImage}
                          alt={post.title}
                          className="w-14 h-10 rounded object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {post.title}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {post.authorName ?? "Unknown"}
                      </TableCell>
                      <TableCell>
                        {post.isDeleted ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : post.isPublished ? (
                          <Badge className="bg-green-600">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {post.isDeleted ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestore(post._id)}
                              title="Restore"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewPost(post)}
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate({
                                    to: "/admin/BlogPost/$id",
                                    params: { id: post._id },
                                  })
                                }
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(post._id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Preview Sheet */}
      <Sheet open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          {previewPost && (
            <>
              <SheetHeader>
                <SheetTitle>{previewPost.title}</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                {previewPost.storageIdImage && (
                  <StorageImage
                    storageId={previewPost.storageIdImage}
                    alt={previewPost.title}
                    className="w-full h-48 rounded-lg object-cover"
                  />
                )}
                <div className="text-sm text-muted-foreground">
                  By {previewPost.authorName ?? "Unknown"} &middot;{" "}
                  {previewPost.publishedAt
                    ? new Date(previewPost.publishedAt).toLocaleDateString()
                    : "Draft"}
                </div>
                {previewPost.excerpt && (
                  <p className="text-muted-foreground italic">
                    {previewPost.excerpt}
                  </p>
                )}
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {previewPost.contentAsMarkdown}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the blog post. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
