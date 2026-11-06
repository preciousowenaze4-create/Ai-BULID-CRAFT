import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Brain,
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
  onOpenArtifact?: (artifact: Artifact) => void;
}

interface BuildFileItem {
  path: string;
  status: 'active' | 'completed';
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

  // Derive component name dynamically based on artifacts or user prompt
  const mainComponentName = useMemo(() => {
    if (artifacts && artifacts.length > 0 && artifacts[0].title) {
      const clean = artifacts[0].title.replace(/[^a-zA-Z0-9]+/g, '');
      return clean || 'AppView';
    }
    const content = messageContent || '';
    const titleAttrMatch = content.match(/title="([^"]*)"/);
    if (titleAttrMatch && titleAttrMatch[1]) {
      const clean = titleAttrMatch[1].replace(/[^a-zA-Z0-9]+/g, '');
      if (clean) return clean;
    }
    const p = (userPrompt || '').toLowerCase();
    if (p.includes('drum') || p.includes('tempo')) return 'DrumMachine';
    if (p.includes('profile') || p.includes('user')) return 'UserProfile';
    if (p.includes('memory') || p.includes('card')) return 'MemoryCardMatch';
    if (p.includes('movie')) return 'MoviePicker';
    if (p.includes('tank')) return 'RetroTankBattle';
    if (p.includes('workout') || p.includes('timer')) return 'WorkoutTimer';
    if (p.includes('bucket')) return 'BucketListTracker';
    if (p.includes('real estate') || p.includes('luxury')) return 'LuxuryRealEstate';
    if (p.includes('todo')) return 'TodoList';
    if (p.includes('weather')) return 'WeatherWidget';
    if (p.includes('shop') || p.includes('store')) return 'StoreDashboard';
    if (p.includes('calc')) return 'Calculator';
    if (p.includes('game')) return 'GameCanvas';

    // Dynamic extract from userPrompt
    const cleaned = (userPrompt || '')
      .replace(/^(can you\s+)?(please\s+)?(build|create|make|code|design|generate)\s+(me\s+)?(an?|the)?\s*/i, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();
    if (cleaned) {
      const words = cleaned.split(/\s+/).slice(0, 3);
      const pascal = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      if (pascal.length >= 3) return pascal;
    }
    return 'AppView';
  }, [artifacts, messageContent, userPrompt]);

