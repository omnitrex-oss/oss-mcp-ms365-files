import { describe, it, expect, beforeEach } from "vitest";
import { AuditLogger } from "../../src/safety/audit.js";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("AuditLogger", () => {
  let auditDir: string;
  let logger: AuditLogger;

  beforeEach(async () => {
    auditDir = await mkdtemp(join(tmpdir(), "mcp-files-audit-test-"));
    logger = new AuditLogger(auditDir);
  });

  it("writes JSONL entry with timestamp", async () => {
    await logger.log({
      action: "upload",
      tool: "files_upload",
      success: true,
      fileName: "report.pptx",
    });

    const now = new Date();
    const fileName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.jsonl`;
    const content = await readFile(join(auditDir, fileName), "utf-8");
    const entry = JSON.parse(content.trim());

    expect(entry.action).toBe("upload");
    expect(entry.tool).toBe("files_upload");
    expect(entry.success).toBe(true);
    expect(entry.fileName).toBe("report.pptx");
    expect(entry.timestamp).toBeDefined();
  });

  it("appends multiple entries", async () => {
    await logger.log({ action: "upload", tool: "files_upload", success: true });
    await logger.log({ action: "delete", tool: "files_delete", success: true });

    const now = new Date();
    const fileName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.jsonl`;
    const content = await readFile(join(auditDir, fileName), "utf-8");
    const lines = content.trim().split("\n");

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).action).toBe("upload");
    expect(JSON.parse(lines[1]).action).toBe("delete");
  });

  it("creates base directory if missing", async () => {
    const nestedDir = join(auditDir, "nested", "path");
    const nestedLogger = new AuditLogger(nestedDir);
    await nestedLogger.log({ action: "test", tool: "test_tool", success: true });
    // Should not throw
  });

  it("records error on failure", async () => {
    await logger.log({
      action: "download",
      tool: "files_download",
      success: false,
      error: "File not found",
    });

    const now = new Date();
    const fileName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.jsonl`;
    const content = await readFile(join(auditDir, fileName), "utf-8");
    const entry = JSON.parse(content.trim());

    expect(entry.success).toBe(false);
    expect(entry.error).toBe("File not found");
  });
});
