import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface ActiveUserRow {
  userId: string;
  userName: string;
  userEmail: string;
  attemptCount: number;
  avgScore: number;
  lastActive: Date | string;
}

interface MostActiveUsersTableProps {
  data: ActiveUserRow[] | undefined;
  isLoading: boolean;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export function MostActiveUsersTable({ data, isLoading }: MostActiveUsersTableProps) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            User Paling Aktif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];

  return (
    <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="leaderboard" className="text-xl text-[var(--chart-2)]" />
            <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
              User Paling Aktif (30 Hari)
            </CardTitle>
          </div>
          <Link
            to="/admin/activity"
            search={{ page: 1, sortDir: "desc" as const }}
            className="text-xs text-[var(--matcha-700)] hover:underline font-medium"
          >
            Lihat semua
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-[var(--warm-charcoal)]">
            <MaterialIcon name="group" className="text-3xl text-[var(--warm-silver)] mb-2" />
            <p className="text-sm">Belum ada aktivitas latihan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--warm-charcoal)] border-b border-[var(--oat-border)]">
                  <th className="text-left py-2 font-medium w-8">#</th>
                  <th className="text-left py-2 font-medium">User</th>
                  <th className="text-right py-2 font-medium">Latihan</th>
                  <th className="text-right py-2 font-medium">Skor</th>
                  <th className="text-right py-2 font-medium">Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.userId} className="border-b border-[var(--oat-border)]/50">
                    <td className="py-2 text-xs font-bold text-[var(--warm-charcoal)]">
                      {i + 1}
                    </td>
                    <td className="py-2">
                      <p className="font-medium text-[var(--clay-black)] truncate max-w-[120px]">
                        {row.userName}
                      </p>
                      <p className="text-xs text-[var(--warm-charcoal)] truncate max-w-[120px]">
                        {row.userEmail}
                      </p>
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {row.attemptCount}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {row.avgScore > 0 ? `${row.avgScore}%` : "-"}
                    </td>
                    <td className="py-2 text-right text-xs text-[var(--warm-charcoal)]">
                      {formatDate(row.lastActive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
