export interface HealthCheckResponse {
  ok: boolean;
  service: string;
  phase: string;
  status: "healthy";
  timestamp: string;
  uptimeSeconds: number;
}

const startTime = Date.now();

export default function handler(req: any, res: any) {
  // Only permit GET or HEAD requests
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed. Use GET.",
    });
  }

  const response: HealthCheckResponse = {
    ok: true,
    service: "The Inspire Business Academy",
    phase: "Phase 12 - Production Deployment",
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };

  // Safe headers
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  return res.status(200).json(response);
}
