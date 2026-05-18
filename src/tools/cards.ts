import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TpClient } from "../tp/client.js";
import { downloadInlineImages } from "../tp/attachments.js";
import { stripHtml } from "../tp/html-images.js";
import { pluralPath } from "../tp/entity-paths.js";
import {
  TpGetCardInput,
  TpSearchCardsInput,
  TpCreateCardInput,
  TpUpdateCardInput,
  type CardKind,
} from "../schemas.js";

const CARD_INCLUDE = [
  "Id",
  "Name",
  "Description",
  "EntityType",
  "EntityState",
  "Project",
  "Team",
  "AssignedUser",
  "Owner",
  "Release",
  "Iteration",
  "Feature",
  "Tags",
  "CreateDate",
  "ModifyDate",
  "NumericPriority",
];

interface GeneralCard {
  Id: number;
  Name: string;
  Description?: string;
  EntityType?: { Name?: string };
  EntityState?: { Id: number; Name: string };
  Project?: { Id: number; Name: string };
  Team?: { Id: number; Name: string };
  AssignedUser?: { Items?: { Id: number; FullName?: string }[] };
  Release?: { Id: number; Name: string };
  Feature?: { Id: number; Name: string };
  Tags?: string;
  CreateDate?: string;
  ModifyDate?: string;
}

