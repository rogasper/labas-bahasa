import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { BlockRenderer } from "@/components/blog/BlockRenderer";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function setMeta(attr: string, name: string, content: string) {
  const selector = `meta[${attr}="${name}"]`;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function BlogDetailPage() {
  const { slug } = useParams({ from: "/blog/$slug" });

  const { data, isLoading, isError } = useQuery(
    trpc.blog.postBySlug.queryOptions({ slug }),
  );

  // Sync meta update during render — before paint, so Google reads correct tags
  const metaPost = data?.data ?? null;
  if (metaPost) {
    document.title = metaPost.metaTitle || metaPost.title;
    setMeta("name", "description", metaPost.metaDescription || "");
    setMeta("name", "keywords", metaPost.keywords || "");
    setMeta("property", "og:title", metaPost.metaTitle || metaPost.title);
    setMeta("property", "og:description", metaPost.metaDescription || "");
    if (metaPost.thumbnail) setMeta("property", "og:image", metaPost.thumbnail);
  }

  if (isLoading) {
    return (
      <div className="px-6 md:px-12 lg:px-16 max-w-3xl mx-auto w-full pt-12 pb-32">
        <div className="text-center py-20">
          <MaterialIcon name="hourglass_top" className="text-4xl text-[var(--warm-silver)] animate-spin" />
          <p className="text-[var(--warm-charcoal)] mt-2">Memuat artikel...</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="px-6 md:px-12 lg:px-16 max-w-3xl mx-auto w-full pt-12 pb-32">
        <div className="text-center py-20">
          <MaterialIcon name="error_outline" className="text-5xl text-[var(--pomegranate-600)]" />
          <h1 className="text-2xl font-headline font-bold text-[var(--clay-black)] mt-4">
            Artikel tidak ditemukan
          </h1>
          <p className="text-[var(--warm-charcoal)] mt-2">
            Artikel yang kamu cari tidak tersedia atau telah dihapus.
          </p>
          <Link
            to="/blog"
            className="inline-block mt-6 text-[var(--matcha-600)] font-semibold hover:underline"
          >
            ← Kembali ke Blog
          </Link>
        </div>
      </div>
    );
  }

  const post = data.data;

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-3xl mx-auto w-full pt-8 pb-32">
      <div className="mb-6">
        <Link
          to="/blog"
          className="text-sm text-[var(--matcha-600)] font-semibold hover:underline inline-flex items-center gap-1"
        >
          <MaterialIcon name="chevron_left" className="text-base" />
          Kembali ke Blog
        </Link>
      </div>

      <article>
        {post.thumbnail && (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="w-full aspect-video object-cover rounded-[var(--radius-xl)] mb-8"
          />
        )}

        <h1 className="text-3xl md:text-4xl font-headline font-bold text-[var(--clay-black)] leading-tight mb-4">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--warm-charcoal)] mb-8 pb-6 border-b border-[var(--oat-border)]">
          {post.author?.name && (
            <span className="flex items-center gap-1.5">
              <MaterialIcon name="person" className="text-base" />
              {post.author.name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <MaterialIcon name="calendar_today" className="text-base" />
            {formatDate(post.createdAt)}
          </span>
          {post.updatedAt !== post.createdAt && (
            <span className="text-xs">
              Diperbarui {formatDate(post.updatedAt)}
            </span>
          )}
        </div>

        <BlockRenderer content={post.content} />
      </article>

      <div className="mt-12 pt-8 border-t border-[var(--oat-border)] text-center">
        <Link
          to="/blog"
          className="text-[var(--matcha-600)] font-semibold hover:underline inline-flex items-center gap-1"
        >
          <MaterialIcon name="chevron_left" className="text-base" />
          Lihat Artikel Lainnya
        </Link>
      </div>
    </div>
  );
}
