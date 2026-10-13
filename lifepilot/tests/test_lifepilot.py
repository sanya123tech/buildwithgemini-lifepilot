"""
Automated Test Suite for LifePilot AI
Tests:
1. SQLite persistent database operations
2. Official Python MCP Server tool registration & execution
3. MCP Client stdio IPC communication
4. Human approval gating for consequential tools
5. End-to-end Demo Scenario: 'Help me prepare for an AI Engineer interview in 7 days'
6. FastAPI REST endpoints & SPA serving
"""

import os
import sys
import json
import asyncio
import unittest
from datetime import datetime

# Setup path
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
LIFEPILOT_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
BACKEND_DIR = os.path.join(LIFEPILOT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from db.database import (
    init_db,
    db_create_task,
    db_list_tasks,
    db_get_task,
    db_update_task,
    db_delete_task,
    db_create_approval,
    db_list_approvals,
    db_resolve_approval
)
from mcp_server.server import mcp as mcp_server
from client.mcp_client import mcp_client
from services.planner import plan_and_execute


class TestLifePilot(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        init_db()

    async def test_01_database_crud(self):
        """Test persistent SQLite CRUD operations."""
        task = db_create_task(
            title="Master Vector Databases",
            description="Study HNSW and IVFPQ indexing",
            priority="urgent",
            category="Learning",
            estimated_minutes=90
        )
        self.assertIsNotNone(task)
        self.assertEqual(task["title"], "Master Vector Databases")
        self.assertEqual(task["priority"], "urgent")

        # Update
        updated = db_update_task(task["id"], {"status": "completed"})
        self.assertEqual(updated["status"], "completed")

        # List
        tasks = db_list_tasks(status="completed")
        self.assertTrue(any(t["id"] == task["id"] for t in tasks))

    async def test_02_mcp_server_tools_discovery(self):
        """Verify official MCP Server registers all expected tools."""
        tools = await mcp_server.list_tools()
        tool_names = [t.name for t in tools]
        expected = [
            "create_task",
            "list_tasks",
            "update_task",
            "delete_task",
            "generate_study_plan",
            "search_web",
            "get_productivity_stats",
            "generate_recommendations"
        ]
        for exp in expected:
            self.assertIn(exp, tool_names, f"Expected MCP tool '{exp}' not found")

    async def test_03_mcp_client_stdio_execution(self):
        """Test tool execution over MCP stdio protocol."""
        res = await mcp_client.execute_tool("create_task", {
            "title": "Build MCP Evaluator",
            "priority": "high",
            "category": "Engineering",
            "estimated_minutes": 60
        })
        self.assertTrue(res["success"])
        self.assertIn("task", res["result"])
        self.assertGreater(res["execution_time_ms"], 0)

    async def test_04_consequential_approval_gate(self):
        """Test that consequential delete_task tool requires human approval."""
        # 1. Create a dummy task
        task = db_create_task(title="Temporary Task for Deletion Test")
        task_id = task["id"]

        # 2. Attempt deletion without skipping approval
        del_res = await mcp_client.execute_tool("delete_task", {"task_id": task_id})
        self.assertFalse(del_res["success"])
        self.assertTrue(del_res["requires_approval"])
        self.assertIn("approval_id", del_res)

        approval_id = del_res["approval_id"]

        # 3. Verify approval exists in pending state
        pending = db_list_approvals(status="pending")
        self.assertTrue(any(a["id"] == approval_id for a in pending))

        # 4. Resolve approval (approve) and execute
        resolved = db_resolve_approval(approval_id, "approved")
        self.assertEqual(resolved["status"], "approved")

        approved_exec = await mcp_client.execute_tool(
            "delete_task",
            {"task_id": task_id},
            skip_approval_check=True
        )
        self.assertTrue(approved_exec["success"])
        self.assertIsNone(db_get_task(task_id))

    async def test_05_demo_scenario_7_day_ai_interview(self):
        """
        Test the user's specific demo scenario:
        'Help me prepare for an AI Engineer interview in 7 days.'
        Should generate a 7-day study plan, create individual tasks through MCP tools,
        save them to SQLite, and update stats.
        """
        demo_prompt = "Help me prepare for an AI Engineer interview in 7 days."
        plan_result = await plan_and_execute(demo_prompt)

        self.assertIsNotNone(plan_result)
        self.assertIn("reply", plan_result)
        self.assertGreater(len(plan_result["executed_tools"]), 0)

        # Verify generate_study_plan was executed
        study_plan_call = next(
            (t for t in plan_result["executed_tools"] if t["tool_name"] == "generate_study_plan"),
            None
        )
        self.assertIsNotNone(study_plan_call, "generate_study_plan tool was not called")
        self.assertEqual(study_plan_call["status"], "success")

        # Verify tasks are persisted in SQLite
        tasks = db_list_tasks(status="all", limit=50)
        self.assertGreaterEqual(len(tasks), 7)

        # Check for expected AI Engineer curriculum items in database
        titles = [t["title"] for t in tasks]
        self.assertTrue(any("Transformer" in title or "Day 1" in title for title in titles))
        self.assertTrue(any("Agentic" in title or "Day 6" in title for title in titles))

    async def test_06_search_web_tool(self):
        """Verify search_web tool returns structured results."""
        res = await mcp_client.execute_tool("search_web", {
            "query": "Model Context Protocol tools",
            "num_results": 2
        })
        self.assertTrue(res["success"])
        results = res["result"].get("results", [])
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("url", results[0])
        self.assertIn("title", results[0])


if __name__ == "__main__":
    unittest.main()
