import {
  Task,
  MCPTool,
  MCPLog,
  Approval,
  ProductivityStats,
  AIRecommendation,
  ChatPlanResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  // --- Tasks ---
  async getTasks(status = 'all', priority = 'all', category = 'all'): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks?status=${status}&priority=${priority}&category=${category}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    const data = await res.json();
    return data.tasks || [];
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    const data = await res.json();
    return data.task;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    const data = await res.json();
    return data.task;
  },

  async deleteTask(taskId: string, reason = 'User requested delete'): Promise<{ status: string; approval_id?: string; message?: string }> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}?reason=${encodeURIComponent(reason)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to delete task');
    }
    return await res.json();
  },

  // --- AI Chat Planner ---
  async submitChatPlan(prompt: string, apiKey?: string): Promise<ChatPlanResponse> {
    const res = await fetch(`${API_BASE}/chat/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, api_key: apiKey || undefined }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to generate plan');
    }
    return await res.json();
  },

  // --- MCP Inspector & Tools ---
  async getMCPTools(): Promise<MCPTool[]> {
    const res = await fetch(`${API_BASE}/mcp/tools`);
    if (!res.ok) throw new Error('Failed to fetch MCP tools');
    const data = await res.json();
    return data.tools || [];
  },

  async executeMCPTool(toolName: string, args: Record<string, any>, skipApproval = false): Promise<any> {
    const res = await fetch(`${API_BASE}/mcp/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: toolName,
        arguments: args,
        skip_approval_check: skipApproval,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Tool execution failed');
    }
    return await res.json();
  },

  async getMCPLogs(limit = 50): Promise<MCPLog[]> {
    const res = await fetch(`${API_BASE}/mcp/logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch MCP logs');
    const data = await res.json();
    return data.logs || [];
  },

  // --- Human Approval ---
  async getApprovals(status = 'pending'): Promise<Approval[]> {
    const res = await fetch(`${API_BASE}/approvals?status=${status}`);
    if (!res.ok) throw new Error('Failed to fetch approvals');
    const data = await res.json();
    return data.approvals || [];
  },

  async respondToApproval(approvalId: string, action: 'approve' | 'reject'): Promise<any> {
    const res = await fetch(`${API_BASE}/approvals/${approvalId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Approval response failed');
    }
    return await res.json();
  },

  // --- Analytics ---
  async getAnalytics(): Promise<{ stats: ProductivityStats; recommendations: AIRecommendation[] }> {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return await res.json();
  },

  // --- SSE Event Stream ---
  subscribeToEvents(onEvent: (payload: { event: string; data: any; timestamp: string }) => void): () => void {
    const eventSource = new EventSource(`${API_BASE}/events`);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE stream connection issue, reconnecting...', err);
    };

    return () => {
      eventSource.close();
    };
  },
};
