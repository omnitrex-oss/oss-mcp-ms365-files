import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";
import { validatePath } from "../utils/path.js";

export function registerFilesCreateFolder(server: McpServer, graph: GraphClient, audit: AuditLogger): void {
  server.tool(
    "files_create_folder",
    "Create a new folder in OneDrive at the specified path.",
    {
      path: z.string().describe("Parent folder path (e.g., 'Documents/Reports'). Omit or use '' for root.").optional(),
      name: z.string().describe("Name of the new folder to create"),
    },
    async ({ path, name }) => {
      if (name.includes("/") || name.includes("\\")) {
        throw new Error("Folder name must not contain slashes. Use 'path' for the parent directory.");
      }

      const parentPath = path ? `/me/drive/root:/${validatePath(path)}:/children` : "/me/drive/root/children";

      const result = await graph.post<Record<string, unknown>>(parentPath, {
        name,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      });

      await audit.log({
        action: "create_folder",
        tool: "files_create_folder",
        success: true,
        path: path ? `${path}/${name}` : name,
        fileName: name,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: result.id,
            name: result.name,
            webUrl: result.webUrl,
            path: path ? `${path}/${name}` : name,
          }, null, 2),
        }],
      };
    },
  );
}
