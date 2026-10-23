import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  transpilePackages: [
    "@protostack/authorization",
    "@protostack/configuration",
    "@protostack/database",
    "@protostack/outcomes-engine",
    "@protostack/protocol-engine",
    "@protostack/tracking-engine",
    "@protostack/tower-engine",
    "@protostack/ui",
  ],
};

export default nextConfig;
initOpenNextCloudflareForDev();
