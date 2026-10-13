"""
LifePilot AI - FastAPI Backend Application
Exposes REST and SSE endpoints for:
- Task management (CRUD & persistence in SQLite)
- Natural-language planning & intelligent MCP tool execution
- MCP Inspector (tool discovery, schema inspection, manual execution)
- Real-time MCP activity timeline (SSE)
- Human-in-the-loop approval management
- Productivity analytics & AI recommendations
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Setup path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from db.database import (
    init_db,
    db_create_task,
    db_list_tasks,
    db_get_task,
    db_update_task,
    db_delete_task,
    db_list_mcp_logs,
    db_list_approvals,
    db_resolve_approval
)
from client.mcp_client import (
    mcp_client,
    subscribe_events,
    unsubscribe_events,
    broadcast_event
)
from services.planner import plan_and_execute

# Initialize DB
init_db()

app = FastAPI(
    title="LifePilot AI Command Center API",
    description="Backend API with official Model Context Protocol (MCP) tool integration",
    version="1.0.0"
)

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    due_date: Optional[str] = None
    category: str = "General"
    estimated_minutes: int = 30
    status: str = "pending"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    estimated_minutes: Optional[int] = None
    status: Optional[str] = None

class ChatPlanRequest(BaseModel):
    prompt: str
    api_key: Optional[str] = None

class ToolExecuteRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    skip_approval_check: bool = False

class ApprovalResponseRequest(BaseModel):
    action: str  # "approve" or "reject"


# --- Task Endpoints ---

@app.get("/api/tasks")
async def get_tasks(
    status: Optional[str] = "all",
    priority: Optional[str] = "all",
    category: Optional[str] = "all",
    limit: int = 100
):
    """Retrieve persistent tasks from SQLite."""
    tasks = db_list_tasks(status=status, priority=priority, category=category, limit=limit)
    return {"tasks": tasks, "count": len(tasks)}

@app.post("/api/tasks")
async def create_task_endpoint(payload: TaskCreate):
    """Directly create a new task."""
    task = db_create_task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        category=payload.category,
        estimated_minutes=payload.estimated_minutes,
        status=payload.status
    )
    await broadcast_event("task_created", {"task": task})
    return {"task": task}

@app.patch("/api/tasks/{task_id}")
async def update_task_endpoint(task_id: str, payload: TaskUpdate):
    """Update task status or attributes."""
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = db_update_task(task_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    await broadcast_event("task_updated", {"task": updated})
    return {"task": updated}

@app.delete("/api/tasks/{task_id}")
async def delete_task_endpoint(task_id: str, reason: str = "User requested deletion from UI"):
    """
    Delete task through the MCP tool infrastructure to guarantee
    human confirmation policy and full execution audit logging.
    """
    res = await mcp_client.execute_tool("delete_task", {"task_id": task_id, "reason": reason})
    if res.get("requires_approval"):
        return {
            "status": "pending_approval",
            "approval_id": res["approval_id"],
            "message": "Consequential delete action paused. Please approve in the approvals center."
        }
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("result", {}).get("error", "Delete failed"))
    await broadcast_event("task_deleted", {"task_id": task_id})
    return {"status": "success", "task_id": task_id}


# --- AI Planner & Chat Endpoints ---

@app.post("/api/chat/plan")
async def chat_plan_endpoint(payload: ChatPlanRequest):
    """
    Accepts natural-language goal, runs planner to select and invoke MCP tools,
    creates persistent SQLite tasks, and returns executive summary.
    """
    if not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    result = await plan_and_execute(payload.prompt, user_api_key=payload.api_key)
    await broadcast_event("plan_completed", result)
    return result


# --- MCP Inspector & Tool Endpoints ---

@app.get("/api/mcp/tools")
async def get_mcp_tools():
    """Returns list of registered MCP tools, schemas, and consequential flags."""
    tools = await mcp_client.list_available_tools()
    return {"tools": tools, "count": len(tools)}

@app.post("/api/mcp/execute")
async def execute_mcp_tool_direct(payload: ToolExecuteRequest):
    """Execute an MCP tool directly from the inspector interface."""
    res = await mcp_client.execute_tool(
        tool_name=payload.tool_name,
        arguments=payload.arguments,
        skip_approval_check=payload.skip_approval_check
    )
    return res

@app.get("/api/mcp/logs")
async def get_mcp_logs(limit: int = 50):
    """Returns audit history of all MCP tool executions."""
    logs = db_list_mcp_logs(limit=limit)
    return {"logs": logs, "count": len(logs)}


# --- Human Approval Endpoints ---

@app.get("/api/approvals")
async def get_pending_approvals(status: str = "pending"):
    """Returns list of pending consequential actions awaiting confirmation."""
    approvals = db_list_approvals(status=status)
    return {"approvals": approvals, "count": len(approvals)}

@app.post("/api/approvals/{approval_id}/respond")
async def respond_to_approval(approval_id: str, payload: ApprovalResponseRequest):
    """Approve or reject a consequential action."""
    action = payload.action.lower()
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    approvals = db_list_approvals(status="all")
    appr = next((a for a in approvals if a["id"] == approval_id), None)
    if not appr:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    if appr["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Approval already resolved as {appr['status']}")

    if action == "reject":
        resolved = db_resolve_approval(approval_id, "rejected")
        await broadcast_event("approval_resolved", {"approval": resolved, "action": "rejected"})
        return {"status": "rejected", "approval": resolved}
    
    # Action approved -> execute the tool with skip_approval_check=True
    tool_name = appr["tool_name"]
    arguments = appr["arguments"]
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except Exception:
            arguments = {}
    
    exec_res = await mcp_client.execute_tool(
        tool_name=tool_name,
        arguments=arguments,
        skip_approval_check=True
    )
    resolved = db_resolve_approval(approval_id, "approved")
    await broadcast_event("approval_resolved", {
        "approval": resolved,
        "action": "approved",
        "execution_result": exec_res
    })
    return {
        "status": "approved",
        "approval": resolved,
        "execution_result": exec_res
    }


# --- Analytics & Recommendations ---

@app.get("/api/analytics")
async def get_analytics_endpoint():
    """Retrieve productivity metrics and AI recommendations."""
    # Execute tools via MCP
    stats_res = await mcp_client.execute_tool("get_productivity_stats", {})
    recs_res = await mcp_client.execute_tool("generate_recommendations", {})
    
    return {
        "stats": stats_res.get("result", {}),
        "recommendations": recs_res.get("result", {}).get("recommendations", [])
    }


# --- Real-Time SSE Stream ---

@app.get("/api/events")
async def sse_events():
    """Server-Sent Events stream for live activity updates and approval alerts."""
    async def event_generator():
        q = subscribe_events()
        try:
            # Send initial ping
            yield f"data: {json.dumps({'event': 'connected', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
            while True:
                data = await q.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            unsubscribe_events(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "LifePilot AI",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "SQLite (WAL mode)",
        "mcp_sdk": "Official Python MCP SDK 2.3.0"
    }

# Mount and serve built frontend SPA if available
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_DIST = os.path.abspath(os.path.join(CURRENT_DIR, "../frontend/dist"))
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to be handled by FastAPI
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend not built"}

