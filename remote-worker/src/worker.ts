import { createMcpHandler } from "agents/mcp";
import { createMcpProbeResponse, normalizeMcpRequest } from "./request-compat.js";
import { createSensoryServer } from "./server.js";
import { constantTimeEqual } from "./security.js";

function jsonRpcError(status: number, message: string): Response {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32603, message } },
    { status, headers: { "cache-control": "no-store" } }
  );
}

async function isAuthorizedPath(pathname: string, token: string): Promise<boolean> {
  const prefix = "/mcp/";
  if (!pathname.startsWith(prefix)) return false;
  const supplied = pathname.slice(prefix.length).replace(/\/ios-v4$/, "");
  return supplied.length > 0 && constantTimeEqual(supplied, token);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json(
        { ok: true, app: "cove-sensory-mcp", version: "0.1.0-remote" },
        { headers: { "cache-control": "no-store" } }
      );
    }
    if (!env.MCP_PATH_TOKEN || !env.GEMINI_API_KEY) {
      console.error(JSON.stringify({ message: "Required secrets are not configured" }));
      return jsonRpcError(503, "Service unavailable");
    }
    if (!(await isAuthorizedPath(url.pathname, env.MCP_PATH_TOKEN))) {
      return new Response("Not found", { status: 404 });
    }

    try {
      const probeResponse = createMcpProbeResponse(request);
      if (probeResponse) return probeResponse;
      const server = createSensoryServer(env);
      const mcpRequest = normalizeMcpRequest(request);
      return createMcpHandler(server, {
        route: url.pathname,
        enableJsonResponse: true
      })(mcpRequest, env, ctx);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`MCP request failed: ${errorMessage}`);
      return jsonRpcError(500, "Internal server error");
    }
  }
} satisfies ExportedHandler<Env>;
