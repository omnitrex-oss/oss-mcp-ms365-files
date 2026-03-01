/**
 * Microsoft Graph API permission scopes for OneDrive and SharePoint operations.
 * These are delegated permissions (user-consented, not app-level).
 */

export const GRAPH_SCOPES = {
  /** Read and write access to user's OneDrive files */
  FILES_READ_WRITE: "Files.ReadWrite.All",
  /** Read access to SharePoint sites */
  SITES_READ: "Sites.Read.All",
  /** Read basic user profile (needed for /me endpoint) */
  USER_READ: "User.Read",
} as const;

/** All scopes required for this MCP server */
export const ALL_SCOPES = [
  GRAPH_SCOPES.FILES_READ_WRITE,
  GRAPH_SCOPES.SITES_READ,
  GRAPH_SCOPES.USER_READ,
];
