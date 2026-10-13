import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Cpu, 
  Clock, 
  Layers, 
  Loader2,
  FileCode,
  Info,
  Send
} from 'lucide-react';
import { MCPTool, MCPLog } from '../types';

interface MCPInspectorProps {
  tools: MCPTool[];
  logs: MCPLog[];
  onExecuteTool: (toolName: string, args: Record<string, any>) => Promise<any>;
}

export const MCPInspector: React.FC<MCPInspectorProps> = ({
  tools,
  logs,
  onExecuteTool
}) => {
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(tools[0] || null);
  const [paramInputs, setParamInputs] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<any | null>(null);

  const handleSelectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setLastExecutionResult(null);
    
    // Set default parameter values
    const initialInputs: Record<string, string> = {};
    const props = tool.input_schema?.properties || {};
    for (const [key, prop] of Object.entries(props)) {
      if (key === 'title') initialInputs[key] = 'Practice Attention Math';
      else if (key === 'topic') initialInputs[key] = 'AI Engineer Interview Prep';
      else if (key === 'query') initialInputs[key] = 'Model Context Protocol architecture';
      else if (key === 'duration_days') initialInputs[key] = '7';
      else if (key === 'priority') initialInputs[key] = 'high';
      else if (key === 'estimated_minutes') initialInputs[key] = '45';
      else if (key === 'task_id') initialInputs[key] = 'task_demo';
      else if (key === 'num_results') initialInputs[key] = '3';
      else initialInputs[key] = '';
    }
    setParamInputs(initialInputs);
  };

  const handleExecute = async () => {
    if (!selectedTool || isExecuting) return;
    setIsExecuting(true);
    setLastExecutionResult(null);

    // Build casted arguments
    const args: Record<string, any> = {};
    const props = selectedTool.input_schema?.properties || {};

    for (const [key, val] of Object.entries(paramInputs)) {
      if (!val && !selectedTool.input_schema?.required?.includes(key)) continue;
      const propType = props[key]?.type;
      if (propType === 'integer') {
        args[key] = parseInt(val) || 0;
      } else if (propType === 'number') {
        args[key] = parseFloat(val) || 0.0;
      } else if (propType === 'boolean') {
        args[key] = val === 'true' || val === '1';
      } else {
        args[key] = val;
      }
    }

    try {
      const res = await onExecuteTool(selectedTool.name, args);
      setLastExecutionResult(res);
    } catch (err: any) {
      setLastExecutionResult({ error: err.message || 'Execution error' });
    } finally {
      setIsExecuting(false);
    }
  };

  const activeProps = selectedTool?.input_schema?.properties || {};

  return (
    <div className="space-y-6">
      {/* Top Banner: Protocol Specs */}
      <div className="glass-panel rounded-2xl p-4 border border-navy-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Model Context Protocol (MCP) Live Inspector
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Connected
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Direct introspection of tools exposed by <code className="text-cyan-300 font-mono">lifepilot-mcp-server</code> via official Python MCP SDK.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div>
            <span className="text-slate-500">Transport: </span>
            <span className="text-cyan-300">stdio IPC</span>
          </div>
          <div>
            <span className="text-slate-500">SDK: </span>
            <span className="text-cyan-300">mcp-2.3.0</span>
          </div>
          <div>
            <span className="text-slate-500">Registered Tools: </span>
            <span className="text-emerald-400 font-bold">{tools.length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Tools List & Interactive Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tool Catalog */}
        <div className="lg:col-span-5 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Exposed MCP Tools ({tools.length})
          </h3>
          <div className="space-y-2">
            {tools.map((tool) => {
              const isSelected = selectedTool?.name === tool.name;
              return (
                <div
                  key={tool.name}
                  onClick={() => handleSelectTool(tool)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-navy-850 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                      : 'bg-navy-900/60 border-navy-800 hover:border-navy-700 hover:bg-navy-850/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      {tool.name}
                    </span>
                    {tool.consequential ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60">
                        <ShieldAlert className="w-3 h-3 text-amber-400" /> Consequential
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-950 text-slate-400 border border-navy-800">
                        Standard
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Schema & Live Execution Playground */}
        <div className="lg:col-span-7">
          {selectedTool ? (
            <div className="glass-panel rounded-2xl p-5 border border-navy-800 shadow-xl space-y-4">
              {/* Tool Header */}
              <div className="flex items-start justify-between gap-3 border-b border-navy-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">
                      {selectedTool.name}
                    </h3>
                    {selectedTool.consequential && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                        Gated by Human Approval
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedTool.description}
                  </p>
                </div>
              </div>

              {/* Consequential Notice */}
              {selectedTool.consequential && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold">Consequential Action Safeguard: </span>
                    Executing this tool triggers a pause and requests explicit confirmation in the Human Approvals Center.
                  </div>
                </div>
              )}

              {/* Parameter Inputs */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Input Schema & Test Parameters
                </h4>

                {Object.keys(activeProps).length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-navy-950">
                    No arguments required for this tool.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(activeProps).map(([propName, propDef]) => {
                      const isRequired = selectedTool.input_schema?.required?.includes(propName);
                      return (
                        <div key={propName}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-mono text-cyan-300 font-semibold">
                              {propName}
                              {isRequired && <span className="text-red-400 ml-0.5">*</span>}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {propDef.type || 'string'}
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder={propDef.description || propName}
                            value={paramInputs[propName] || ''}
                            onChange={(e) =>
                              setParamInputs({ ...paramInputs, [propName]: e.target.value })
                            }
                            className="w-full bg-navy-950 border border-navy-750 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Execution Trigger */}
              <div className="pt-2">
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Protocol Request over stdio...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute Tool via MCP</span>
                    </>
                  )}
                </button>
              </div>

              {/* Execution Result Box */}
              {lastExecutionResult && (
                <div className="pt-3 border-t border-navy-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      {lastExecutionResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-400" />
                      )}
                      MCP Response Payload
                    </span>
                    {lastExecutionResult.execution_time_ms && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {lastExecutionResult.execution_time_ms}ms
                      </span>
                    )}
                  </div>
                  <pre className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-64">
                    {JSON.stringify(lastExecutionResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select a tool on the left to inspect its parameters and run tests.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
