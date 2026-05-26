export const SITE_URL = "https://labas.rogasper.com";

export const OG_IMAGE_PATH = "/og_image.png";
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
  "Labas — platform latihan ujian bahasa dengan AI Generator dan simulasi tes";

export const DEFAULT_SITE_TITLE = "Labas — AI-Powered Exam Practice Platform";
export const DEFAULT_SITE_DESCRIPTION =
  "Generate AI-powered practice questions for JLPT, TOPIK, TOAFL, and more. Practice smarter with adaptive test preparation.";

type SiteHeadInput = {
  title?: string;
  description?: string;
  url?: string;
};

/** Shared Open Graph + Twitter tags for TanStack Router `head()`. */
export function buildSocialMeta(input: SiteHeadInput = {}) {
  const title = input.title ?? DEFAULT_SITE_TITLE;
  const description = input.description ?? DEFAULT_SITE_DESCRIPTION;
  const url = input.url ?? `${SITE_URL}/`;

  return [
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { property: "og:image", content: OG_IMAGE_URL },
    { property: "og:image:secure_url", content: OG_IMAGE_URL },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: String(OG_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_IMAGE_HEIGHT) },
    { property: "og:image:alt", content: OG_IMAGE_ALT },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: OG_IMAGE_URL },
    { name: "twitter:image:alt", content: OG_IMAGE_ALT },
  ];
}
