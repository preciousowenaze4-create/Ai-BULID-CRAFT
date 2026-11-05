import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { ArtifactPanel } from './components/ArtifactPanel.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { EnvModal } from './components/EnvModal.tsx';
import { DatabaseModal } from './components/DatabaseModal.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { AppsDashboard } from './components/AppsDashboard.tsx';
import { ProfileScreen } from './components/ProfileScreen.tsx';
import { AssetsModal } from './components/AssetsModal.tsx';
import { ErrorsModal } from './components/ErrorsModal.tsx';
import { ChatSession, Message, Artifact, Attachment, ModelOption, AuthUser } from './types.ts';
import { extractArtifacts, isBuildOrCodeRequest } from './lib/utils.ts';
import { loadUserSessions, saveUserSessions, createDefaultSession } from './lib/userSessions.ts';
import { supabase } from './lib/supabase.ts';
import { getUserTokens, deductUserTokens, ensureUserRecord } from './lib/tokens.ts';
import { NetworkToast, ToastNotice } from './components/NetworkToast.tsx';
import confetti from 'canvas-confetti';

const STORAGE_KEY_THEME = 'vercel_ai_chatbot_theme';
const STORAGE_KEY_SYSTEM_PROMPT = 'vercel_ai_chatbot_system_prompt';
const STORAGE_KEY_USER = 'appifex_current_user';

const DEFAULT_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Fast, intelligent, and versatile for coding, analysis & everyday tasks',
    badge: 'Recommended',
    speed: 'Fast',
    capabilities: ['artifacts', 'multimodal', 'streaming'],
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini Flash Lite',
    description: 'Ultra-snappy lightweight model for high-throughput responses',
    badge: 'Lightweight',
    speed: 'Ultra Fast',
    capabilities: ['artifacts', 'multimodal', 'streaming'],
  },
];

