import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GraphClient } from "../graph/client.js";

export function registerSharepointSearch(server: McpServer, graph: GraphClient): void {
  server.tool(
    "sharepoint_search",
    "Search across all SharePoint sites and document libraries. Uses Microsoft Search API.",
    {
      query: z.string().describe("Search query (KQL syntax supported)"),
      top: z.number().min(1).max(50).optional().describe("Max results (default 25)"),
    },
    async ({ query, top = 25 }) => {
      const result = await graph.post<Record<string, unknown>>("/search/query", {
        requests: [
          {
            entityTypes: ["driveItem"],
            query: { queryString: query },
            from: 0,
            size: top,
            fields: ["id", "name", "size", "lastModifiedDateTime", "webUrl", "parentReference"],
          },
        ],
      });

      const hits: Record<string, unknown>[] = [];
      const searchResults = (result as any)?.value?.[0]?.hitsContainers?.[0]?.hits ?? [];

      for (const hit of searchResults) {
        const resource = hit.resource ?? {};
        hits.push({
          id: resource.id,
          name: resource.name,
          size: resource.size,
          lastModified: resource.lastModifiedDateTime,
          webUrl: resource.webUrl,
          summary: hit.summary,
        });
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ results: hits, count: hits.length }, null, 2),
        }],
      };
    },
  );
}
