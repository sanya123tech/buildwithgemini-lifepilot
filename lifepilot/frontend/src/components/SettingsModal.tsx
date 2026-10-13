import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  Cpu, 
  Database, 
  X, 
  Check, 
  Info, 
  ShieldCheck,
  Server
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  model: string;
  onSaveModel: (model: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  model,
  onSaveModel
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState(model);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(keyInput.trim());
    onSaveModel(selectedModel);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleClearKey = () => {
    setKeyInput('');
    onSaveApiKey('');
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="glass-panel-glow w-full max-w-lg rounded-2xl p-6 border border-cyan-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-navy-800 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Command Center Settings
              </h3>
              <p className="text-xs text-slate-400">
                Configure LLM Providers, Model Context Protocol parameters, and Storage.
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

        <form onSubmit={handleSave} className="space-y-4">
          {/* Gemini API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              Google Gemini API Key (Optional)
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-navy-950 border border-navy-750 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              If left blank, LifePilot seamlessly operates in <strong className="text-violet-300">Autonomous Simulation Mode</strong> with full MCP tool calling & SQLite persistence.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              Gemini Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-navy-950 border border-navy-750 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Recommended)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>

          {/* System Specs Info Box */}
          <div className="p-3.5 rounded-xl bg-navy-950/80 border border-navy-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Server className="w-3.5 h-3.5 text-cyan-400" /> MCP Protocol:
              </span>
              <span className="text-emerald-400">mcp-2.3.0 (Active)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Database className="w-3.5 h-3.5 text-cyan-400" /> Persistent Storage:
              </span>
              <span className="text-slate-300">SQLite (WAL Mode)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Consequential Guard:
              </span>
              <span className="text-amber-300">Human Approval Gate Enabled</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-navy-800">
            {keyInput ? (
              <button
                type="button"
                onClick={handleClearKey}
                className="text-xs text-slate-400 hover:text-red-300"
              >
                Clear Key (Use Simulation)
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-navy-900 border border-navy-750 text-slate-300 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-semibold shadow-md shadow-cyan-500/20"
              >
                {savedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Settings</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
