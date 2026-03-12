import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "@/components/layout/Layout";
import { StorageImage } from "@/components/StorageImage";
import { Calendar, User } from "lucide-react";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

export const Route = createFileRoute("/Blogs")({
  component: RouteComponent,
});

function RouteComponent() {
  const convex = useConvex();
  const [posts, setPosts] = useState<
    FunctionReturnType<typeof api.userFns.blogPosts.listPublished> | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex.query(api.userFns.blogPosts.listPublished).then((result) => {
      if (!cancelled) setPosts(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Blog</h1>
        <p className="text-muted-foreground mb-8">
          Health tips, pharmacy news, and wellness advice from Crown Pharmacy.
        </p>

        {posts === undefined ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg overflow-hidden animate-pulse"
              >
                <div className="h-48 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post._id}
                to="/Blog/$slug"
                params={{ slug: post.slug }}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video overflow-hidden">
                  <StorageImage
                    storageId={post.storageIdImage}
                    cdnUrl={post.cdnImageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {post.authorName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.authorName}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
