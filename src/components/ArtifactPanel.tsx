import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Play,
  Copy,
  Check,
  Download,
  Code2,
  Eye,
  RefreshCw,
  GitCompare,
  Edit3,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  ArrowUp,
  Share2,
  Lock,
  ArrowLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Artifact } from '../types.ts';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
  onUpdateArtifact: (updated: Artifact) => void;
  onRequestChange?: (changePrompt: string) => void;
  isAiGenerating?: boolean;
  initialPlatform?: 'mobile' | 'web';
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
  onClose,
  onUpdateArtifact,
  onRequestChange,
  isAiGenerating = false,
  initialPlatform = 'mobile',
}) => {
  if (!artifact) return null;

  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'console' | 'diff'>(
    artifact.type === 'html' ? 'preview' : 'editor'
  );
  // Default to immersive full-screen view for all generated apps/simulations
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(artifact.content);

  // Device simulation viewport mode: 'fullscreen' edge-to-edge, 'mobile' device frame, 'tablet', 'desktop'
  const [deviceMode, setDeviceMode] = useState<'fullscreen' | 'mobile' | 'tablet' | 'desktop'>(
    'fullscreen'
  );

  const [iframeKey, setIframeKey] = useState(0);

  // In-preview AI change prompt bar
  const [changePrompt, setChangePrompt] = useState('');
  const [showPromptBar, setShowPromptBar] = useState(false);

  // App Slug and Real-Life Public Link
  const [appSlug, setAppSlug] = useState('');
  const [realLinkUrl, setRealLinkUrl] = useState('');

  // Compute and publish real-life link
  useEffect(() => {
    const slug =
      (artifact.title || 'app')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'app';
    setAppSlug(slug);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/s/${slug}`;
    setRealLinkUrl(fullUrl);

    // Auto-publish to backend storage
    fetch('/api/publish-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: artifact.id,
        slug,
        title: artifact.title,
        content: artifact.content,
        type: artifact.type,
      }),
    }).catch((e) => console.warn('Could not auto-publish app link:', e));
  }, [artifact.id, artifact.title, artifact.content, artifact.type]);

  // Sync content when artifact changes
  useEffect(() => {
    setEditableContent(artifact.content);
    setConsoleOutput(null);
    setIframeKey((prev) => prev + 1);
    if (artifact.type === 'html') {
      setActiveTab('preview');
    }
  }, [artifact.id, artifact.content, artifact.type]);

  const [envVersion, setEnvVersion] = useState(0);

  useEffect(() => {
    const handleEnvUpdate = () => {
      setEnvVersion((prev) => prev + 1);
      setIframeKey((prev) => prev + 1);
    };
    window.addEventListener('custom-env-updated', handleEnvUpdate);
    return () => window.removeEventListener('custom-env-updated', handleEnvUpdate);
  }, []);

  // Prepare preview HTML with injected user API keys, Tailwind CDN, Lucide icons, and responsive viewport
  const previewHtml = React.useMemo(() => {
    if (artifact.type !== 'html') return editableContent;
    let cleanCode = editableContent.trim();

    // Strip any accidental markdown fences (e.g. ```html ... ```)
    if (cleanCode.startsWith('```')) {
      cleanCode = cleanCode
        .replace(/^```[a-z0-9_-]*\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
    }

    const customEnvMap: Record<string, string> = {};
    try {
      const saved = localStorage.getItem('vercel_ai_custom_env_vars');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (
              item &&
              typeof item.key === 'string' &&
              item.value &&
              !['GEMINI_API_KEY', 'NODE_ENV', 'PORT'].includes(item.key)
            ) {
              customEnvMap[item.key] = item.value;
            }
          });
        }
      }
    } catch (e) {
      console.warn('Could not read custom env vars for preview:', e);
    }

    const envScript = `<script>
  window.ENV = Object.assign({}, window.ENV || {}, ${JSON.stringify(customEnvMap)});
  window.process = window.process || {};
  window.process.env = Object.assign({}, window.process.env || {}, window.ENV);
</script>`;

    const is3D =
      cleanCode.includes('THREE') ||
      cleanCode.includes('three.js') ||
      cleanCode.includes('three.min.js') ||
      cleanCode.includes('WebGLRenderer');

    const threeCdn = is3D
      ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>`
      : '';

    const tailwindCdn = `<script src="https://cdn.tailwindcss.com"></script>`;
    const fontHead = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;
    const lucideScript = `<script src="https://unpkg.com/lucide@latest"></script>`;
    const baseStyle = `<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    min-height: 100%;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  canvas {
    display: block;
    width: 100vw !important;
    height: 100vh !important;
  }
</style>`;

    const hasDoctype =
      cleanCode.toLowerCase().includes('<!doctype') ||
      cleanCode.toLowerCase().includes('<html');

    if (hasDoctype) {
      let result = cleanCode;
      if (!result.includes('tailwindcss.com')) {
        result = result.replace(
          '<head>',
          `<head>\n  ${tailwindCdn}\n  ${fontHead}\n  ${threeCdn}\n  ${lucideScript}\n  ${baseStyle}`
        );
      } else if (is3D && !result.includes('three.min.js') && !result.includes('three.js')) {
        result = result.replace('<head>', `<head>\n  ${threeCdn}`);
      }
      if (result.includes('<head>')) {
        result = result.replace('<head>', `<head>\n  ${envScript}`);
      } else {
        result = `${envScript}\n${result}`;
      }
      if (!result.includes('lucide.createIcons')) {
        result = result.replace(
          '</body>',
          `<script>if(window.lucide){window.lucide.createIcons();}</script>\n</body>`
        );
      }
      return result;
    }

    // Wrap component fragment into a complete production-grade HTML document
    return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>${artifact.title || 'Live App'}</title>
  ${tailwindCdn}
  ${fontHead}
  ${threeCdn}
  ${lucideScript}
  ${baseStyle}
  ${envScript}
</head>
<body class="bg-white text-neutral-900 antialiased h-full min-h-screen">
  ${cleanCode}
  <script>
    function initIcons() {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initIcons);
    } else {
      initIcons();
    }
    setTimeout(initIcons, 400);
    setTimeout(initIcons, 1200);
  </script>
</body>
</html>`;
  }, [editableContent, artifact.type, artifact.title, iframeKey, envVersion]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const url = realLinkUrl || window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareApp = async () => {
    const url = realLinkUrl || window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: artifact.title || 'AI BuildCraft App',
          text: `Check out this app built with AI BuildCraft: ${artifact.title}`,
          url,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }
    handleCopyLink();
  };

  const handleOpenInNewTab = () => {
    window.open(`/s/${appSlug}`, '_blank');
  };

  const handleDownload = () => {
    let extension = 'html';
    if (artifact.language) {
      const extMap: Record<string, string> = {
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        html: 'html',
        css: 'css',
        markdown: 'md',
        csv: 'csv',
        json: 'json',
      };
      extension = extMap[artifact.language] || artifact.language;
    } else if (artifact.type === 'sheet') {
      extension = 'csv';
    }

    const filename = `${appSlug || 'artifact'}.${extension}`;
    const blob = new Blob([editableContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveTab('console');
    setConsoleOutput('Executing program...\n');

    try {
      const res = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: artifact.language || 'python',
          code: editableContent,
        }),
      });

      const data = await res.json();
      if (data.output) {
        setConsoleOutput(data.output);
      } else if (data.error) {
        setConsoleOutput(`Error: ${data.error}`);
      } else {
        setConsoleOutput('Program finished without output.');
      }
    } catch (err: any) {
      setConsoleOutput(`Execution failed: ${err.message || 'Network error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveEdit = () => {
    const updated: Artifact = {
      ...artifact,
      content: editableContent,
      versions: [...artifact.versions, editableContent],
      activeVersionIndex: artifact.versions.length,
    };
    onUpdateArtifact(updated);
    setIsEditing(false);

    // Update published version
    fetch('/api/publish-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: updated.id,
        slug: appSlug,
        title: updated.title,
        content: editableContent,
        type: updated.type,
      }),
    }).catch(() => {});
  };

  const handleSendLiveChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePrompt.trim() || isAiGenerating || !onRequestChange) return;

    const fullPrompt = `Please update the current ${artifact.type} artifact "${artifact.title}". Specific change requested: ${changePrompt.trim()}. Output the complete revised artifact so the preview updates live.`;
    onRequestChange(fullPrompt);
    setChangePrompt('');
  };

  return (
    <div
      className={`fixed inset-0 z-50 w-screen h-dvh bg-neutral-950 flex flex-col overflow-hidden animate-in fade-in duration-200 select-none`}
    >
      {/* =========================================================================
          FLOATING AI BADGE & CONTROL MENU (Top Right)
          Fixed to the top-right corner of the full-screen preview view
          ========================================================================= */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-50 select-none">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="group relative flex items-center gap-2 p-1.5 sm:p-2 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-700/90 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer touch-manipulation"
          title="AI BuildCraft Control Menu"
        >
          <img
            src="/brand-logo.png"
            alt="AI BuildCraft"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
          />
          <span className="hidden sm:inline text-xs font-semibold text-neutral-800 dark:text-neutral-100 pr-1">
            Controls
          </span>
          {/* Subtle live indicator dot */}
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900 animate-pulse" />
        </button>

        {/* Dropdown Action Menu */}
        {isMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setIsMenuOpen(false)}
            />

            <div className="absolute right-0 mt-2.5 w-72 sm:w-80 rounded-3xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* App Info Header */}
              <div className="flex items-center gap-2.5 p-2 mb-2 border-b border-neutral-100 dark:border-neutral-800/80">
                <img
                  src="/brand-logo.png"
                  alt="AI BuildCraft"
                  className="w-6 h-6 object-contain shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {artifact.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Live Runner</span>
                    <span>•</span>
                    <span className="uppercase font-mono">{artifact.language || artifact.type}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Options */}
              <div className="space-y-1">
                {/* 1. Back to Chat */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 font-semibold text-xs transition-all active:scale-98 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  <span>Back to Chat</span>
                </button>

                {/* 2. Copy App Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                    ) : (
                      <Copy className="w-4 h-4 text-neutral-500" />
                    )}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy App Link'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 truncate max-w-[90px]">
                    /s/{appSlug}
                  </span>
                </button>

                {/* 3. Share App */}
                <button
                  type="button"
                  onClick={handleShareApp}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-neutral-500" />
                  <span>Share App</span>
                </button>

                {/* 4. Refresh Preview */}
                <button
                  type="button"
                  onClick={() => {
                    setIframeKey((k) => k + 1);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-neutral-500" />
                  <span>Refresh Preview</span>
                </button>

                {/* 5. View Code / Toggle Editor */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(activeTab === 'editor' ? 'preview' : 'editor');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-neutral-500" />
                  <span>{activeTab === 'editor' ? 'Back to Live Preview' : 'View / Edit Code'}</span>
                </button>

                {/* 6. Open in New Browser Tab */}
                <button
                  type="button"
                  onClick={() => {
                    handleOpenInNewTab();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-neutral-500" />
                  <span>Open Standalone Tab</span>
                </button>

                {/* 7. Download App File */}
                <button
                  type="button"
                  onClick={() => {
                    handleDownload();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-neutral-500" />
                  <span>Download File</span>
                </button>

                {/* 8. Toggle AI Prompt Bar */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPromptBar(!showPromptBar);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>{showPromptBar ? 'Hide AI Prompt Bar' : 'Live AI Prompt Bar'}</span>
                </button>
              </div>

              {/* Viewport Bounds Switcher */}
              <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] px-1 text-neutral-500">
                <span>Layout bounds:</span>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <button
                    type="button"
                    onClick={() => setDeviceMode('fullscreen')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                      deviceMode === 'fullscreen'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Full
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode('mobile')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                      deviceMode === 'mobile'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode('tablet')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                      deviceMode === 'tablet'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Tablet
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          MAIN IMMERSIVE FULL-SCREEN VIEWPORT
          Properly sizing heights and layout bounds without device-frame clutters
          ========================================================================= */}
      <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col bg-white dark:bg-neutral-950">
        {activeTab === 'preview' && artifact.type === 'html' ? (
          deviceMode === 'fullscreen' ? (
            /* Immersive Edge-to-Edge Full-Screen Runner */
            <div className="w-full h-full flex flex-col overflow-hidden bg-white">
              <iframe
                key={iframeKey}
                title={artifact.title || 'Interactive App Preview'}
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                className="w-full h-full flex-1 border-0 bg-white"
              />
            </div>
          ) : (
            /* Simulated Mobile or Tablet Device Frame on larger screens */
            <div className="w-full h-full flex items-center justify-center p-3 sm:p-6 bg-neutral-950 overflow-hidden">
              <div
                className={`w-full h-full bg-white rounded-[36px] shadow-2xl overflow-hidden border-[6px] border-neutral-800 flex flex-col relative transition-all duration-300 ${
                  deviceMode === 'mobile'
                    ? 'max-w-[400px] max-h-[840px]'
                    : 'max-w-[768px] max-h-[920px]'
                }`}
              >
                <iframe
                  key={iframeKey}
                  title={artifact.title || 'Interactive App Preview'}
                  srcDoc={previewHtml}
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className="w-full flex-1 border-0 bg-white"
                />
              </div>
            </div>
          )
        ) : activeTab === 'editor' ? (
          /* Code Drawer / Editor Mode */
          <div className="w-full h-full flex flex-col bg-[#0d1117] text-neutral-200">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/80">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold">{artifact.title} (Source Code)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Return to Preview</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
              {isEditing ? (
                <textarea
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full h-full p-2 bg-transparent text-neutral-100 font-mono resize-none focus:outline-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="whitespace-pre-wrap select-text">{editableContent}</pre>
              )}
            </div>
          </div>
        ) : (
          /* Other formats (Console / Diff) */
          <div className="w-full h-full flex flex-col bg-neutral-950 p-4 font-mono text-xs text-neutral-200 overflow-auto">
            <pre className="whitespace-pre-wrap">{consoleOutput || editableContent}</pre>
          </div>
        )}

        {/* Live In-Preview AI Prompt Bar (when toggled on) */}
        {onRequestChange && showPromptBar && (
          <div className="absolute bottom-5 left-4 right-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom-3 duration-200">
            <form
              onSubmit={handleSendLiveChange}
              className="flex items-center gap-2 p-1.5 pl-3.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl border border-neutral-200/90 dark:border-neutral-700/90 shadow-2xl"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              <input
                type="text"
                value={changePrompt}
                onChange={(e) => setChangePrompt(e.target.value)}
                disabled={isAiGenerating}
                placeholder="Ask AI to update the app live (e.g. 'add dark mode', 'change colors')..."
                className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                disabled={!changePrompt.trim() || isAiGenerating}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  changePrompt.trim() && !isAiGenerating
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                }`}
                title="Send update"
              >
                {isAiGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
