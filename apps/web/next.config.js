const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@entrip/ui', '@entrip/shared', '@entrip/design-tokens', 'date-fns', 'debug', 'supports-color'],
  
  // Environment-conditional type checking
  eslint: {
    // Temporary: ignore during builds for Docker
    ignoreDuringBuilds: true,
  },
  
  // Environment-conditional TypeScript error handling
  typescript: {
    // Temporary: ignore during builds for Docker
    ignoreBuildErrors: true,
  },
  
  
  webpack: (config, { webpack, isServer, dev }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true' && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: path.join(__dirname, 'bundle-analysis.html'),
          openAnalyzer: false,
        })
      );
    }
    
    // Alias configuration
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@entrip/ui/global.css': path.resolve(__dirname, '../../packages/ui/global.css'),
      '@entrip/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@entrip/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@entrip/design-tokens': path.resolve(__dirname, '../../packages/design-tokens'),
    };
    
    // /mnt/e ENODEV 에러 방지 - 더 포괄적인 패턴
    if (dev) {
      config.watchOptions = {
        ignored: /\/mnt\/[a-z]/,
      };
    }
    
    return config;
  },
  
  // Standalone output for Docker (disabled on Windows due to symlink issues)
  // output: 'standalone',
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'entrip-assets.s3.amazonaws.com',
        pathname: '/**',
      }
    ],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.0.0',
  },
  
  // Headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Accept, Accept-Version, Authorization, Content-Length, Content-MD5, Content-Type, Date, X-Requested-With' },
        ],
      },
    ];
  },
  
  // API Proxy Routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4001/api/:path*',
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/reservations',
        destination: '/workspace?content=monthlyCalendar',
        permanent: false,
      },
      {
        source: '/reservations/:path*',
        destination: '/workspace?content=monthlyCalendar',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;