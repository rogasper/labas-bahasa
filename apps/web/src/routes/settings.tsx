import { useState, startTransition } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useApiKeys, type ApiKeyConfig } from "@/hooks/use-api-key";
import { trpc } from "@/utils/trpc";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@labas/ui/components/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { TokenUsageChart } from "@/components/settings/TokenUsageChart";
import { ApiKeyList } from "@/components/settings/ApiKeyList";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { TipsCard } from "@/components/settings/TipsCard";
import { SecurityInfo } from "@/components/settings/SecurityInfo";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { z } from "zod";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
  validateSearch: z.object({
    tab: z.enum(["api-keys", "token-usage", "security", "account"]).optional(),
  }).parse,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "groq", label: "Groq" },
  { value: "custom", label: "Custom" },
];

function defaultConfig(): Omit<ApiKeyConfig, "id" | "apiKey"> {
  return {
    name: "",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4o-mini",
    maxTokens: 16384,
  };
}

type Tab = "api-keys" | "token-usage" | "security" | "account";

function TokenUsageSection() {
  const { data, isLoading } = useQuery(trpc.ai.tokenUsageToday.queryOptions());

  const totalTokens = data?.totalTokens ?? 0;
  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-6">
      <TokenUsageChart />

      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MaterialIcon name="toll" className="text-xl" />
            <div>
              <CardTitle className="font-headline text-[var(--clay-black)]">
                Penggunaan Token Hari Ini
              </CardTitle>
              <CardDescription className="text-[var(--warm-charcoal)]">
                Total token yang terpakai untuk generate soal hari ini.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-[var(--matcha-300)] rounded-[var(--radius-lg)]">
            <MaterialIcon name="toll" className="text-3xl text-[var(--matcha-800)]" />
            <div>
              <p className="text-sm text-[var(--matcha-800)]/80">Total Token Terpakai</p>
              <p className="text-3xl font-extrabold text-[var(--matcha-800)]">
                {isLoading ? "..." : totalTokens.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--clay-black)] mb-3">
              Riwayat Generate Hari Ini
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-[var(--oat-border)] rounded-[var(--radius-lg)]">
                <MaterialIcon name="receipt_long" className="text-4xl text-[var(--warm-silver)] mx-auto mb-3" />
                <p className="text-[var(--warm-charcoal)] font-semibold">Belum ada generate hari ini</p>
                <p className="text-xs text-[var(--warm-silver)] mt-1">
                  Generate soal baru untuk melihat penggunaan token.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--oat-border)] text-[var(--warm-charcoal)]">
                      <th className="text-left py-2 px-3 font-medium">Waktu</th>
                      <th className="text-left py-2 px-3 font-medium">Mode</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Ujian</th>
                      <th className="text-left py-2 px-3 font-medium">Section</th>
                      <th className="text-right py-2 px-3 font-medium">Soal</th>
                      <th className="text-right py-2 px-3 font-medium">Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const isFailed = job.status === "failed";
                      const isCancelled = job.status === "cancelled";
                      return (
                        <tr
                          key={job.id}
                          className={`border-b border-[var(--oat-border)] last:border-0 hover:bg-[var(--warm-cream)] transition-colors ${
                            isFailed || isCancelled ? "opacity-70" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-[var(--clay-black)] whitespace-nowrap">
                            {new Date(job.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                job.mode === "agentic"
                                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                                  : "bg-[var(--lavender-300)] text-[var(--lavender-800)]"
                              }`}
                            >
                              {job.mode === "agentic" ? "Agentic" : "Quick"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {job.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--matcha-800)]">
                                <MaterialIcon name="check_circle" className="text-xs" />
                                Selesai
                              </span>
                            ) : isFailed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--pomegranate-400)]">
                                <MaterialIcon name="error" className="text-xs" />
                                Gagal
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--warm-charcoal)]">
                                <MaterialIcon name="cancel" className="text-xs" />
                                Dibatalkan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--warm-silver)]">
                                <MaterialIcon name="hourglass_empty" className="text-xs" />
                                {job.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--clay-black)]">{job.examTypeId}</td>
                          <td className="py-2.5 px-3 text-[var(--clay-black)]">{job.sectionTypeId}</td>
                          <td className="py-2.5 px-3 text-right text-[var(--clay-black)]">{job.questionCount}</td>
                          <td className="py-2.5 px-3 text-right text-[var(--clay-black)] font-medium">
                            {job.tokensUsed?.toLocaleString("id-ID") ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RouteComponent() {
  const { configs, isLoading, addConfig, updateConfig, removeConfig } =
    useApiKeys();

  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeTab: Tab = search.tab ?? "api-keys";

  const setTab = (tab: string) => {
    startTransition(() => {
      navigate({ search: { tab: tab as Tab } });
    });
  };

  const [form, setForm] = useState<Omit<ApiKeyConfig, "id"> & { apiKey: string }>(
    () => ({
      ...defaultConfig(),
      apiKey: "",
    }),
  );

  const resetForm = () => {
    setForm({ ...defaultConfig(), apiKey: "" });
  };

  const handleFormChange = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
    setEditingId(null);
  };

  const startEdit = (config: ApiKeyConfig) => {
    setForm({
      name: config.name,
      provider: config.provider,
      baseUrl: config.baseUrl,
      modelName: config.modelName,
      maxTokens: config.maxTokens ?? 16384,
      apiKey: "",
    });
    setEditingId(config.id);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      if (isAdding) {
        if (!form.apiKey) return;
        await addConfig(form);
        setIsAdding(false);
      } else if (editingId) {
        await updateConfig(editingId, form);
        setEditingId(null);
      }
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const isFormOpen = isAdding || editingId !== null;
  const canSave =
    !!form.name.trim() &&
    !!form.baseUrl.trim() &&
    !!form.modelName.trim() &&
    (isAdding ? !!form.apiKey : true);

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-5xl mx-auto bg-[var(--warm-cream)]">
      <section className="mb-10">
        <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-4">
          <Link to="/" className="hover:text-[var(--clay-black)] transition-colors">Beranda</Link>
          <MaterialIcon name="chevron_right" className="text-xs" />
          <span className="text-[var(--clay-black)] font-medium">Pengaturan</span>
        </div>
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Pengaturan
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] mt-2">
          Kelola API key, pantau penggunaan token, dan preferensi akun.
        </p>
      </section>

      <Tabs value={activeTab} onValueChange={setTab} className="w-full">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="token-usage">Token Usage</TabsTrigger>
          <TabsTrigger value="account">Akun</TabsTrigger>
          <TabsTrigger value="security">Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-8">
              <ApiKeyList
                configs={configs}
                isLoading={isLoading}
                editingId={editingId}
                isFormOpen={isFormOpen}
                providers={PROVIDERS}
                onStartAdd={startAdd}
                onStartEdit={startEdit}
                onRemove={removeConfig}
              />

              {isFormOpen && (
                <ApiKeyForm
                  isAdding={isAdding}
                  isSaving={isSaving}
                  form={form}
                  canSave={canSave}
                  providers={PROVIDERS}
                  onChange={handleFormChange}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                />
              )}
            </div>

            <div className="lg:col-span-5">
              <TipsCard />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="token-usage">
          <TokenUsageSection />
        </TabsContent>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="security">
          <SecurityInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
