const IMG_TAG_RE = /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;

export interface ExtractedImage {
  src: string;
  alt?: string;
}

export function extractImageSources(html: string | null | undefined): ExtractedImage[] {
  if (!html) return [];
  const out: ExtractedImage[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(IMG_TAG_RE)) {
    const tag = match[0];
    const src = decodeHtmlEntities(match[2]);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const altMatch = tag.match(/\balt\s*=\s*(["'])(.*?)\1/i);
    out.push({ src, alt: altMatch ? decodeHtmlEntities(altMatch[2]) : undefined });
  }
  return out;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
