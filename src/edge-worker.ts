import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

function createServer() {
  const server = new McpServer({
    name: "cove-sensory-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "sensory_status",
    {
      title: "Sensory MCP Status",
      description: "Check whether the Cove Sensory remote MCP server is online.",
      inputSchema: z.object({}),
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
      inputSchema: z.object({
        text: z.string().describe("Text to return"),
      }),
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

  return server;
}

const handler = createMcpHandler(() => createServer());

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Cove Sensory MCP is running. MCP endpoint: /mcp");
    }

    if (url.pathname === "/mcp") {
      return handler(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
