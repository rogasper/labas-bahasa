import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@labas/ui/components/card";
import type { BlogPostSummary } from "@labas/api/routers/blog";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function BlogCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className="block group">
      <Card className="h-full clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] transition-all hover:border-[var(--matcha-400)] overflow-hidden">
        {post.thumbnail && (
          <div className="aspect-video overflow-hidden bg-[var(--oat-light)]">
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <CardContent className="p-5">
          <h3 className="font-headline text-base font-bold text-[var(--clay-black)] mb-2 line-clamp-2 group-hover:text-[var(--matcha-700)] transition-colors">
            {post.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-[var(--warm-charcoal)]">
            {post.author?.name && (
              <span className="font-medium">{post.author.name}</span>
            )}
            <span>{formatDate(post.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
