import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';
const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 15);

/** Hosts the optimiser may fetch tattoo photographs from. */
function mediaPatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [];
  if (process.env.MEDIA_ORIGIN) {
    const u = new URL(process.env.MEDIA_ORIGIN);
    patterns.push({
      protocol: u.protocol.replace(':', '') as 'http' | 'https',
      hostname: u.hostname,
      port: u.port,
      pathname: '/storage/v1/object/public/**',
    });
  }
  // Development-only local storage driver served by the API at /media.
  if (process.env.IMAGES_ALLOW_LOCAL === '1') {
    const u = new URL(BACKEND_URL);
    patterns.push({ protocol: u.protocol.replace(':', '') as 'http' | 'https', hostname: u.hostname, port: u.port, pathname: '/media/**' });
  }
  return patterns;
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Next buffers request bodies for proxy.ts and silently truncates them at 10 MB by default,
    // which corrupts large photo uploads on their way to the API. Allow the upload limit plus
    // multipart overhead; the API still enforces MAX_UPLOAD_MB itself and answers 413 beyond it.
    proxyClientMaxBodySize: `${MAX_UPLOAD_MB + 5}mb`,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: mediaPatterns(),
    qualities: [70, 82],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [480, 640, 828, 1080, 1280, 1600, 2048],
    imageSizes: [96, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowLocalIP: process.env.IMAGES_ALLOW_LOCAL === '1',
  },
  async rewrites() {
    // The browser only ever talks to this origin; /api/v1 is proxied to the Express API,
    // which keeps admin cookies first-party and the API origin private.
    return [{ source: '/api/v1/:path*', destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
