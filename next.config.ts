import type { NextConfig } from "next";

// The Django backend (backend/) serves the API and admin. The browser reaches them through this site, so the
// sign-in session cookie is first-party.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Django expects trailing slashes on admin URLs; don't let Next strip them and loop with APPEND_SLASH.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/admin", destination: `${BACKEND_URL}/admin/` },
      // Keep Django admin's trailing slashes (the :path* param drops them).
      { source: "/admin/:path*/", destination: `${BACKEND_URL}/admin/:path*/` },
      { source: "/admin/:path*", destination: `${BACKEND_URL}/admin/:path*` },
      { source: "/static/:path*", destination: `${BACKEND_URL}/static/:path*` },
    ];
  },
};

export default nextConfig;
