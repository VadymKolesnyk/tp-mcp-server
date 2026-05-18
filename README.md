# tp-mcp-server

Custom MCP server for TargetProcess with first-class image / attachment support.

## Environment

| Var           | Required | Description                                |
| ------------- | -------- | ------------------------------------------ |
| `TP_TOKEN`    | yes      | TP access token (query param auth)         |
| `TP_BASE_URL` | yes      | e.g. `https://your-company.tpondemand.com` |
| `TP_OWNER_ID` | no       | Default owner id for release queries       |
| `TP_TEAM_ID`  | no       | Default team id for release queries        |

## Build & run

```sh
npm install
npm run build
node dist/index.js
```

## Register in Claude Code

In `~/.claude.json` under `mcpServers`:

```json
"targetprocess": {
  "type": "stdio",
  "command": "node",
  "args": ["C:\\SW\\tp-mcp-server\\dist\\index.js"],
  "env": {
    "TP_TOKEN": "...",
    "TP_BASE_URL": "https://your-company.tpondemand.com",
    "TP_OWNER_ID": "...",
    "TP_TEAM_ID": "..."
  }
}
```
