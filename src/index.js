#!/usr/bin/env node
// @three-ws/vision-mcp — MCP server entry point.
//
// Gives any AI assistant image understanding over stdio — the "let an agent see"
// surface of three.ws:
//   • analyze_image     — answer a prompt about an image (VQA, OCR, critique)
//   • describe_image     — natural-language description / alt text / caption
//   • get_vision_status  — is vision live, and what formats does it accept
//
// A thin wrapper over the PUBLIC /api/vision endpoint: a free-first NVIDIA NIM
// VLM chain with an automatic, server-side paid backstop. The caller never pays
// and needs no key — set THREE_WS_API_KEY only to raise the rate limit.
//
// Run standalone:
//   node packages/vision-mcp/src/index.js
//
// Or wire into Claude Code / Cursor — see README.md.

import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { def as analyzeImage } from './tools/analyze-image.js';
import { def as describeImage } from './tools/describe-image.js';
import { def as visionStatus } from './tools/vision-status.js';

// Single source of truth for the advertised server version — package.json.
const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../package.json');

export const TOOLS = [
	analyzeImage,
	describeImage,
	visionStatus,
];

/**
 * Construct a fully-registered McpServer without connecting a transport.
 * Registration is env-free, so this is safe to import from tests.
 * @returns {McpServer}
 */
export function buildServer() {
	const server = new McpServer(
		{ name: 'vision-mcp', title: 'three.ws Vision', version: PKG_VERSION },
		{
			capabilities: { tools: {} },
			instructions:
				'three.ws Vision MCP — let the agent see. analyze_image answers a prompt about an image (visual ' +
				'Q&A, reading text in a screenshot, critiquing a 3D/avatar render); describe_image returns a ' +
				'natural-language description for alt text or a caption, steerable by detail level and focus. Pass ' +
				'each image as a public https `imageUrl` OR a base64 `image` (JPEG/PNG/WebP/GIF, up to 12 MB). ' +
				'get_vision_status reports whether a VLM provider is live and which formats are accepted. The ' +
				'platform runs every request against free NVIDIA NIM lanes first and an automatic paid backstop ' +
				'otherwise — the caller never pays and needs no key. Set THREE_WS_API_KEY only to raise the rate ' +
				'limit. Every tool is read-only: it analyzes images, it never stores or mutates anything.',
		},
	);

	for (const tool of TOOLS) {
		server.registerTool(
			tool.name,
			{
				title: tool.title,
				description: tool.description,
				inputSchema: tool.inputSchema,
				annotations: tool.annotations,
			},
			async (args, extra) => {
				try {
					const result = await tool.handler(args, extra);
					const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
					return { content: [{ type: 'text', text }] };
				} catch (err) {
					const payload = {
						ok: false,
						error: err?.code || 'unhandled',
						message: err?.message || String(err),
						...(err?.status ? { status: err.status } : {}),
					};
					return {
						content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
						isError: true,
					};
				}
			},
		);
	}

	return server;
}

async function main() {
	const server = buildServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error(`[vision-mcp@${PKG_VERSION}] connected over stdio with ${TOOLS.length} tools`);
}

// Connect stdio ONLY when this file is the process entry point. Importing the
// module (tests, embedding) must not grab the transport. realpath both sides:
// npm bin shims are symlinks, so argv[1] may differ from import.meta.url.
function isProcessEntryPoint() {
	if (!process.argv[1]) return false;
	try {
		return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
	} catch {
		return false;
	}
}

if (isProcessEntryPoint()) {
	main().catch((err) => {
		console.error('[vision-mcp] fatal:', err);
		process.exit(1);
	});
}