  // Real-time signal that the first component file has finished building
  const isFirstFileDone = useMemo(() => {
    if (isCompleted) return true;

    // Component is done when artifact block has closed or artifact object exists
    const content = messageContent || '';
    if (artifacts && artifacts.length > 0 && artifacts[0].content) {
      return true;
    }

    const hasArtifactClosed =
      content.includes(':::artifact{') ||
      (content.match(/:::/g) || []).length >= 2 ||
      (content.match(/```/g) || []).length >= 2 ||
      (content.length > 1500 && elapsed >= 4.0);

    return Boolean(hasArtifactClosed);
  }, [isCompleted, artifacts, messageContent, elapsed]);

  // Dynamic real-time list of files being built
  // Rules:
  // 1. Files appear in real-time as they are worked on!
  // 2. Starts with an active spinner (NO mark yet!)
  // 3. When finished, dynamically transitions to a green checkmark (✓)!
  // 4. Then next step begins with spinner!
  const buildFiles: BuildFileItem[] = useMemo(() => {
    if (!isBuildRequest) return [];

    const list: BuildFileItem[] = [];

    // File 1: The primary component (e.g., src/components/UserProfile.tsx)
    // Starts with active spinner, transitions to checkmark when completed!
    list.push({
      path: `src/components/${mainComponentName}.tsx`,
      status: isFirstFileDone ? 'completed' : 'active',
    });

    // File 2: App connection & verification (src/App.tsx)
    // ONLY appears once File 1 is completed and connection starts!
    if (isFirstFileDone) {
      list.push({
        path: `src/App.tsx`,
        status: isCompleted ? 'completed' : 'active',
      });
    }

    return list;
  }, [isBuildRequest, mainComponentName, isFirstFileDone, isCompleted]);

  // Check if this turn is actually building an application or code
  const isActuallyBuilding = useMemo(() => {
    if (isBuildRequest) return true;
    const content = messageContent || '';
    if (artifacts && artifacts.length > 0) return true;
    if (content.includes(':::artifact') || content.includes('```')) return true;
    return false;
  }, [isBuildRequest, messageContent, artifacts]);

  // Dynamic Status Headline (matching authentic Gemini AI Studio state)
  const statusHeadline = useMemo(() => {
    if (isCompleted) {
      if (isActuallyBuilding) {
        const title = artifacts[0]?.title || mainComponentName;
        return `Built ${title}`;
      }
      return 'Thinking completed';
    }

    if (!isFirstFileDone) {
      if (elapsed < 1.4) {
        return 'Thinking...';
      }
      const content = messageContent || '';
      if (content.length > 250) {
        return `Coding ${mainComponentName}...`;
      }
      return `Building ${mainComponentName}...`;
    }

    // While second file is active
    return 'Connecting application logic...';
  }, [isCompleted, isActuallyBuilding, isFirstFileDone, artifacts, mainComponentName, messageContent, elapsed]);

  // RULE 1: Conversational / Non-Build Messages (Greetings, Questions, Ideas)
  // MUST NEVER SHOW A BLANK WHITE BUBBLE! Always displays Gemini Star while thinking.
  if (!isActuallyBuilding) {
    if (isLoading && isLast) {
      return (
        <div className="flex items-center gap-2 py-1 px-1 mb-1 text-neutral-800 dark:text-neutral-200 animate-in fade-in duration-150">
          <GeminiStarIcon isSpinning={true} />
          <span className="font-semibold tracking-tight text-[13px] text-neutral-900 dark:text-neutral-100">
            Thinking...
          </span>
          <span className="text-[11px] text-neutral-400 font-mono">• {elapsed.toFixed(1)}s</span>
        </div>
      );
    }

    // After completion: if reasoning text was produced, offer clean collapsible drawer
    if (thinkingText) {
      return (
        <div className="mb-2">
          <button
            type="button"
            onClick={onToggleThinking}
            className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isOpenThinking ? 'Hide thinking' : `Thought for ${thinkingTime ? thinkingTime + 's' : elapsed.toFixed(1) + 's'}`}</span>
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

  // RULE 2: Real-Time Build Output (When Building an Application or Component)
  return (
    <div className="mb-3 space-y-1.5 text-xs animate-in fade-in duration-150">
      {/* 1. Straight Line Status Header with Animated Spinning Star */}
      <div className="flex items-center justify-between gap-3 px-1 py-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <GeminiStarIcon isSpinning={!isCompleted} isCompleted={isCompleted} />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight truncate text-[13px]">
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

      {/* 2. Clean Inline Real-Time Build Steps (No Box / No Heavy Borders) */}
      {buildFiles.length > 0 && (
        <div className="pt-0.5 pb-1 space-y-1 font-mono text-[12px] sm:text-[13px]">
          {buildFiles.map((file) => {
            const isDone = file.status === 'completed';

            return (
              <div
                key={file.path}
                className="flex items-center justify-between gap-3 text-neutral-700 dark:text-neutral-300 py-0.5 px-1 animate-in fade-in duration-150"
              >
                <span
                  className={`truncate ${
                    isDone
                      ? 'text-neutral-800 dark:text-neutral-200'
                      : 'text-blue-600 dark:text-blue-400 font-semibold'
                  }`}
                >
                  {file.path}
                </span>

                <div className="shrink-0 flex items-center">
                  {isDone ? (
                    /* Clean inline blue circled checkmark */
                    <div className="w-4 h-4 rounded-full border border-blue-500 text-blue-600 dark:text-blue-400 flex items-center justify-center bg-blue-500/10">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    /* Active animated spinner while building: NO premature checkmark! */
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500/30 border-t-blue-600 animate-spin" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
 * Animated Google Gemini 4-Pointed Star Sparkle Icon
 * Continuously rotates 360 degrees while active, never static or sleeping!
 */
function GeminiStarIcon({
  isSpinning = false,
  isCompleted = false,
}: {
  isSpinning?: boolean;
  isCompleted?: boolean;
}) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center shrink-0 select-none">
      {/* 4-pointed Gemini Star actively spinning 360° continuously when active */}
      <svg
        className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`}
        style={{ animationDuration: '2.5s' }}
        viewBox="0 0 24 24"
        fill="url(#geminiStarGradient)"
      >
        <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
        <defs>
          <linearGradient id="geminiStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="35%" stopColor="#9B51E0" />
            <stop offset="70%" stopColor="#EA4335" />
            <stop offset="100%" stopColor="#FBBC05" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
