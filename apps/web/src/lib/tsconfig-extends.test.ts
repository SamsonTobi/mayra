import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("apps/web/tsconfig.json", () => {
  it("extends @mayra/config/tsconfig.base.json (checklist T9)", () => {
    const raw = readFileSync(join(__dirname, "../../tsconfig.json"), "utf8");
    const tsconfig = JSON.parse(raw) as { extends?: string };
    expect(tsconfig.extends).toBe("@mayra/config/tsconfig.base.json");
  });
});
