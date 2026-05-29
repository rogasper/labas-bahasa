import { MaterialIcon } from "@/components/ui/MaterialIcon";
import {
  COMMUNITY_PLATFORM_META,
  getCommunitySections,
  type CommunityChannel,
  type CommunityPlatform,
} from "@/lib/community-links";

function ChannelRow({
  channel,
  platform,
  variant,
}: {
  channel: CommunityChannel;
  platform: CommunityPlatform;
  variant: "modal" | "card";
}) {
  const meta = COMMUNITY_PLATFORM_META[platform];
  const baseClass =
    variant === "modal"
      ? `w-full flex items-start gap-3 py-3.5 px-4 rounded-[var(--radius-lg)] font-semibold transition-all text-[var(--clay-black)] border-2 clay-hover ${meta?.linkClass ?? ""}`
      : `flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 transition-colors ${meta?.linkClass ?? "border-[var(--oat-border)] bg-[var(--warm-cream)]/60"}`;

  const iconClass = meta?.iconClass ?? "text-[var(--matcha-700)]";

  if (!channel.href) {
    return (
      <div
        className={`${baseClass} opacity-70 cursor-not-allowed border-dashed`}
        aria-disabled="true"
      >
        <MaterialIcon name={channel.icon} className={`text-2xl shrink-0 mt-0.5 ${iconClass}`} />
        <span className="text-left flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="block font-bold">{channel.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
              Segera hadir
            </span>
          </span>
          <span className="block text-sm font-normal text-[var(--warm-charcoal)] mt-0.5">
            {channel.description}
          </span>
        </span>
      </div>
    );
  }

  return (
    <a
      href={channel.href}
      target="_blank"
      rel="noopener noreferrer"
      className={baseClass}
    >
      <MaterialIcon name={channel.icon} className={`text-2xl shrink-0 mt-0.5 ${iconClass}`} />
      <span className="text-left">
        <span className={`block font-bold ${variant === "card" ? "text-sm" : ""}`}>
          {channel.name}
        </span>
        <span
          className={`block font-normal text-[var(--warm-charcoal)] mt-0.5 ${variant === "card" ? "text-xs" : "text-sm"}`}
        >
          {channel.description}
        </span>
      </span>
    </a>
  );
}

export function CommunityChannelList({ variant }: { variant: "modal" | "card" }) {
  const sections = getCommunitySections();

  return (
    <div className={variant === "modal" ? "flex flex-col gap-5" : "space-y-5"}>
      {sections.map(({ platform, meta, channels }) => (
        <section key={platform} className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--warm-charcoal)]">
            <MaterialIcon name={meta.icon} className={`text-base ${meta.iconClass}`} />
            {meta.label}
          </h3>
          <div className={variant === "modal" ? "flex flex-col gap-2" : "space-y-2"}>
            {channels.map((channel) => (
              <ChannelRow key={channel.id} channel={channel} platform={platform} variant={variant} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
