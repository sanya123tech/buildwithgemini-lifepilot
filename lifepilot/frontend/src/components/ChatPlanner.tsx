import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Wrench, 
  ArrowRight,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { ChatPlanResponse } from '../types';

interface ChatPlannerProps {
  onPlanSubmitted: (prompt: string) => Promise<ChatPlanResponse>;
  isLoading: boolean;
  lastResponse: ChatPlanResponse | null;
  onRefreshData: () => void;
}

const SUGGESTED_PROMPTS = [
  {
    title: 'AI Engineer Interview Prep (Demo)',
    prompt: 'Help me prepare for an AI Engineer interview in 7 days.',
    badge: '7-Day Curriculum'
  },
  {
    title: 'Vector DB & RAG Deep Dive',
    prompt: 'Plan a 3-day deep dive into Vector Databases, HNSW indexing, and RAG.',
    badge: '3-Day Plan'
  },
  {
    title: 'Schedule Deep Work Task',
    prompt: 'Schedule an urgent 90-minute architecture review session on MCP protocol for tomorrow.',
    badge: 'Action Task'
  },
  {
    title: 'Productivity Audit',
    prompt: 'Analyze my productivity statistics and generate actionable recommendations for my backlog.',
    badge: 'Analytics'
  }
];

export const ChatPlanner: React.FC<ChatPlannerProps> = ({
  onPlanSubmitted,
  isLoading,
  lastResponse,
  onRefreshData
}) => {
  const [prompt, setPrompt] = useState('');
  const [activeStepText, setActiveStepText] = useState<string>('');

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSubmit = (customPrompt || prompt).trim();
    if (!textToSubmit || isLoading) return;

    if (customPrompt) {
      setPrompt(customPrompt);
    }

    setActiveStepText('Analyzing goal with AI Planner...');
    const stepTimer1 = setTimeout(() => {
      setActiveStepText('Selecting and dispatching MCP tools via stdio IPC...');
    }, 400);

    const stepTimer2 = setTimeout(() => {
      setActiveStepText('Persisting tasks to SQLite database & compiling report...');
    }, 1100);

    try {
      await onPlanSubmitted(textToSubmit);
      onRefreshData();
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setActiveStepText('');
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-navy-800 shadow-xl relative overflow-hidden">
      {/* Decorative ambient glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Autonomous AI Goal Planner
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 border border-violet-700/50">
                MCP Tool Calling
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Enter any natural-language objective. LifePilot calls real MCP tools to decompose it, schedule tasks, and query live sources.
            </p>
          </div>
        </div>
      </div>

      {/* Prompt Form */}
      <form onSubmit={handleSubmit} className="relative mb-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Help me prepare for an AI Engineer interview in 7 days..."
            disabled={isLoading}
            className="w-full bg-navy-900/90 border border-navy-750 focus:border-cyan-500/80 rounded-xl px-4 py-3.5 pr-28 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium disabled:opacity-50"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Planning...</span>
                </>
              ) : (
                <>
                  <span>Execute</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          Suggested:
        </span>
        {SUGGESTED_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleSubmit(undefined, item.prompt)}
            className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-900/80 hover:bg-navy-800 border border-navy-800 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-cyan-200 transition-all text-left"
          >
            <span className="font-medium">{item.title}</span>
            <span className="text-[10px] text-slate-500 group-hover:text-cyan-400 font-mono">
              [{item.badge}]
            </span>
          </button>
        ))}
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="mt-4 p-4 rounded-xl bg-navy-900/90 border border-cyan-500/30 flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="text-xs font-semibold text-cyan-300">
              {activeStepText || 'MCP Orchestrator executing tools...'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Protocol: Model Context Protocol (v2.3.0) • Transport: stdio IPC
            </div>
          </div>
        </div>
      )}

      {/* Last Planner Response & Executed Tools Drawer */}
      {lastResponse && !isLoading && (
        <div className="mt-4 p-4 rounded-xl bg-navy-900/80 border border-navy-750">
          <div className="flex items-center justify-between border-b border-navy-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Plan Executed & Persisted
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-navy-700">
                {lastResponse.engine} ({lastResponse.model})
              </span>
            </div>
            {lastResponse.is_mock && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/50">
                Simulation Engine
              </span>
            )}
          </div>

          {/* Fallback warning if any */}
          {lastResponse.fallback_warning && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{lastResponse.fallback_warning}</span>
            </div>
          )}

          {/* AI Response Narrative */}
          <div className="text-xs text-slate-300 leading-relaxed space-y-1.5 whitespace-pre-line mb-3 font-normal">
            {lastResponse.reply}
          </div>

          {/* Tools Executed Summary Chips */}
          {lastResponse.executed_tools && lastResponse.executed_tools.length > 0 && (
            <div className="pt-2 border-t border-navy-800/80">
              <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                <span>MCP Tools Invoked in this Run ({lastResponse.executed_tools.length}):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lastResponse.executed_tools.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-750 text-xs font-mono text-slate-300"
                  >
                    <span className="text-cyan-400 font-semibold">{t.tool_name}</span>
                    <span className="text-[10px] text-slate-500">
                      {t.execution_time_ms}ms
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
