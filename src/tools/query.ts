import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TpClient } from "../tp/client.js";
import { pluralPath } from "../tp/entity-paths.js";
import { TpQueryInput } from "../schemas.js";

export function registerQueryTool(server: McpServer, client: TpClient) {
  server.registerTool(
    "tp_query",
    {
      description:
        "Generic TargetProcess query. Pass any entity name (e.g. UserStory, Bug, Project, Release) with optional where/include/take/skip/orderBy.",
      inputSchema: TpQueryInput,
    },
    async (args) => {
      const { entityType, where, include, take, skip, orderBy, orderByDesc } = args as z.infer<z.ZodObject<typeof TpQueryInput>>;
      const path = pluralPath(entityType);
      const result = await client.get<{ Items: unknown[]; Next?: string }>(path, {
        where,
        include,
        take,
        skip,
        orderBy,
        orderByDesc,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
