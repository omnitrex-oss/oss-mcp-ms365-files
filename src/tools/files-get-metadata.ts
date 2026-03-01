import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";

export function registerFilesGetMetadata(server: McpServer, graph: GraphClient): void {
  server.tool(
    "files_get_metadata",
    "Get file or folder metadata without downloading. Returns size, type, modified date, author, sharing info.",
    {
      itemId: z.string().describe("The drive item ID"),
    },
    async ({ itemId }) => {
      const item = await graph.get<Record<string, unknown>>(
        `/me/drive/items/${itemId}?$select=id,name,size,file,folder,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,parentReference,webUrl,shared`,
      );

      const result = {
        id: item.id,
        name: item.name,
        type: item.folder ? "folder" : "file",
        size: item.size,
        mimeType: (item.file as any)?.mimeType,
        childCount: (item.folder as any)?.childCount,
        created: item.createdDateTime,
        lastModified: item.lastModifiedDateTime,
        createdBy: (item.createdBy as any)?.user?.displayName,
        lastModifiedBy: (item.lastModifiedBy as any)?.user?.displayName,
        path: (item.parentReference as any)?.path?.replace("/drive/root:", "") ?? "",
        webUrl: item.webUrl,
        shared: item.shared ? true : false,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
