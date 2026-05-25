export type RouteShell = "public" | "fullscreen" | "app";

export const routeShell = {
  public: { shell: "public" as const },
  fullscreen: { shell: "fullscreen" as const },
  app: { shell: "app" as const },
};
