import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuthManager } from "./auth/msal.js";
import { GraphClient } from "./graph/client.js";
import { AuditLogger } from "./safety/audit.js";
import { loadConfig, type AppConfig } from "./config.js";
import { registerFilesList } from "./tools/files-list.js";
import { registerFilesSearch } from "./tools/files-search.js";
import { registerFilesDownload } from "./tools/files-download.js";
import { registerFilesUpload } from "./tools/files-upload.js";
import { registerFilesGetMetadata } from "./tools/files-get-metadata.js";
import { registerFilesCreateFolder } from "./tools/files-create-folder.js";
import { registerFilesMove } from "./tools/files-move.js";
import { registerFilesDelete } from "./tools/files-delete.js";
import { registerFilesGetSharingLink } from "./tools/files-get-sharing-link.js";
import { registerSharepointListSites } from "./tools/sharepoint-list-sites.js";
import { registerSharepointListLibraries } from "./tools/sharepoint-list-libraries.js";
import { registerSharepointListItems } from "./tools/sharepoint-list-items.js";
import { registerSharepointSearch } from "./tools/sharepoint-search.js";

export async function createServer(): Promise<McpServer> {
  const config: AppConfig = loadConfig();

  // Initialize auth
  const auth = new AuthManager({
    clientId: config.clientId,
    tenantId: config.tenantId,
    tokenCachePath: config.tokenCachePath,
  });
  await auth.init();

  // Create Graph client
  const graph = new GraphClient(auth);

  // Create audit logger
  const audit = new AuditLogger(config.auditPath);

  // Create MCP server
  const server = new McpServer({
    name: "mcp-ms365-files",
    version: "0.1.0",
  });

  // Register OneDrive tools (9: 5 read + 4 write)
  registerFilesList(server, graph);
  registerFilesSearch(server, graph);
  registerFilesDownload(server, graph, audit);
  registerFilesGetMetadata(server, graph);
  registerFilesGetSharingLink(server, graph, audit);
  registerFilesUpload(server, graph, audit);
  registerFilesCreateFolder(server, graph, audit);
  registerFilesMove(server, graph, audit);
  registerFilesDelete(server, graph, audit);

  // Register SharePoint tools (4 read)
  registerSharepointListSites(server, graph);
  registerSharepointListLibraries(server, graph);
  registerSharepointListItems(server, graph);
  registerSharepointSearch(server, graph);

  return server;
}
