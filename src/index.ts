#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { TpClient } from "./tp/client.js";
import { registerQueryTool } from "./tools/query.js";
import { registerCardTools } from "./tools/cards.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerAttachmentTools } from "./tools/attachments.js";
import { registerReleaseTools } from "./tools/releases.js";
import { registerMetaTools } from "./tools/meta.js";

async function main() {
  const cfg = loadConfig();
  const client = new TpClient(cfg);

  const server = new McpServer(
    { name: "tp-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  registerQueryTool(server, client);
  registerCardTools(server, client);
  registerCommentTools(server, client);
  registerAttachmentTools(server, client);
  registerReleaseTools(server, client, cfg);
  registerMetaTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
