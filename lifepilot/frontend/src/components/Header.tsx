import React from 'react';
import { 
  Bot, 
  Terminal, 
  Cpu, 
  ShieldAlert, 
  Settings, 
  Activity, 
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'inspector' | 'activity';
  setActiveTab: (tab: 'dashboard' | 'inspector' | 'activity') => void;
  pendingApprovalsCount: number;
  onOpenApprovals: () => void;
  onOpenSettings: () => void;
  isMockMode: boolean;
  engineName: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  onOpenApprovals,
  onOpenSettings,
  isMockMode,
  engineName,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-navy-950/80 backdrop-blur-xl border-b border-navy-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-navy-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                LifePilot AI
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold tracking-wider">
                v1.0 MCP
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Your Personal AI Command Center
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-navy-900/90 border border-navy-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-600/30 to-violet-600/30 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'inspector'
                ? 'bg-gradient-to-r from-cyan-600/30 to-violet-600/30 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>MCP Inspector</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'activity'
                ? 'bg-gradient-to-r from-cyan-600/30 to-violet-600/30 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Timeline</span>
          </button>
        </nav>

        {/* System Status Indicators & Actions */}
        <div className="flex items-center gap-2.5">
          {/* MCP Protocol Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-900 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>MCP Stdio IPC</span>
          </div>

          {/* AI Engine Status */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
              isMockMode
                ? 'bg-violet-950/40 border-violet-700/40 text-violet-300 hover:border-violet-500/60'
                : 'bg-cyan-950/40 border-cyan-700/40 text-cyan-300 hover:border-cyan-500/60'
            }`}
            title="Click to configure AI Engine API key"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{isMockMode ? 'Simulation Engine' : engineName}</span>
          </button>

          {/* Pending Approvals Alert Badge */}
          {pendingApprovalsCount > 0 ? (
            <button
              onClick={onOpenApprovals}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold animate-pulse hover:bg-amber-500/30 transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{pendingApprovalsCount} Approval{pendingApprovalsCount > 1 ? 's' : ''}</span>
            </button>
          ) : (
            <button
              onClick={onOpenApprovals}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-900 border border-navy-800 text-slate-400 hover:text-slate-300 text-xs"
              title="No pending consequential action approvals"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Approvals Clear</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-navy-900 border border-navy-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
            title="Settings & API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
