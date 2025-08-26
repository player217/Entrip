const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo root configuration
  experimental: {
    outputFileTracingRoot: path.join(__dirname),
  },
};

module.exports = nextConfig;