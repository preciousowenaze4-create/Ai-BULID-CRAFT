import { supabase } from './supabase.ts';

export interface UserTokenRecord {
  id?: string;
  created_at?: string;
  user_id: string;
  token_balance: number;
}

const DEFAULT_INITIAL_TOKENS = 500;

/**
 * Fetch or initialize the user's token balance from the Supabase `user_tokens` table.
 * Defaults to 500 tokens if no record exists yet.
 */
export async function getUserTokens(userId: string): Promise<number> {
  if (!userId) return DEFAULT_INITIAL_TOKENS;

  const storageKey = `user_tokens_${userId}`;

  try {
    const { data, error } = await supabase
      .from('user_tokens')
      .select('token_balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase get user_tokens query note:', error.message);
      const cached = localStorage.getItem(storageKey);
      return cached ? parseInt(cached, 10) : DEFAULT_INITIAL_TOKENS;
    }

    if (data && typeof data.token_balance === 'number') {
      localStorage.setItem(storageKey, String(data.token_balance));
      return data.token_balance;
    }

    // No row found: initialize user in user_tokens table with default 500 tokens
    const { data: inserted, error: insertError } = await supabase
      .from('user_tokens')
      .insert({
        user_id: userId,
        token_balance: DEFAULT_INITIAL_TOKENS,
      })
      .select('token_balance')
      .single();

    if (insertError) {
      console.warn('Supabase insert user_tokens note:', insertError.message);
      return DEFAULT_INITIAL_TOKENS;
    }

    const initial = inserted?.token_balance ?? DEFAULT_INITIAL_TOKENS;
    localStorage.setItem(storageKey, String(initial));
    return initial;
  } catch (err) {
    console.warn('Error accessing user_tokens table:', err);
    const cached = localStorage.getItem(storageKey);
    return cached ? parseInt(cached, 10) : DEFAULT_INITIAL_TOKENS;
  }
}

/**
 * Deduct tokens for the user and persist to the Supabase `user_tokens` table.
 */
export async function deductUserTokens(userId: string, amount: number = 1): Promise<number> {
  if (!userId) return DEFAULT_INITIAL_TOKENS;
  const storageKey = `user_tokens_${userId}`;

  try {
    const currentBalance = await getUserTokens(userId);
    const newBalance = Math.max(0, currentBalance - amount);

    const { error } = await supabase
      .from('user_tokens')
      .update({ token_balance: newBalance })
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase update user_tokens note:', error.message);
    }

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
    const fallback = cached ? Math.max(0, parseInt(cached, 10) - amount) : DEFAULT_INITIAL_TOKENS;
    localStorage.setItem(storageKey, String(fallback));
    return fallback;
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

    const { error } = await supabase
      .from('user_tokens')
      .update({ token_balance: newBalance })
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase top-up user_tokens note:', error.message);
    }

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
    const fallback = (cached ? parseInt(cached, 10) : DEFAULT_INITIAL_TOKENS) + amount;
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

