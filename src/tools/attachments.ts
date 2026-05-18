import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TpClient } from "../tp/client.js";
import { downloadAttachment } from "../tp/attachments.js";
import { TpListAttachmentsInput, TpGetAttachmentInput } from "../schemas.js";

interface TpAttachment {
  Id: number;
  Name?: string;
  MimeType?: string;
  Size?: number;
  Description?: string;
  Date?: string;
  Owner?: { FullName?: string };
}

export function registerAttachmentTools(server: McpServer, client: TpClient) {
  server.registerTool(
    "tp_list_attachments",
    {
      description: "List attachments for a TP entity by ID. Returns metadata only (no file contents).",
      inputSchema: TpListAttachmentsInput,
    },
    async (args) => {
      const { entityId } = args as z.infer<z.ZodObject<typeof TpListAttachmentsInput>>;
      const res = await client.get<{ Items: TpAttachment[] }>("Attachments", {
        where: `General.Id eq ${entityId}`,
        include: ["Id", "Name", "MimeType", "Size", "Date", "Owner"],
        take: 200,
      });
      const items = res.Items ?? [];
      const text = items
        .map((a) => `#${a.Id} ${a.Name ?? "(unnamed)"} — ${a.MimeType ?? "?"} ${a.Size ?? "?"}B [${a.Date ?? ""}]`)
        .join("\n");
      return { content: [{ type: "text", text: text || "No attachments." }] };
    }
  );

  server.registerTool(
    "tp_get_attachment",
    {
      description:
        "Download a TP attachment by ID. Image attachments are returned as image content; other types as a text note (use tp_list_attachments first to inspect).",
      inputSchema: TpGetAttachmentInput,
    },
    async (args) => {
      const { attachmentId } = args as z.infer<z.ZodObject<typeof TpGetAttachmentInput>>;
      const { data, mimeType, size } = await downloadAttachment(client, attachmentId);
      if (mimeType.startsWith("image/")) {
        return {
          content: [
            { type: "text", text: `Attachment #${attachmentId} (${mimeType}, ${size} bytes)` },
            { type: "image", mimeType, data: data.toString("base64") },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Attachment #${attachmentId} is ${mimeType} (${size} bytes). Non-image binaries are not returned inline; download via TP UI.`,
          },
        ],
      };
    }
  );
}
