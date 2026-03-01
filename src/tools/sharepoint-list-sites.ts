import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";

export function registerSharepointListSites(server: McpServer, graph: GraphClient): void {
  server.tool(
    "sharepoint_list_sites",
    "List accessible SharePoint sites. Returns site name, URL, and ID.",
    {
      search: z.string().optional().describe("Search query to filter sites by name"),
      top: z.number().min(1).max(50).optional().describe("Max results (default 25)"),
    },
    async ({ search, top = 25 }) => {
      let path: string;
      if (search) {
        path = `/sites?search=${encodeURIComponent(search)}&$top=${top}&$select=id,displayName,webUrl,description`;
      } else {
        path = `/sites?search=*&$top=${top}&$select=id,displayName,webUrl,description`;
      }

      const result = await graph.getPaginated<Record<string, unknown>>(path, 1);

      const sites = result.items.map((site) => ({
        id: site.id,
        name: site.displayName,
        webUrl: site.webUrl,
        description: site.description,
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ sites, count: sites.length, hasMore: result.hasMore }, null, 2),
        }],
      };
    },
  );
}
