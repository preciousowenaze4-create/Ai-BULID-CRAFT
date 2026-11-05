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
 * Guarantees a clean dashboard for new or separate user accounts.
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

  // Attempt to sync from Supabase if table exists
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
  } catch {
    // Table may not exist yet in schema cache, fallback to local storage
  }

  if (localSessions.length > 0) {
    return localSessions;
  }

  // Clean fresh session for new user
  const freshSession = createDefaultSession(defaultModel);
  localStorage.setItem(localKey, JSON.stringify([freshSession]));
  return [freshSession];
}

/**
 * Persist user's sessions to local scoped storage and sync with Supabase
 */
export async function saveUserSessions(userId: string, sessions: ChatSession[]): Promise<void> {
  const localKey = getUserStorageKey(userId);
  try {
    localStorage.setItem(localKey, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save user sessions to local storage:', e);
  }

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
