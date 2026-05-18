import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TpClient } from "../tp/client.js";
import { TpMetaListInput } from "../schemas.js";

export function registerMetaTools(server: McpServer, client: TpClient) {
  server.registerTool(
    "tp_projects",
    { description: "List TP projects.", inputSchema: TpMetaListInput },
    async (args) => listSimple(client, "Projects", args, ["Id", "Name", "Abbreviation", "IsActive"])
  );

  server.registerTool(
    "tp_teams",
    { description: "List TP teams.", inputSchema: TpMetaListInput },
    async (args) => listSimple(client, "Teams", args, ["Id", "Name"])
  );

  server.registerTool(
    "tp_users",
    { description: "List TP users.", inputSchema: TpMetaListInput },
    async (args) => listSimple(client, "Users", args, ["Id", "FullName", "Email", "IsActive"], "FullName")
  );
}

async function listSimple(
  client: TpClient,
  path: string,
  args: unknown,
  include: string[],
  searchField: string = "Name"
) {
  const a = args as z.infer<z.ZodObject<typeof TpMetaListInput>>;
  const where = a.search ? `${searchField} contains '${a.search.replace(/'/g, "''")}'` : undefined;
  const res = await client.get<{ Items: Record<string, unknown>[] }>(path, { where, include, take: a.take });
  return {
    content: [{ type: "text" as const, text: JSON.stringify(res.Items ?? [], null, 2) }],
  };
}
