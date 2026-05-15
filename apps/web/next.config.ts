import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root — silences Next “multiple lockfiles” warning when apps/web has its own package-lock. */
const outputFileTracingRoot = path.resolve(__dirname, "..", "..");

const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

export default {
  output: "export",
  outputFileTracingRoot,
  images: { unoptimized: true },
  trailingSlash: true,
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ["@mayra/contracts"],
} satisfies import("next").NextConfig;