export default function App() {
  // Current authenticated user (gates app access until signed in)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Supabase user_tokens live balance (default 500)
  const [userTokens, setUserTokens] = useState<number>(500);

  // Floating network and connectivity notice
  const [toastNotice, setToastNotice] = useState<ToastNotice | null>(null);

  const [models, setModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [currentModel, setCurrentModel] = useState<string>('gemini-3.8-flash');

  // Sessions are strictly scoped to the authenticated user ID for 100% private clean dashboards
  // Startup Rule: Always ensure a fresh, empty session is at the front so app launches on Home Screen
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const freshHomeSession = createDefaultSession('gemini-3.8-flash');
    if (currentUser?.id) {
      try {
        const localKey = 'user_chat_sessions_' + currentUser.id;
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const filtered = parsed.filter((s: ChatSession) => s.messages && s.messages.length > 0);
            return [freshHomeSession, ...filtered];
          }
        }
      } catch (e) {
        console.warn('Failed to load user-scoped sessions:', e);
      }
    }
    return [freshHomeSession];
  });

  // Always start activeSessionId on the fresh home session (showing 'What app should I build for you?')
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || 'session-default';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState<Record<string, boolean>>({});
  const [runtimeErrors, setRuntimeErrors] = useState<string[]>([]);
  const isCurrentSessionLoading = Boolean(loadingSessions[activeSessionId]);

  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEnvOpen, setIsEnvOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isErrorsOpen, setIsErrorsOpen] = useState(false);
  const [isAppsDashboardOpen, setIsAppsDashboardOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<'mobile' | 'web'>('mobile');
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_SYSTEM_PROMPT) || '';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  // Global unhandled error & promise rejection listener for true diagnostics
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      if (event.message && !event.message.includes('ResizeObserver')) {
        setRuntimeErrors((prev) => Array.from(new Set([...prev, event.message])).slice(-10));
      }
    };
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason || '');
      if (reason && !reason.includes('AbortError') && !reason.includes('ResizeObserver')) {
        setRuntimeErrors((prev) => Array.from(new Set([...prev, reason])).slice(-10));
      }
    };
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  // Sync active session if it had an incomplete assistant response or was running in background
  useEffect(() => {
    if (!activeSessionId) return;
    const current = sessions.find((s) => s.id === activeSessionId);
    if (!current || !current.messages || current.messages.length === 0) return;

    const lastMsg = current.messages[current.messages.length - 1];
    const isUnfinished = lastMsg && lastMsg.role === 'assistant' && (!lastMsg.content || lastMsg.content === '');

    if (isUnfinished || loadingSessions[activeSessionId]) {
      fetch(`/api/chat/session/${activeSessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.isCompleted && data.session) {
            setSessions((prev) =>
              prev.map((s) => (s.id === activeSessionId ? data.session : s))
            );
            setLoadingSessions((prev) => ({ ...prev, [activeSessionId]: false }));
          }
        })
        .catch(() => {});
    }
  }, [activeSessionId]);

  // Whenever currentUser changes (e.g. login with Google or email), load their private clean dashboard & tokens
  useEffect(() => {
    if (!currentUser?.id) return;
    let isCurrent = true;

    // Initialize/sync user record and tokens in Supabase user_tokens table
    ensureUserRecord(currentUser);
    getUserTokens(currentUser.id).then((balance) => {
      if (isCurrent) setUserTokens(balance);
    });

    loadUserSessions(currentUser.id, currentModel).then((userSessions) => {
      if (isCurrent && userSessions) {
        const savedWithMessages = userSessions.filter((s) => s.messages && s.messages.length > 0);
        setSessions((prev) => {
          const fresh = prev.find((s) => !s.messages || s.messages.length === 0) || createDefaultSession(currentModel);
          // Keep the fresh empty home session at index 0 and retain activeSessionId on it
          return [fresh, ...savedWithMessages];
        });
        // CRITICAL: DO NOT redirect activeSessionId to userSessions[0].id on app startup/reload!
        // The user must remain on the Home Screen until they explicitly tap a project in sidebar or dashboard.
        setActiveArtifact(null);
        setIsArtifactPanelOpen(false);
      }
    });

    const handleTokensUpdated = (e: any) => {
      if (e.detail?.userId === currentUser.id && typeof e.detail.balance === 'number') {
        setUserTokens(e.detail.balance);
      }
    };
    window.addEventListener('tokens-updated', handleTokensUpdated);

    return () => {
      isCurrent = false;
      window.removeEventListener('tokens-updated', handleTokensUpdated);
    };
  }, [currentUser?.id]);

  // Persist sessions isolated per user
  useEffect(() => {
    if (!currentUser?.id || sessions.length === 0) return;
    saveUserSessions(currentUser.id, sessions);
  }, [sessions, currentUser?.id]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
    localStorage.removeItem(STORAGE_KEY_USER);
    setCurrentUser(null);
    setSessions([createDefaultSession(currentModel)]);
    setActiveSessionId('');
    setActiveArtifact(null);
    setIsArtifactPanelOpen(false);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync theme to HTML root element and browser theme-color
  useEffect(() => {
    const metaTheme = document.getElementById('meta-theme-color');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      metaTheme?.setAttribute('content', '#09090b');
    } else {
      document.documentElement.classList.remove('dark');
      metaTheme?.setAttribute('content', '#ffffff');
    }
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Fetch available models from backend
  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models)) {
          setModels(data.models);
        }
      })
      .catch((err) => console.log('Using default models:', err));

    // Initial sync of stored custom env vars to backend configuration context
    try {
      const saved = localStorage.getItem('vercel_ai_custom_env_vars');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fetch('/api/env/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ envVars: parsed }),
          }).catch(() => {});
        }
      }
    } catch {}
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const latestSessionArtifact = React.useMemo(() => {
    if (!activeSession?.messages) return null;
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      const msg = activeSession.messages[i];
      if (msg.artifacts && msg.artifacts.length > 0) {
        return msg.artifacts[msg.artifacts.length - 1];
      }
    }
    return null;
  }, [activeSession]);

  const currentArtifact = activeArtifact || latestSessionArtifact;

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleNewChat = () => {
    // If the active session is already empty with 0 messages, reset artifact & view
    const currentActive = sessions.find((s) => s.id === activeSessionId);
    if (currentActive && (!currentActive.messages || currentActive.messages.length === 0)) {
      setActiveArtifact(null);
      setIsArtifactPanelOpen(false);
      setIsSidebarOpen(false);
      setIsAppsDashboardOpen(false);
      setIsProfileOpen(false);
      return;
    }

    // Check if another empty session exists to reuse
    const existingEmpty = sessions.find((s) => !s.messages || s.messages.length === 0);
    if (existingEmpty) {
      setActiveSessionId(existingEmpty.id);
      setActiveArtifact(null);
      setIsArtifactPanelOpen(false);
      setIsSidebarOpen(false);
      setIsAppsDashboardOpen(false);
      setIsProfileOpen(false);
      return;
    }

    const newSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      model: currentModel,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveArtifact(null);
    setIsArtifactPanelOpen(false);
    setIsSidebarOpen(false);
    setIsAppsDashboardOpen(false);
    setIsProfileOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    const remaining = sessions.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      const fallback: ChatSession = {
        id: 'session-' + Date.now(),
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        model: currentModel,
      };
      setSessions([fallback]);
      setActiveSessionId(fallback.id);
      setActiveArtifact(null);
      setIsArtifactPanelOpen(false);
    } else {
      setSessions(remaining);
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
        setActiveArtifact(null);
        setIsArtifactPanelOpen(false);
      }
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    );
  };

  const handleTogglePinSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s))
    );
  };

  const handleClearAllSessions = () => {
    const fresh: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      model: currentModel,
    };
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setActiveArtifact(null);
    setIsArtifactPanelOpen(false);
  };

  const handleSendMessage = async (
    content: string,
    attachments: Attachment[] = [],
    enableThinking: boolean = false
  ) => {
    if (!content.trim() && attachments.length === 0) return;

    // Check network connectivity first before sending
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setToastNotice({
        id: 'offline-' + Date.now(),
        type: 'offline',
        message: 'No internet connection. Waiting to reconnect...',
        onRetry: () => handleSendMessage(content, attachments, enableThinking),
      });
      return;
    }

    // Check token balance from Supabase user_tokens table
    if (currentUser?.id) {
      if (userTokens <= 0) {
        alert('You have 0 tokens remaining in your account. Please check your Database panel or contact support.');
        return;
      }
      // Deduct 1 token immediately against Supabase user_tokens table
      deductUserTokens(currentUser.id, 1).then((newBal) => {
        setUserTokens(newBal);
      });
    }

    const userMsgId = 'msg-' + Date.now();
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
    };

    const assistantMsgId = 'msg-ai-' + (Date.now() + 1);
    const placeholderAssistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
    };

    const updatedMessages = [...(activeSession?.messages || []), userMessage, placeholderAssistantMessage];

    // Determine initial project title if this is the first message in this session
    const isFirstUserMsg = !(activeSession?.messages && activeSession.messages.some((m) => m.role === 'user'));
    let initialProjectTitle = activeSession?.title;
    if (isFirstUserMsg && (!initialProjectTitle || initialProjectTitle === 'New Chat')) {
      const cleanPrompt = content.trim().replace(/^[^a-zA-Z0-9]+/, '');
      if (cleanPrompt) {
        // Format words neatly, e.g. "Can You Build Me A App"
        const words = cleanPrompt.slice(0, 42).split(/\s+/);
        initialProjectTitle = words
          .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
          .join(' ')
          .trim();
      }
    }

    const targetSessionId = activeSessionId;
    const targetSessionTitle = initialProjectTitle || activeSession?.title || 'New Chat';

    // Update session with user message, title, and placeholder
    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSessionId
          ? {
              ...s,
              title: targetSessionTitle,
              messages: updatedMessages,
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setLoadingSessions((prev) => ({ ...prev, [targetSessionId]: true }));

    // Cancel any previous stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Graceful network timeout: after 45s of no completion or network stall, abort smoothly with toast
    const timeoutTimer = setTimeout(() => {
      if (abortControllerRef.current === abortController) {
        setToastNotice({
          id: 'timeout-' + Date.now(),
          type: 'slow_network',
          message: 'Network is slow, retrying...',
          onRetry: () => handleRegenerate(),
          autoDismiss: 5000,
        });
        abortController.abort();
      }
    }, 45000);

    const startTime = Date.now();
    let accumulatedText = '';
    let streamGroundingSources: Array<{ title?: string; uri?: string }> = [];

    try {
      let customGeminiKey = '';
      try {
        const customEnvStr = localStorage.getItem('vercel_ai_custom_env_vars');
        if (customEnvStr) {
          const parsed = JSON.parse(customEnvStr);
          const found = parsed.find((v: any) => v.key === 'GEMINI_API_KEY' || v.key === 'VITE_GEMINI_API_KEY');
          if (found?.value) customGeminiKey = found.value;
        }
      } catch {}

      const viteEnvKey =
        (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as any).GEMINI_API_KEY)) ||
        '';

      const effectiveKey = (customGeminiKey || viteEnvKey || '').trim().replace(/^["']|["']$/g, '');
      const validKey = effectiveKey && effectiveKey !== 'MY_GEMINI_API_KEY' && effectiveKey !== 'undefined' && effectiveKey !== 'null' ? effectiveKey : '';

      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (validKey) {
        reqHeaders['x-gemini-key'] = validKey;
        reqHeaders['authorization'] = `Bearer ${validKey}`;
      }

      const AI_BUILDCRAFT_SYSTEM = `You are AI BuildCraft, an elite AI app architect, full-stack engineer, and deep-thinking software craftsman.
Your official name and this application's name is AI BuildCraft. If the user asks for your name, who you are, or what application this is, always introduce yourself clearly and proudly as AI BuildCraft.

1. INTENT DIFFERENTIATION & THINKING PROTOCOL:
- FOR APP BUILDS, CODE MODIFICATIONS & COMPLEX TASKS:
  When the user asks to build an app, code a component, or troubleshoot, pause and systematically break down the logic inside a <thinking>...</thinking> block covering Requirements Verification, Relational Data & State Modeling, Component Hierarchy, and Modular Execution Plan.
- FOR NORMAL CONVERSATION & GREETINGS (e.g. "How are you doing", "hello", "hi"):
  Respond directly, warmly, and promptly with clean conversational text. DO NOT generate <thinking> blocks or multi-phase breakdown for casual greetings and general chat.

2. DEEP ARCHITECTURAL PLANNING & PRODUCTION-GRADE CODE:
- Relational Schema & State Modeling First: When building or extending apps, model the underlying entities (users, chats, transactions, records, state logs) with clean relational columns (id, created_at, user_id, status, payload, etc.) and explicit state management.
- Zero Slop & Zero Placeholders: Avoid rushed, sloppy, or incomplete responses. Write comprehensive, clean, and fully realized code without "TODO" or ellipses ("...").
- Modern Visual Quality: For web and mobile artifacts, use modern Tailwind CSS, Lucide SVG icons (initialized via lucide.createIcons()), responsive bounds, and bulletproof vanilla/modular JS.

3. SMART SCREENSHOT & VISUAL ANALYSIS:
When an image or screenshot is provided, analyze it in the exact context of the project. Identify layout, typography, components, states, and error messages. Make surgical updates without breaking existing features.

4. CLEAN CONVERSATIONAL FLOW & ARTIFACT DISCIPLINE:
- Normal text, greetings, and questions MUST render as standard clean chat bubbles. Only executable or generated app files should trigger artifact preview wrapper cards.
- When generating apps, widgets, or full code files, ALWAYS wrap them in \`\`\`artifact... blocks. Never dump raw HTML or code directly into the chat stream.`;

      const effectiveSystemInstruction = systemPrompt ? `${systemPrompt}\n\n${AI_BUILDCRAFT_SYSTEM}` : AI_BUILDCRAFT_SYSTEM;

      const isBuildRequest = isBuildOrCodeRequest(content, attachments, undefined, false);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: reqHeaders,
        signal: abortController.signal,
        body: JSON.stringify({
          sessionId: targetSessionId,
          userId: currentUser?.id || '',
          sessionTitle: targetSessionTitle,
          messages: [...(activeSession?.messages || []), userMessage],
          model: currentModel,
          enableThinking: isBuildRequest,
          currentArtifact: currentArtifact
            ? {
                id: currentArtifact.id,
                title: currentArtifact.title,
                type: currentArtifact.type,
                language: currentArtifact.language,
                content: currentArtifact.content,
              }
            : undefined,
          systemInstruction: effectiveSystemInstruction,
          apiKey: validKey || undefined,
        }),
      });


      if (!response.ok) {
        let serverErrorMsg = '';
        try {
          const errData = await response.json();
          serverErrorMsg = errData?.error || '';
        } catch {
          try {
            serverErrorMsg = await response.text();
          } catch {}
        }
        throw new Error(serverErrorMsg || 'Chat server connection error');
      } else {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No readable stream available');

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.substring(6);
              try {
                const data = JSON.parse(dataStr);
                if (data.text) {
                  accumulatedText += data.text;
                  const { displayText: liveText, thinking: liveThinking } = extractArtifacts(accumulatedText);
                  // Live update assistant message
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id !== targetSessionId) return s;
                      const msgs = s.messages.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              content: liveText,
                              thinking: liveThinking || m.thinking,
                            }
                          : m
                      );
                      return { ...s, messages: msgs };
                    })
                  );
                }
                if (data.groundingSources && Array.isArray(data.groundingSources)) {
                  streamGroundingSources = [...streamGroundingSources, ...data.groundingSources];
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id !== targetSessionId) return s;
                      const msgs = s.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, groundingSources: streamGroundingSources }
                          : m
                      );
                      return { ...s, messages: msgs };
                    })
                  );
                }
                if (data.error) {
                  setToastNotice({
                    id: 'net-notice-' + Date.now(),
                    type: 'slow_network',
                    message: 'Network is slow, retrying...',
                    onRetry: () => handleRegenerate(),
                    autoDismiss: 4000,
                  });
                }
              } catch (err) {
                console.warn('Failed to parse SSE chunk:', err);
              }
            }
          }
        }
      }

      // Final processing: extract artifacts & deep thinking
      const { displayText, thinking, artifacts } = extractArtifacts(accumulatedText);
      const thinkingTime = Number(((Date.now() - startTime) / 1000).toFixed(1));

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          const msgs = s.messages.map((m) => {
            if (m.id === assistantMsgId) {
              return {
                ...m,
                content: displayText,
                artifacts: artifacts.length > 0 ? artifacts : undefined,
                groundingSources: streamGroundingSources.length > 0 ? streamGroundingSources : m.groundingSources,
                thinking:
                  thinking ||
                  `Requirements analyzed and architecture verified. Step-by-step modular plan executed with ${artifacts.length} interactive artifact(s).`,
                thinkingTime: thinkingTime,
              };
            }
            return m;
          });
          return { ...s, messages: msgs };
        })
      );

      // If an artifact was produced, automatically open canvas if user is still in this session
      if (artifacts.length > 0 && activeSessionId === targetSessionId) {
        setActiveArtifact(artifacts[0]);
        setIsArtifactPanelOpen(true);
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
        });
      }

      // Auto-summarize title if this is the first interaction in the session
      if (isFirstUserMsg && content.trim()) {
        const titleHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (validKey) {
          titleHeaders['x-gemini-key'] = validKey;
          titleHeaders['authorization'] = `Bearer ${validKey}`;
        }
        fetch('/api/summarize-title', {
          method: 'POST',
          headers: titleHeaders,
          body: JSON.stringify({
            prompt: content.trim(),
            apiKey: validKey || undefined,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.title) {
              handleRenameSession(targetSessionId, data.title);
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped or timed out.');
      } else {
        console.warn('Network / chat error:', err);
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (isOffline) {
          setToastNotice({
            id: 'offline-' + Date.now(),
            type: 'offline',
            message: 'No internet connection. Waiting to reconnect...',
            onRetry: () => handleRegenerate(),
          });
        } else {
          setToastNotice({
            id: 'slow-net-' + Date.now(),
            type: 'slow_network',
            message: 'Network is slow, retrying...',
            onRetry: () => handleRegenerate(),
            autoDismiss: 5000,
          });
        }

        // Clean chat state: never print raw technical stack traces or generic API config errors into chat
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== targetSessionId) return s;
            if (accumulatedText.trim()) {
              // Retain partial response cleanly without any appended error text
              const msgs = s.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
              );
              return { ...s, messages: msgs };
            } else {
              // Cleanly prune empty placeholder assistant message so user flow remains pristine
              const msgs = s.messages.filter((m) => m.id !== assistantMsgId);
              return { ...s, messages: msgs };
            }
          })
        );
      }
    } finally {
      clearTimeout(timeoutTimer);
      setLoadingSessions((prev) => ({ ...prev, [targetSessionId]: false }));
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoadingSessions((prev) => ({ ...prev, [activeSessionId]: false }));
    }
  };


  const handleRegenerate = () => {
    if (!activeSession || activeSession.messages.length < 2) return;
    const msgs = [...activeSession.messages];
    // Find last user message
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const userMsg = msgs[lastUserIndex];
    // Trim history to just before that user message
    const trimmed = msgs.slice(0, lastUserIndex);
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: trimmed } : s))
    );

    // Resend
    handleSendMessage(userMsg.content, userMsg.attachments);
  };

  const handleOpenArtifact = (art: Artifact) => {
    setActiveArtifact(art);
    setIsArtifactPanelOpen(true);
  };

  const handleUpdateArtifact = (updated: Artifact) => {
    setActiveArtifact(updated);
    // Update artifact inside the message that created it
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const newMsgs = s.messages.map((m) => {
          if (m.artifacts) {
            const hasIt = m.artifacts.some((a) => a.id === updated.id);
            if (hasIt) {
              return {
                ...m,
                artifacts: m.artifacts.map((a) => (a.id === updated.id ? updated : a)),
              };
            }
          }
          return m;
        });
        return { ...s, messages: newMsgs };
      })
    );
  };

  if (!currentUser) {
    return (
      <>
        <NetworkToast
          notice={toastNotice}
          onDismiss={() => setToastNotice(null)}
        />
        <AuthScreen
          onAuthenticated={(user) => {
            setCurrentUser(user);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
          }}
        />
      </>
    );
  }

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground font-sans relative">
      {/* Floating Connectivity & Network Notification Banner */}
      <NetworkToast
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          const target = sessions.find((s) => s.id === id);
          if (target && target.messages) {
            let foundArtifact: Artifact | null = null;
            for (let i = target.messages.length - 1; i >= 0; i--) {
              const msg = target.messages[i];
              if (msg.artifacts && msg.artifacts.length > 0) {
                foundArtifact = msg.artifacts[msg.artifacts.length - 1];
                break;
              }
            }
            setActiveArtifact(foundArtifact);
          }
          setIsSidebarOpen(false);
          setIsAppsDashboardOpen(false);
          setIsProfileOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          setIsAppsDashboardOpen(false);
          setIsProfileOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onTogglePinSession={handleTogglePinSession}
        onClearAllSessions={handleClearAllSessions}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenProfile={() => {
          setIsProfileOpen(true);
          setIsAppsDashboardOpen(false);
        }}
      />

      {/* Main Chat & Canvas Area OR Apps Dashboard OR Profile Screen */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {isProfileOpen ? (
          <ProfileScreen
            currentUser={currentUser}
            tokenBalance={userTokens}
            onBack={() => setIsProfileOpen(false)}
            onSignOut={handleSignOut}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenDatabase={() => setIsDatabaseOpen(true)}
            onTokensUpdated={(newBal) => setUserTokens(newBal)}
          />
        ) : isAppsDashboardOpen ? (
          <AppsDashboard
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectApp={(id) => {
              setActiveSessionId(id);
              const target = sessions.find((s) => s.id === id);
              if (target && target.messages) {
                let foundArtifact: Artifact | null = null;
                for (let i = target.messages.length - 1; i >= 0; i--) {
                  const msg = target.messages[i];
                  if (msg.artifacts && msg.artifacts.length > 0) {
                    foundArtifact = msg.artifacts[msg.artifacts.length - 1];
                    break;
                  }
                }
                setActiveArtifact(foundArtifact);
              }
              setIsAppsDashboardOpen(false);
              setIsProfileOpen(false);
            }}
            onNewApp={() => {
              handleNewChat();
              setIsAppsDashboardOpen(false);
              setIsProfileOpen(false);
            }}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onOpenProfile={() => {
              setIsProfileOpen(true);
              setIsAppsDashboardOpen(false);
            }}
            onCloseDashboard={() => setIsAppsDashboardOpen(false)}
            onDeleteApp={handleDeleteSession}
            onRenameApp={handleRenameSession}
          />
        ) : (
          <>
            <Header
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onOpenDashboard={() => setIsAppsDashboardOpen(true)}
              onBackToDashboard={() => setIsAppsDashboardOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              hasStartedChat={(activeSession?.messages || []).length > 0}
              projectTitle={activeSession?.title}
              models={models}
              currentModel={currentModel}
              onSelectModel={setCurrentModel}
              onNewChat={handleNewChat}
              hasArtifact={activeArtifact !== null}
              isArtifactPanelOpen={isArtifactPanelOpen}
              onToggleArtifactPanel={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              onOpenSettings={() => setIsSettingsOpen(true)}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              tokenBalance={userTokens}
              onOpenDatabase={() => setIsDatabaseOpen(true)}
            />

        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden justify-between">
            <ChatArea
              messages={activeSession?.messages || []}
              isLoading={isCurrentSessionLoading}
              onOpenArtifact={handleOpenArtifact}
              onRegenerate={handleRegenerate}
              currentModelName={
                models.find((m) => m.id === currentModel)?.name || 'Gemini 3.8 Flash'
              }
            />

            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isCurrentSessionLoading}
              onStop={handleStop}
              hasStartedChat={(activeSession?.messages || []).length > 0}
              hasArtifact={!!currentArtifact}
              onOpenPreview={() => {
                if (currentArtifact) {
                  setActiveArtifact(currentArtifact);
                } else {
                  // Fallback showroom workspace if no artifact block was generated yet
                  const fallbackArtifact: Artifact = {
                    id: 'showroom-' + (activeSession?.id || 'live'),
                    type: 'html',
                    title: activeSession?.title && activeSession.title !== 'New Chat' ? activeSession.title : 'Live App Preview',
                    language: 'html',
                    content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-950 text-white min-h-screen flex items-center justify-center p-6 font-sans">
  <div class="text-center max-w-sm w-full p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" stroke-width="2"></rect><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01"></path></svg>
    </div>
    <h2 class="text-xl font-bold mb-2 text-white">${activeSession?.title || 'Interactive Showroom'}</h2>
    <p class="text-neutral-400 text-xs leading-relaxed mb-6">Your app showroom is live. When you ask Gemini to build or add features, your interactive app displays right here!</p>
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Showroom Ready
    </div>
  </div>
</body>
</html>`,
                    versions: [],
                    activeVersionIndex: 0,
                  };
                  setActiveArtifact(fallbackArtifact);
                }
                setIsArtifactPanelOpen(true);
              }}
              onOpenEnv={() => setIsEnvOpen(true)}
              onOpenDatabase={() => setIsDatabaseOpen(true)}
              onOpenAssets={() => setIsAssetsOpen(true)}
              onOpenErrors={() => setIsErrorsOpen(true)}
              targetPlatform={targetPlatform}
              onTogglePlatform={setTargetPlatform}
            />
          </div>

          {/* Artifact Side-by-Side Panel */}
          {isArtifactPanelOpen && activeArtifact && (
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => setIsArtifactPanelOpen(false)}
              onUpdateArtifact={handleUpdateArtifact}
              onRequestChange={(prompt) => handleSendMessage(prompt)}
              isAiGenerating={isCurrentSessionLoading}
              initialPlatform={targetPlatform}
            />
          )}
        </div>
        </>
      )}
    </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemPrompt={systemPrompt}
        onSaveSystemPrompt={(p) => {
          setSystemPrompt(p);
          localStorage.setItem(STORAGE_KEY_SYSTEM_PROMPT, p);
        }}
        onClearAllSessions={handleClearAllSessions}
      />

      {/* Env Variables Modal ([ 🔑 Env ] Chip) */}
      <EnvModal
        isOpen={isEnvOpen}
        onClose={() => setIsEnvOpen(false)}
      />

      {/* Database Explorer Modal ([ 🗄️ Database ] Chip) */}
      <DatabaseModal
        isOpen={isDatabaseOpen}
        onClose={() => setIsDatabaseOpen(false)}
        currentUser={currentUser}
        sessions={sessions}
        activeSessionId={activeSessionId}
        activeArtifact={activeArtifact}
        targetPlatform={targetPlatform}
        userId={currentUser?.id}
      />

      {/* Project Assets Modal ([ 🖼️ Assets ] Toolbar Button) */}
      <AssetsModal
        isOpen={isAssetsOpen}
        onClose={() => setIsAssetsOpen(false)}
        onInsertAsset={(assetTag) => handleSendMessage(assetTag, [], false)}
      />

      {/* Errors & Diagnostics Modal ([ 🪲 Errors ] Toolbar Button) */}
      <ErrorsModal
        isOpen={isErrorsOpen}
        onClose={() => setIsErrorsOpen(false)}
        runtimeErrors={runtimeErrors}
        onClearErrors={() => setRuntimeErrors([])}
        onDiagnoseWithAi={(prompt) => handleSendMessage(prompt, [], false)}
      />

    </div>
  );
}
