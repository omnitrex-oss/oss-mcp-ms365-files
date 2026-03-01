import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerFilesMove(server: McpServer, graph: GraphClient, audit: AuditLogger): void {
  server.tool(
    "files_move",
    "Move a file or folder to a new location in OneDrive. Can also rename.",
    {
      itemId: z.string().describe("The drive item ID to move"),
      destinationFolderId: z.string().optional().describe("ID of the destination folder (omit to rename in place)"),
      newName: z.string().optional().describe("New name for the item (omit to keep current name)"),
    },
    async ({ itemId, destinationFolderId, newName }) => {
      if (!destinationFolderId && !newName) {
        throw new Error("At least one of destinationFolderId or newName is required.");
      }

      const body: Record<string, unknown> = {};
      if (destinationFolderId) {
        body.parentReference = { id: destinationFolderId };
      }
      if (newName) {
        body.name = newName;
      }

      const result = await graph.patch<Record<string, unknown>>(
        `/me/drive/items/${itemId}`,
        body,
      );

      await audit.log({
        action: "move",
        tool: "files_move",
        success: true,
        itemId,
        fileName: result.name as string,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: result.id,
            name: result.name,
            webUrl: result.webUrl,
          }, null, 2),
        }],
      };
    },
  );
}
