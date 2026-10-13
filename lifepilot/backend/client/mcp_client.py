"""
LifePilot AI - MCP Client Integration
Connects to the official MCP server using official Python MCP SDK (stdio_client + ClientSession).
Provides:
- Dynamic tool inspection and schema extraction
- Safe tool execution with execution time tracking and error handling
- Consequential action detection and human approval gating
- SQLite persistence of all execution logs
- Event emission for live frontend activity timeline
"""

import os
import sys
import time
import json
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone

from mcp import StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.session import ClientSession

from db.database import (
    db_log_mcp_call,
    db_create_approval,
    db_list_mcp_logs
)

SERVER_SCRIPT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../mcp_server/server.py")
)

# Consequential tools that require human confirmation before execution
CONSEQUENTIAL_TOOLS = {
    "delete_task": "Permanently deletes a task from the database."
}

# In-memory listeners for real-time SSE broadcasts
_event_listeners: List[asyncio.Queue] = []

def subscribe_events() -> asyncio.Queue:
    q = asyncio.Queue(maxsize=100)
    _event_listeners.append(q)
    return q

def unsubscribe_events(q: asyncio.Queue):
    if q in _event_listeners:
        _event_listeners.remove(q)

async def broadcast_event(event_type: str, data: Any):
    payload = {"event": event_type, "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}
    for q in list(_event_listeners):
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass


class MCPClientManager:
    def __init__(self):
        self.cached_tools: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()

    def get_server_params(self) -> StdioServerParameters:
        return StdioServerParameters(
            command=sys.executable,
            args=[SERVER_SCRIPT],
            env=os.environ.copy()
        )

    async def list_available_tools(self) -> List[Dict[str, Any]]:
        """Query the MCP server over stdio to fetch available tools and their schemas."""
        async with self._lock:
            try:
                server_params = self.get_server_params()
                async with stdio_client(server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        tools_result = await session.list_tools()
                        
                        tool_list = []
                        for tool in tools_result.tools:
                            # Format parameter schema
                            input_schema = tool.inputSchema if hasattr(tool, "inputSchema") else {}
                            if hasattr(input_schema, "model_dump"):
                                input_schema = input_schema.model_dump()

                            tool_list.append({
                                "name": tool.name,
                                "description": tool.description or "",
                                "input_schema": input_schema,
                                "consequential": tool.name in CONSEQUENTIAL_TOOLS,
                                "consequential_reason": CONSEQUENTIAL_TOOLS.get(tool.name, "")
                            })
                        self.cached_tools = tool_list
                        return tool_list
            except Exception as e:
                # If stdio failed, fallback to direct server import if available
                from mcp_server.server import mcp as local_mcp
                tools = await local_mcp.list_tools()
                tool_list = []
                for tool in tools:
                    tool_list.append({
                        "name": tool.name,
                        "description": tool.description or "",
                        "input_schema": getattr(tool, "inputSchema", {}),
                        "consequential": tool.name in CONSEQUENTIAL_TOOLS,
                        "consequential_reason": CONSEQUENTIAL_TOOLS.get(tool.name, "")
                    })
                self.cached_tools = tool_list
                return tool_list

    async def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        skip_approval_check: bool = False
    ) -> Dict[str, Any]:
        """
        Executes a tool on the MCP server via stdio transport.
        If tool is consequential and not approved, returns approval required status.
        """
        # 1. Consequential Action Check
        if not skip_approval_check and tool_name in CONSEQUENTIAL_TOOLS:
            reason = CONSEQUENTIAL_TOOLS[tool_name]
            appr = db_create_approval(
                tool_name=tool_name,
                arguments=arguments,
                reason=f"Action requires confirmation: {reason}"
            )
            log = db_log_mcp_call(
                tool_name=tool_name,
                arguments=arguments,
                result={"approval_id": appr["id"], "reason": appr["reason"], "status": "pending_approval"},
                status="pending_approval",
                execution_time_ms=0,
                requires_approval=True
            )
            await broadcast_event("approval_requested", {
                "approval": appr,
                "log": log
            })
            return {
                "success": False,
                "requires_approval": True,
                "approval_id": appr["id"],
                "message": f"Consequential action '{tool_name}' paused pending user approval.",
                "details": appr
            }

        start_time = time.time()
        status = "failed"
        result_payload: Any = None
        
        # Notify timeline that tool started
        await broadcast_event("tool_started", {
            "tool_name": tool_name,
            "arguments": arguments,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        try:
            server_params = self.get_server_params()
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    call_res = await session.call_tool(tool_name, arguments)
                    
                    # Extract structured result or text
                    if hasattr(call_res, "structured_content") and call_res.structured_content:
                        res = call_res.structured_content
                        if isinstance(res, dict) and "result" in res:
                            result_payload = res["result"]
                        else:
                            result_payload = res
                    elif hasattr(call_res, "content") and call_res.content:
                        first = call_res.content[0]
                        text = getattr(first, "text", str(first))
                        try:
                            result_payload = json.loads(text)
                        except Exception:
                            result_payload = {"raw_text": text}
                    else:
                        result_payload = {"output": str(call_res)}

                    status = "success"

        except Exception as e:
            # Fallback to in-process execution if stdio process threw
            try:
                from mcp_server.server import mcp as local_mcp
                call_res = await local_mcp.call_tool(tool_name, arguments)
                if hasattr(call_res, "structured_content") and call_res.structured_content:
                    res = call_res.structured_content
                    result_payload = res.get("result", res)
                elif hasattr(call_res, "content") and call_res.content:
                    first = call_res.content[0]
                    text = getattr(first, "text", str(first))
                    try:
                        result_payload = json.loads(text)
                    except Exception:
                        result_payload = {"raw_text": text}
                else:
                    result_payload = {"output": str(call_res)}
                status = "success"
            except Exception as e2:
                status = "failed"
                result_payload = {"error": str(e2), "fallback_error": str(e)}

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        # Record log in SQLite
        log_entry = db_log_mcp_call(
            tool_name=tool_name,
            arguments=arguments,
            result=result_payload,
            status=status,
            execution_time_ms=elapsed_ms,
            requires_approval=(tool_name in CONSEQUENTIAL_TOOLS)
        )

        # Broadcast completed event
        await broadcast_event("tool_completed", {
            "log": log_entry
        })

        return {
            "success": (status == "success"),
            "tool_name": tool_name,
            "status": status,
            "execution_time_ms": elapsed_ms,
            "result": result_payload,
            "log_id": log_entry["id"]
        }


# Singleton manager instance
mcp_client = MCPClientManager()
