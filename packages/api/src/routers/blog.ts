import { z } from "zod";
import { env } from "@labas/env/server";
import { publicProcedure, router } from "../index";

export const blogRouter = router({
  posts: publicProcedure
    .input(
      z
        .object({
          page: z.number().default(1),
          perPage: z.number().default(10),
          search: z.string().optional(),
          orderBy: z.enum(["asc", "desc"]).default("desc"),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { page = 1, perPage = 10, search, orderBy = "desc" } = input ?? {};
      const url = new URL(
        `${env.BLOG_API_URL}/public/projects/${env.BLOG_PROJECT_SLUG}/posts`,
      );
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));
      url.searchParams.set("orderBy", orderBy);
      if (search) url.searchParams.set("search", search);
      const res = await fetch(url.toString(), {
        headers: { "x-api-key": env.BLOG_API_KEY },
      });
      if (!res.ok) {
        throw new Error(`Rogasper API error: ${res.status} ${res.statusText}`);
      }
      return res.json() as Promise<{
        success: boolean;
        data: BlogPostSummary[];
        metadata: BlogMetadata;
      }>;
    }),

  postBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const url = `${env.BLOG_API_URL}/public/projects/${env.BLOG_PROJECT_SLUG}/posts/${input.slug}`;
      const res = await fetch(url, {
        headers: { "x-api-key": env.BLOG_API_KEY },
      });
      if (!res.ok) {
        if (res.status === 404) {
          return { success: false, data: null };
        }
        throw new Error(`Rogasper API error: ${res.status} ${res.statusText}`);
      }
      return res.json() as Promise<{
        success: boolean;
        data: BlogPostDetail | null;
      }>;
    }),
});

export type BlogPostSummary = {
  title: string;
  slug: string;
  thumbnail: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: { name: string };
  categories: { category: { id: number; name: string; slug: string } }[];
};

export type BlogPostDetail = {
  id: string;
  title: string;
  slug: string;
  content: Record<string, BlogBlock>;
  thumbnail: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  categories: { category: { id: number; name: string; slug: string } }[];
};

export type BlogBlock = {
  id: string;
  meta: { align?: string; depth?: number; order: number };
  type: string;
  value: BlogBlockValue[];
};

export type BlogBlockValue = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children: BlogBlockChild[];
};

export type BlogBlockChild = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type BlogMetadata = {
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
  links: {
    first: string;
    previous: string | null;
    next: string | null;
    last: string;
  };
};
