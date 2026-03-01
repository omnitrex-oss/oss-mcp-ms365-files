import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";

export function registerSharepointListLibraries(server: McpServer, graph: GraphClient): void {
  server.tool(
    "sharepoint_list_libraries",
    "List document libraries in a SharePoint site. Returns library name, ID, and web URL.",
    {
      siteId: z.string().describe("The SharePoint site ID"),
    },
    async ({ siteId }) => {
      const data = await graph.get<{ value: Record<string, unknown>[] }>(
        `/sites/${siteId}/drives?$select=id,name,driveType,webUrl,description`,
      );

      const libraries = (data.value ?? []).map((drive) => ({
        id: drive.id,
        name: drive.name,
        driveType: drive.driveType,
        webUrl: drive.webUrl,
        description: drive.description,
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ libraries, count: libraries.length }, null, 2),
        }],
      };
    },
  );
}
