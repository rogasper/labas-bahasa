export type CommunityPlatform = "whatsapp" | "discord";

export type CommunityChannel = {
  id: string;
  platform: CommunityPlatform;
  name: string;
  description: string;
  /** null = belum live (tampil sebagai "Segera hadir") */
  href: string | null;
  icon: string;
};

export const COMMUNITY_PLATFORM_META: Record<
  CommunityPlatform,
  { label: string; icon: string; linkClass: string; iconClass: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: "chat",
    linkClass:
      "bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366]/20",
    iconClass: "text-[#128C7E]",
  },
  discord: {
    label: "Discord",
    icon: "forum",
    linkClass:
      "bg-[#5865F2]/10 border-[#5865F2]/30 hover:bg-[#5865F2]/20",
    iconClass: "text-[#5865F2]",
  },
};

/** Satu sumber data — tambah Discord cukup isi `href` di entri bawah. */
export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    id: "labas-whatsapp",
    platform: "whatsapp",
    name: "Labas — Open Source",
    description: "Laporkan bug, usulkan fitur, atau diskusi pengembangan Labas.",
    href: "https://chat.whatsapp.com/JT6bDIXMQ5x6SUQCA1aDWB",
    icon: "groups",
  },
  {
    id: "learning-whatsapp",
    platform: "whatsapp",
    name: "Rogasper Learning",
    description: "Berbagi tips, trik, dan berita terbaru dari Rogasper Learning.",
    href: "https://chat.whatsapp.com/IrQOUGB3jhR7WnOoilCill",
    icon: "school",
  },
  // Aktifkan saat server Discord siap — cukup isi href:
  {
    id: "labas-discord",
    platform: "discord",
    name: "Labas Discord",
    description: "Diskusi async, bug report terstruktur, dan pengumuman fitur baru.",
    href: null,
    icon: "chat",
  },
];

export const COMMUNITY_PROMPT_STORAGE_KEY = "labas_community_prompt_seen";

const PLATFORM_ORDER: CommunityPlatform[] = ["whatsapp", "discord"];

export function getCommunitySections() {
  return PLATFORM_ORDER.map((platform) => ({
    platform,
    meta: COMMUNITY_PLATFORM_META[platform],
    channels: COMMUNITY_CHANNELS.filter((c) => c.platform === platform),
  })).filter((section) => section.channels.length > 0);
}
