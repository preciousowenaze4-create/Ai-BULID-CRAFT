import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Brain,
  Code2,
  FileCode,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Artifact } from '../types.ts';

interface ThinkingIndicatorProps {
  isLoading: boolean;
  isLast: boolean;
  isBuildRequest: boolean;
  timestamp: number;
  thinkingText?: string;
  thinkingTime?: number;
  artifacts?: Artifact[];
  messageContent?: string;
  userPrompt?: string;
  isOpenThinking: boolean;
  onToggleThinking: () => void;
}

interface BuildStepFile {
  path: string;
  label?: string;
  status: 'pending' | 'active' | 'completed';
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  isLoading,
  isLast,
  isBuildRequest,
  timestamp,
  thinkingText,
  thinkingTime,
  artifacts = [],
  messageContent = '',
  userPrompt = '',
  isOpenThinking,
  onToggleThinking,
}) => {
  const [elapsed, setElapsed] = useState(() => Math.max(0, (Date.now() - timestamp) / 1000));

  useEffect(() => {
    if (!isLoading || !isLast) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - timestamp) / 1000);
    }, 120);
    return () => clearInterval(interval);
  }, [isLoading, isLast, timestamp]);

  const isCompleted = !isLoading || !isLast;

  // Signal that AI has actually initiated the code writing/generation phase
  const hasStartedCoding = useMemo(() => {
    // Conversational chats never enter coding mode
    if (!isBuildRequest) return false;
    if (isCompleted) return true;

    // Real-time signal that code block or artifact writing has started
    const content = messageContent || '';
    const hasCodeSignal =
      (artifacts && artifacts.length > 0) ||
      content.includes(':::artifact') ||
      content.includes('```artifact') ||
      content.includes('```html') ||
      content.includes('```tsx') ||
      content.includes('```jsx') ||
      content.includes('```ts') ||
      content.includes('```js') ||
      content.includes('<!DOCTYPE') ||
      content.includes('<html');

    // Architecture planning window: at least 2.5 seconds of thinking before code generation panel
    return hasCodeSignal || elapsed >= 2.6;
  }, [isBuildRequest, isCompleted, messageContent, artifacts, elapsed]);

  // Extract actual files or build modules dynamically based on user prompt or generated artifacts
  const buildFiles: BuildStepFile[] = useMemo(() => {
    if (!isBuildRequest || !hasStartedCoding) return [];

    const fileList: string[] = [];

    // 1. Inspect artifacts for component names
    if (artifacts && artifacts.length > 0) {
      artifacts.forEach((art) => {
        const cleanTitle = art.title.replace(/[^a-zA-Z0-9]+/g, '');
        if (art.type === 'html') {
          fileList.push(`src/components/${cleanTitle || 'App'}.tsx`);
          fileList.push(`src/App.tsx`);
        } else {
          fileList.push(`src/lib/${cleanTitle || 'module'}.${art.language === 'python' ? 'py' : 'ts'}`);
          fileList.push(`src/App.tsx`);
        }
      });
    }

    // 2. Scan thinking text or message content for file paths
    const combinedText = `${thinkingText || ''} ${messageContent || ''}`;
    const pathMatches = combinedText.match(/\b(src\/[a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+)\b/g);
    if (pathMatches) {
      pathMatches.forEach((p) => {
        if (!fileList.includes(p)) {
          fileList.push(p);
        }
      });
    }

    // 3. Fallback dynamically tailored to the user's prompt
    if (fileList.length === 0) {
      const p = (userPrompt || '').toLowerCase();
      let mainComp = 'AppView.tsx';
      if (p.includes('todo')) mainComp = 'TodoList.tsx';
      else if (p.includes('calc')) mainComp = 'Calculator.tsx';
      else if (p.includes('weather')) mainComp = 'WeatherWidget.tsx';
      else if (p.includes('game')) mainComp = 'GameCanvas.tsx';
      else if (p.includes('chat')) mainComp = 'ChatInterface.tsx';
      else if (p.includes('track')) mainComp = 'Tracker.tsx';
      else if (p.includes('dash')) mainComp = 'Dashboard.tsx';
      else if (p.includes('note')) mainComp = 'NotesManager.tsx';
      else if (p.includes('timer')) mainComp = 'Timer.tsx';
      else if (p.includes('shop') || p.includes('store')) mainComp = 'StoreView.tsx';

      fileList.push(`src/components/${mainComp}`);
      fileList.push(`src/App.tsx`);
    }

    const uniqueFiles = Array.from(new Set(fileList)).slice(0, 3);

    // Realistic state progression:
    // Files do NOT start as completed immediately!
    return uniqueFiles.map((path, idx) => {
      if (isCompleted) {
        return { path, status: 'completed' as const };
      }
      // Progressive transition from active to completed as code is generated
      const fileProgressTime = (idx + 1) * 2.8 + 2.5;
      if (elapsed >= fileProgressTime) {
        return { path, status: 'completed' as const };
      }
      if (elapsed >= fileProgressTime - 2.8) {
        return { path, status: 'active' as const };
      }
      return { path, status: 'pending' as const };
    });
  }, [isBuildRequest, hasStartedCoding, artifacts, thinkingText, messageContent, userPrompt, isCompleted, elapsed]);

  // Dynamic status headline
  const statusHeadline = useMemo(() => {
    if (isCompleted) {
      if (isBuildRequest) {
        const artTitle = artifacts[0]?.title || 'Application';
        return `Built ${artTitle}`;
      }
      return 'Thinking completed';
    }

    if (!hasStartedCoding) {
      return 'Thinking...';
    }

    // Dynamic real-time architecting phases during active build
    if (elapsed < 5.2) {
      return 'Coding & Generating Component';
    } else {
      return 'Verifying Application Execution';
    }
  }, [isCompleted, isBuildRequest, hasStartedCoding, elapsed, artifacts]);

  // RULE 1: For ALL messages during initial thinking/planning (or anytime hasStartedCoding is false)
  // ALWAYS show ONLY the clean, minimal single straight line "Thinking..." status badge
  if (isLoading && isLast && !hasStartedCoding) {
    return (
      <div className="flex items-center gap-2 text-xs py-1 px-1 mb-2 text-neutral-600 dark:text-neutral-300 animate-pulse">
        <GoogleLightbulbSpinner isSpinning={true} />
        <span className="font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
          Thinking...
        </span>
        <span className="text-[11px] text-neutral-400 font-mono">({elapsed.toFixed(1)}s)</span>
      </div>
    );
  }

  // RULE 2: Conversational Responses (when completed or streaming without build request)
  if (!isBuildRequest) {
    if (thinkingText) {
      return (
        <div className="mb-2">
          <button
            type="button"
            onClick={onToggleThinking}
            className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isOpenThinking ? 'Hide thinking' : 'View reasoning'}</span>
            {isOpenThinking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {isOpenThinking && (
            <div className="mt-1.5 p-3 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-600 dark:text-neutral-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed border border-neutral-200/50 dark:border-neutral-700/50">
              {thinkingText}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  // RULE 3: App Building Requests once coding phase begins (hasStartedCoding === true)
  return (
    <div className="mb-3.5 space-y-2 text-xs animate-in fade-in duration-300">
      {/* 1. Straight Line Status Header with Google colored lightbulb spinner */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <GoogleLightbulbSpinner isSpinning={!isCompleted} isCompleted={isCompleted} />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
            {statusHeadline}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500">•</span>
          <span className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono shrink-0">
            {isCompleted
              ? `${thinkingTime ? thinkingTime + 's' : elapsed.toFixed(1) + 's'}`
              : `${elapsed.toFixed(1)}s`}
          </span>
        </div>

        {thinkingText && (
          <button
            type="button"
            onClick={onToggleThinking}
            className="flex items-center gap-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-[11px] font-medium shrink-0 cursor-pointer"
          >
            <span>{isOpenThinking ? 'Hide reasoning' : 'View reasoning'}</span>
            {isOpenThinking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* 2. Real-Time Build Output Files Card (Matching IMG_5064 Box) */}
      <div className="rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-xs px-3.5 py-2.5 space-y-2">
        {buildFiles.map((file) => {
          const isDone = file.status === 'completed';
          const isActive = file.status === 'active';

          return (
            <div
              key={file.path}
              className="flex items-center justify-between gap-3 font-mono text-[12px] transition-all duration-300"
            >
              <span
                className={`truncate ${
                  isDone
                    ? 'text-neutral-700 dark:text-neutral-300'
                    : isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-neutral-400 dark:text-neutral-600'
                }`}
              >
                {file.path}
              </span>

              <div className="shrink-0 flex items-center">
                {isDone ? (
                  /* Green circled checkmark exactly as in IMG_5064 */
                  <div className="w-4 h-4 rounded-full border border-emerald-500/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center bg-emerald-500/10">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : isActive ? (
                  /* Active animated blue/cyan spinner */
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                ) : (
                  /* Pending gray bullet */
                  <div className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Expandable Deep Thinking Reasoning Box */}
      {isOpenThinking && thinkingText && (
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150">
          {thinkingText}
        </div>
      )}
    </div>
  );
};


/**
 * Animated Google-colored circular ring spinner with embedded lightbulb icon
 * Matches the visual design in IMG_5064
 */
function GoogleLightbulbSpinner({
  isSpinning = false,
  isCompleted = false,
}: {
  isSpinning?: boolean;
  isCompleted?: boolean;
}) {
  return (
    <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
      {/* Multi-color arc ring (Blue #4285F4, Red #EA4335, Green #34A853) */}
      <svg
        className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="#4285F4"
          strokeWidth="2"
          strokeDasharray="24 32"
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="#EA4335"
          strokeWidth="2"
          strokeDasharray="16 40"
          strokeDashoffset="-28"
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="#34A853"
          strokeWidth="2"
          strokeDasharray="16 40"
          strokeDashoffset="-46"
          strokeLinecap="round"
        />
      </svg>

      {/* Center Lightbulb Icon */}
      <div className="absolute inset-0 flex items-center justify-center text-neutral-700 dark:text-neutral-200">
        <svg
          className="w-2.5 h-2.5 text-neutral-700 dark:text-neutral-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      </div>
    </div>
  );
}