export function registerCardTools(server: McpServer, client: TpClient) {
  server.registerTool(
    "tp_get_card",
    {
      description:
        "Fetch a TargetProcess card (UserStory/Bug/Feature/Task/Epic) by numeric ID. Returns metadata, description (stripped to plain text by default), and inline images. Pass includeRawHtml=true to also receive the raw HTML — REQUIRED before tp_update_card when you want to preserve existing formatting (headings, lists, images) instead of overwriting it.",
      inputSchema: TpGetCardInput,
    },
    async (args) => {
      const { id, kind, includeImages, includeComments, includeRawHtml } = args as z.infer<z.ZodObject<typeof TpGetCardInput>>;
      const path = kind ? `${pluralPath(kind)}/${id}` : `General/${id}`;
      const card = await client.get<GeneralCard>(path, { include: CARD_INCLUDE });
      const text = formatCard(card);

      const content: ({ type: "text"; text: string } | { type: "image"; mimeType: string; data: string })[] = [
        { type: "text", text },
      ];

      if (includeRawHtml) {
        content.push({
          type: "text",
          text: `\n=== Raw HTML Description ===\n${card.Description ?? "(empty)"}`,
        });
      }

      if (includeImages !== false) {
        const { blocks, skipped } = await downloadInlineImages(client, card.Description);
        content.push(...blocks);
        if (skipped.length) {
          content.push({ type: "text", text: `Skipped images: ${skipped.map((s) => `${s.src} (${s.reason})`).join("; ")}` });
        }
      }

      if (includeComments) {
        const comments = await client.get<{ Items: { Id: number; Description: string; CreateDate: string; Owner?: { FullName?: string } }[] }>("Comments", {
          where: `General.Id eq ${id}`,
          include: ["Id", "Description", "CreateDate", "Owner"],
          take: 50,
        });
        if (comments.Items?.length) {
          const commentsText = comments.Items
            .map((c) => `[${c.CreateDate} ${c.Owner?.FullName ?? "?"}] ${stripHtml(c.Description)}`)
            .join("\n---\n");
          content.push({ type: "text", text: `\n=== Comments ===\n${commentsText}` });

          if (includeRawHtml) {
            const rawComments = comments.Items
              .map((c) => `[#${c.Id} ${c.CreateDate} ${c.Owner?.FullName ?? "?"}]\n${c.Description ?? ""}`)
              .join("\n---\n");
            content.push({ type: "text", text: `\n=== Raw HTML Comments ===\n${rawComments}` });
          }

          if (includeImages !== false) {
            for (const c of comments.Items) {
              const { blocks } = await downloadInlineImages(client, c.Description, { maxImages: 5 });
              content.push(...blocks);
            }
          }
        }
      }

      return { content };
    }
  );

  server.registerTool(
    "tp_search_cards",
    {
      description:
        "Search TP cards of a given kind with filters: project, release, state, assignee, free-text. Returns lightweight list (no images).",
      inputSchema: TpSearchCardsInput,
    },
    async (args) => {
      const a = args as z.infer<z.ZodObject<typeof TpSearchCardsInput>>;
      const clauses: string[] = [];
      if (a.where) clauses.push(`(${a.where})`);
      if (a.search) clauses.push(`(Name contains '${escapeTql(a.search)}')`);
      if (a.projectId) clauses.push(`(Project.Id eq ${a.projectId})`);
      if (a.releaseId) clauses.push(`(Release.Id eq ${a.releaseId})`);
      if (a.stateName) clauses.push(`(EntityState.Name eq '${escapeTql(a.stateName)}')`);
      if (a.assignedUserId) clauses.push(`(AssignedUser.Id eq ${a.assignedUserId})`);

      const result = await client.get<{ Items: GeneralCard[] }>(pluralPath(a.kind), {
        where: clauses.length ? clauses.join(" and ") : undefined,
        include: ["Id", "Name", "EntityState", "Project", "AssignedUser", "Release", "ModifyDate"],
        take: a.take,
        skip: a.skip,
      });

      const text = (result.Items ?? [])
        .map((c) => `#${c.Id} [${c.EntityState?.Name ?? "?"}] ${c.Name} — ${c.Project?.Name ?? ""} ${c.Release?.Name ? `(${c.Release.Name})` : ""}`)
        .join("\n");

      return {
        content: [{ type: "text", text: text || "No matches." }],
      };
    }
  );

  server.registerTool(
    "tp_create_card",
    {
      description: "Create a new TP card (UserStory/Bug/Feature/Task/Epic).",
      inputSchema: TpCreateCardInput,
    },
    async (args) => {
      const a = args as z.infer<z.ZodObject<typeof TpCreateCardInput>>;
      const body: Record<string, unknown> = {
        Name: a.name,
        Project: { Id: a.projectId },
      };
      if (a.description !== undefined) body.Description = a.description;
      if (a.teamId) body.Team = { Id: a.teamId };
      if (a.assignedUserId) body.AssignedUser = [{ Id: a.assignedUserId }];
      if (a.featureId) body.Feature = { Id: a.featureId };
      if (a.releaseId) body.Release = { Id: a.releaseId };
      if (a.tags) body.Tags = a.tags;

      const created = await client.post<GeneralCard>(pluralPath(a.kind), body);
      return {
        content: [{ type: "text", text: `Created #${created.Id}: ${created.Name}` }],
      };
    }
  );

  server.registerTool(
    "tp_update_card",
    {
      description:
        "Update a TP card. Partial update — only provided fields are modified. The `description` field is stored as HTML; before changing it, call tp_get_card with includeRawHtml=true so you can preserve existing markup (headings, lists, images, code) instead of replacing it with plain text.",
      inputSchema: TpUpdateCardInput,
    },
    async (args) => {
      const a = args as z.infer<z.ZodObject<typeof TpUpdateCardInput>>;
      const body: Record<string, unknown> = {};
      if (a.name !== undefined) body.Name = a.name;
      if (a.description !== undefined) body.Description = a.description;
      if (a.stateId) body.EntityState = { Id: a.stateId };
      else if (a.stateName) {
        const states = await client.get<{ Items: { Id: number; Name: string }[] }>("EntityStates", {
          where: `Name eq '${escapeTql(a.stateName)}'`,
          include: ["Id", "Name"],
          take: 5,
        });
        const state = states.Items?.[0];
        if (!state) throw new Error(`No EntityState named '${a.stateName}'`);
        body.EntityState = { Id: state.Id };
      }
      if (a.assignedUserId) body.AssignedUser = [{ Id: a.assignedUserId }];
      if (a.releaseId) body.Release = { Id: a.releaseId };
      if (a.tags !== undefined) body.Tags = a.tags;

      const updated = await client.post<GeneralCard>(`${pluralPath(a.kind)}/${a.id}`, body);
      return {
        content: [{ type: "text", text: `Updated #${updated.Id}: ${updated.Name}` }],
      };
    }
  );
}

function formatCard(c: GeneralCard): string {
  const lines = [
    `#${c.Id} ${c.EntityType?.Name ? `(${c.EntityType.Name}) ` : ""}${c.Name}`,
    `State: ${c.EntityState?.Name ?? "?"}`,
    `Project: ${c.Project?.Name ?? "?"}`,
  ];
  if (c.Team?.Name) lines.push(`Team: ${c.Team.Name}`);
  if (c.Release?.Name) lines.push(`Release: ${c.Release.Name}`);
  if (c.Feature?.Name) lines.push(`Feature: ${c.Feature.Name}`);
  if (c.AssignedUser?.Items?.length) {
    lines.push(`Assigned: ${c.AssignedUser.Items.map((u) => u.FullName ?? `#${u.Id}`).join(", ")}`);
  }
  if (c.Tags) lines.push(`Tags: ${c.Tags}`);
  if (c.CreateDate) lines.push(`Created: ${c.CreateDate}`);
  if (c.ModifyDate) lines.push(`Modified: ${c.ModifyDate}`);
  lines.push("", "--- Description ---", stripHtml(c.Description) || "(empty)");
  return lines.join("\n");
}

function escapeTql(s: string): string {
  return s.replace(/'/g, "''");
}
