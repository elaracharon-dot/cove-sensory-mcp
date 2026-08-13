"""Remote Streamable HTTP entry point for Cove Sensory MCP."""

from __future__ import annotations

import os

from cove_sensory_mcp.cli import _build_services
from cove_sensory_mcp.server import create_server


def _port() -> int:
    value = os.environ.get("PORT", "8000")
    try:
        port = int(value)
    except ValueError as exc:
        raise SystemExit("PORT must be an integer") from exc
    if not 1 <= port <= 65535:
        raise SystemExit("PORT must be between 1 and 65535")
    return port


def main() -> None:
    """Run the existing sensory tools over production-oriented Streamable HTTP."""
    server = create_server(_build_services())
    server.run(
        transport="streamable-http",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=_port(),
        streamable_http_path="/mcp",
        stateless_http=True,
        json_response=True,
    )


if __name__ == "__main__":
    main()
