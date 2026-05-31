/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and uptime probes.
 * Returns service status, version, and basic diagnostics.
 */

const startedAt = Date.now();

export default function handler(_req: any, res: any) {
  const uptimeMs = Date.now() - startedAt;

  res.status(200).json({
    status: 'ok',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    uptime: Math.floor(uptimeMs / 1000),
    region: process.env.VERCEL_REGION || 'local',
    timestamp: new Date().toISOString(),
  });
}
