# tp-mcp-server

Custom MCP server for TargetProcess with first-class image / attachment support.

## Environment

| Var           | Required | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `TP_TOKEN`    | yes      | TP access token (query-param auth)                   |
| `TP_BASE_URL` | yes      | e.g. `https://your-company.tpondemand.com`           |
| `TP_OWNER_ID` | no       | Your TP user id — default owner for release queries  |
| `TP_TEAM_ID`  | no       | Default team id for release queries                  |

## Build & run

```sh
npm install
npm run build
node dist/index.js
```

`npm run build` writes the bundle to `dist/index.js` — that is the path you point Claude Code at.

## Setup in Claude Code

### 1. Get your environment values

- **`TP_TOKEN`** — in TargetProcess: top-right avatar → **Access Tokens** → generate a new one. Treat it like a password; it is bound to your user account.
- **`TP_BASE_URL`** — the root URL of your TP instance, without a trailing slash (e.g. `https://your-company.tpondemand.com`).
- **`TP_OWNER_ID`** — your TP user id. Open your profile in TP; the id is the numeric value in the URL. If you can't find it, register the server first and ask Claude to look it up by email via `tp_users`.
- **`TP_TEAM_ID`** — id of the team whose releases you want as the default scope. Find it in the TP URL when you open the team's board.

### 2. Register the server

Run once in PowerShell (Windows) or your shell of choice. Use **absolute paths** — Claude Code does not expand `~` or relative paths in the command argument.

```powershell
claude mcp add targetprocess -s user `
  -e TP_TOKEN=<your-token> `
  -e TP_BASE_URL=https://your-company.tpondemand.com `
  -e TP_OWNER_ID=<your-user-id> `
  -e TP_TEAM_ID=<your-team-id> `
  -- node C:\path\to\tp-mcp-server\dist\index.js
```

Bash / macOS / Linux equivalent:

```sh
claude mcp add targetprocess -s user \
  -e TP_TOKEN=<your-token> \
  -e TP_BASE_URL=https://your-company.tpondemand.com \
  -e TP_OWNER_ID=<your-user-id> \
  -e TP_TEAM_ID=<your-team-id> \
  -- node /absolute/path/to/tp-mcp-server/dist/index.js
```

Flags:
- `-s user` — register at user scope, so the server is available in every project on this machine. Use `-s project` if you only want it in the current working directory.
- `-e KEY=VALUE` — environment variables passed to the server process.
- Everything after `--` is the command + args used to spawn the server (stdio transport).

### 3. Verify

```sh
claude mcp list
```

Expected output:

```
targetprocess: node C:\path\to\tp-mcp-server\dist\index.js - ✓ Connected
```

If the status is `✗ Failed to connect`, inspect the configured entry:

```sh
claude mcp get targetprocess
```

Common causes:
- Wrong absolute path to `dist/index.js` — fix with `claude mcp remove targetprocess -s user` and re-add.
- Forgot `npm run build` — `dist/` won't exist.
- `TP_TOKEN` invalid / expired — regenerate in TP.

### 4. Manual config alternative

If you prefer editing JSON, add this under `mcpServers` in `~/.claude.json` (Windows: `%USERPROFILE%\.claude.json`) instead of running `claude mcp add`:

```json
"targetprocess": {
  "type": "stdio",
  "command": "node",
  "args": ["C:\\path\\to\\tp-mcp-server\\dist\\index.js"],
  "env": {
    "TP_TOKEN": "<your-token>",
    "TP_BASE_URL": "https://your-company.tpondemand.com",
    "TP_OWNER_ID": "<your-user-id>",
    "TP_TEAM_ID": "<your-team-id>"
  }
}
```

JSON paths on Windows need double backslashes.

## Updating

After pulling new changes from the repo:

```sh
git pull
npm install
npm run build
```

Claude Code picks up the rebuilt `dist/index.js` on its next launch — no need to re-register the server.

## Removing

```sh
claude mcp remove targetprocess -s user
```
