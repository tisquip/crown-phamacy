import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/layout/AdminLayout";
import { CdnImageUpload } from "@/components/CdnImageUpload";
import { StorageImage } from "@/components/StorageImage";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/BlogPost/$id")({
  component: RouteComponent,
});

// ── Form Schema ─────────────────────────────────────────────────────────────
const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200, "Slug is too long")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only (e.g. my-blog-post)",
    ),
  excerpt: z.string().max(500, "Excerpt is too long").optional(),
  contentAsMarkdown: z
    .string()
    .min(1, "Content is required")
    .max(50000, "Content is too long"),
  isPublished: z.boolean(),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

/** Auto-generate a slug from the title. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const existingPost = useQuery(
    api.adminFns.blogPosts.getById,
    isNew ? "skip" : { id: id as Id<"blogPost"> },
  );

  const createPost = useMutation(api.adminFns.blogPosts.create);
  const updatePost = useMutation(api.adminFns.blogPosts.update);

  const [imageId, setImageId] = useState<Id<"_storage"> | null>(null);
  const [cdnImageUrl, setCdnImageUrl] = useState<string | null>(null);
  const [cdnImageKey, setCdnImageKey] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      contentAsMarkdown: "",
      isPublished: false,
    },
  });

  // Populate form when editing an existing post
  useEffect(() => {
    if (!isNew && existingPost && !initialized) {
      form.reset({
        title: existingPost.title,
        slug: existingPost.slug,
        excerpt: existingPost.excerpt ?? "",
        contentAsMarkdown: existingPost.contentAsMarkdown,
        isPublished: existingPost.isPublished,
      });
      setImageId(existingPost.storageIdImage ?? null);
      setCdnImageUrl(existingPost.cdnImageUrl ?? null);
      setCdnImageKey(existingPost.cdnImageKey ?? null);
      setInitialized(true);
    }
    if (isNew && !initialized) {
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPost, isNew, initialized]);

  // Auto-generate slug from title only for new posts
  const watchedTitle = form.watch("title");
  useEffect(() => {
    if (isNew && watchedTitle) {
      form.setValue("slug", slugify(watchedTitle), { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTitle, isNew]);

  async function onSubmit(values: BlogPostFormValues) {
    try {
      if (isNew) {
        await createPost({
          title: values.title,
          slug: values.slug,
          excerpt: values.excerpt || undefined,
          contentAsMarkdown: values.contentAsMarkdown,
          isPublished: values.isPublished,
          storageIdImage: imageId ?? undefined,
          cdnImageUrl: cdnImageUrl ?? undefined,
          cdnImageKey: cdnImageKey ?? undefined,
        });
        toast.success("Blog post created");
      } else {
        await updatePost({
          id: id as Id<"blogPost">,
          title: values.title,
          slug: values.slug,
          excerpt: values.excerpt || undefined,
          contentAsMarkdown: values.contentAsMarkdown,
          isPublished: values.isPublished,
          storageIdImage: imageId ?? undefined,
          cdnImageUrl: cdnImageUrl ?? undefined,
          cdnImageKey: cdnImageKey ?? undefined,
        });
        toast.success("Blog post updated");
      }
      navigate({ to: "/admin/BlogPosts" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  // Show loading state when fetching existing post
  if (!isNew && existingPost === undefined) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!isNew && existingPost === null) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Blog post not found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate({ to: "/admin/BlogPosts" })}
          >
            Back to Blog Posts
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/admin/BlogPosts" })}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? "New Blog Post" : "Edit Blog Post"}
        </h1>
      </div>

      <div className="max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Two-column layout for image + meta */}
            <div className="grid md:grid-cols-[1fr_300px] gap-6">
              {/* Left column – main fields */}
              <div className="space-y-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 5 Tips for Healthy Living"
                          className="text-lg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Slug */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 5-tips-for-healthy-living"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL-friendly identifier. Auto-generated from title.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Excerpt */}
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary shown on listing pages (optional)"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content */}
                <FormField
                  control={form.control}
                  name="contentAsMarkdown"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <div
                          data-color-mode="light"
                          className="rounded-md overflow-hidden border border-input"
                        >
                          <MDEditor
                            value={field.value}
                            onChange={(val) => field.onChange(val ?? "")}
                            height={500}
                            preview="live"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Use the toolbar to format your content, or write
                        Markdown directly.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right column – image + publish */}
              <div className="space-y-6">
                {/* Featured Image */}
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <FormLabel>Featured Image</FormLabel>
                  {(cdnImageUrl || imageId) && (
                    <StorageImage
                      storageId={imageId}
                      cdnUrl={cdnImageUrl}
                      alt="Preview"
                      className="w-full h-40 rounded object-cover"
                    />
                  )}
                  <CdnImageUpload
                    currentImageUrl={cdnImageUrl}
                    cdnImageKey={cdnImageKey}
                    keyPrefix="blog"
                    onUploadComplete={({ cdnUrl, key }) => {
                      setCdnImageUrl(cdnUrl);
                      setCdnImageKey(key);
                    }}
                    onClear={() => {
                      setCdnImageUrl(null);
                      setCdnImageKey(null);
                    }}
                    hidePreview
                  />
                </div>

                {/* Published */}
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-card">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Publish</FormLabel>
                        <FormDescription>
                          When checked, this post will be visible to the public.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : isNew ? (
                      "Create Post"
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate({ to: "/admin/BlogPosts" })}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
