import { createLazyFileRoute } from "@tanstack/react-router";
import { CpnsBankComponent } from "@/components/routes/CpnsBankPage";

export const Route = createLazyFileRoute("/cpns/bank")({
  component: CpnsBankComponent,
});
