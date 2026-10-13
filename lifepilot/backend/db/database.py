import os
import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DB_PATH = os.getenv("LIFEPILOT_DB_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../lifepilot.db")))

def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending',
                due_date TEXT,
                category TEXT DEFAULT 'General',
                estimated_minutes INTEGER DEFAULT 30,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS mcp_logs (
                id TEXT PRIMARY KEY,
                tool_name TEXT NOT NULL,
                arguments TEXT NOT NULL,
                result TEXT NOT NULL,
                status TEXT NOT NULL,
                execution_time_ms REAL DEFAULT 0,
                requires_approval INTEGER DEFAULT 0,
                timestamp TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                tool_name TEXT NOT NULL,
                arguments TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                resolved_at TEXT
            );
        """)
        conn.commit()

# --- Task DB helpers ---

def db_create_task(
    title: str,
    description: str = "",
    priority: str = "medium",
    due_date: Optional[str] = None,
    category: str = "General",
    estimated_minutes: int = 30,
    status: str = "pending"
) -> Dict[str, Any]:
    task_id = f"task_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    if not due_date:
        due_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO tasks (id, title, description, priority, status, due_date, category, estimated_minutes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (task_id, title, description, priority, status, due_date, category, estimated_minutes, now, now)
        )
        conn.commit()
    
    return db_get_task(task_id)

def db_get_task(task_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if row:
            return dict(row)
    return None

def db_list_tasks(status: Optional[str] = None, priority: Optional[str] = None, category: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    query = "SELECT * FROM tasks WHERE 1=1"
    params = []
    if status and status != "all":
        query += " AND status = ?"
        params.append(status)
    if priority and priority != "all":
        query += " AND priority = ?"
        params.append(priority)
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    query += " ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, due_date ASC, created_at DESC LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

def db_update_task(task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    fields = []
    params = []
    allowed = ["title", "description", "priority", "status", "due_date", "category", "estimated_minutes"]
    for k, v in updates.items():
        if k in allowed:
            fields.append(f"{k} = ?")
            params.append(v)
    if not fields:
        return db_get_task(task_id)

    fields.append("updated_at = ?")
    params.append(datetime.now(timezone.utc).isoformat())
    params.append(task_id)

    with get_connection() as conn:
        conn.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()

    return db_get_task(task_id)

def db_delete_task(task_id: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        return cur.rowcount > 0

# --- MCP Log helpers ---

def db_log_mcp_call(
    tool_name: str,
    arguments: Any,
    result: Any,
    status: str,
    execution_time_ms: float = 0.0,
    requires_approval: bool = False
) -> Dict[str, Any]:
    log_id = f"log_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    args_json = json.dumps(arguments) if not isinstance(arguments, str) else arguments
    res_json = json.dumps(result) if not isinstance(result, str) else result

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO mcp_logs (id, tool_name, arguments, result, status, execution_time_ms, requires_approval, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (log_id, tool_name, args_json, res_json, status, execution_time_ms, 1 if requires_approval else 0, now)
        )
        conn.commit()

    return {
        "id": log_id,
        "tool_name": tool_name,
        "arguments": arguments,
        "result": result,
        "status": status,
        "execution_time_ms": execution_time_ms,
        "requires_approval": requires_approval,
        "timestamp": now
    }

def db_list_mcp_logs(limit: int = 50) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM mcp_logs ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
        logs = []
        for r in rows:
            d = dict(r)
            try:
                d["arguments"] = json.loads(d["arguments"])
            except Exception:
                pass
            try:
                d["result"] = json.loads(d["result"])
            except Exception:
                pass
            d["requires_approval"] = bool(d["requires_approval"])
            logs.append(d)
        return logs

# --- Approval helpers ---

def db_create_approval(tool_name: str, arguments: Any, reason: str) -> Dict[str, Any]:
    approval_id = f"appr_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    args_json = json.dumps(arguments) if not isinstance(arguments, str) else arguments

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO approvals (id, tool_name, arguments, reason, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            """,
            (approval_id, tool_name, args_json, reason, now)
        )
        conn.commit()

    return {
        "id": approval_id,
        "tool_name": tool_name,
        "arguments": arguments,
        "reason": reason,
        "status": "pending",
        "created_at": now
    }

def db_list_approvals(status: str = "pending") -> List[Dict[str, Any]]:
    with get_connection() as conn:
        query = "SELECT * FROM approvals"
        params = []
        if status and status != "all":
            query += " WHERE status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC"
        rows = conn.execute(query, params).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["arguments"] = json.loads(d["arguments"])
            except Exception:
                pass
            results.append(d)
        return results

def db_resolve_approval(approval_id: str, status: str) -> Optional[Dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            "UPDATE approvals SET status = ?, resolved_at = ? WHERE id = ?",
            (status, now, approval_id)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
        if row:
            d = dict(row)
            try:
                d["arguments"] = json.loads(d["arguments"])
            except Exception:
                pass
            return d
    return None
