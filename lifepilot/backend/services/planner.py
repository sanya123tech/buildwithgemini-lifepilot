"""
LifePilot AI - Intelligent MCP Planner Service
Orchestrates natural language user goals into MCP tool executions.
Supports:
1. Google Gemini SDK (google-genai) with function/tool calling when GEMINI_API_KEY is configured
2. Autonomous Simulation Mode (clearly labeled Mock LLM engine) that performs intelligent
   intent parsing, real MCP tool selection, and end-to-end task generation with zero fake tool executions.
"""

import os
import re
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

from client.mcp_client import mcp_client, broadcast_event

logger = logging.getLogger("lifepilot.planner")

def get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or None

def get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

async def plan_and_execute(prompt: str, user_api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entrypoint: Receives user prompt, selects appropriate MCP tools,
    executes them, records execution traces, and returns synthesized response.
    """
    api_key = user_api_key or get_api_key()
    
    if api_key:
        try:
            return await _execute_with_gemini(prompt, api_key)
        except Exception as e:
            logger.warning(f"Gemini execution encountered error: {e}. Falling back to Autonomous Simulation Planner.")
            sim_res = await _execute_simulation_planner(prompt)
            sim_res["fallback_warning"] = f"Gemini API returned an error ({str(e)}). Switched to Autonomous Simulation Engine."
            return sim_res
    else:
        return await _execute_simulation_planner(prompt)


async def _execute_with_gemini(prompt: str, api_key: str) -> Dict[str, Any]:
    """Execute plan using Google Gemini tool calling."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    model_name = get_model_name()
    
    # 1. Fetch available MCP tools
    tools = await mcp_client.list_available_tools()
    
    # Build tool declarations for Gemini
    gemini_tools = []
    # For simplicity and robust tool invocation, we provide function declarations
    func_declarations = []
    for t in tools:
        schema = t.get("input_schema", {})
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        func_declarations.append(
            types.FunctionDeclaration(
                name=t["name"],
                description=t["description"],
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        p_name: types.Schema(
                            type=types.Type.STRING if p_info.get("type") == "string" else
                                 types.Type.INTEGER if p_info.get("type") == "integer" else
                                 types.Type.NUMBER if p_info.get("type") == "number" else
                                 types.Type.BOOLEAN if p_info.get("type") == "boolean" else types.Type.STRING,
                            description=p_info.get("description", p_name)
                        )
                        for p_name, p_info in properties.items()
                    },
                    required=required
                )
            )
        )
    
    system_instruction = (
        "You are LifePilot AI, a proactive Personal AI Command Center. "
        "Your mission is to help users accomplish their goals by breaking them into actionable steps "
        "and invoking MCP tools (create_task, generate_study_plan, search_web, list_tasks, get_productivity_stats, generate_recommendations). "
        "Always call tools to persist real tasks rather than merely providing theoretical advice."
    )

    executed_tools = []
    
    # Call Gemini
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[types.Tool(function_declarations=func_declarations)],
            temperature=0.2
        )
    )

    # Check for tool calls
    if response.function_calls:
        for call in response.function_calls:
            fn_name = call.name
            fn_args = dict(call.args) if call.args else {}
            
            tool_res = await mcp_client.execute_tool(fn_name, fn_args)
            executed_tools.append({
                "tool_name": fn_name,
                "arguments": fn_args,
                "result": tool_res.get("result"),
                "status": tool_res.get("status"),
                "execution_time_ms": tool_res.get("execution_time_ms", 0),
                "requires_approval": tool_res.get("requires_approval", False)
            })

    # If Gemini answered with text, use it; otherwise summarize executed tools
    reply_text = response.text if response.text else f"Successfully executed {len(executed_tools)} MCP tool action(s) for your goal."

    return {
        "engine": "Google Gemini (Live API)",
        "model": model_name,
        "is_mock": False,
        "reply": reply_text,
        "executed_tools": executed_tools
    }


