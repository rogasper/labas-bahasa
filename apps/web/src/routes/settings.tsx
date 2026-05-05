import { useState } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useApiKeys, type ApiKeyConfig } from "@/hooks/use-api-key";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Input } from "@labas/ui/components/input";
import { Label } from "@labas/ui/components/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@labas/ui/components/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@labas/ui/components/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
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

function TokenUsageSection() {
  const { data, isLoading } = useQuery(trpc.ai.tokenUsageToday.queryOptions());

  const totalTokens = data?.totalTokens ?? 0;
  const jobs = data?.jobs ?? [];

  return (
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
  );
}

function RouteComponent() {
  const { configs, isLoading, addConfig, updateConfig, removeConfig } =
    useApiKeys();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<Omit<ApiKeyConfig, "id"> & { apiKey: string }>({
    ...defaultConfig(),
    apiKey: "",
  });

  const resetForm = () => {
    setForm({ ...defaultConfig(), apiKey: "" });
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
      apiKey: "", // kosong = tidak ubah
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
    form.name.trim() &&
    form.baseUrl.trim() &&
    form.modelName.trim() &&
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

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="token-usage">Token Usage</TabsTrigger>
          <TabsTrigger value="security">Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-8">
              {/* API Key List */}
              <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MaterialIcon name="key" className="text-xl" />
                      <div>
                        <CardTitle className="font-headline text-[var(--clay-black)]">API Keys</CardTitle>
                        <CardDescription className="text-[var(--warm-charcoal)]">
                          {configs.length} konfigurasi tersimpan
                        </CardDescription>
                      </div>
                    </div>
                    {!isFormOpen && (
                      <Button
                        onClick={startAdd}
                        className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] clay-shadow clay-hover text-sm"
                      >
                        <MaterialIcon name="add" className="mr-1" />
                        Tambah
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="h-20 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />
                  ) : configs.length === 0 ? (
                    <div className="text-center py-8">
                      <MaterialIcon name="key_off" className="text-4xl text-[var(--warm-silver)] mx-auto mb-3" />
                      <p className="text-[var(--warm-charcoal)] font-semibold">Belum ada API key</p>
                      <p className="text-xs text-[var(--warm-silver)] mt-1">
                        Tambahkan minimal satu key untuk generate soal.
                      </p>
                      <Button
                        onClick={startAdd}
                        className="mt-4 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]"
                      >
                        <MaterialIcon name="add" className="mr-1" />
                        Tambah API Key
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {configs.map((config) => (
                        <div
                          key={config.id}
                          className={`p-4 rounded-[var(--radius-lg)] border-2 transition-colors ${
                            editingId === config.id
                              ? "border-[var(--matcha-600)] bg-[var(--matcha-100)]"
                              : "border-[var(--oat-border)] bg-[var(--warm-cream)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-[var(--clay-black)] truncate">
                                  {config.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-[10px] font-semibold">
                                  {PROVIDERS.find((p) => p.value === config.provider)?.label ?? config.provider}
                                </span>
                              </div>
                              <div className="text-xs text-[var(--warm-charcoal)]">
                                {config.modelName} · {config.baseUrl.replace("https://", "").replace("/v1", "")}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => startEdit(config)}
                                className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--oat-light)] text-[var(--warm-charcoal)] transition-colors"
                                title="Edit"
                              >
                                <MaterialIcon name="edit" className="text-sm" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Yakin mau hapus konfigurasi ini?")) {
                                    removeConfig(config.id);
                                  }
                                }}
                                className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--pomegranate-400)]/10 text-[var(--pomegranate-400)] transition-colors"
                                title="Hapus"
                              >
                                <MaterialIcon name="delete" className="text-sm" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add/Edit Form */}
              {isFormOpen && (
                <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--matcha-400)] rounded-[var(--radius-xl)]">
                  <CardHeader>
                    <CardTitle className="font-headline text-[var(--clay-black)]">
                      {isAdding ? "Tambah API Key Baru" : "Edit API Key"}
                    </CardTitle>
                    <CardDescription className="text-[var(--warm-charcoal)]">
                      {isAdding
                        ? "Tambahkan konfigurasi provider baru."
                        : "Kosongkan field API Key jika tidak ingin mengubahnya."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[var(--clay-black)]">Nama Config</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Contoh: OpenAI GPT-4o"
                        className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="provider" className="text-[var(--clay-black)]">Provider</Label>
                        <Select
                          items={PROVIDERS}
                          value={form.provider}
                          onValueChange={(v: string | null) =>
                            setForm((f) => ({ ...f, provider: v ?? "openai" }))
                          }
                        >
                          <SelectTrigger id="provider">
                            <SelectValue placeholder="Pilih provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {PROVIDERS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model" className="text-[var(--clay-black)]">Model</Label>
                        <Input
                          id="model"
                          value={form.modelName}
                          onChange={(e) => setForm((f) => ({ ...f, modelName: e.target.value }))}
                          placeholder="gpt-4o-mini"
                          className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="baseUrl" className="text-[var(--clay-black)]">Base URL</Label>
                        <Input
                          id="baseUrl"
                          value={form.baseUrl}
                          onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                          placeholder="https://api.openai.com/v1"
                          className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxTokens" className="text-[var(--clay-black)]">Max Tokens</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          min={1}
                          max={1_000_000}
                          value={form.maxTokens}
                          onChange={(e) => setForm((f) => ({ ...f, maxTokens: Number(e.target.value) }))}
                          placeholder="16384"
                          className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey" className="text-[var(--clay-black)]">
                        API Key
                        {!isAdding && (
                          <span className="text-[var(--warm-silver)] font-normal ml-1">
                            (kosongkan jika tidak diubah)
                          </span>
                        )}
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={form.apiKey}
                        onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                        placeholder={isAdding ? "sk-..." : "•••••••• (kosongkan untuk tidak mengubah)"}
                        className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleSave}
                        disabled={!canSave || isSaving}
                        className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] h-11 clay-shadow clay-hover"
                      >
                        {isSaving ? "Menyimpan..." : isAdding ? "Simpan" : "Update"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEdit}
                        className="rounded-[var(--radius-lg)] h-11 border-2 border-[var(--oat-border)]"
                      >
                        Batal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-5">
              <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] sticky top-8">
                <CardHeader>
                  <CardTitle className="font-headline text-[var(--clay-black)]">Tips</CardTitle>
                  <CardDescription className="text-[var(--warm-charcoal)]">
                    Panduan singkat mengelola API key.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-[var(--warm-charcoal)] space-y-2">
                    <p className="flex items-start gap-2">
                      <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                      BYOK — bawa key milik Anda sendiri
                    </p>
                    <p className="flex items-start gap-2">
                      <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                      Platform tidak menyimpan key di server
                    </p>
                    <p className="flex items-start gap-2">
                      <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                      Key dienkripsi secara lokal di browser
                    </p>
                    <p className="flex items-start gap-2">
                      <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                      Anda bisa menambahkan beberapa config
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="token-usage">
          <TokenUsageSection />
        </TabsContent>

        <TabsContent value="security">
          <div className="max-w-xl">
            <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardHeader>
                <CardTitle className="font-headline text-[var(--clay-black)]">Keamanan</CardTitle>
                <CardDescription className="text-[var(--warm-charcoal)]">
                  Cara penyimpanan API key Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-[var(--matcha-300)] rounded-[var(--radius-lg)]">
                  <MaterialIcon name="lock" className="text-xl text-[var(--matcha-800)]" />
                  <div>
                    <p className="font-medium text-[var(--matcha-800)]">Enkripsi Lokal</p>
                    <p className="text-sm text-[var(--matcha-800)]/70">
                      AES-GCM-256 dengan key di IndexedDB
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[var(--warm-charcoal)] space-y-2">
                  <p className="flex items-start gap-2">
                    <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                    API key tidak pernah dikirim ke server kami
                  </p>
                  <p className="flex items-start gap-2">
                    <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                    Data terenkripsi di localStorage browser Anda
                  </p>
                  <p className="flex items-start gap-2">
                    <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                    Key enkripsi tersimpan aman di IndexedDB
                  </p>
                  <p className="flex items-start gap-2">
                    <MaterialIcon name="check_circle" className="text-xs text-[var(--matcha-600)] shrink-0 mt-0.5" />
                    BYOK — Bring Your Own Key, platform tidak menyimpan key
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
