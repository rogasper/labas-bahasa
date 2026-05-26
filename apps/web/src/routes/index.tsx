import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { routeShell } from "@/lib/route-shell";
import { buildSocialMeta, DEFAULT_SITE_TITLE, SITE_URL } from "@/lib/site-seo";

export const Route = createFileRoute("/")({
  staticData: routeShell.public,
  head: () => ({
    meta: [
      { title: DEFAULT_SITE_TITLE },
      ...buildSocialMeta({ url: `${SITE_URL}/` }),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession();
      if (session.data?.user) {
        throw redirect({ to: "/dashboard", replace: true });
      }
    } catch (e) {
      if (isRedirect(e)) throw e;
      // Offline / auth endpoint unavailable — still show public landing.
    }
  },
});
