import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface ActiveUser {
  attemptId: string;
  userId: string;
  userName: string;
  userEmail: string;
  packageTitle: string;
  startedAt: Date | string;
  elapsedMinutes: number;
}

interface ActiveUsersPanelProps {
  data: ActiveUser[] | undefined;
  isLoading: boolean;
}

function formatElapsed(minutes: number): string {
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}j ${m}m`;
}

export function ActiveUsersPanel({ data, isLoading }: ActiveUsersPanelProps) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Sedang Latihan Sekarang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const count = data?.length ?? 0;

  return (
    <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="bolt" className="text-xl text-[var(--chart-3)]" />
            <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
              Sedang Latihan Sekarang
            </CardTitle>
            {count > 0 && (
              <span className="text-xs font-bold bg-[var(--chart-3)]/15 text-[var(--chart-3)] px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
          <Link
            to="/admin/activity"
            search={{ page: 1, sortDir: "desc" as const, status: "in_progress" }}
            className="text-xs text-[var(--matcha-700)] hover:underline font-medium"
          >
            Lihat semua
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-[var(--warm-charcoal)]">
            <MaterialIcon name="self_improvement" className="text-3xl text-[var(--warm-silver)] mb-2" />
            <p className="text-sm">Tidak ada yang sedang latihan</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {data!.map((user) => (
              <div
                key={user.attemptId}
                className="flex items-center gap-3 p-2 rounded-[var(--radius-lg)] bg-[var(--oat-light)]/50"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--chart-3)] animate-pulse shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--clay-black)] truncate">
                    {user.userName}
                  </p>
                  <p className="text-xs text-[var(--warm-charcoal)] truncate">
                    {user.packageTitle}
                  </p>
                </div>
                <span className="text-xs text-[var(--warm-silver)] shrink-0">
                  {formatElapsed(user.elapsedMinutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
