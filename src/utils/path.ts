/**
 * Path sanitization utilities for OneDrive/SharePoint paths.
 * Prevents path traversal attacks and normalizes platform differences.
 */

/** Characters not allowed in OneDrive file/folder names */
const INVALID_CHARS = /[<>:"|?*\\]/g;

/**
 * Sanitize and validate a OneDrive/SharePoint path.
 * Rejects path traversal (..), normalizes slashes.
 */
export function sanitizePath(inputPath: string): string {
  // Normalize backslashes to forward slashes
  let normalized = inputPath.replace(/\\/g, "/");

  // Remove leading/trailing whitespace and slashes
  normalized = normalized.trim().replace(/^\/+|\/+$/g, "");

  // Reject path traversal
  const segments = normalized.split("/");
  for (const segment of segments) {
    if (segment === ".." || segment === ".") {
      throw new Error(
        `Path traversal not allowed: "${inputPath}". Paths must not contain ".." or "." segments.`,
      );
    }
    if (segment.length === 0) continue;
    if (INVALID_CHARS.test(segment)) {
      throw new Error(
        `Invalid characters in path segment "${segment}". Characters < > : " | ? * \\ are not allowed.`,
      );
    }
  }

  // Reconstruct clean path
  return segments.filter(Boolean).join("/");
}

/**
 * Validate a path is not empty after sanitization.
 */
export function validatePath(inputPath: string, paramName: string = "path"): string {
  const clean = sanitizePath(inputPath);
  if (!clean) {
    throw new Error(`${paramName} must not be empty.`);
  }
  return clean;
}

/**
 * Extract file name from a path.
 */
export function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}
