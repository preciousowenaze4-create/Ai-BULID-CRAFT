import React, { useState } from 'react';
import { X, Trash2, Check, RefreshCw, Cpu, Shield, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  onClearAllSessions: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  systemPrompt,
  onSaveSystemPrompt,
  onClearAllSessions,
}) => {
  if (!isOpen) return null;

  const [promptValue, setPromptValue] = useState(systemPrompt);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveSystemPrompt(promptValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Settings & Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs text-neutral-600 dark:text-neutral-400">
          {/* Custom System Instruction */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-neutral-900 dark:text-neutral-200">
                System Instructions
              </label>
              <span className="text-[10px] text-neutral-400">Custom persona & rules</span>
            </div>
            <textarea
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              rows={4}
              placeholder="Enter custom instructions for how the model should respond..."
              className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : null}
                <span>{saved ? 'Saved' : 'Save Instructions'}</span>
              </button>
            </div>
          </div>

          <div className="border-t border-neutral-200/80 dark:border-neutral-800/80 pt-4 space-y-3">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-200">
              Data & Conversations
            </h3>
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-200">
                  Delete All Chat History
                </div>
                <div className="text-[11px] text-neutral-400">
                  Permanently wipe local chat sessions and stored artifacts
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete all conversations?')) {
                    onClearAllSessions();
                    onClose();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* About Template Info */}
          <div className="border-t border-neutral-200/80 dark:border-neutral-800/80 pt-4 space-y-2">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-200">About</h3>
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1.5 leading-relaxed text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Vercel AI Chatbot
                </span>
                <span className="font-mono text-neutral-400">v3.1.0</span>
              </div>
              <p>
                Powered by the official Google GenAI SDK, with interactive code and document
                artifacts, multimodal vision, real-time streaming, and responsive Canvas editor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
