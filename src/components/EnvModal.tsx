import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  Copy,
  ClipboardPaste,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface EnvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

export const STORAGE_KEY_CUSTOM_ENV = 'vercel_ai_custom_env_vars';

// Helper to push synced environment variables to the backend context
async function syncSecretsToBackend(vars: EnvVar[]) {
  try {
    await fetch('/api/env/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envVars: vars }),
    });
  } catch (err) {
    console.warn('Backend env sync note:', err);
  }
}

export const EnvModal: React.FC<EnvModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Initialize and strictly sanitize environment variables:
  // Purge any internal system keys like GEMINI_API_KEY, NODE_ENV, PORT
  const [envVars, setEnvVars] = useState<EnvVar[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_ENV);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (v: any) =>
              v &&
              typeof v.key === 'string' &&
              !['GEMINI_API_KEY', 'NODE_ENV', 'PORT', 'APP_PLATFORM'].includes(
                v.key.trim().toUpperCase()
              )
          );
          localStorage.setItem(STORAGE_KEY_CUSTOM_ENV, JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Error reading stored env vars:', e);
    }
    return [];
  });

  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showNewValue, setShowNewValue] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(true);

  // Sync to localStorage and backend on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTOM_ENV, JSON.stringify(envVars));
    syncSecretsToBackend(envVars).then(() => {
      setIsSynced(true);
    });
    // Dispatch event so active preview iframes and components update live
    window.dispatchEvent(new CustomEvent('custom-env-updated', { detail: { envVars } }));
  }, [envVars]);

  const toggleShow = (key: string) => {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setNewValue(text.trim());
        setPasteError(null);
      }
    } catch {
      setPasteError('Clipboard permission not granted. Please paste manually into the field.');
      setTimeout(() => setPasteError(null), 3000);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    // Clean up variable name: uppercase, alphanumeric and underscores only
    const cleanKey = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    setIsSynced(false);
    setEnvVars((prev) => {
      const filtered = prev.filter((v) => v.key !== cleanKey);
      return [
        ...filtered,
        {
          key: cleanKey,
          value: newValue.trim(),
          isSecret: true,
        },
      ];
    });

    setNewKey('');
    setNewValue('');
    setShowNewValue(false);
  };

  const handleDelete = (key: string) => {
    setIsSynced(false);
    setEnvVars((prev) => prev.filter((v) => v.key !== key));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90dvh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  App Secrets & API Keys (Env)
                </h2>
                {isSynced && envVars.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Synced
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Custom secrets are securely injected into your apps and backend context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice Banner */}
        <div className="px-5 py-2.5 bg-neutral-100/60 dark:bg-neutral-950/40 border-b border-neutral-200 dark:border-neutral-800/80 flex items-start gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">Dynamic Injection:</span> Saved secrets are dynamically available in generated apps via <code className="font-mono text-[10px] bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">window.ENV.KEY_NAME</code> and in backend API execution context.
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* List of User's Configured API Keys */}
          {envVars.length === 0 ? (
            <div className="py-8 px-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center bg-neutral-50/50 dark:bg-neutral-950/40">
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                No Secrets Configured
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Add any custom API key or environment variable below. Your built apps can access them dynamically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
                Configured Secrets ({envVars.length})
              </div>
              {envVars.map((item) => {
                const isVisible = showValues[item.key] || false;
                // Badge initials from key name (e.g. SUPABASE_KEY -> SU)
                const badgeText = item.key.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-center font-mono font-bold text-[10px] text-neutral-700 dark:text-neutral-300 shrink-0">
                        {badgeText}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs truncate">
                            {item.key}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 truncate block mt-0.5">
                          {isVisible
                            ? item.value || '(empty)'
                            : '••••••••••••••••••••••••••••••••'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleShow(item.key)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                        title={isVisible ? 'Hide secret' : 'Reveal secret'}
                      >
                        {isVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(item.key, item.value)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                        title="Copy key value"
                      >
                        {copiedKey === item.key ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.key)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-neutral-400 hover:text-rose-500 transition-colors"
                        title="Delete variable"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clean Add API Key Form */}
          <form
            onSubmit={handleAdd}
            className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Add Secret</span>
              </span>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Paste from clipboard into value"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Paste from Clipboard</span>
              </button>
            </div>

            {pasteError && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400">
                {pasteError}
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Key Name / Variable
                </label>
                <input
                  type="text"
                  placeholder="e.g. API_KEY, DATABASE_URL, STRIPE_SECRET"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-neutral-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  API Key / Secret Value
                </label>
                <div className="relative">
                  <input
                    type={showNewValue ? 'text' : 'password'}
                    placeholder="Paste secret or API key here..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-neutral-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewValue(!showNewValue)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    title={showNewValue ? 'Hide' : 'Show'}
                  >
                    {showNewValue ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!newKey.trim() || !newValue.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save API Key</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
