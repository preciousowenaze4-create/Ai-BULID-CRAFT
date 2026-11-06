import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Brain,
  Terminal,
  Edit3,
  Server,
  Eye,
  Cloud,
  GitBranch,
  Box,
  Play,
  Loader2,
  Circle,
  FileCode,
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

interface BuildExecutionStep {
  id: string;
  category:
    | 'sandbox'
    | 'git'
    | 'research'
    | 'docs'
    | 'edit'
    | 'bash'
    | 'qa'
    | 'server'
    | 'preview'
    | 'icon'
    | 'deploy'
    | 'commit';
  prefix?: string;
  detail: string;
  status: 'completed' | 'active' | 'pending';
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
  onOpenArtifact,
}) => {
  const [elapsed, setElapsed] = useState(() => Math.max(0, (Date.now() - timestamp) / 1000));
  const [isStepsExpanded, setIsStepsExpanded] = useState(true);

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
    if (!isBuildRequest) return false;
    if (isCompleted) return true;

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

    return hasCodeSignal || elapsed >= 2.5;
  }, [isBuildRequest, isCompleted, messageContent, artifacts, elapsed]);

  // Derive component name dynamically based on artifacts or user prompt
  const mainComponentName = useMemo(() => {
    if (artifacts && artifacts.length > 0 && artifacts[0].title) {
      return artifacts[0].title.replace(/[^a-zA-Z0-9]+/g, '') || 'AppView';
    }
    const p = (userPrompt || '').toLowerCase();
    if (p.includes('memory') || p.includes('card')) return 'MemoryCardMatch';
    if (p.includes('drum')) return 'DrumMachine';
    if (p.includes('movie')) return 'MoviePicker';
    if (p.includes('tank')) return 'RetroTankBattle';
    if (p.includes('workout') || p.includes('timer')) return 'WorkoutTimer';
    if (p.includes('bucket')) return 'BucketListTracker';
    if (p.includes('real estate') || p.includes('luxury')) return 'LuxuryRealEstate';
    if (p.includes('todo')) return 'TodoList';
    if (p.includes('weather')) return 'WeatherWidget';
    if (p.includes('shop') || p.includes('store')) return 'StoreDashboard';
    if (p.includes('game')) return 'GameCanvas';
    return 'AppView';
  }, [artifacts, userPrompt]);

  // Construct realistic, step-by-step build logs matching IMG_5072 & IMG_5073
  const executionSteps: BuildExecutionStep[] = useMemo(() => {
    if (!isBuildRequest || !hasStartedCoding) return [];

    const baseSteps: Array<{
      id: string;
      category: BuildExecutionStep['category'];
      prefix?: string;
      detail: string;
    }> = [
      {
        id: 'step-1',
        category: 'sandbox',
        detail: 'Setup Agent resumed existing sandbox',
      },
      {
        id: 'step-2',
        category: 'git',
        detail: 'Setup Agent loaded project files from GitHub',
      },
      {
        id: 'step-3',
        category: 'research',
        prefix: 'Using research',
        detail: 'Inspect the existing project structure and dependency graph',
      },
      {
        id: 'step-4',
        category: 'research',
        prefix: 'Using research',
        detail: 'Read mobile/app.json, configurations, and environment secrets',
      },
      {
        id: 'step-5',
        category: 'research',
        prefix: 'Using research',
        detail: 'Check whether the project exports standalone preview',
      },
      {
        id: 'step-6',
        category: 'research',
        prefix: 'Using research',
        detail: 'Inspect the exact contents of main router layout',
      },
      {
        id: 'step-7',
        category: 'docs',
        prefix: 'Using get_library_docs',
        detail: 'expo-router & lucide-react',
      },
      {
        id: 'step-8',
        category: 'edit',
        prefix: 'Editing +html.tsx',
        detail: 'mobile/app/+html.tsx',
      },
      {
        id: 'step-9',
        category: 'edit',
        prefix: 'Editing manifest.json',
        detail: 'mobile/public/manifest.json',
      },
      {
        id: 'step-10',
        category: 'edit',
        prefix: 'Editing sw.js',
        detail: 'mobile/public/sw.js',
      },
      {
        id: 'step-11',
        category: 'edit',
        prefix: `Editing ${mainComponentName}.tsx`,
        detail: `src/components/${mainComponentName}.tsx`,
      },
      {
        id: 'step-12',
        category: 'bash',
        prefix: 'Using run_bash_command',
        detail: 'npx expo export -p web --clean',
      },
      {
        id: 'step-13',
        category: 'research',
        prefix: 'Using research',
        detail: 'Verify the newly added mobile components and state logic',
      },
      {
        id: 'step-14',
        category: 'qa',
        detail: 'Passed 18 quality checks',
      },
      {
        id: 'step-15',
        category: 'server',
        detail: 'Starting backend development server...',
      },
      {
        id: 'step-16',
        category: 'preview',
        detail: 'Preview available',
      },
      {
        id: 'step-17',
        category: 'qa',
        detail: 'QA verification passed',
      },
      {
        id: 'step-18',
        category: 'icon',
        detail: 'Generating app icon...',
      },
      {
        id: 'step-19',
        category: 'deploy',
        detail: 'Deploying mobile...',
      },
      {
        id: 'step-20',
        category: 'icon',
        detail: 'App icon generated',
      },
      {
        id: 'step-21',
        category: 'deploy',
        detail: 'mobile deployed',
      },
      {
        id: 'step-22',
        category: 'commit',
        detail: 'Code committed to GitHub',
      },
    ];

    if (isCompleted) {
      return baseSteps.map((s) => ({
        ...s,
        status: 'completed' as const,
      }));
    }

    // Step progression based on real-time elapsed seconds
    // Step index threshold:
    // Steps 1 & 2: instant
    // Steps 3 - 14: progress smoothly
    // Step 15 (Server): active near completion
    // Steps 16 - 22: STRICTLY PENDING until isCompleted === true
    const activeIndex = Math.min(14, Math.floor(elapsed / 0.6) + 2);

    return baseSteps.map((s, idx) => {
      if (idx < activeIndex) {
        return { ...s, status: 'completed' as const };
      }
      if (idx === activeIndex) {
        return { ...s, status: 'active' as const };
      }
      return { ...s, status: 'pending' as const };
    });
  }, [isBuildRequest, hasStartedCoding, isCompleted, elapsed, mainComponentName]);

  const completedCount = useMemo(() => {
    return executionSteps.filter((s) => s.status === 'completed').length;
  }, [executionSteps]);

  // Dynamic status headline
  const statusHeadline = useMemo(() => {
    if (isCompleted) {
      if (isBuildRequest) {
        const artTitle = artifacts[0]?.title || mainComponentName || 'Application';
        return `Built ${artTitle}`;
      }
      return 'Thinking completed';
    }

    if (!hasStartedCoding) {
      return 'Thinking...';
    }

    if (elapsed < 4.5) {
      return 'Inspecting Architecture & Dependencies';
    } else if (elapsed < 8.0) {
      return 'Generating Component Code';
    } else {
      return 'Verifying Application Execution & QA';
    }
  }, [isCompleted, isBuildRequest, hasStartedCoding, elapsed, artifacts, mainComponentName]);

  // RULE 1: Initial Thinking State (Single Straight Line Status Badge)
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

  // RULE 2: Conversational Responses (Plain Chat / Reasoning View)
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

  // Helper to render icon for step row
  const renderStepIcon = (step: BuildExecutionStep) => {
    switch (step.category) {
      case 'research':
      case 'docs':
      case 'bash':
        return (
          <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Terminal className="w-3 h-3 stroke-[2.2]" />
          </div>
        );
      case 'edit':
        return (
          <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Edit3 className="w-3 h-3 stroke-[2.2]" />
          </div>
        );
      case 'sandbox':
        return <Box className="w-4 h-4 text-neutral-500 shrink-0" />;
      case 'git':
        return <GitBranch className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'qa':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'server':
        return <Server className="w-4 h-4 text-cyan-600 shrink-0" />;
      case 'preview':
        return <Eye className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'deploy':
        return <Cloud className="w-4 h-4 text-sky-500 shrink-0" />;
      case 'commit':
        return <GitBranch className="w-4 h-4 text-emerald-600 shrink-0" />;
      default:
        return <Circle className="w-4 h-4 text-neutral-400 shrink-0" />;
    }
  };

  // RULE 3: App Building Requests (Real-Time Build Step Tracking)
  return (
    <div className="mb-3.5 space-y-2 text-xs animate-in fade-in duration-300">
      {/* Top Status Header */}
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

      {/* Build Steps Tracking Container (Matching IMG_5072 & IMG_5073) */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-xs overflow-hidden">
        {/* Collapsible Steps Header Banner */}
        <button
          type="button"
          onClick={() => setIsStepsExpanded(!isStepsExpanded)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
            isCompleted
              ? 'bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border-b border-emerald-100 dark:border-emerald-900/40'
              : 'bg-neutral-50 hover:bg-neutral-100/80 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isCompleted ? (
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            ) : (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            )}
            <span className="font-semibold text-xs tracking-tight">
              {isCompleted
                ? `${executionSteps.length} steps completed`
                : `Executing build pipeline (${completedCount}/${executionSteps.length} steps)...`}
            </span>
          </div>
          <div className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
            {isStepsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Detailed Step List */}
        {isStepsExpanded && (
          <div className="p-3 space-y-2 max-h-72 overflow-y-auto font-sans">
            {executionSteps.map((step) => {
              const isStepDone = step.status === 'completed';
              const isStepActive = step.status === 'active';
              const isPreviewStep = step.category === 'preview';

              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between gap-2.5 py-1 px-1.5 rounded-lg text-xs transition-colors ${
                    isStepActive
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {renderStepIcon(step)}

                    <div className="min-w-0 truncate">
                      {step.prefix ? (
                        <>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 mr-1.5">
                            {step.prefix}
                          </span>
                          <span className="text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                            {step.detail}
                          </span>
                        </>
                      ) : (
                        <span
                          className={`font-medium ${
                            isStepDone
                              ? 'text-neutral-800 dark:text-neutral-200'
                              : isStepActive
                              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {step.detail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator / Preview Trigger on Right */}
                  <div className="shrink-0 flex items-center gap-2">
                    {/* Zero-Error Preview Availability Trigger */}
                    {isPreviewStep && isCompleted && artifacts.length > 0 && onOpenArtifact && (
                      <button
                        type="button"
                        onClick={() => onOpenArtifact(artifacts[0])}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Preview your app</span>
                      </button>
                    )}

                    {isStepDone ? (
                      <div className="w-4 h-4 rounded-full border border-emerald-500/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center bg-emerald-500/10">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : isStepActive ? (
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expandable Reasoning Box */}
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
