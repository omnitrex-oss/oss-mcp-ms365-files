# oss-mcp-onedrive — AGENTS.md

<!-- FORMAT RULES — DO NOT REMOVE
This file follows the Omnitrex Harmonised AGENTS.md structure.
AI agents MUST preserve these exact sections when updating this file.
- Keep each section concise (see line targets below)
- Never add new top-level sections — use subsections within existing ones
- When updating Status/Roadmap, move completed items to a "Done" subsection or remove them
- Total file MUST stay under 200 lines
-->

## Identity

OSS MCP server for Microsoft 365 OneDrive and SharePoint — file management via AI assistants. Public, community-maintained.

- **GitHub repo:** `omnitrex-oss/oss-mcp-onedrive`
- **Local folder:** `C:\Users\maxim\projects\omnitrex-holding\omnitrex-oss\oss-mcp-ms365-files\`
- **License:** MIT
- **Maintainer:** `@dieudonne84`

## Architecture

### Stack

TypeScript (ESM), MCP SDK, Zod (validation), Vitest (testing)

### Architecture Pattern

```
config.ts → auth/msal.ts → graph/client.ts → safety/ → tools/ → server.ts → index.ts
```

- Each tool in its own file under `src/tools/` exporting a register function
- Write tools audited via `safety/audit.ts`
- Token storage: OS keychain (keytar) with file fallback
- Config directory: `~/.mcp-ms365-files/`

### Tools (13)

| Group | Count | Tools |
|-------|-------|-------|
| OneDrive | 9 | list, search, download, upload, get-metadata, get-sharing-link, create-folder, move, delete |
| SharePoint | 4 | list-sites, list-libraries, list-items, search |

### Safety

- JSONL audit logging on write operations
- No permanent deletes (moves to recycle bin, recoverable 93 days)
- Large file support: auto-switches to resumable upload session for files >4MB

## Commands

```bash
npm install
npm run build        # tsup (ESM bundle)
npm test             # Vitest (24 tests)
npm run lint         # tsc --noEmit
npm run dev          # Watch mode
```

## Status

**March 2026 — v0.1.0 published**
- 13 tools, 24 tests passing
- Fully rebranded from `oss-mcp-ms365-files`
- CONTRIBUTING.md, SECURITY.md, LICENSE (MIT, Contributors)
- CI: GitHub Actions, CODEOWNERS, branch protection on `master`
- Git remote: `https://github.com/omnitrex-oss/oss-mcp-onedrive.git`

### Done (March 2026)
- [x] Rebrand: package name, MCP server name, README, all docs
- [x] Branding scrub: zero references to internal company names
- [x] SECURITY.md added
- [x] CONTRIBUTING.md created (MIT, correct URLs)
- [x] LICENSE updated (Copyright Contributors)
- [x] package.json metadata (repository, homepage, bugs, keywords)

## Roadmap

### v0.2.0
- [ ] npm publish to public registry
- [ ] SharePoint download tool (14th tool — download files from SP libraries)
- [ ] Add tool-level tests (currently only unit tests for utils/graph/audit)

### Housekeeping
- [ ] Local folder rename: `oss-mcp-ms365-files` → `oss-mcp-onedrive` (blocked by VS Code file handles, low priority)

## Rules

- All write tools must be audited
- No permanent delete operations
- Run `npm test && npm run lint` before committing
- Branch protection on `master`: require CI pass
- CODEOWNERS: `@dieudonne84` owns all files
- Never reference internal company names or real email addresses in code/docs
- Keep in sync with sibling repo `oss-mcp-outlook` (shared patterns)
