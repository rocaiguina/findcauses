import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The deployed site reads data/snapshot.json at runtime (no hosted database yet), so ship it with the server code.
  outputFileTracingIncludes: {
    "/**/*": ["./data/snapshot.json"],
  },
};

export default nextConfig;
