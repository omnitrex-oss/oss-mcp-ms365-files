import { describe, it, expect } from "vitest";
import { sanitizePath, validatePath, getFileName } from "../../src/utils/path.js";

describe("sanitizePath", () => {
  it("normalizes forward slashes", () => {
    expect(sanitizePath("Documents/Reports/2026")).toBe("Documents/Reports/2026");
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(sanitizePath("Documents\\Reports\\2026")).toBe("Documents/Reports/2026");
  });

  it("strips leading and trailing slashes", () => {
    expect(sanitizePath("/Documents/Reports/")).toBe("Documents/Reports");
  });

  it("rejects path traversal with ..", () => {
    expect(() => sanitizePath("Documents/../../../etc")).toThrow("Path traversal not allowed");
  });

  it("rejects path traversal with single dot", () => {
    expect(() => sanitizePath("Documents/./Reports")).toThrow("Path traversal not allowed");
  });

  it("rejects invalid characters", () => {
    expect(() => sanitizePath("Documents/<script>")).toThrow("Invalid characters");
  });

  it("handles empty path", () => {
    expect(sanitizePath("")).toBe("");
  });

  it("handles path with spaces", () => {
    expect(sanitizePath("My Documents/Annual Reports")).toBe("My Documents/Annual Reports");
  });
});

describe("validatePath", () => {
  it("returns sanitized path for valid input", () => {
    expect(validatePath("Documents/Reports")).toBe("Documents/Reports");
  });

  it("throws for empty path", () => {
    expect(() => validatePath("")).toThrow("must not be empty");
  });

  it("uses custom param name in error", () => {
    expect(() => validatePath("", "remotePath")).toThrow("remotePath must not be empty");
  });
});

describe("getFileName", () => {
  it("extracts filename from path", () => {
    expect(getFileName("Documents/Reports/quarterly.pptx")).toBe("quarterly.pptx");
  });

  it("handles backslashes", () => {
    expect(getFileName("C:\\Users\\file.txt")).toBe("file.txt");
  });

  it("returns input if no path separator", () => {
    expect(getFileName("report.pdf")).toBe("report.pdf");
  });
});
