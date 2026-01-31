/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@getiickets/shared', '@getiickets/config'],
  output: 'standalone', // Enable standalone output for Docker
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    domains: ['localhost', 'yourdomain.netlify.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
  // All /api/* served by Next.js API routes on same port (no proxy to Express)
};

module.exports = nextConfig;
