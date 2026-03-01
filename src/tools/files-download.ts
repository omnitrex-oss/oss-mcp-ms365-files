import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";
import { saveTempFile } from "../utils/temp.js";
import { getFileName } from "../utils/path.js";

export function registerFilesDownload(server: McpServer, graph: GraphClient, audit: AuditLogger): void {
  server.tool(
    "files_download",
    "Download a file from OneDrive to a local temp directory. Returns the local file path for use with other tools (e.g., mail_attach).",
    {
      itemId: z.string().describe("The drive item ID of the file to download"),
    },
    async ({ itemId }) => {
      // Get metadata first
      const meta = await graph.get<Record<string, unknown>>(`/me/drive/items/${itemId}`);
      const fileName = (meta.name as string) ?? "download";

      // Download content
      const { buffer, contentType } = await graph.getRaw(`/me/drive/items/${itemId}/content`);

      // Save to temp
      const localPath = await saveTempFile(buffer, fileName);

      await audit.log({
        action: "download",
        tool: "files_download",
        success: true,
        itemId,
        fileName,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            localPath,
            fileName,
            size: buffer.byteLength,
            contentType,
            note: "File saved to temp directory. Use this localPath with other tools (e.g., mail_attach). Auto-cleaned after 1 hour.",
          }, null, 2),
        }],
      };
    },
  );
}
