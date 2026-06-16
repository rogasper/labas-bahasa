import { Link } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface CpnsGenerationModeCardProps {
  useFreeCredits: boolean;
  setUseFreeCredits: (v: boolean) => void;
  hasFreeCredits: boolean;
  tokenBalance: number;
  myCreditData: any;
  hasConfigs: boolean;
  configs: any[];
  selectedKeyId: string;
  setSelectedKeyId: (v: string) => void;
  selectedConfig: any;
}

export function CpnsGenerationModeCard({
  useFreeCredits, setUseFreeCredits,
  hasFreeCredits, tokenBalance, myCreditData,
  hasConfigs, configs, selectedKeyId, setSelectedKeyId, selectedConfig,
}: CpnsGenerationModeCardProps) {
  return (
    <div className="mb-8 p-5 rounded-[var(--radius-xl)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[var(--clay-black)]">Generation Mode</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => { setUseFreeCredits(false); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${!useFreeCredits
              ? "bg-[var(--clay-black)] text-[var(--pure-white)]"
              : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
            }`}
        >
          <MaterialIcon name="vpn_key" className="text-sm" />
          BYOK
        </button>
        {hasFreeCredits && (
          <button
            onClick={() => { setUseFreeCredits(true); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${useFreeCredits
                ? "bg-[var(--clay-black)] text-[var(--pure-white)]"
                : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
              }`}
          >
            <MaterialIcon name="stars" className="text-sm" />
            Free Credits
          </button>
        )}
        {useFreeCredits && (
          <Link to="/settings" className="text-xs text-[var(--matcha-600)] underline ml-2">
            Atur BYOK di Settings
          </Link>
        )}
      </div>

      {useFreeCredits && myCreditData && (
        <div className="mt-4 pt-4 border-t border-[var(--oat-border)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--warm-charcoal)]">Token kamu</span>
            <span className={`text-lg font-headline font-bold ${tokenBalance > 0 ? "text-[var(--clay-black)]" : "text-[var(--clay-red)]"}`}>
              {tokenBalance.toLocaleString()}
            </span>
          </div>
          {tokenBalance > 0 && (
            <div className="w-full h-2 bg-[var(--oat-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--matcha-500)] rounded-full transition-all"
                style={{ width: String(Math.min(100, Math.round(tokenBalance * 100 / 50000))) + "%" }}
              />
            </div>
          )}
          {myCreditData.cooldownRemaining > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--sunbeam-800)] bg-[var(--sunbeam-300)]/30 px-3 py-1.5 rounded-[var(--radius-md)]">
              <MaterialIcon name="schedule" className="text-base leading-none shrink-0" />
              <span>Cooldown: {myCreditData.cooldownRemaining} hari lagi untuk auto-refill.</span>
            </p>
          )}
          {tokenBalance <= 0 && myCreditData.cooldownRemaining === 0 && (
            <p className="text-xs text-[var(--matcha-700)] bg-[var(--matcha-300)]/30 px-3 py-1.5 rounded-[var(--radius-md)]">
              Token habis. Auto-refill tersedia saat kamu generate.
            </p>
          )}
          {tokenBalance <= 0 && myCreditData.cooldownRemaining > 0 && (
            <p className="text-xs text-[var(--clay-red)]/80 bg-[var(--clay-red)]/5 px-3 py-1.5 rounded-[var(--radius-md)]">
              Token habis & dalam cooldown. Gunakan BYOK atau tunggu {myCreditData.cooldownRemaining} hari.
            </p>
          )}
        </div>
      )}

      {!useFreeCredits && hasConfigs && (
        <div className="mt-4 pt-4 border-t border-[var(--oat-border)]">
          <label className="text-sm font-medium text-[var(--clay-black)] mb-2 block">Provider / API Key</label>
          <div className="flex gap-3">
            <Select value={selectedKeyId} onValueChange={(v) => v && setSelectedKeyId(v)}>
              <SelectTrigger className="flex-1 h-11">
                <SelectValue>
                  {selectedConfig ? selectedConfig.name + " . " + selectedConfig.modelName : "Pilih provider..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {configs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} . {c.modelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link to="/settings">
              <Button variant="outline" size="xl" className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover">
                <MaterialIcon name="settings" className="mr-1" />
                Kelola
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!useFreeCredits && !hasConfigs && !hasFreeCredits && (
        <p className="mt-3 text-xs text-[var(--warm-charcoal)]">
          Tambahkan API key di Settings dahulu.
        </p>
      )}

      {!useFreeCredits && !hasConfigs && hasFreeCredits && (
        <p className="mt-3 text-xs text-[var(--warm-charcoal)]">
          Belum ada API key?{" "}
          <button onClick={() => setUseFreeCredits(true)} className="text-[var(--matcha-600)] underline">
            Gunakan kredit gratis
          </button>
          {" "}atau tambah di Settings.
        </p>
      )}

      {useFreeCredits && !hasFreeCredits && (
        <p className="mt-3 text-xs text-[var(--warm-charcoal)]">
          Free credits sedang dinonaktifkan oleh admin.
        </p>
      )}
    </div>
  );
}
