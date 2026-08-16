/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    const segment = process.env.NEXT_PUBLIC_ADMIN_SEGMENT || "admin";
    return [
      { source: `/${segment}/:path*`, destination: "/admin/:path*" },
      { source: `/${segment}`, destination: "/admin" },
      { source: `/api/${segment}/:path*`, destination: "/api/admin/:path*" },
      { source: `/api/${segment}`, destination: "/api/admin" },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "https://bdja.ac.ke" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Aevibron-Key" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://gateway.aevibron.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
