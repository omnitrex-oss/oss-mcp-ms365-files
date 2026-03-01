import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerFilesGetSharingLink(server: McpServer, graph: GraphClient, audit: AuditLogger): void {
  server.tool(
    "files_get_sharing_link",
    "Create or get a sharing link for a OneDrive file or folder.",
    {
      itemId: z.string().describe("The drive item ID"),
      type: z.enum(["view", "edit"]).optional().describe("Link type: 'view' (read-only) or 'edit' (default: 'view')"),
      scope: z.enum(["anonymous", "organization"]).optional().describe("Who can use the link (default: 'organization')"),
    },
    async ({ itemId, type = "view", scope = "organization" }) => {
      const result = await graph.post<Record<string, unknown>>(
        `/me/drive/items/${itemId}/createLink`,
        { type, scope },
      );

      const link = result.link as Record<string, unknown> | undefined;

      await audit.log({
        action: "create_sharing_link",
        tool: "files_get_sharing_link",
        success: true,
        itemId,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            webUrl: link?.webUrl,
            type,
            scope,
          }, null, 2),
        }],
      };
    },
  );
}
