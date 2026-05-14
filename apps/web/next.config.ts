const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

export default {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ["@mayra/contracts"],
} satisfies import("next").NextConfig;
