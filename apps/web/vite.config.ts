import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor";
          if (id.includes("node_modules/@tanstack/react-router") || id.includes("node_modules/@tanstack/react-query")) return "router";
          if (id.includes("node_modules/recharts")) return "charts";
          if (id.includes("node_modules/react-joyride")) return "tour";
        },
      },
    },
  },
  plugins: [
    {
      name: "inject-umami",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          '<script defer src="https://umami-analytic.rogasper.com/script.js" data-website-id="67a18412-12c8-44ef-9cd3-e04238d37e9a"></script></head>',
        );
      },
      apply: "build",
    },
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "labas",
        short_name: "labas",
        description: "AI-powered multi-language test practice platform",
        theme_color: "#0c0c0c",
      },
      pwaAssets: { disabled: false, config: true },
      devOptions: { enabled: false },
    }),
  ],
});
