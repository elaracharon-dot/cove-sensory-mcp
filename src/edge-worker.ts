import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { z } from "zod";

const server = new McpServer({
  name: "cove-sensory-mcp",
  version: "0.1.0",
});

server.registerTool(
  "sensory_status",
  {
    title: "Sensory MCP Status",
    description: "Check whether the Cove Sensory remote MCP server is online.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "Cove Sensory MCP is online.",
      },
    ],
  }),
);

server.registerTool(
  "echo",
  {
    title: "Echo",
    description: "Return text supplied by the caller. Used to test the remote MCP connection.",
    inputSchema: {
      text: z.string().describe("Text to return"),
    },
  },
  async ({ text }) => ({
    content: [
      {
        type: "text",
        text,
      },
    ],
  }),
);

const handler = createMcpHandler(server);

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Cove Sensory MCP is running. MCP endpoint: /mcp");
    }

    if (url.pathname === "/mcp") {
      return handler(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
};
