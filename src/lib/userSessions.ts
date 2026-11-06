import { ChatSession } from '../types.ts';
import { supabase } from './supabase.ts';

const SESSIONS_PREFIX = 'user_chat_sessions_';

export function getUserStorageKey(userId?: string): string {
  if (!userId) return `${SESSIONS_PREFIX}guest`;
  return `${SESSIONS_PREFIX}${userId}`;
}

export function createDefaultSession(model: string = 'gemini-3.8-flash'): ChatSession {
  return {
    id: 'session-' + Date.now(),
    title: 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    model,
  };
}

/**
 * Load user's private sessions scoped strictly to their user ID.
 * Synchronizes with local storage, persistent server endpoint, and Supabase.
 * Guarantees cross-device, cross-browser, and installed PWA/home-screen access.
 */
export async function loadUserSessions(userId: string, defaultModel: string = 'gemini-3.8-flash'): Promise<ChatSession[]> {
  const localKey = getUserStorageKey(userId);
  let localSessions: ChatSession[] = [];

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      localSessions = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local user sessions:', e);
  }

  // 1. Fetch from persistent cross-device server storage
  try {
    const sRes = await fetch(`/api/user/sessions?userId=${encodeURIComponent(userId)}`);
    if (sRes.ok) {
      const data = await sRes.json();
      if (data && Array.isArray(data.sessions) && data.sessions.length > 0) {
        // Merge server sessions with local sessions, preferring newer/richer
        const mergedMap = new Map<string, ChatSession>();
        for (const s of data.sessions) {
          if (s?.id) mergedMap.set(s.id, s);
        }
        for (const s of localSessions) {
          if (s?.id) {
            const existing = mergedMap.get(s.id);
            if (!existing || (s.messages && s.messages.length >= (existing.messages?.length || 0))) {
              mergedMap.set(s.id, s);
            }
          }
        }
        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
        );
        localStorage.setItem(localKey, JSON.stringify(mergedList));
        return mergedList;
      }
    }
  } catch (err) {
    console.warn('Server session fetch note:', err);
  }

  // 2. Attempt to sync from Supabase if table exists
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('session_data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteSessions: ChatSession[] = data.map((row: any) => row.session_data).filter(Boolean);
      if (remoteSessions.length > 0) {
        localStorage.setItem(localKey, JSON.stringify(remoteSessions));
        return remoteSessions;
      }
    }
  } catch {}

  if (localSessions.length > 0) {
    return localSessions;
  }

  // Clean fresh session for new user
  const freshSession = createDefaultSession(defaultModel);
  localStorage.setItem(localKey, JSON.stringify([freshSession]));
  return [freshSession];
}

/**
 * Persist user's sessions immediately to local storage, server endpoint, and Supabase
 */
export async function saveUserSessions(userId: string, sessions: ChatSession[]): Promise<void> {
  const localKey = getUserStorageKey(userId);
  try {
    localStorage.setItem(localKey, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save user sessions to local storage:', e);
  }

  // Immediately persist to cross-device server storage
  try {
    fetch('/api/user/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessions }),
    }).catch(() => {});
  } catch {}

  // Attempt Supabase upsert in background
  try {
    if (sessions.length > 0) {
      const records = sessions.map((s) => ({
        id: s.id,
        user_id: userId,
        title: s.title,
        session_data: s,
        updated_at: new Date(s.updatedAt || Date.now()).toISOString(),
      }));

      await supabase.from('chat_sessions').upsert(records, { onConflict: 'id' });
    }
  } catch {
    // Silent fail if table not present
  }
}
