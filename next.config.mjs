// Local-first means local: Next's anonymous telemetry is disabled here rather
// than in an npm script, because `VAR=1 next build` fails under cmd.exe and
// would break start.bat.
process.env.NEXT_TELEMETRY_DISABLED = '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // Personal data must never land in a browser or proxy cache.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
