import { describe, expect, it } from "vitest";

describe("next.config.ts", () => {
  it("exports Tauri static-export shape (spec §3.1 / nextjs-tauri rule)", async () => {
    const mod = await import("../next.config");
    const cfg = mod.default;
    expect(cfg.output).toBe("export");
    expect(cfg.images).toEqual({ unoptimized: true });
    expect(cfg.trailingSlash).toBe(true);
    expect(cfg.reactStrictMode).toBe(true);
    expect(cfg.experimental).toEqual({ typedRoutes: true });
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
      expect(cfg.assetPrefix).toMatch(/^http:\/\/[^:]+:3000$/);
    } else {
      expect(cfg.assetPrefix).toBeUndefined();
    }
  });
});
