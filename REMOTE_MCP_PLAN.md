# Remote MCP deployment plan

This branch adapts Cove Sensory MCP from its current local stdio transport toward a remotely reachable MCP service suitable for ChatGPT.

## Guardrails

- Keep `main` synchronized with upstream; remote-specific work stays on this branch until reviewed.
- Do not commit provider credentials or Cloudflare secrets.
- Prefer deployment environment secrets.
- Preserve the existing sensory tool contracts where possible.

## Current architecture constraints

The upstream application is composed around a local filesystem configuration store, OS keyring/environment credentials, local media paths, temporary job workspaces, FFmpeg, and an MCP stdio transport. A remote deployment therefore needs more than a transport switch: configuration/secrets, media ingress, and runtime storage must be adapted deliberately.

## Target phases

1. Add a remote MCP HTTP transport entry point without removing the existing stdio entry point.
2. Define deployment-safe configuration and secret loading.
3. Replace local-only media assumptions with explicitly authorized remote inputs/object storage where required.
4. Package a runtime with FFmpeg for audio/video paths.
5. Deploy to a public HTTPS endpoint, initially using the platform-provided hostname.
6. Connect the endpoint to ChatGPT and test `sensory_status`, image, audio, video, and music tools.
7. Bind a custom domain only after the deployment is stable.

## Cloudflare deployment direction

Cloudflare's current remote MCP guidance uses Streamable HTTP at `/mcp`. Python Workers run in Pyodide and are best suited to isolate-compatible code, while Cloudflare Containers provide a Linux-like runtime and filesystem for applications that need system tools such as FFmpeg. Because Cove Sensory MCP depends on FFmpeg and local temporary workspaces for audio/video processing, the likely target is a small Worker/MCP edge entry point backed by a Container runtime, rather than forcing the entire existing Python package into a plain Python Worker.
