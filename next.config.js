/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
