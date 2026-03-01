import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";

export function registerSharepointListItems(server: McpServer, graph: GraphClient): void {
  server.tool(
    "sharepoint_list_items",
    "List items in a SharePoint document library folder. Returns files and subfolders.",
    {
      driveId: z.string().describe("The document library (drive) ID"),
      path: z.string().optional().describe("Folder path within the library (omit for root)"),
      top: z.number().min(1).max(200).optional().describe("Max items (default 50)"),
    },
    async ({ driveId, path, top = 50 }) => {
      const basePath = path
        ? `/drives/${driveId}/root:/${encodeURIComponent(path)}:/children`
        : `/drives/${driveId}/root/children`;

      const params = new URLSearchParams();
      params.set("$top", String(top));
      params.set("$select", "id,name,size,file,folder,lastModifiedDateTime,webUrl");
      params.set("$orderby", "name asc");

      const result = await graph.getPaginated<Record<string, unknown>>(
        `${basePath}?${params}`,
        1,
      );

      const items = result.items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.folder ? "folder" : "file",
        size: item.size,
        mimeType: (item.file as any)?.mimeType,
        lastModified: item.lastModifiedDateTime,
        webUrl: item.webUrl,
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ items, count: items.length, hasMore: result.hasMore }, null, 2),
        }],
      };
    },
  );
}
