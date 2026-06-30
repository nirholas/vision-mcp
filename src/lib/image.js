// Boundary validation + normalization for caller-supplied images.
//
// The /api/vision endpoint accepts a JSON body with EITHER `imageUrl` (a public
// https URL the model server fetches) OR `image` (base64 / data URI) + optional
// `imageType`. The server SSRF-guards URLs and enforces a 12 MB cap itself; we
// pre-validate here so an obviously-bad input fails fast with a clear, local
// error instead of a wasted round-trip — and so the MCP tool's contract is
// explicit. This is the only place the two tools turn raw args into a request.

// Mirrors the endpoint's ACCEPTED_TYPES (api/vision.js). Kept in sync by hand —
// both are short, stable lists.
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Matches the endpoint's MAX_IMAGE_BYTES (12 MiB on the decoded image).
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function boundaryError(message) {
	return Object.assign(new Error(message), { code: 'invalid_image', status: 400 });
}

function normalizeImageType(raw) {
	const type = String(raw || '').split(';')[0].trim().toLowerCase();
	return ACCEPTED_IMAGE_TYPES.includes(type) ? type : null;
}

// Reject the SSRF targets we can cheaply detect from the URL string itself
// (https only, no IP-literal loopback/private/link-local hosts, no *.local). The
// server applies the authoritative guard; this just turns the common mistakes
// into a clean local 400.
function assertPublicHttpsUrl(rawUrl) {
	let url;
	try {
		url = new URL(rawUrl);
	} catch {
		throw boundaryError(`imageUrl is not a valid URL: "${String(rawUrl).slice(0, 80)}"`);
	}
	if (url.protocol !== 'https:') {
		throw boundaryError(`imageUrl must be an https URL (got "${url.protocol.replace(':', '') || 'none'}")`);
	}
	const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	const isPrivate =
		host === 'localhost' ||
		/\.(local|internal|localdomain)$/.test(host) ||
		/^127\./.test(host) ||
		/^10\./.test(host) ||
		/^192\.168\./.test(host) ||
		/^169\.254\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
		host === '0.0.0.0' ||
		host === '::1';
	if (isPrivate) {
		throw boundaryError('imageUrl must resolve to a public host (private/loopback addresses are blocked)');
	}
	return url.toString();
}

// Decode-safe size check for a base64 payload without materializing the bytes:
// 4 base64 chars → 3 bytes, minus padding.
function base64ByteLength(b64) {
	const len = b64.length;
	const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
	return Math.floor((len * 3) / 4) - padding;
}

function assertBase64Image(raw, imageTypeHint) {
	const dataUri = String(raw).match(/^data:(image\/[a-z+]+);base64,(.*)$/is);
	const mimeType = dataUri ? normalizeImageType(dataUri[1]) : normalizeImageType(imageTypeHint) || 'image/jpeg';
	if (dataUri && !mimeType) {
		throw boundaryError(`unsupported image type in data URI; use one of ${ACCEPTED_IMAGE_TYPES.join(', ')}`);
	}
	const payload = (dataUri ? dataUri[2] : String(raw).replace(/^data:[^,]*,/, '')).replace(/\s+/g, '');
	if (!payload) throw boundaryError('image is empty');
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
		throw boundaryError('image is not valid base64 (pass raw base64 or a data: URI)');
	}
	if (base64ByteLength(payload) > MAX_IMAGE_BYTES) {
		throw boundaryError('image exceeds the 12 MB limit; downscale before sending');
	}
	return { payload, mimeType };
}

/**
 * Turn validated tool args into the /api/vision JSON request body. Exactly one
 * of `imageUrl` / `image` must be supplied.
 *
 * @param {{ imageUrl?: string, image?: string, imageType?: string, prompt?: string, maxTokens?: number }} args
 * @returns {{ body: object, source: 'url' | 'base64' }}
 */
export function buildVisionBody({ imageUrl, image, imageType, prompt, maxTokens } = {}) {
	const hasUrl = typeof imageUrl === 'string' && imageUrl.trim() !== '';
	const hasImage = typeof image === 'string' && image.trim() !== '';

	if (hasUrl && hasImage) {
		throw boundaryError('provide either imageUrl or image, not both');
	}
	if (!hasUrl && !hasImage) {
		throw boundaryError('an image is required: pass imageUrl (public https) or image (base64 / data URI)');
	}

	const body = {};
	let source;
	if (hasUrl) {
		body.imageUrl = assertPublicHttpsUrl(imageUrl.trim());
		source = 'url';
	} else {
		const { payload, mimeType } = assertBase64Image(image, imageType);
		body.image = payload;
		body.imageType = mimeType;
		source = 'base64';
	}

	if (typeof prompt === 'string' && prompt.trim()) body.prompt = prompt.trim().slice(0, 2000);
	if (Number.isFinite(maxTokens)) body.maxTokens = Math.min(Math.max(Math.trunc(maxTokens), 16), 2048);

	return { body, source };
}
