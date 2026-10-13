import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  Flame, 
  Zap, 
  Heart,
  ChevronRight
} from 'lucide-react';
import { ProductivityStats, AIRecommendation } from '../types';

interface AnalyticsCardsProps {
  stats: ProductivityStats;
  recommendations: AIRecommendation[];
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({
  stats,
  recommendations
}) => {
  const getRecommendationIcon = (type: AIRecommendation['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'priority':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'wellness':
        return <Heart className="w-4 h-4 text-emerald-400" />;
      default:
        return <Zap className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getRecommendationBadge = (type: AIRecommendation['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'priority':
        return 'bg-red-950/80 text-red-300 border-red-700/60';
      case 'wellness':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      default:
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Completion Rate */}
        <div className="glass-panel rounded-2xl p-4 border border-navy-800 shadow-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight mb-2">
            {stats.completion_rate_percentage}%
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden mb-1.5">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.completion_rate_percentage, 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {stats.completed_tasks} of {stats.total_tasks} tasks done
          </div>
        </div>

        {/* Card 2: Focus Hours */}
        <div className="glass-panel rounded-2xl p-4 border border-navy-800 shadow-md relative overflow-hidden group hover:border-violet-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Deep Work Focus</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight mb-2">
            {stats.completed_focus_hours}h
            <span className="text-xs text-slate-400 font-normal ml-1">
              / {stats.total_estimated_focus_hours}h
            </span>
          </div>
          <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden mb-1.5">
            <div
              className="bg-gradient-to-r from-violet-500 to-indigo-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  stats.total_estimated_focus_hours > 0
                    ? Math.min((stats.completed_focus_hours / stats.total_estimated_focus_hours) * 100, 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Structured focus time
          </div>
        </div>

        {/* Card 3: Due Today */}
        <div className="glass-panel rounded-2xl p-4 border border-navy-800 shadow-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Today's Targets</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight mb-2">
            {stats.due_today}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-3">
            {stats.pending_tasks} pending total
          </div>
        </div>

        {/* Card 4: Overdue Alert */}
        <div className="glass-panel rounded-2xl p-4 border border-navy-800 shadow-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Backlog & Overdue</span>
            <AlertTriangle className={`w-4 h-4 ${stats.overdue_tasks > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div
            className={`text-2xl font-extrabold tracking-tight mb-2 ${
              stats.overdue_tasks > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {stats.overdue_tasks}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-3">
            {stats.overdue_tasks === 0 ? 'All deadlines on track' : 'Attention recommended'}
          </div>
        </div>
      </div>

      {/* AI Recommendations Bar */}
      {recommendations.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-navy-800 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              AI Command Center Recommendations
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-navy-900/70 border border-navy-750 flex items-start gap-3 hover:border-navy-700 transition-all"
              >
                <div className="mt-0.5 shrink-0">{getRecommendationIcon(rec.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white">{rec.title}</span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${getRecommendationBadge(
                        rec.type
                      )}`}
                    >
                      {rec.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-1.5">{rec.message}</p>
                  <p className="text-[11px] text-cyan-300 font-medium flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-cyan-400" />
                    {rec.suggested_action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
