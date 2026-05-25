import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { toast } from "sonner";

export interface PackageItem {
  id: string;
  title: string;
  description?: string | null;
  examTypeName?: string | null;
  isPublic: boolean;
  creatorUserId?: string | null;
  totalQuestions: number;
  totalSections: number;
  estimatedDurationMin?: number | null;
  usageCount: number;
  avgRating?: number | null;
}

interface PackageCardProps {
  pkg: PackageItem;
  isOwner: boolean;
  bulkMode: boolean;
  isSelected: boolean;
  isTogglePending?: boolean;
  onToggleSelect: () => void;
  onTogglePublic: () => void;
}

export function PackageCard({
  pkg,
  isOwner,
  bulkMode,
  isSelected,
  isTogglePending = false,
  onToggleSelect,
  onTogglePublic,
}: PackageCardProps) {
  const navigate = useNavigate();
  const isPrivate = isOwner && !pkg.isPublic;

  return (
    <Card
      className={`clay-shadow clay-hover bg-[var(--pure-white)] border-2 rounded-[var(--radius-xl)] h-full flex flex-col ${
        bulkMode && isSelected
          ? "border-[var(--matcha-600)] ring-2 ring-[var(--matcha-400)]"
          : isPrivate && !bulkMode
            ? "border-[var(--oat-border)] border-l-[var(--warm-charcoal)] border-l-4"
            : "border-[var(--oat-border)]"
      }`}
    >
      <CardContent className="p-5 flex flex-col h-full">
        {/* Clickable content area */}
        <div
          className="block flex-1 cursor-pointer"
          onClick={bulkMode ? onToggleSelect : undefined}
        >
          <Link
            to="/package/$id"
            params={{ id: pkg.id }}
            className={bulkMode ? "pointer-events-none" : ""}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-2 flex-wrap">
                {bulkMode && (
                  <span className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                    isSelected
                      ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
                      : "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
                  }`}>
                    <MaterialIcon name={isSelected ? "check_circle" : "radio_button_unchecked"} className="text-xs" />
                    {isSelected ? "Terpilih" : "Pilih"}
                  </span>
                )}
                {pkg.examTypeName && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold leading-none whitespace-nowrap">
                    {pkg.examTypeName}
                  </span>
                )}
              </div>
              {pkg.avgRating && (
                <div className="flex items-center gap-1 text-[var(--lemon-700)] shrink-0">
                  <MaterialIcon name="star" className="text-sm" />
                  <span className="text-xs font-bold">{pkg.avgRating}</span>
                </div>
              )}
            </div>

            <h3 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-2 line-clamp-2">
              {pkg.title}
            </h3>

            {pkg.description && (
              <p className="text-sm text-[var(--warm-charcoal)] line-clamp-2 mb-4">
                {pkg.description}
              </p>
            )}
          </Link>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--oat-border)]">
            <div className="flex gap-3 text-xs text-[var(--warm-charcoal)]">
              <span className="flex items-center gap-1">
                <MaterialIcon name="quiz" className="text-xs" />
                {pkg.totalQuestions}
              </span>
              <span className="flex items-center gap-1">
                <MaterialIcon name="folder" className="text-xs" />
                {pkg.totalSections}
              </span>
              {pkg.estimatedDurationMin && (
                <span className="flex items-center gap-1">
                  <MaterialIcon name="timer" className="text-xs" />
                  {pkg.estimatedDurationMin}m
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--warm-silver)]">
              {pkg.usageCount}x digunakan
            </span>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && !bulkMode && (
          <div className="mt-3 pt-3 border-t border-[var(--oat-border)] flex items-center justify-between">
            <button
              onClick={onTogglePublic}
              disabled={isTogglePending}
              aria-label={pkg.isPublic ? "Jadikan privat" : "Jadikan publik"}
              className={`group text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                pkg.isPublic
                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] hover:bg-[var(--pomegranate-400)]/15 hover:text-[var(--pomegranate-600)]"
                  : "bg-[var(--slushie-500)]/15 text-[var(--slushie-800)] hover:bg-[var(--matcha-300)] hover:text-[var(--matcha-800)]"
              }`}
            >
              {/* Default icon */}
              <MaterialIcon
                name={pkg.isPublic ? "public" : "lock"}
                className="text-xs group-hover:hidden"
              />
              {/* Hover icon (shows intent) */}
              <MaterialIcon
                name={pkg.isPublic ? "lock" : "public"}
                className="text-xs hidden group-hover:inline"
              />
              {/* Default label */}
              <span className="group-hover:hidden">
                {pkg.isPublic ? "Publik" : "Privat"}
              </span>
              {/* Hover label */}
              <span className="hidden group-hover:inline">
                {pkg.isPublic ? "Jadikan Privat" : "Jadikan Publik"}
              </span>
            </button>

            {pkg.isPublic && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/package/${pkg.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link paket disalin!");
                }}
                className="text-xs text-[var(--matcha-600)] hover:bg-[var(--matcha-300)]/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
              >
                <MaterialIcon name="share" className="text-xs" />
                Bagikan
              </button>
            )}
          </div>
        )}

        {/* CTA */}
        {!bulkMode && (
          <div className="mt-3 pt-3 border-t border-[var(--oat-border)]">
            <Button
              className="w-full bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] clay-hover rounded-[var(--radius-lg)]"
              onClick={() => navigate({ to: "/package/$id/take", params: { id: pkg.id } })}
              size="xl"
            >
              <MaterialIcon name="play_arrow" className="mr-2" />
              Mulai Latihan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
