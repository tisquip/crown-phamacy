import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/layout/Layout";
import { StorageImage } from "@/components/StorageImage";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

export const Route = createFileRoute("/Blog/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const convex = useConvex();
  // undefined = loading, null = not found, object = found
  const [post, setPost] = useState<
    FunctionReturnType<typeof api.userFns.blogPosts.getBySlug> | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex.query(api.userFns.blogPosts.getBySlug, { slug }).then((result) => {
      if (!cancelled) setPost(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (post === undefined) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-3xl animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mb-4" />
          <div className="h-64 bg-muted rounded mb-6" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </div>
      </Layout>
    );
  }

  if (post === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Blog Post Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/Blog">Back to Blog</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back link */}
        <Link
          to="/Blogs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          {post.authorName && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.authorName}
            </span>
          )}
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Featured Image */}
        {(post.cdnImageUrl || post.storageIdImage) && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <StorageImage
              storageId={post.storageIdImage}
              cdnUrl={post.cdnImageUrl}
              alt={post.title}
              className="w-full h-auto max-h-[400px] object-cover"
            />
          </div>
        )}

        {/* Content – rendered as Markdown */}
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.contentAsMarkdown}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="border-t border-border mt-12 pt-6">
          <Button variant="outline" asChild>
            <Link to="/Blogs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              More Articles
            </Link>
          </Button>
        </div>
      </article>
    </Layout>
  );
}
