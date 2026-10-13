import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import { 
  Task, 
  MCPTool, 
  MCPLog, 
  Approval, 
  ProductivityStats, 
  AIRecommendation, 
  ChatPlanResponse 
} from './types';
import { Header } from './components/Header';
import { ChatPlanner } from './components/ChatPlanner';
import { TaskDashboard } from './components/TaskDashboard';
import { ActivityPanel } from './components/ActivityPanel';
import { MCPInspector } from './components/MCPInspector';
import { ApprovalModal } from './components/ApprovalModal';
import { AnalyticsCards } from './components/AnalyticsCards';
import { SettingsModal } from './components/SettingsModal';
import { RefreshCw, Sparkles, Terminal, Activity, ShieldAlert } from 'lucide-react';

const DEFAULT_STATS: ProductivityStats = {
  total_tasks: 0,
  completed_tasks: 0,
  in_progress_tasks: 0,
  pending_tasks: 0,
  overdue_tasks: 0,
  due_today: 0,
  completion_rate_percentage: 0,
  total_estimated_focus_hours: 0,
  completed_focus_hours: 0,
  by_priority: {},
  by_category: {}
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inspector' | 'activity'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [logs, setLogs] = useState<MCPLog[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [stats, setStats] = useState<ProductivityStats>(DEFAULT_STATS);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [lastResponse, setLastResponse] = useState<ChatPlanResponse | null>(null);
  
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('lifepilot_gemini_key') || '');
  const [model, setModel] = useState<string>(() => localStorage.getItem('lifepilot_gemini_model') || 'gemini-2.5-flash');

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, fetchedTools, fetchedLogs, fetchedApprovals, analyticsData] = await Promise.all([
        api.getTasks().catch(() => []),
        api.getMCPTools().catch(() => []),
        api.getMCPLogs().catch(() => []),
        api.getApprovals('pending').catch(() => []),
        api.getAnalytics().catch(() => ({ stats: DEFAULT_STATS, recommendations: [] }))
      ]);

      setTasks(fetchedTasks);
      setTools(fetchedTools);
      setLogs(fetchedLogs);
      setApprovals(fetchedApprovals);
      setStats(analyticsData.stats || DEFAULT_STATS);
      setRecommendations(analyticsData.recommendations || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to real-time Server-Sent Events (SSE)
    const unsubscribe = api.subscribeToEvents((event) => {
      // Reload on real-time task or tool updates
      if (['tool_completed', 'task_created', 'task_updated', 'task_deleted', 'approval_requested', 'approval_resolved', 'plan_completed'].includes(event.event)) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('lifepilot_gemini_key', newKey);
  };

  const handleSaveModel = (newModel: string) => {
    setModel(newModel);
    localStorage.setItem('lifepilot_gemini_model', newModel);
  };

  // Submit AI goal plan
  const handlePlanSubmitted = async (prompt: string): Promise<ChatPlanResponse> => {
    setIsPlanning(true);
    try {
      const response = await api.submitChatPlan(prompt, apiKey || undefined);
      setLastResponse(response);
      await loadData();
      return response;
    } finally {
      setIsPlanning(false);
    }
  };

  // Toggle complete
  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      await api.updateTask(task.id, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Update failed:', err);
      loadData();
    }
  };

  // Update task
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await api.updateTask(taskId, updates);
      loadData();
    } catch (err) {
      console.error('Update task failed:', err);
    }
  };

  // Delete task (consequential action workflow)
  const handleDeleteTask = async (task: Task) => {
    try {
      const res = await api.deleteTask(task.id, `User requested removal of task '${task.title}'`);
      if (res.status === 'pending_approval') {
        setIsApprovalsModalOpen(true);
      }
      loadData();
    } catch (err: any) {
      console.error('Delete task failed:', err);
      alert(`Delete Error: ${err.message}`);
    }
  };

  // Create manual task
  const handleCreateTask = async (data: Partial<Task>) => {
    try {
      await api.createTask(data);
      loadData();
    } catch (err) {
      console.error('Create task failed:', err);
    }
  };

  // Execute MCP tool manually in Inspector
  const handleExecuteTool = async (toolName: string, args: Record<string, any>) => {
    const res = await api.executeMCPTool(toolName, args);
    loadData();
    return res;
  };

  // Respond to pending approval
  const handleRespondApproval = async (approvalId: string, action: 'approve' | 'reject') => {
    await api.respondToApproval(approvalId, action);
    loadData();
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        onOpenApprovals={() => setIsApprovalsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isMockMode={!apiKey}
        engineName={apiKey ? `Gemini (${model})` : 'Simulation Engine'}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Banner for Human Approvals if any pending */}
        {pendingApprovalsCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-200">
                  {pendingApprovalsCount} Consequential Action{pendingApprovalsCount > 1 ? 's' : ''} Paused
                </span>
                <span className="text-xs text-amber-300/80 hidden sm:inline ml-1.5">
                  — Human confirmation required before modifying persistent data.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsApprovalsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 text-xs font-bold shrink-0 shadow-md transition-all"
            >
              Review Actions
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* AI Goal Planner Section */}
            <ChatPlanner
              onPlanSubmitted={handlePlanSubmitted}
              isLoading={isPlanning}
              lastResponse={lastResponse}
              onRefreshData={loadData}
            />

            {/* Productivity Analytics & AI Recommendations */}
            <AnalyticsCards stats={stats} recommendations={recommendations} />

            {/* Tasks Management & Kanban/Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    Command Tasks & Deadlines
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 border border-navy-800 text-cyan-300">
                      SQLite Persistent
                    </span>
                  </h3>
                  <button
                    onClick={loadData}
                    className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
                <TaskDashboard
                  tasks={tasks}
                  onToggleComplete={handleToggleComplete}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onCreateTask={handleCreateTask}
                />
              </div>

              {/* Side Live Activity Timeline Widget */}
              <div className="lg:col-span-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Live MCP Timeline
                  </h3>
                </div>
                <ActivityPanel logs={logs.slice(0, 10)} onRefresh={loadData} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: MCP Inspector View */}
        {activeTab === 'inspector' && (
          <div className="animate-in fade-in duration-300">
            <MCPInspector
              tools={tools}
              logs={logs}
              onExecuteTool={handleExecuteTool}
            />
          </div>
        )}

        {/* Tab 3: Dedicated Full Activity Timeline View */}
        {activeTab === 'activity' && (
          <div className="animate-in fade-in duration-300">
            <ActivityPanel logs={logs} onRefresh={loadData} />
          </div>
        )}
      </main>

      {/* Human Approvals Modal */}
      <ApprovalModal
        approvals={approvals}
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        onRespond={handleRespondApproval}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        model={model}
        onSaveModel={handleSaveModel}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-navy-900 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">LifePilot AI</span>
            <span>—</span>
            <span>Personal AI Command Center powered by Model Context Protocol (MCP)</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Python MCP SDK • SQLite WAL • FastAPI • React + Vite
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
