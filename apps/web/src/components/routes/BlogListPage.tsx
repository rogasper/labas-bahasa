import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Route } from "@/routes/blog.index";
import { trpc } from "@/utils/trpc";
import { BlogCard } from "@/components/blog/BlogCard";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Input } from "@labas/ui/components/input";
import { useState } from "react";

export function BlogListPage() {
  const { page = 1, search: searchParam } = useSearch({ from: Route.id });
  const navigate = useNavigate({ from: Route.id });
  const [searchInput, setSearchInput] = useState(searchParam ?? "");

  const { data, isLoading, isError } = useQuery(
    trpc.blog.posts.queryOptions({
      page,
      perPage: 9,
      search: searchParam || undefined,
    }),
  );

  const posts = data?.data ?? [];
  const meta = data?.metadata;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: { page: 1, search: searchInput || undefined } });
  }

  return (
    <div className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full pt-12 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold text-[var(--clay-black)]">
            Artikel
          </h1>
          <p className="text-[var(--warm-charcoal)] mt-1">
            Tips dan panduan seputar ujian bahasa
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="search"
            placeholder="Cari artikel..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)]"
          />
          <Button
            type="submit"
            className="bg-[var(--clay-black)] text-[var(--pure-white)] rounded-[var(--radius-lg)]"
            aria-label="Cari"
          >
            <MaterialIcon name="search" className="text-lg" />
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="text-center py-20">
          <MaterialIcon name="hourglass_top" className="text-4xl text-[var(--warm-silver)] animate-spin" />
          <p className="text-[var(--warm-charcoal)] mt-2">Memuat artikel...</p>
        </div>
      )}

      {isError && (
        <div className="text-center py-20">
          <MaterialIcon name="error_outline" className="text-4xl text-[var(--pomegranate-600)]" />
          <p className="text-[var(--warm-charcoal)] mt-2">Gagal memuat artikel. Coba lagi nanti.</p>
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div className="text-center py-20">
          <MaterialIcon name="article" className="text-5xl text-[var(--warm-silver)]" />
          <p className="text-lg text-[var(--warm-charcoal)] mt-3">
            {searchParam
              ? `Tidak ada artikel untuk "${searchParam}"`
              : "Belum ada artikel."}
          </p>
          {searchParam && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchInput("");
                navigate({ search: { page: 1, search: undefined } });
              }}
            >
              Hapus filter
            </Button>
          )}
        </div>
      )}

      {posts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-12">
              <Button
                variant="outline"
                disabled={meta.page <= 1}
                onClick={() =>
                  navigate({ search: { page: meta.page - 1, search: searchParam || undefined } })
                }
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
              >
                <MaterialIcon name="chevron_left" className="text-lg mr-1" />
                Sebelumnya
              </Button>
              <span className="text-sm text-[var(--warm-charcoal)]">
                Halaman {meta.page} dari {meta.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={meta.page >= meta.totalPages}
                onClick={() =>
                  navigate({ search: { page: meta.page + 1, search: searchParam || undefined } })
                }
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
              >
                Selanjutnya
                <MaterialIcon name="chevron_right" className="text-lg ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
