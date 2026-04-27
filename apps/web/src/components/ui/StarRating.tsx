import { MaterialIcon } from "./MaterialIcon";

export function StarRating({ value }: { value: number | null }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcon
          key={star}
          name={(value ?? 0) >= star ? "star" : "star_outline"}
          className={`text-xl ${(value ?? 0) >= star ? "text-[var(--lemon-500)]" : "text-[var(--oat-border)]"}`}
        />
      ))}
    </div>
  );
}
