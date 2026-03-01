import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerFilesDelete(server: McpServer, graph: GraphClient, audit: AuditLogger): void {
  server.tool(
    "files_delete",
    "Delete a file or folder from OneDrive. Items are moved to the recycle bin (recoverable for 93 days).",
    {
      itemId: z.string().describe("The drive item ID to delete"),
    },
    async ({ itemId }) => {
      // Get name before deleting for audit
      const meta = await graph.get<Record<string, unknown>>(`/me/drive/items/${itemId}?$select=name`);
      const fileName = (meta.name as string) ?? "unknown";

      await graph.delete(`/me/drive/items/${itemId}`);

      await audit.log({
        action: "delete",
        tool: "files_delete",
        success: true,
        itemId,
        fileName,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            deleted: true,
            itemId,
            fileName,
            note: "Item moved to OneDrive recycle bin (recoverable for 93 days).",
          }, null, 2),
        }],
      };
    },
  );
}
