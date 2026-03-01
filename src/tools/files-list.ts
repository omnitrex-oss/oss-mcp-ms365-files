import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";

export function registerFilesList(server: McpServer, graph: GraphClient): void {
  server.tool(
    "files_list",
    "List files and folders at a OneDrive path. Returns name, size, type, and last modified.",
    {
      path: z.string().optional().describe("Folder path (e.g., 'Documents/Reports'). Omit for root."),
      top: z.number().min(1).max(200).optional().describe("Max items to return (default 50)"),
    },
    async ({ path, top = 50 }) => {
      const basePath = path
        ? `/me/drive/root:/${encodeURIComponent(path)}:/children`
        : "/me/drive/root/children";

      const params = new URLSearchParams();
      params.set("$top", String(top));
      params.set("$select", "id,name,size,file,folder,lastModifiedDateTime,lastModifiedBy,webUrl");
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
        childCount: (item.folder as any)?.childCount,
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
