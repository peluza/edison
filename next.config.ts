import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  experimental: {
    mdxRs: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mdast-util-gfm-table': path.resolve(__dirname, 'mdast-util-gfm-table'),
      'clipanion': path.resolve(__dirname, 'clipanion'),
    };
    return config;
  },
};

export default nextConfig;
