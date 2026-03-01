import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";

export function registerFilesSearch(server: McpServer, graph: GraphClient): void {
  server.tool(
    "files_search",
    "Search for files in OneDrive by name or content. Returns matching files with metadata.",
    {
      query: z.string().describe("Search query (file name or content keywords)"),
      top: z.number().min(1).max(50).optional().describe("Max results (default 25)"),
    },
    async ({ query, top = 25 }) => {
      const params = new URLSearchParams();
      params.set("$top", String(top));
      params.set("$select", "id,name,size,file,folder,lastModifiedDateTime,parentReference,webUrl");

      const data = await graph.get<{ value: Record<string, unknown>[] }>(
        `/me/drive/root/search(q='${encodeURIComponent(query)}')?${params}`,
      );

      const items = (data.value ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.folder ? "folder" : "file",
        size: item.size,
        mimeType: (item.file as any)?.mimeType,
        path: (item.parentReference as any)?.path?.replace("/drive/root:", "") ?? "",
        lastModified: item.lastModifiedDateTime,
        webUrl: item.webUrl,
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ items, count: items.length }, null, 2),
        }],
      };
    },
  );
}
