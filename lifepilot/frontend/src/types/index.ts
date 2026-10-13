export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  category: string;
  estimated_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface MCPTool {
  name: string;
  description: string;
  input_schema: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string; default?: any }>;
    required?: string[];
  };
  consequential: boolean;
  consequential_reason?: string;
}

export interface MCPLog {
  id: string;
  tool_name: string;
  arguments: Record<string, any> | string;
  result: any;
  status: 'success' | 'failed' | 'pending_approval' | 'rejected';
  execution_time_ms: number;
  requires_approval: boolean;
  timestamp: string;
}

export interface Approval {
  id: string;
  tool_name: string;
  arguments: Record<string, any> | string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at?: string;
}

export interface ProductivityStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  due_today: number;
  completion_rate_percentage: number;
  total_estimated_focus_hours: number;
  completed_focus_hours: number;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
}

export interface AIRecommendation {
  type: 'warning' | 'priority' | 'tip' | 'wellness';
  title: string;
  message: string;
  suggested_action: string;
}

export interface ChatPlanResponse {
  engine: string;
  model: string;
  is_mock: boolean;
  reply: string;
  executed_tools: Array<{
    tool_name: string;
    arguments: Record<string, any>;
    result: any;
    status: string;
    execution_time_ms: number;
    requires_approval?: boolean;
  }>;
  fallback_warning?: string;
}
