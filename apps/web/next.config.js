const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@entrip/ui', '@entrip/shared', '@entrip/design-tokens', 'date-fns', 'debug', 'supports-color'],
  
  // Environment-conditional type checking
  eslint: {
    // Temporarily ignore ESLint during builds - need to fix unused vars
    ignoreDuringBuilds: true,
  },
  
  // Environment-conditional TypeScript error handling
  typescript: {
    // D1.3: Build Gate activated - TypeScript errors must be fixed
    ignoreBuildErrors: false,
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
  
  // D2.2: Enhanced Security Headers and CORS Policy
  async headers() {
    return [
      // D2.2: Comprehensive security headers for all routes
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy - Prevent XSS attacks
          { 
            key: 'Content-Security-Policy', 
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
              "style-src 'self' 'unsafe-inline'", // Allow inline styles for components
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:4001 ws://localhost:4001 https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com https://cdn.jsdelivr.net", // Allow Iconify API services for dynamic icon loading
              "frame-ancestors 'none'", // Prevent clickjacking
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'"
            ].join('; ')
          },
          
          // HSTS - Force HTTPS in production
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          
          // XSS Protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          
          // Referrer Policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          
          // Permissions Policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          
          // Remove server info
          { key: 'X-Powered-By', value: '' }
        ],
      },
      
      // D2.2: Secure CORS policy for API routes
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          // D2.2: Restrict to specific origins instead of wildcard
          { key: 'Access-Control-Allow-Origin', value: process.env.NODE_ENV === 'production' 
              ? 'https://your-production-domain.com'  // Replace with actual production domain
              : 'http://localhost:3000' 
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Accept, Accept-Version, Authorization, Content-Length, Content-MD5, Content-Type, Date, X-Requested-With, X-Request-ID' },
          { key: 'Access-Control-Max-Age', value: '86400' }, // 24 hours preflight cache
          
          // Additional security headers for API
          { key: 'X-API-Version', value: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0' },
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
  
  // API Proxy Routes
  async rewrites() {
    return [
      // v2 API routes should be handled by app/api/v2/[...path]/route.ts
      // Only rewrite v1 API routes to legacy server
      {
        source: '/api/((?!v2).*)', // Negative lookahead: match all except v2
        destination: 'http://localhost:4001/api/$1',
      },
    ];
  },

  // Redirects
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;