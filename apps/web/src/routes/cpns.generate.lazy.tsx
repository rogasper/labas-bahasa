import { createLazyFileRoute } from "@tanstack/react-router";
import { CpnsGenerateComponent } from "@/components/routes/CpnsGeneratePage";

export const Route = createLazyFileRoute("/cpns/generate")({
  component: CpnsGenerateComponent,
});
