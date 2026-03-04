# oss-mcp-ms365-files

MCP server for Microsoft 365 OneDrive and SharePoint — browse, search, upload, and manage files directly from Claude Code.

## Features

- **9 OneDrive tools**: list, search, download, upload, metadata, sharing links, create folder, move, delete
- **4 SharePoint tools**: list sites, list libraries, list items, search across sites
- **Audit log**: structured JSON lines at `~/.mcp-ms365-files/audit/` (tracks write operations)
- **Token security**: OS keychain (keytar) with encrypted file fallback
- **Large file support**: auto-switches to resumable upload session for files >4MB (up to 250MB)

## Prerequisites

- **Node.js** 20 or later
- **Microsoft 365 account** with OneDrive access
- **Azure AD app registration** (free, one-time setup — see below)

## Azure App Registration (step-by-step)

You need to register an app in Azure so the MCP server can access your files via the Graph API. This is a one-time setup that takes ~5 minutes.

> **Tip**: If you already have an app registered for [oss-mcp-ms365-mail](https://github.com/omnitrex-oss/oss-mcp-ms365-mail), you can reuse the same app — just add the extra permissions below. Note: each server uses its own token cache, so you'll need to authenticate separately.

### Step 1: Create the app

1. Go to [entra.microsoft.com](https://entra.microsoft.com)
2. In the left sidebar, expand **Applications** → click **App registrations**
3. Click **+ New registration** at the top
4. Fill in:
   - **Name**: `MCP Files` (or whatever you like)
   - **Supported account types**: select **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts**
   - **Redirect URI**: leave completely blank — device code flow doesn't use a redirect
5. Click **Register**

### Step 2: Note your IDs

On the app's **Overview** page, copy these two values:

- **Application (client) ID** — a UUID like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID** — another UUID on the same page

### Step 3: Add API permissions

1. In the left sidebar of your app, click **API permissions**
2. You should see `User.Read` already listed. If not, add it.
3. Add file permissions:
   - Click **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Search for `Files.ReadWrite.All`, check it, click **Add permissions**
   - Click **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Search for `Sites.Read.All`, check it, click **Add permissions**
4. You should now see 3 permissions listed:
   - `Files.ReadWrite.All` — Delegated
   - `Sites.Read.All` — Delegated
   - `User.Read` — Delegated
5. **Admin consent** (if applicable): if your tenant requires admin consent and you're the admin, click **Grant admin consent for [your org]**.

### Step 4: Enable public client flows

1. In the left sidebar of your app, click **Authentication**
2. Scroll down to **Advanced settings**
3. Find **Allow public client flows** and set the toggle to **Yes**
4. Click **Save** at the top

### Step 5: Verify

Your app should now have:
- 3 delegated permissions (Files.ReadWrite.All, Sites.Read.All, User.Read)
- Public client flows enabled
- No redirect URIs (none needed)
- No client secret (none needed)

## Setup

### 1. Build from source

```bash
git clone https://github.com/omnitrex-oss/oss-mcp-ms365-files.git
cd oss-mcp-ms365-files
npm install
npm run build
```

### 2. Add to Claude Code

```bash
claude mcp add --transport stdio \
  --env MS365_CLIENT_ID=<your-client-id> \
  --env MS365_TENANT_ID=<your-tenant-id> \
  mcp-ms365-files -- node /path/to/mcp-ms365-files/dist/index.js
```

### 3. First use — device code authentication

The first time you use any file tool, the server triggers device code auth:

1. Claude will show a message like: *"To sign in, use a web browser to open https://microsoft.com/devicelogin and enter the code XXXXXXXX"*
2. Open that URL in any browser
3. Paste the code
4. Sign in with your M365 account
5. Click **Accept** when prompted for permissions
6. Return to Claude Code — the tool will complete automatically

After first auth, tokens are cached in your OS keychain (or `~/.mcp-ms365-files/token-cache.json` as fallback) and refreshed silently.

## Configuration

All via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MS365_CLIENT_ID` | Yes | — | Azure app client ID |
| `MS365_TENANT_ID` | Yes | — | Azure directory tenant ID |
| `MS365_TOKEN_CACHE_PATH` | No | `~/.mcp-ms365-files/token-cache.json` | Token cache file location |
| `MS365_AUDIT_PATH` | No | `~/.mcp-ms365-files/audit` | Audit log directory |

## Tools

### OneDrive (9 tools)

| Tool | Type | Description |
|------|------|-------------|
| `files_list` | Read | List files and folders at a path |
| `files_search` | Read | Search files by name or content |
| `files_download` | Read | Download file to local temp directory |
| `files_get_metadata` | Read | Get file/folder metadata without downloading |
| `files_get_sharing_link` | Write | Create or get a sharing link |
| `files_upload` | Write | Upload local file (up to 250MB, auto-chunked) |
| `files_create_folder` | Write | Create a new folder |
| `files_move` | Write | Move or rename a file/folder |
| `files_delete` | Write | Delete file/folder (moves to recycle bin) |

### SharePoint (4 tools)

| Tool | Type | Description |
|------|------|-------------|
| `sharepoint_list_sites` | Read | List accessible SharePoint sites |
| `sharepoint_list_libraries` | Read | List document libraries in a site |
| `sharepoint_list_items` | Read | List items in a library folder |
| `sharepoint_search` | Read | Search across all sites and libraries |

## Safety

- **Audit trail**: every write operation logged to `~/.mcp-ms365-files/audit/YYYY-MM.jsonl`
- **No permanent deletes**: `files_delete` moves to recycle bin (recoverable for 93 days)
- **No plaintext tokens**: stored in OS keychain or file with restricted permissions

## Development

```bash
npm run dev       # Watch mode build
npm test          # Run tests
npm run lint      # Type check
```

## License

MIT
