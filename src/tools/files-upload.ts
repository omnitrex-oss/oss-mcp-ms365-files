import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";
import { validatePath, getFileName } from "../utils/path.js";

const SMALL_FILE_LIMIT = 4 * 1024 * 1024; // 4 MB
const UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB (multiple of 320 KiB)
const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB

export function registerFilesUpload(server: McpServer, graph: GraphClient, audit: AuditLogger): void {
  server.tool(
    "files_upload",
    "Upload a local file to OneDrive. Supports files up to 250MB. For files >4MB, uses resumable upload session.",
    {
      localPath: z.string().describe("Absolute path to the local file to upload"),
      remotePath: z.string().describe("OneDrive destination path (e.g., 'Reports/GRC/quarterly.pptx')"),
    },
    async ({ localPath, remotePath }) => {
      const cleanPath = validatePath(remotePath, "remotePath");
      const fileName = getFileName(cleanPath);

      // Check file exists and get size
      const fileStat = await stat(localPath);
      if (fileStat.size > MAX_FILE_SIZE) {
        throw new Error(`File exceeds maximum upload size of 250MB (file is ${Math.round(fileStat.size / 1024 / 1024)}MB)`);
      }

      const fileBuffer = await readFile(localPath);

      let result: Record<string, unknown>;

      if (fileStat.size <= SMALL_FILE_LIMIT) {
        // Simple upload for small files
        result = await graph.put(
          `/me/drive/root:/${cleanPath}:/content`,
          fileBuffer,
        );
      } else {
        // Upload session for large files
        const session = await graph.post<{ uploadUrl: string }>(
          `/me/drive/root:/${cleanPath}:/createUploadSession`,
          {
            item: { "@microsoft.graph.conflictBehavior": "rename" },
          },
        );

        let offset = 0;
        while (offset < fileStat.size) {
          const end = Math.min(offset + UPLOAD_CHUNK_SIZE, fileStat.size);
          const chunk = fileBuffer.subarray(offset, end);
          const contentRange = `bytes ${offset}-${end - 1}/${fileStat.size}`;
          const chunkResult = await graph.putBytes(
            session.uploadUrl,
            Buffer.from(chunk),
            contentRange,
            "application/octet-stream",
          );
          if (chunkResult && typeof chunkResult === "object") {
            result = chunkResult as Record<string, unknown>;
          }
          offset = end;
        }
        result = result!;
      }

      await audit.log({
        action: "upload",
        tool: "files_upload",
        success: true,
        path: cleanPath,
        fileName,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: result?.id,
            name: result?.name,
            size: result?.size,
            webUrl: result?.webUrl,
            path: cleanPath,
          }, null, 2),
        }],
      };
    },
  );
}

// Extend GraphClient with put method for simple upload
declare module "../graph/client.js" {
  interface GraphClient {
    put(path: string, data: Buffer): Promise<Record<string, unknown>>;
  }
}

// Monkey-patch put method onto GraphClient prototype
import { GraphClient as GC } from "../graph/client.js";
(GC.prototype as any).put = async function (path: string, data: Buffer): Promise<Record<string, unknown>> {
  const token = await (this as any).auth.getAccessToken();
  const url = path.startsWith("http") ? path : `https://graph.microsoft.com/v1.0${path}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: data,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const { parseGraphError } = await import("../graph/error.js");
    throw parseGraphError(response.status, body);
  }
  return response.json() as Promise<Record<string, unknown>>;
};
