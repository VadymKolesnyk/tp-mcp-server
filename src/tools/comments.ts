import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TpClient } from "../tp/client.js";
import { downloadInlineImages } from "../tp/attachments.js";
import { stripHtml } from "../tp/html-images.js";
import { TpListCommentsInput, TpAddCommentInput } from "../schemas.js";

interface TpComment {
  Id: number;
  Description: string;
  CreateDate: string;
  Owner?: { Id: number; FullName?: string };
}

export function registerCommentTools(server: McpServer, client: TpClient) {
  server.registerTool(
    "tp_list_comments",
    {
      description: "List comments for a TP entity (by entity ID). Inline images from comments are included as image blocks by default.",
      inputSchema: TpListCommentsInput,
    },
    async (args) => {
      const { entityId, includeImages, take } = args as z.infer<z.ZodObject<typeof TpListCommentsInput>>;
      const res = await client.get<{ Items: TpComment[] }>("Comments", {
        where: `General.Id eq ${entityId}`,
        include: ["Id", "Description", "CreateDate", "Owner"],
        take,
        orderByDesc: "CreateDate",
      });

      const items = res.Items ?? [];
      const text = items
        .map((c) => `[#${c.Id} ${c.CreateDate} ${c.Owner?.FullName ?? "?"}]\n${stripHtml(c.Description)}`)
        .join("\n\n---\n\n");

      const content: ({ type: "text"; text: string } | { type: "image"; mimeType: string; data: string })[] = [
        { type: "text", text: text || "No comments." },
      ];

      if (includeImages !== false) {
        for (const c of items) {
          const { blocks } = await downloadInlineImages(client, c.Description, { maxImages: 5 });
          content.push(...blocks);
        }
      }

      return { content };
    }
  );

  server.registerTool(
    "tp_add_comment",
    {
      description: "Post a new comment on a TP entity. Description accepts HTML.",
      inputSchema: TpAddCommentInput,
    },
    async (args) => {
      const { entityId, description } = args as z.infer<z.ZodObject<typeof TpAddCommentInput>>;
      const created = await client.post<TpComment>("Comments", {
        General: { Id: entityId },
        Description: description,
      });
      return {
        content: [{ type: "text", text: `Posted comment #${created.Id} on entity #${entityId}.` }],
      };
    }
  );
}
