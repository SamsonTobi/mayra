import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("next.config.ts", () => {
  it("exports Tauri static-export shape (spec §3.1 / nextjs-tauri rule)", async () => {
    const mod = await import("../next.config");
    const cfg = mod.default;
    const repoRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
    );
    expect(path.resolve(cfg.outputFileTracingRoot as string)).toBe(repoRoot);
    expect(cfg.output).toBe("export");
    expect(cfg.images).toEqual({ unoptimized: true });
    expect(cfg.trailingSlash).toBe(true);
    expect(cfg.reactStrictMode).toBe(true);
    expect(cfg.typedRoutes).toBe(true);
    expect(cfg.transpilePackages).toEqual(["@mayra/contracts"]);
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
      expect(cfg.assetPrefix).toMatch(/^http:\/\/[^:]+:3000$/);
    } else {
      expect(cfg.assetPrefix).toBeUndefined();
    }
  });
});
