import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StorageImage } from "./StorageImage";
import { Link } from "@tanstack/react-router";
import { Calendar, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import type { FunctionReturnType } from "convex/server";

/**
 * Homepage section showing the 3 latest published blog posts.
 * Hidden when there are no published posts.
 */
export default function HomepageBlogHighlights() {
  const convex = useConvex();
  const [posts, setPosts] = useState<
    FunctionReturnType<typeof api.userFns.blogPosts.getLatest> | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    convex
      .query(api.userFns.blogPosts.getLatest, { limit: 3 })
      .then((result) => {
        if (!cancelled) setPosts(result);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <span className="block w-1 h-6 rounded-full bg-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Latest from Our Blog
          </h2>
        </div>
        <Link
          to="/Blog"
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        >
          View all articles
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
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
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {post.excerpt}
                </p>
              )}
              {post.publishedAt && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(post.publishedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
