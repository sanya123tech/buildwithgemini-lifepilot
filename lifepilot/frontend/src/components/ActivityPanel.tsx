import React, { useState } from 'react';
import { 
  Activity, 
  Terminal, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  RefreshCw,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { MCPLog } from '../types';

interface ActivityPanelProps {
  logs: MCPLog[];
  onRefresh: () => void;
  isStreaming?: boolean;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({
  logs,
  onRefresh,
  isStreaming = true
}) => {
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState<string>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Distinct tool names for filtering
  const distinctTools = Array.from(new Set(logs.map((l) => l.tool_name)));

  const filteredLogs = logs.filter((log) => {
    if (selectedTool !== 'all' && log.tool_name !== selectedTool) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const inName = log.tool_name.toLowerCase().includes(q);
      const inArgs = JSON.stringify(log.arguments).toLowerCase().includes(q);
      const inRes = JSON.stringify(log.result).toLowerCase().includes(q);
      if (!inName && !inArgs && !inRes) return false;
    }
    return true;
  });

  const getStatusBadge = (status: MCPLog['status'], requiresApproval: boolean) => {
    if (status === 'pending_approval' || requiresApproval) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-amber-300 text-[10px] font-mono font-semibold">
          <ShieldAlert className="w-3 h-3 text-amber-400" /> Pending Approval
        </span>
      );
    }
    if (status === 'success') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-[10px] font-mono font-semibold">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Success
        </span>
      );
    }
    if (status === 'failed' || status === 'rejected') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-600/50 text-red-300 text-[10px] font-mono font-semibold">
          <XCircle className="w-3 h-3 text-red-400" /> {status === 'rejected' ? 'Rejected' : 'Failed'}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/50 text-cyan-300 text-[10px] font-mono font-semibold">
        <Activity className="w-3 h-3 text-cyan-400 animate-spin" /> Running
      </span>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-navy-800 shadow-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-navy-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              MCP Activity Timeline & Execution Audit
              {isStreaming && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live SSE
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Real-time audit log of tools called over the Model Context Protocol stdio transport.
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            className="bg-navy-900 border border-navy-750 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Tools ({logs.length})</option>
            {distinctTools.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-40">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search traces..."
              className="w-full bg-navy-900 border border-navy-750 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-xl bg-navy-900 border border-navy-750 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No MCP tool execution traces recorded yet. Enter a goal above to trigger tools!
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = !!expandedLogIds[log.id];
            const parsedArgs = typeof log.arguments === 'string' ? JSON.parse(log.arguments || '{}') : log.arguments;
            const parsedRes = typeof log.result === 'string' ? JSON.parse(log.result || '{}') : log.result;

            return (
              <div
                key={log.id}
                className="rounded-xl bg-navy-900/80 border border-navy-750 hover:border-navy-700 transition-all p-3.5 shadow-sm"
              >
                {/* Log summary row */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1.5 rounded-lg bg-navy-950 border border-navy-800 text-cyan-400 font-mono text-xs font-semibold">
                      {log.tool_name}
                    </span>
                    {getStatusBadge(log.status, log.requires_approval)}
                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      {log.execution_time_ms > 0 ? `${log.execution_time_ms}ms` : 'gated'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Arguments & Result Inspector */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-navy-800 space-y-2.5 text-xs font-mono">
                    <div>
                      <div className="text-[11px] font-semibold text-cyan-400 mb-1 flex items-center gap-1">
                        <Terminal className="w-3 h-3" /> Input Arguments:
                      </div>
                      <pre className="p-2.5 rounded-lg bg-navy-950 border border-navy-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
                        {JSON.stringify(parsedArgs, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Execution Result / Output:
                      </div>
                      <pre className="p-2.5 rounded-lg bg-navy-950 border border-navy-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-56">
                        {JSON.stringify(parsedRes, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
