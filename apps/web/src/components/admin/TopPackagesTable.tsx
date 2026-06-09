import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface TopPackageRow {
  packageId: string | null;
  packageTitle: string;
  examTypeId: string;
  attemptCount: number;
  avgScore: number;
}

interface TopPackagesTableProps {
  data: TopPackageRow[] | undefined;
  isLoading: boolean;
}

export function TopPackagesTable({ data, isLoading }: TopPackagesTableProps) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Paket Terpopuler
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
        <div className="flex items-center gap-2">
          <MaterialIcon name="star" className="text-xl text-[var(--chart-4)]" />
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Paket Terpopuler (30 Hari)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-[var(--warm-charcoal)]">
            <MaterialIcon name="library_books" className="text-3xl text-[var(--warm-silver)] mb-2" />
            <p className="text-sm">Belum ada paket yang dikerjakan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--warm-charcoal)] border-b border-[var(--oat-border)]">
                  <th className="text-left py-2 font-medium w-8">#</th>
                  <th className="text-left py-2 font-medium">Paket</th>
                  <th className="text-right py-2 font-medium">Dikerjakan</th>
                  <th className="text-right py-2 font-medium">Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.packageId ?? `row-${i}`} className="border-b border-[var(--oat-border)]/50">
                    <td className="py-2 text-xs font-bold text-[var(--warm-charcoal)]">
                      {i + 1}
                    </td>
                    <td className="py-2">
                      <p className="font-medium text-[var(--clay-black)] truncate max-w-[180px]">
                        {row.packageTitle}
                      </p>
                      <p className="text-xs text-[var(--warm-charcoal)]">{row.examTypeId}</p>
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {row.attemptCount}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {row.avgScore > 0 ? `${row.avgScore}%` : "-"}
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