async def _execute_simulation_planner(prompt: str) -> Dict[str, Any]:
    """
    Intelligent Autonomous Simulation Planner.
    Analyzes user intent, extracts duration/milestones, invokes real MCP tools
    over the MCP protocol, and saves real persistent tasks into SQLite.
    """
    prompt_clean = prompt.lower().strip()
    executed_tools = []
    reply_text = ""

    # Case 1: Study plan / Interview preparation / Multi-day roadmap (The primary demo scenario)
    if any(k in prompt_clean for k in ["interview", "study plan", "prepare", "7 days", "7-day", "roadmap", "curriculum", "learn"]):
        # Extract duration
        duration_days = 7
        day_match = re.search(r"(\d+)\s*(?:day|days)", prompt_clean)
        if day_match:
            try:
                duration_days = int(day_match.group(1))
            except ValueError:
                duration_days = 7

        topic = "AI Engineer Interview Prep"
        if "interview" in prompt_clean:
            topic = "AI Engineer Interview & Systems"
        elif "python" in prompt_clean:
            topic = "Advanced Python Engineering"
        elif "react" in prompt_clean:
            topic = "Fullstack React Architecture"

        # 1. First search web for reference sources
        search_res = await mcp_client.execute_tool("search_web", {
            "query": f"{topic} topics and curriculum",
            "num_results": 3
        })
        executed_tools.append({
            "tool_name": "search_web",
            "arguments": {"query": f"{topic} topics and curriculum", "num_results": 3},
            "result": search_res.get("result"),
            "status": search_res.get("status"),
            "execution_time_ms": search_res.get("execution_time_ms", 0)
        })

        # 2. Call generate_study_plan (which creates real SQLite tasks)
        plan_res = await mcp_client.execute_tool("generate_study_plan", {
            "topic": topic,
            "duration_days": duration_days,
            "hours_per_day": 2.5,
            "skill_level": "advanced",
            "auto_create_tasks": True
        })
        executed_tools.append({
            "tool_name": "generate_study_plan",
            "arguments": {
                "topic": topic,
                "duration_days": duration_days,
                "hours_per_day": 2.5,
                "auto_create_tasks": True
            },
            "result": plan_res.get("result"),
            "status": plan_res.get("status"),
            "execution_time_ms": plan_res.get("execution_time_ms", 0)
        })

        # 3. Call get_productivity_stats to refresh metrics
        stats_res = await mcp_client.execute_tool("get_productivity_stats", {})
        executed_tools.append({
            "tool_name": "get_productivity_stats",
            "arguments": {},
            "result": stats_res.get("result"),
            "status": stats_res.get("status"),
            "execution_time_ms": stats_res.get("execution_time_ms", 0)
        })

        reply_text = (
            f"🎯 **Action Plan Generated & Scheduled**\n\n"
            f"I have broken down your goal into a comprehensive **{duration_days}-Day Roadmap** for **{topic}**.\n\n"
            f"• **MCP Tools Executed**: `search_web`, `generate_study_plan`, and `get_productivity_stats`.\n"
            f"• **{duration_days} Actionable Tasks** have been created in your SQLite database with daily deadlines and priority ratings.\n"
            f"• All tasks are immediately visible on your **Command Center Dashboard** below.\n\n"
            f"You can now track today's goals, adjust priorities, complete tasks as you progress, or delete tasks (with human confirmation)."
        )

    # Case 2: Direct Task Creation
    elif any(k in prompt_clean for k in ["add task", "create task", "schedule", "remind me to", "todo"]):
        title = prompt.replace("add task", "").replace("create task", "").replace("schedule", "").strip(": ")
        if not title:
            title = "High Priority Objective"
        
        priority = "high" if any(w in prompt_clean for w in ["urgent", "asap", "critical", "important"]) else "medium"
        category = "Work" if any(w in prompt_clean for w in ["work", "project", "deploy", "build"]) else "General"
        
        create_res = await mcp_client.execute_tool("create_task", {
            "title": title[:100],
            "description": f"Created via natural language command: '{prompt}'",
            "priority": priority,
            "category": category,
            "estimated_minutes": 45
        })
        executed_tools.append({
            "tool_name": "create_task",
            "arguments": {"title": title[:100], "priority": priority, "category": category},
            "result": create_res.get("result"),
            "status": create_res.get("status"),
            "execution_time_ms": create_res.get("execution_time_ms", 0)
        })

        reply_text = f"✅ Created new task **'{title}'** ({priority.upper()} priority) in SQLite database."

    # Case 3: Productivity / Analytics / Status request
    elif any(k in prompt_clean for k in ["stats", "analytics", "how am i doing", "progress", "productivity", "recommendations"]):
        stats_res = await mcp_client.execute_tool("get_productivity_stats", {})
        recs_res = await mcp_client.execute_tool("generate_recommendations", {})
        
        executed_tools.extend([
            {
                "tool_name": "get_productivity_stats",
                "arguments": {},
                "result": stats_res.get("result"),
                "status": stats_res.get("status"),
                "execution_time_ms": stats_res.get("execution_time_ms", 0)
            },
            {
                "tool_name": "generate_recommendations",
                "arguments": {},
                "result": recs_res.get("result"),
                "status": recs_res.get("status"),
                "execution_time_ms": recs_res.get("execution_time_ms", 0)
            }
        ])

        reply_text = "📊 Updated productivity velocity statistics and generated fresh AI recommendations."

    # Default / General Query
    else:
        # Search web for information and create an action item
        search_res = await mcp_client.execute_tool("search_web", {
            "query": prompt,
            "num_results": 3
        })
        executed_tools.append({
            "tool_name": "search_web",
            "arguments": {"query": prompt, "num_results": 3},
            "result": search_res.get("result"),
            "status": search_res.get("status"),
            "execution_time_ms": search_res.get("execution_time_ms", 0)
        })

        create_res = await mcp_client.execute_tool("create_task", {
            "title": f"Follow-up: {prompt[:60]}",
            "description": f"Research follow-up for: {prompt}",
            "priority": "medium",
            "category": "Research",
            "estimated_minutes": 30
        })
        executed_tools.append({
            "tool_name": "create_task",
            "arguments": {"title": f"Follow-up: {prompt[:60]}"},
            "result": create_res.get("result"),
            "status": create_res.get("status"),
            "execution_time_ms": create_res.get("execution_time_ms", 0)
        })

        reply_text = f"Analyzed your request, queried live technical sources, and logged a follow-up action task."

    return {
        "engine": "Autonomous Simulation Engine (Demo Mode)",
        "model": "rule-based-mcp-orchestrator",
        "is_mock": True,
        "reply": reply_text,
        "executed_tools": executed_tools
    }
