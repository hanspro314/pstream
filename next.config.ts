import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: [
    '@libsql/client',
    '@prisma/adapter-libsql',
    '@prisma/client',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'munowatch.com',
      },
      {
        protocol: 'https',
        hostname: 'munoapp.org',
      },
      {
        protocol: 'https',
        hostname: '**.b-cdn.net',
      },
    ],
  },
};

export default nextConfig;
