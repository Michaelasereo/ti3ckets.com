/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@getiickets/shared', '@getiickets/config', '@getiickets/database'],
  output: 'standalone', // Enable standalone output for Docker
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
  async rewrites() {
    const isDev = process.env.NODE_ENV === 'development';
    const apiUrl = process.env.API_URL || 'http://localhost:8080';
    
    // In development, proxy /api/* to Fastify API server
    if (isDev) {
      return {
        beforeFiles: [
          {
            source: '/api/:path*',
            destination: `${apiUrl}/api/:path*`,
          },
        ],
      };
    }
    
    // In production, use Next.js API routes (or keep proxying if preferred)
    return [];
  },
};

module.exports = nextConfig;
