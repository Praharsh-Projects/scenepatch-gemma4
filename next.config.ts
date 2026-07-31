import type { NextConfig } from "next";

const isGitHubPages = process.env.SCENEPATCH_STATIC_EXPORT === "true";
const githubBasePath = "/scenepatch-gemma4";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        assetPrefix: githubBasePath,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
