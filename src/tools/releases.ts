import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TpClient } from "../tp/client.js";
import type { TpConfig } from "../config.js";
import { pluralPath } from "../tp/entity-paths.js";
import { TpCurrentReleasesInput, TpReleaseItemsInput } from "../schemas.js";

interface TpRelease {
  Id: number;
  Name: string;
  StartDate?: string;
  EndDate?: string;
  Project?: { Id: number; Name: string };
}

export function registerReleaseTools(server: McpServer, client: TpClient, cfg: TpConfig) {
  server.registerTool(
    "tp_current_releases",
    {
      description: "List current/active releases. Defaults filter by owner+team from env if no params passed.",
      inputSchema: TpCurrentReleasesInput,
    },
    async (args) => {
      const a = args as z.infer<z.ZodObject<typeof TpCurrentReleasesInput>>;
      const clauses: string[] = ["(EndDate gte 'Today')"];
      if (a.projectId) clauses.push(`(Project.Id eq ${a.projectId})`);
      const ownerId = a.ownerId ?? cfg.ownerId;
      const teamId = a.teamId ?? cfg.teamId;
      if (ownerId) clauses.push(`(Project.Owner.Id eq ${ownerId})`);
      if (teamId) clauses.push(`(Projects.Teams.Id eq ${teamId})`);

      const res = await client.get<{ Items: TpRelease[] }>("Releases", {
        where: clauses.join(" and "),
        include: ["Id", "Name", "StartDate", "EndDate", "Project"],
        take: 50,
        orderByDesc: "EndDate",
      });

      const text = (res.Items ?? [])
        .map((r) => `#${r.Id} ${r.Name} — ${r.Project?.Name ?? ""} (${r.StartDate ?? "?"} → ${r.EndDate ?? "?"})`)
        .join("\n");
      return { content: [{ type: "text", text: text || "No active releases." }] };
    }
  );

  server.registerTool(
    "tp_release_items",
    {
      description: "List items (UserStory/Bug/Feature) in a release.",
      inputSchema: TpReleaseItemsInput,
    },
    async (args) => {
      const a = args as z.infer<z.ZodObject<typeof TpReleaseItemsInput>>;
      const clauses = [`Release.Id eq ${a.releaseId}`];
      if (a.stateName) clauses.push(`EntityState.Name eq '${a.stateName.replace(/'/g, "''")}'`);
      const res = await client.get<{ Items: { Id: number; Name: string; EntityState?: { Name: string } }[] }>(
        pluralPath(a.kind),
        {
          where: clauses.join(" and "),
          include: ["Id", "Name", "EntityState", "AssignedUser"],
          take: a.take,
        }
      );
      const text = (res.Items ?? [])
        .map((c) => `#${c.Id} [${c.EntityState?.Name ?? "?"}] ${c.Name}`)
        .join("\n");
      return { content: [{ type: "text", text: text || "No items in release." }] };
    }
  );
}
