// Centralized env + HTTP base for the vision MCP.
//
// This server is a thin wrapper over the PUBLIC three.ws vision endpoint
// (/api/vision): a free-first NVIDIA NIM VLM chain with an automatic, server-side
// paid backstop. The caller never pays and holds no provider secret — the only
// knobs are which deployment to talk to, how long to wait, and an OPTIONAL
// three.ws API key that raises the rate limit from the per-IP to the per-user
// tier. Every description comes from the live endpoint; nothing is computed here.

export function env(key, fallback) {
	const v = process.env[key];
	return v !== undefined && String(v).trim() !== '' ? String(v).trim() : fallback;
}

// Base URL of the three.ws API. Override only when self-hosting or pointing at a
// preview deployment.
export const THREE_WS_BASE = env('THREE_WS_BASE', 'https://three.ws').replace(/\/+$/, '');

// Per-request timeout (ms). A vision call may fall over several free NIM lanes
// before one answers, so the default is more generous than a plain JSON read.
export const HTTP_TIMEOUT_MS = (() => {
	const raw = env('THREE_WS_TIMEOUT_MS');
	if (raw === undefined) return 30000;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) {
		throw Object.assign(new Error(`THREE_WS_TIMEOUT_MS must be a positive number (got "${raw}")`), {
			code: 'bad_config',
		});
	}
	return n;
})();

// Optional three.ws API key (bearer). When present it lifts the caller from the
// anonymous per-IP rate limit to the per-user tier. Absent is fully supported —
// the free model serves anonymous callers — so this is never required.
export const THREE_WS_API_KEY = env('THREE_WS_API_KEY');

// Identifies this client to the API in request logs.
export const USER_AGENT = '@three-ws/vision-mcp';
