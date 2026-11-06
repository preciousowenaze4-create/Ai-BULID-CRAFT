import { supabase } from './supabase.ts';

export interface UserTokenRecord {
  id?: string;
  created_at?: string;
  user_id: string;
  count: number;
}

const DEFAULT_INITIAL_TOKENS = 500;

/**
 * Fetch or initialize the user's token balance from the Supabase `user_tokens` table.
 * Strictly respects 0 balance so users who finish their tokens stay at 0 even after
 * logging out, logging back in, or reinstalling.
 */
export async function getUserTokens(userId: string): Promise<number> {
  if (!userId) return DEFAULT_INITIAL_TOKENS;

  const storageKey = `user_tokens_${userId}`;

  try {
    const { data, error } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase get user_tokens query note:', error.message);
      const cached = localStorage.getItem(storageKey);
      if (cached !== null) {
        return parseInt(cached, 10);
      }
      return DEFAULT_INITIAL_TOKENS;
    }

    if (data) {
      // Check column 'count' (user's Supabase schema) with fallback to 'token_balance'
      const resolved = typeof data.count === 'number'
        ? data.count
        : typeof data.token_balance === 'number'
        ? data.token_balance
        : null;

      if (resolved !== null) {
        localStorage.setItem(storageKey, String(resolved));
        return resolved;
      }
    }

    // No row found for user: initialize new user in user_tokens table with default 500 tokens
    const { data: inserted, error: insertError } = await supabase
      .from('user_tokens')
      .insert({
        user_id: userId,
        count: DEFAULT_INITIAL_TOKENS,
      })
      .select('*')
      .single();

    if (insertError) {
      console.warn('Supabase insert user_tokens note:', insertError.message);
      const cached = localStorage.getItem(storageKey);
      return cached !== null ? parseInt(cached, 10) : DEFAULT_INITIAL_TOKENS;
    }

    const initial = inserted?.count ?? inserted?.token_balance ?? DEFAULT_INITIAL_TOKENS;
    localStorage.setItem(storageKey, String(initial));
    return initial;
  } catch (err) {
    console.warn('Error accessing user_tokens table:', err);
    const cached = localStorage.getItem(storageKey);
    return cached !== null ? parseInt(cached, 10) : DEFAULT_INITIAL_TOKENS;
  }
}

/**
 * Deduct tokens for the user and persist immediately to Supabase `user_tokens` table.
 */
export async function deductUserTokens(userId: string, amount: number = 1): Promise<number> {
  if (!userId) return DEFAULT_INITIAL_TOKENS;
  const storageKey = `user_tokens_${userId}`;

  try {
    const currentBalance = await getUserTokens(userId);
    const newBalance = Math.max(0, currentBalance - amount);

    await supabase
      .from('user_tokens')
      .update({ count: newBalance })
      .eq('user_id', userId);

    localStorage.setItem(storageKey, String(newBalance));

    // Dispatch global event so UI components react in real-time
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tokens-updated', {
          detail: { userId, balance: newBalance },
        })
      );
    }

    return newBalance;
  } catch (err) {
    console.warn('Error updating user_tokens:', err);
    const cached = localStorage.getItem(storageKey);
    const fallback = cached !== null ? Math.max(0, parseInt(cached, 10) - amount) : 0;
    localStorage.setItem(storageKey, String(fallback));
    return fallback;
  }
}

/**
 * Directly synchronize token balance to Supabase `user_tokens` table.
 * Used during real-time streaming burning as the AI generates code fast.
 */
export async function syncUserTokenBalance(userId: string, balance: number): Promise<void> {
  if (!userId) return;
  const storageKey = `user_tokens_${userId}`;
  const safeBalance = Math.max(0, Math.floor(balance));

  localStorage.setItem(storageKey, String(safeBalance));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tokens-updated', {
        detail: { userId, balance: safeBalance },
      })
    );
  }

  try {
    await supabase
      .from('user_tokens')
      .update({ count: safeBalance })
      .eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase syncUserTokenBalance note:', err);
  }
}

/**
 * Add tokens to a user's account balance in the Supabase `user_tokens` table.
 * Used for payment recharges, token top-ups, and promo allocations.
 */
export async function addUserTokens(userId: string, amount: number): Promise<number> {
  if (!userId || amount <= 0) return DEFAULT_INITIAL_TOKENS;
  const storageKey = `user_tokens_${userId}`;

  try {
    const currentBalance = await getUserTokens(userId);
    const newBalance = currentBalance + amount;

    await supabase
      .from('user_tokens')
      .update({ count: newBalance })
      .eq('user_id', userId);

    localStorage.setItem(storageKey, String(newBalance));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tokens-updated', {
          detail: { userId, balance: newBalance },
        })
      );
    }

    return newBalance;
  } catch (err) {
    console.warn('Error adding user_tokens:', err);
    const cached = localStorage.getItem(storageKey);
    const fallback = (cached !== null ? parseInt(cached, 10) : DEFAULT_INITIAL_TOKENS) + amount;
    localStorage.setItem(storageKey, String(fallback));
    return fallback;
  }
}

/**
 * Ensure user login info and token record are initialized upon sign-in.
 */
export async function ensureUserRecord(user: { id: string; email?: string; name?: string }) {
  if (!user?.id) return;
  try {
    // 1. Ensure user token row exists in `user_tokens`
    await getUserTokens(user.id);
  } catch (e) {
    console.warn('User record sync note:', e);
  }
}

