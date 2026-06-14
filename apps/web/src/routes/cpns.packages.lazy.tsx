import { createLazyFileRoute } from "@tanstack/react-router";
import { CpnsPackagesComponent } from "@/components/routes/CpnsPackagesPage";

export const Route = createLazyFileRoute("/cpns/packages")({
  component: CpnsPackagesComponent,
});
