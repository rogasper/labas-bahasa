import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Labas — AI-Powered Exam Practice Platform" },
      { name: "description", content: "Generate AI-powered practice questions for JLPT, TOPIK, TOAFL, and more. Practice smarter with adaptive test preparation." },
      { property: "og:title", content: "Labas — AI-Powered Exam Practice Platform" },
      { property: "og:description", content: "Generate AI-powered practice questions for JLPT, TOPIK, TOAFL, and more. Practice smarter with adaptive test preparation." },
      { property: "og:url", content: "https://labas.rogasper.com/landing" },
    ],
    links: [
      { rel: "canonical", href: "https://labas.rogasper.com/landing" },
    ],
  }),
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession();
      if (session?.data) {
        throw redirect({ to: "/", replace: true });
      }
    } catch (e) {
      if (e instanceof Response) throw e;
    }
  },
});
