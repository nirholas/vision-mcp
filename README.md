<p align="center">
  <a href="https://three.ws"><img src="https://three.ws/three-ws-mcp-icon.svg" alt="three.ws" width="88" height="88"></a>
</p>

<h1 align="center">@three-ws/vision-mcp</h1>

<p align="center"><strong>Let any AI agent see — analyze and describe images through the three.ws vision pipeline, free-first and no key required.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@three-ws/vision-mcp"><img alt="npm" src="https://img.shields.io/npm/v/@three-ws/vision-mcp?logo=npm&color=cb3837"></a>
  <img alt="license" src="https://img.shields.io/npm/l/@three-ws/vision-mcp?color=3b82f6">
  <img alt="node" src="https://img.shields.io/node/v/@three-ws/vision-mcp?color=339933&logo=node.js">
  <a href="https://registry.modelcontextprotocol.io/?q=io.github.nirholas"><img alt="MCP Registry" src="https://img.shields.io/badge/MCP%20Registry-io.github.nirholas-0ea5e9"></a>
  <a href="https://three.ws"><img alt="three.ws" src="https://img.shields.io/badge/built%20by-three.ws-000"></a>
</p>

---

> A [Model Context Protocol](https://modelcontextprotocol.io) server that gives any AI assistant **image understanding** over stdio. Pass an image as a public URL or base64 and the agent can read the text in a screenshot, identify what's in a scene, critique a 3D/avatar render, or write alt-text — all live, read-only, no key required.

Every answer comes from the three.ws vision pipeline: **free NVIDIA NIM vision models lead every request**, with an automatic server-side paid backstop behind them. The caller never pays and needs no provider key — point `THREE_WS_BASE` at a deployment and go.

## Install

```bash
npm install @three-ws/vision-mcp
```

Or run with `npx` (no install):

```bash
npx @three-ws/vision-mcp
```

## Quick start

**Claude Code**, one line:

```bash
claude mcp add vision -- npx -y @three-ws/vision-mcp
```

**Claude Desktop / Cursor** (`claude_desktop_config.json` or `mcp.json`):

```json
{
	"mcpServers": {
		"vision": {
			"command": "npx",
			"args": ["-y", "@three-ws/vision-mcp"]
		}
	}
}
```

Inspect the surface with the MCP Inspector:

```bash
npx -y @modelcontextprotocol/inspector npx @three-ws/vision-mcp
```

## Tools

| Tool                | Type      | What it does                                                                                                       |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `analyze_image`     | read-only | Answer a prompt about an image — visual Q&A, OCR (read a screenshot), classification, or critiquing a render.       |
| `describe_image`    | read-only | Natural-language description for alt text or a caption, steerable by detail level and focus.                        |
| `get_vision_status` | read-only | Report whether a vision provider is live and which image formats are accepted. No image, no cost.                  |

All three tools are read-only — they look at an image, they never store or mutate anything. A VLM is non-deterministic and the live provider chain moves, so none are idempotent.

### Input parameters

**`analyze_image`** — `prompt` (required), and exactly one of `imageUrl` (public https) or `image` (base64 / data URI). Optional `imageType` (for raw base64), `maxTokens` (16–2048, default 512).

**`describe_image`** — exactly one of `imageUrl` or `image`. Optional `imageType`, `detail` (`brief` | `standard` | `detailed`, default `standard`), `focus` (an aspect to emphasize).

**`get_vision_status`** — no parameters.

## Example

```jsonc
// analyze_image: read the text in a logo image
> { "imageUrl": "https://three.ws/logo.png", "prompt": "What does this logo say?" }
{
  "ok": true,
  "text": "The logo reads \"three.ws\".",
  "provider": "nvidia",
  "model": "nvidia/nemotron-nano-12b-v2-vl",
  "prompt": "What does this logo say?",
  "image_source": "url"
}
```

```jsonc
// describe_image — alt text from a base64 image
> { "image": "data:image/png;base64,iVBORw0KG...", "detail": "brief" }
{
  "ok": true,
  "description": "A seagull in profile against a blurred coastal background.",
  "detail": "brief",
  "provider": "nvidia",
  "model": "nvidia/nemotron-nano-12b-v2-vl",
  "image_source": "base64"
}
```

```jsonc
// get_vision_status — gate a "describe this" affordance
> {}
{
  "ok": true,
  "configured": true,
  "image_types": ["image/jpeg", "image/png", "image/webp", "image/gif"],
  "max_image_mb": 12
}
```

## Examples

Runnable, key-free examples live in [`examples/`](./examples):

```bash
node examples/list-tools.mjs     # every tool with its full input schema
node examples/read-an-image.mjs  # status + alt text + OCR on a live image
```

Both spawn this server over stdio and call the real vision pipeline. Every tool
is read-only, so nothing is stored and nothing is paid. See
[`examples/README.md`](./examples/README.md) for expected output.

Images may be JPEG, PNG, WebP, or GIF, up to **12 MB**. Base64 inputs are size-checked locally before upload; `imageUrl` must be a public **https** URL (the vision server fetches it, so private/loopback hosts are rejected).

## Pricing & auth

There is **no charge to the caller and no key is needed**. The platform runs every request against free NVIDIA NIM vision lanes first and falls back to a paid model only on its own infrastructure — that cost is the platform's, transparent to you.

The endpoint is rate-limited per IP. To raise your limit to the per-user tier, set the optional `THREE_WS_API_KEY` (a three.ws API key); it is sent as a bearer token. It is never required to use the free model.

## Requirements

- **Node.js >= 20.**
- Network access to `https://three.ws` (or your own `THREE_WS_BASE`).

### Environment variables

| Variable              | Required | Default            | Purpose                                                       |
| --------------------- | -------- | ------------------ | ------------------------------------------------------------- |
| `THREE_WS_BASE`       | no       | `https://three.ws` | Which deployment to call.                                     |
| `THREE_WS_TIMEOUT_MS` | no       | `30000`            | Per-request timeout (a call may chain across free lanes).     |
| `THREE_WS_API_KEY`    | no       | —                  | Optional bearer token to raise the rate limit to per-user.    |

## Links

- Homepage: https://three.ws
- Changelog: https://three.ws/changelog
- Issues: https://github.com/nirholas/three.ws/issues
- License: Apache-2.0, see [LICENSE](./LICENSE)

---

<p align="center">
  <sub>
    Part of the <a href="https://three.ws">three.ws</a> SDK suite — 3D AI agents, on-chain identity, and agent payments.<br/>
    <a href="https://three.ws">Website</a> · <a href="https://three.ws/changelog">Changelog</a> · <a href="https://github.com/nirholas/three.ws">GitHub</a>
  </sub>
</p>

<!-- three.ws:growth -->
## Support the project

If vision-mcp saves you time, **[star it on GitHub](https://github.com/nirholas/vision-mcp)**. Stars are how other developers and AI agents find the repositories worth trusting, and they cost you one click.

Know someone who would use it? [Post on X](https://twitter.com/intent/tweet?text=vision-mcp%3A%20Let%20any%20AI%20agent%20see%3A%20analyze%20and%20describe%20images%20through%20the%20three.ws%20vision%20pipeline&url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fvision-mcp) · [Share on Bluesky](https://bsky.app/intent/compose?text=vision-mcp%3A%20Let%20any%20AI%20agent%20see%3A%20analyze%20and%20describe%20images%20through%20the%20three.ws%20vision%20pipeline%20https%3A%2F%2Fgithub.com%2Fnirholas%2Fvision-mcp) · [Share on LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fvision-mcp) · [Submit to Hacker News](https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2Fnirholas%2Fvision-mcp&t=vision-mcp%3A%20Let%20any%20AI%20agent%20see%3A%20analyze%20and%20describe%20images%20through%20the%20three.ws%20vision%20pipeline) · [Share on Reddit](https://www.reddit.com/submit?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fvision-mcp&title=vision-mcp%3A%20Let%20any%20AI%20agent%20see%3A%20analyze%20and%20describe%20images%20through%20the%20three.ws%20vision%20pipeline)

## Built for AI agents too

Coding agents and LLM tooling can read this repo directly: [AGENTS.md](./AGENTS.md), [llms.txt](./llms.txt), [llms-full.txt](./llms-full.txt). Point an agent at `https://github.com/nirholas/vision-mcp` and it has the context it needs.

## More from the same author

- [All repositories by nirholas](https://github.com/nirholas/nirholas#readme): the full catalog, grouped by topic
- [three.ws](https://three.ws): the platform for 3D AI agents with Solana wallets, a skill marketplace and x402 payments
- Questions or ideas: [open an issue](https://github.com/nirholas/vision-mcp/issues) or [start a discussion](https://github.com/nirholas/vision-mcp/discussions)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=nirholas/vision-mcp)](https://github.com/nirholas/vision-mcp/graphs/contributors)

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=nirholas/vision-mcp&type=Date)](https://www.star-history.com/#nirholas/vision-mcp&Date)

<!-- /three.ws:growth -->

<!-- three.ws:ecosystem -->
## Part of three.ws

[three.ws](https://three.ws) is a platform for 3D AI agents with Solana wallets: avatars, a skill marketplace, x402 payments and more than seventy MCP servers. `@three-ws/vision-mcp` is one package from it.

- Documentation site: https://nirholas.github.io/vision-mcp/
- npm: https://www.npmjs.com/package/@three-ws/vision-mcp
- Canonical source: https://github.com/nirholas/three.ws (this repository is a generated mirror of `packages/vision-mcp`)
- Agent-readable summary: [llms.txt](./llms.txt) and [AGENTS.md](./AGENTS.md)
- Issues and ideas: https://github.com/nirholas/vision-mcp/issues
<!-- /three.ws:ecosystem -->
