import { createLazyFileRoute } from "@tanstack/react-router";
import { CpnsHistoryComponent } from "@/components/routes/CpnsHistoryPage";

export const Route = createLazyFileRoute("/cpns/history")({
  component: CpnsHistoryComponent,
});
