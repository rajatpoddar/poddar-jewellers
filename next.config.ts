import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { formats: ['image/avif', 'image/webp'] },
  allowedDevOrigins: ['192.168.29.209', 'localhost', '127.0.0.1'],
};

export default nextConfig;
