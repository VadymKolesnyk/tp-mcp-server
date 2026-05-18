import type { TpClient } from "./client.js";
import { extractImageSources } from "./html-images.js";

export interface McpImageBlock {
  type: "image";
  mimeType: string;
  data: string;
}

export interface InlineImageResult {
  blocks: McpImageBlock[];
  skipped: { src: string; reason: string }[];
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function downloadInlineImages(
  client: TpClient,
  html: string | null | undefined,
  options?: { maxImages?: number; maxBytes?: number }
): Promise<InlineImageResult> {
  const maxImages = options?.maxImages ?? 10;
  const maxBytes = options?.maxBytes ?? MAX_IMAGE_BYTES;
  const sources = extractImageSources(html).slice(0, maxImages);
  const blocks: McpImageBlock[] = [];
  const skipped: { src: string; reason: string }[] = [];

  for (const { src } of sources) {
    try {
      const { data, mimeType, size } = await client.fetchBinary(src);
      if (!mimeType.startsWith("image/")) {
        skipped.push({ src, reason: `not an image (${mimeType})` });
        continue;
      }
      if (size > maxBytes) {
        skipped.push({ src, reason: `too large (${size} bytes)` });
        continue;
      }
      blocks.push({ type: "image", mimeType, data: data.toString("base64") });
    } catch (err) {
      skipped.push({ src, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return { blocks, skipped };
}

export async function downloadAttachment(
  client: TpClient,
  attachmentId: number
): Promise<{ mimeType: string; data: Buffer; size: number }> {
  return client.fetchBinary(`/Attachment.aspx?AttachmentID=${attachmentId}`);
}
