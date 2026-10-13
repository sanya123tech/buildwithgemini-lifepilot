import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  AlertTriangle,
  Flame,
  Check,
  X
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types';

interface TaskDashboardProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
  onCreateTask: (task: Partial<Task>) => void;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  tasks,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onCreateTask
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Task>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'Work',
    estimated_minutes: 30,
    due_date: new Date().toISOString().split('T')[0]
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (statusFilter === 'today') {
      if (task.due_date !== todayStr || task.status === 'completed') return false;
    } else if (statusFilter === 'pending') {
      if (task.status !== 'pending') return false;
    } else if (statusFilter === 'in_progress') {
      if (task.status !== 'in_progress') return false;
    } else if (statusFilter === 'completed') {
      if (task.status !== 'completed') return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchCat = task.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }

    return true;
  });

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      estimated_minutes: task.estimated_minutes,
      due_date: task.due_date
    });
  };

  const handleSaveEdit = (taskId: string) => {
    onUpdateTask(taskId, editFormData);
    setEditingTaskId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title?.trim()) return;
    onCreateTask(newTaskData);
    setIsAddModalOpen(false);
    setNewTaskData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'Work',
      estimated_minutes: 30,
      due_date: todayStr
    });
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-700/60 text-red-300 text-[10px] font-mono font-semibold uppercase">
            <Flame className="w-3 h-3 text-red-400" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[10px] font-mono font-semibold uppercase">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-[10px] font-mono font-semibold uppercase">
            Med
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-750 text-slate-400 text-[10px] font-mono uppercase">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'today'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            Due Today
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'pending'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'completed'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Priority & Search & Add Button */}
        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-navy-900 border border-navy-750 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-36 sm:w-48 bg-navy-900 border border-navy-750 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Add Task Modal Trigger */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-200 text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center border border-navy-800">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">
              No tasks found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Use the AI Goal Planner above to generate a curriculum or add tasks manually.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isEditing = editingTaskId === task.id;
            const isCompleted = task.status === 'completed';
            const isOverdue = task.due_date && task.due_date < todayStr && !isCompleted;
            const isDueToday = task.due_date === todayStr && !isCompleted;

            return (
              <div
                key={task.id}
                className={`group glass-panel rounded-xl p-3.5 border transition-all duration-200 ${
                  isCompleted
                    ? 'border-navy-850 bg-navy-950/40 opacity-75'
                    : 'border-navy-800 hover:border-cyan-500/40 hover:bg-navy-850/60 shadow-sm'
                }`}
              >
                {isEditing ? (
                  /* Inline Edit Form */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editFormData.title || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      className="w-full bg-navy-900 border border-cyan-500/60 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <textarea
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder="Description..."
                      className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none h-16"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={editFormData.priority}
                        onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as TaskPriority })}
                        className="bg-navy-900 border border-navy-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <input
                        type="date"
                        value={editFormData.due_date || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                        className="bg-navy-900 border border-navy-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                      />
                      <input
                        type="number"
                        value={editFormData.estimated_minutes || 30}
                        onChange={(e) => setEditFormData({ ...editFormData, estimated_minutes: parseInt(e.target.value) || 30 })}
                        className="w-20 bg-navy-900 border border-navy-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                        placeholder="Minutes"
                      />
                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          onClick={() => handleSaveEdit(task.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Task Row */
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    {/* Left: Checkbox & Title */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => onToggleComplete(task)}
                        className="mt-0.5 sm:mt-0 text-slate-400 hover:text-cyan-400 transition-colors shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500 hover:border-cyan-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold transition-all truncate ${
                              isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                            }`}
                          >
                            {task.title}
                          </span>
                          {getPriorityBadge(task.priority)}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 border border-navy-800 text-slate-400">
                            {task.category}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Badges & Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Due date tag */}
                      {task.due_date && (
                        <div
                          className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded ${
                            isOverdue
                              ? 'bg-red-950/60 text-red-300 border border-red-800/50'
                              : isDueToday
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                              : 'text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{isDueToday ? 'Today' : task.due_date}</span>
                        </div>
                      )}

                      {/* Estimated time */}
                      <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{task.estimated_minutes}m</span>
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEdit(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-navy-800 transition-colors"
                        title="Edit task"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button (Triggers MCP consequential action workflow) */}
                      <button
                        onClick={() => onDeleteTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        title="Delete task (Requires confirmation)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel-glow w-full max-w-md rounded-2xl p-6 border border-cyan-500/40 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Create New Action Task
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Transformer Multi-Head Attention"
                  value={newTaskData.title || ''}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  className="w-full bg-navy-900 border border-navy-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Key concepts, notes, or objectives..."
                  value={newTaskData.description || ''}
                  onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  className="w-full bg-navy-900 border border-navy-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskData.priority}
                    onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value as TaskPriority })}
                    className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newTaskData.category || 'General'}
                    onChange={(e) => setNewTaskData({ ...newTaskData, category: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskData.due_date || todayStr}
                    onChange={(e) => setNewTaskData({ ...newTaskData, due_date: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estimated Minutes
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={newTaskData.estimated_minutes || 30}
                    onChange={(e) => setNewTaskData({ ...newTaskData, estimated_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-semibold shadow-md shadow-cyan-500/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
