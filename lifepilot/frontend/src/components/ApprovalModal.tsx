import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Check, 
  X, 
  Terminal, 
  AlertTriangle, 
  Loader2,
  Clock
} from 'lucide-react';
import { Approval } from '../types';

interface ApprovalModalProps {
  approvals: Approval[];
  isOpen: boolean;
  onClose: () => void;
  onRespond: (approvalId: string, action: 'approve' | 'reject') => Promise<void>;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  approvals,
  isOpen,
  onClose,
  onRespond
}) => {
  const [respondingId, setRespondingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const pendingList = approvals.filter((a) => a.status === 'pending');

  const handleAction = async (approvalId: string, action: 'approve' | 'reject') => {
    setRespondingId(approvalId);
    try {
      await onRespond(approvalId, action);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="glass-panel-glow w-full max-w-xl rounded-2xl p-6 border border-amber-500/50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-navy-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Human-in-the-Loop Confirmation Required
              </h2>
              <p className="text-xs text-slate-400">
                LifePilot AI requires explicit user approval before executing consequential actions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Approvals List */}
        {pendingList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            No pending consequential action requests. All systems clear.
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {pendingList.map((appr) => {
              const isWorking = respondingId === appr.id;
              const argsObj = typeof appr.arguments === 'string' ? JSON.parse(appr.arguments || '{}') : appr.arguments;

              return (
                <div
                  key={appr.id}
                  className="p-4 rounded-xl bg-navy-950/90 border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      Tool: {appr.tool_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(appr.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-xs text-amber-200/90 font-medium bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-lg">
                    {appr.reason}
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block mb-1">
                      Target Arguments / Payload:
                    </span>
                    <pre className="p-2.5 rounded-lg bg-navy-900 border border-navy-800 text-[11px] font-mono text-slate-200 overflow-x-auto">
                      {JSON.stringify(argsObj, null, 2)}
                    </pre>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-navy-800/80">
                    <button
                      onClick={() => handleAction(appr.id, 'reject')}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-700/60 text-red-300 text-xs font-semibold disabled:opacity-50 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Action</span>
                    </button>
                    <button
                      onClick={() => handleAction(appr.id, 'approve')}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                    >
                      {isWorking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing via MCP...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Execute</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-navy-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-navy-900 border border-navy-750 text-slate-300 hover:text-white text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
