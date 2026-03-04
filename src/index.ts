import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[oss-mcp-onedrive] Server started on stdio\n");
}

main().catch((error) => {
  process.stderr.write(`[oss-mcp-onedrive] Fatal error: ${error}\n`);
  process.exit(1);
});
