# Cove Sensory MCP — Remote Worker

Cloudflare Workers remote-MCP adaptation of the original local stdio server.

## Supported tools

- `sensory_status`
- `sensory_setup_guide`
- `sense_image`
- `sense_video`
- `sense_audio`
- `sense_music`

The remote edition accepts direct public HTTPS media URLs. It intentionally does not
read local filesystem paths and does not follow redirects. Media is bounded before it
is sent to the configured Gemini model.

## Required secrets

- `MCP_PATH_TOKEN`: random private path component
- `GEMINI_API_KEY`: Gemini API key

Never commit either value. Add them through Cloudflare Workers **Variables and
Secrets** as encrypted secrets.

The connector endpoint is:

```text
https://cove-sensory-mcp.<account-subdomain>.workers.dev/mcp/<MCP_PATH_TOKEN>
```

## Deploy

```console
corepack pnpm install
corepack pnpm run cf-types
corepack pnpm run typecheck
corepack pnpm run deploy
```
