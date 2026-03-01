/**
 * Temp file management with auto-cleanup.
 * Downloads are stored in OS temp dir and cleaned up after 1 hour.
 */

import { writeFile, mkdir, readdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const TEMP_DIR = join(tmpdir(), "mcp-ms365-files");
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Save a buffer to a temp file. Returns the absolute file path.
 */
export async function saveTempFile(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  await mkdir(TEMP_DIR, { recursive: true });

  // Prefix with UUID to avoid collisions
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tempPath = join(TEMP_DIR, `${randomUUID()}-${safeName}`);
  await writeFile(tempPath, buffer);

  // Start cleanup timer if not running
  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanupOldFiles, CLEANUP_INTERVAL_MS);
    cleanupTimer.unref(); // Don't prevent process exit
  }

  return tempPath;
}

/**
 * Remove temp files older than MAX_AGE_MS.
 */
async function cleanupOldFiles(): Promise<void> {
  try {
    const files = await readdir(TEMP_DIR);
    const now = Date.now();

    for (const file of files) {
      try {
        const filePath = join(TEMP_DIR, file);
        const stats = await stat(filePath);
        if (now - stats.mtimeMs > MAX_AGE_MS) {
          await unlink(filePath);
        }
      } catch {
        // Ignore individual file errors
      }
    }
  } catch {
    // Temp dir may not exist yet
  }
}

/**
 * Get the temp directory path (for config display).
 */
export function getTempDir(): string {
  return TEMP_DIR;
}
