---
name: see-images
description: Analyze or describe an image (screenshot, photo, 3D render) with the vision-mcp MCP tools. Use when you need to read text in a screenshot, answer a question about a picture, or write alt text or a caption.
---

# See images with vision-mcp

The plugin starts the `@three-ws/vision-mcp` stdio server (`npx -y @three-ws/vision-mcp`, Node 20 or newer). It wraps the public three.ws endpoint `POST /api/vision`, which tries free NVIDIA NIM vision models first and falls back to a paid backstop on the server side. The caller pays nothing and needs no key. All tools are read-only: nothing is stored or changed.

## Tools

- `analyze_image`: answer a question about an image.
  - `prompt` (required, 1 to 2000 chars): what to extract, read, classify or critique.
  - `imageUrl`: public https URL the server fetches. Provide this OR `image`.
  - `image`: raw base64 or a `data:image/...;base64,...` URI.
  - `imageType`: MIME type for raw base64 (defaults to image/jpeg).
  - `maxTokens`: 16 to 2048 (default 512).
  - Returns `{ ok, text, provider, model, prompt, image_source }`.
- `describe_image`: a prose description for alt text or a caption.
  - Same image inputs, plus `detail` (`brief`, `standard`, `detailed`) and `focus` (free text to steer attention).
- `get_vision_status`: reports whether a vision provider is live and which formats are accepted. Call it first when a request fails.

Accepted formats: JPEG, PNG, WebP, GIF, up to 12 MB.

## Environment

- `THREE_WS_API_KEY` (optional): raises the rate limit from per-IP to per-user.
- `THREE_WS_BASE` (default `https://three.ws`): override only to self-host or hit a preview.
- `THREE_WS_TIMEOUT_MS` (default 30000): per-request timeout.

## Worked example

Goal: read the error shown in a screenshot at a public URL.

1. Call `get_vision_status` to confirm a provider is live.
2. Call `analyze_image` with `{ "imageUrl": "https://example.com/error.png", "prompt": "Transcribe the error message and say which dialog it comes from." }`.
3. Use the returned `text`. If the result has `ok: false`, read `error` and `message`: oversize images and unsupported types are rejected before upload, so shrink or convert and retry.

For a local file, base64-encode it and pass it as `image` with the matching `imageType`.

## Running from a clone

```
git clone https://github.com/nirholas/vision-mcp
cd vision-mcp && npm install
node src/index.js        # stdio server
npm run inspect          # open the MCP Inspector against it
```
