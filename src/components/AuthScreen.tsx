import React, { useState, useEffect } from 'react';
import { Mail, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AuthUser, isOwnerEmail } from '../types.ts';
import { supabase } from '../lib/supabase.ts';

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

function createAuthUserRecord(id: string, email: string, rawName?: string, rawAvatar?: string, provider: 'google' | 'apple' | 'email' = 'google'): AuthUser {
  const isOwner = isOwnerEmail(email);
  return {
    id,
    email: email.trim(),
    name: isOwner ? 'Precious' : rawName || email.split('@')[0] || 'User',
    avatar: rawAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(isOwner ? 'Precious' : email || 'user')}`,
    provider,
    role: isOwner ? 'owner' : 'user',
    isOwner,
  };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  // 'social' (Image 1) or 'email' (Image 2)
  const [view, setView] = useState<'social' | 'email'>('social');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Independent loading state: only the tapped button shows loading!
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | 'email' | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Listen for Supabase redirect callback & active session
  useEffect(() => {
    // 1. Listen for Supabase auth state change (runs after redirect back to window.location.origin)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const user = createAuthUserRecord(
          u.id,
          u.email || '',
          u.user_metadata?.full_name || u.user_metadata?.name,
          u.user_metadata?.avatar_url,
          'google'
        );
        // Clean URL hash/search if OAuth tokens are present
        if (window.location.hash || window.location.search.includes('code=')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        onAuthenticated(user);
      }
    });

    // 2. Also check if active session already exists on load
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('Session check error:', sessionError.message);
      } else if (session?.user) {
        const u = session.user;
        const user = createAuthUserRecord(
          u.id,
          u.email || '',
          u.user_metadata?.full_name || u.user_metadata?.name,
          u.user_metadata?.avatar_url,
          'google'
        );
        onAuthenticated(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onAuthenticated]);

  // 1. Real Google Login: Uses Supabase redirect mode with dynamic window.location.origin
  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    setError(null);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`
      }
    });

    if (error) {
      console.error('Error logging in:', error.message);
      setError(error.message);
      setLoadingProvider(null);
    }
  };

  // 2. Apple Login: Only Apple loads
  const handleAppleLogin = async () => {
    setLoadingProvider('apple');
    setError(null);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}`
      }
    });

    if (error) {
      console.error('Apple login error:', error.message);
      setError('Apple authentication is currently unavailable');
      setLoadingProvider(null);
    }
  };

  // 3. Email Login / Sign Up Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoadingProvider('email');
    setError(null);

    try {
      if (emailMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim() || email.trim().split('@')[0],
            },
          },
        });

        if (error) throw error;
        if (data?.user) {
          onAuthenticated(createAuthUserRecord(
            data.user.id,
            data.user.email || email.trim(),
            data.user.user_metadata?.name || email.trim().split('@')[0],
            undefined,
            'email'
          ));
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        if (data?.user) {
          onAuthenticated(createAuthUserRecord(
            data.user.id,
            data.user.email || email.trim(),
            data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.trim().split('@')[0],
            data.user.user_metadata?.avatar_url,
            'email'
          ));
          return;
        }
      }
    } catch (err: any) {
      // Fallback to server route if direct client Supabase encounters network restrictions
      try {
        const endpoint = emailMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Authentication failed');
        if (d.user) {
          onAuthenticated(d.user);
          return;
        }
      } catch (fallbackErr: any) {
        setError(err.message || fallbackErr.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      setError('Please enter your email to receive reset instructions');
      return;
    }
    setError(null);
    setForgotSent(true);
    setTimeout(() => setForgotSent(false), 4000);
  };

  // =========================================================================
  // Screen 1: Welcome to AI Chatbot (Fixed static mobile layout)
  // =========================================================================
  if (view === 'social') {
    return (
      <div
        className="fixed inset-0 w-screen h-screen h-dvh bg-black text-white flex flex-col justify-between items-center select-none overflow-hidden overscroll-none touch-none px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] font-sans z-50"
        style={{ backgroundColor: '#000000' }}
        onTouchMove={(e) => e.preventDefault()}
      >
        {/* Subtle Background Code Watermarks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 select-none font-mono text-[11px]">
          <span className="absolute top-[8%] left-[48%] text-emerald-400">++ 0x=&gt;</span>
          <span className="absolute top-[20%] left-[16%] text-purple-400">$$</span>
          <span className="absolute top-[16%] left-[53%] text-neutral-400">00</span>
          <span className="absolute top-[22%] left-[34%] text-blue-400">01</span>
          <span className="absolute top-[30%] left-[27%] text-purple-400">**</span>
          <span className="absolute top-[32%] right-[15%] text-purple-400">=*=&gt;</span>
          <span className="absolute top-[34%] left-[6%] text-neutral-500">B2</span>
          <span className="absolute top-[42%] left-[53%] text-neutral-500">11</span>
          <span className="absolute top-[50%] left-[38%] text-cyan-400">&lt; / &gt;</span>
          <span className="absolute top-[54%] left-[34%] text-purple-400">** A1</span>
          <span className="absolute top-[52%] right-[14%] text-purple-400">$$</span>
          <span className="absolute top-[56%] right-[32%] text-neutral-500">A1</span>
          <span className="absolute top-[58%] left-[43%] text-neutral-500">FF</span>
          <span className="absolute top-[60%] right-[28%] text-neutral-400">**</span>
          <span className="absolute top-[60%] left-[34%] text-emerald-500 text-base">||</span>
          <span className="absolute top-[78%] left-[22%] text-blue-500 text-base">[]</span>
          <span className="absolute bottom-[16%] right-[14%] text-emerald-400">=&gt;</span>
          <span className="absolute bottom-[16%] left-[7%] text-neutral-500">10</span>
        </div>

        {/* Top spacer to balance layout */}
        <div className="w-full h-2 shrink-0 bg-transparent" />

        {/* Center Content Box (Centered and static, perfectly fitting mobile viewport) */}
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center my-auto shrink-0">
          {/* Master Blue and Black Abstract 'A' Logo (Rendered seamlessly without any background box/square) */}
          <div className="mb-5 flex items-center justify-center">
            <img
              src="/brand-logo.png"
              alt="AI BuildCraft Logo"
              className="w-20 h-20 object-contain drop-shadow-[0_0_25px_rgba(0,102,255,0.4)] select-none"
            />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-6 tracking-tight">
            Welcome to AI BuildCraft
          </h1>

          {/* Error Message if any */}
          {error && (
            <div className="w-full mb-3.5 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="break-words leading-tight text-[11px]">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="p-1 text-rose-400 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {/* Continue with Google (ONLY Google shows spinner when loading) */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-[#242529] hover:bg-[#2c2d33] border border-neutral-700/60 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-75"
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{loadingProvider === 'google' ? 'Redirecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Continue with Apple (Never shows spinner when Google is loading!) */}
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-[#242529] hover:bg-[#2c2d33] border border-neutral-700/60 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-75"
            >
              {loadingProvider === 'apple' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 shrink-0 fill-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.59-7.71-11.72-14.01-6-9.14-10.74-19.11-14.23-29.91-3.48-10.8-5.22-21.35-5.22-31.65 0-14.57 3.73-26.68 11.2-36.33 7.46-9.65 16.92-14.58 28.37-14.78 4.79 0 10.22 1.25 16.29 3.75 6.07 2.5 10.15 3.79 12.24 3.88 1.63 0 5.86-1.35 12.69-4.04 6.83-2.7 12.77-3.9 17.82-3.6 13.26.82 23.63 5.48 31.11 13.99-11.74 7.07-17.41 16.74-17.02 28.99.38 9.57 4.13 17.55 11.25 23.94 7.12 6.39 15.42 10.12 24.89 11.19-2.17 6.42-4.78 12.67-7.82 18.77zm-30.8-107.03c0 7.39-2.72 14.37-8.16 20.93-5.44 6.56-12.29 10.55-20.55 11.96-.22-1.3-.33-2.49-.33-3.58 0-7.39 2.94-14.47 8.81-21.25 5.87-6.78 12.83-10.65 20.89-11.61.22 1.19.34 2.37.34 3.55z" />
                </svg>
              )}
              <span>Continue with Apple</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-neutral-800 w-full" />
              <span className="bg-black px-3 font-mono text-[11px] text-neutral-500 uppercase tracking-widest">
                OR
              </span>
              <div className="border-t border-neutral-800 w-full" />
            </div>

            {/* Continue with Email */}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setView('email');
              }}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-[#242529] hover:bg-[#2c2d33] border border-neutral-700/60 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-75"
            >
              <Mail className="w-4 h-4 text-neutral-300" />
              <span>Continue with Email</span>
            </button>
          </div>
        </div>

        {/* Bottom spacer / safe area */}
        <div className="w-full h-2 shrink-0 bg-transparent" />
      </div>
    );
  }

  // =========================================================================
  // Screen 2: Sign In / Sign Up with Email (Static Mobile View)
  // =========================================================================
  return (
    <div
      className="fixed inset-0 w-screen h-screen h-dvh bg-black text-neutral-100 flex flex-col justify-between items-center select-none overflow-hidden overscroll-none px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] font-sans z-50"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Subtle Background Code Watermarks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 select-none font-mono text-[11px]">
        <span className="absolute top-[8%] left-[48%] text-blue-400">&lt; / &gt;</span>
        <span className="absolute top-[12%] left-[36%] text-purple-400">$$</span>
        <span className="absolute top-[18%] left-[16%] text-neutral-400">11</span>
        <span className="absolute top-[20%] right-[32%] text-blue-400">[]</span>
        <span className="absolute top-[28%] left-[20%] text-cyan-400">%%</span>
        <span className="absolute top-[28%] left-[31%] text-emerald-400">=&gt;</span>
        <span className="absolute top-[48%] left-[50%] text-blue-400">[]</span>
        <span className="absolute top-[58%] left-[43%] text-neutral-400">++</span>
        <span className="absolute top-[64%] left-[48%] text-blue-400">{}</span>
        <span className="absolute bottom-[14%] right-[20%] text-emerald-400">//</span>
      </div>

      <div className="w-full h-2 shrink-0 bg-transparent" />

      {/* Content Box */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center my-auto shrink-0">
        {/* Master Brand Logo */}
        <div className="mb-4 flex items-center justify-center">
          <img
            src="/brand-logo.png"
            alt="AI BuildCraft"
            className="w-14 h-14 object-contain drop-shadow-[0_0_20px_rgba(0,102,255,0.35)] select-none"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white text-center mb-5 tracking-tight">
          {emailMode === 'signin' ? 'Sign in with Email' : 'Create your Account'}
        </h1>

        {/* Alert Messages */}
        {error && (
          <div className="w-full mb-3.5 p-3 rounded-xl bg-rose-950/80 border border-rose-900 text-rose-300 text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="break-words text-[11px] leading-tight">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-1 text-rose-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {forgotSent && (
          <div className="w-full mb-3.5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-[11px]">Password reset instructions sent to your email</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailSubmit} className="w-full space-y-3.5">
          {emailMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-neutral-800 bg-[#18181b] text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-neutral-800 bg-[#18181b] text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-2xl border border-neutral-800 bg-[#18181b] text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password link */}
          {emailMode === 'signin' && (
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-[#00D26A] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Big Green Sign In Button */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={loadingProvider !== null}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#3bf187] hover:bg-[#34db7a] active:bg-[#2ecc71] text-neutral-900 font-bold text-sm tracking-wide transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingProvider === 'email' && <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />}
              <span>{emailMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            </button>
          </div>
        </form>

        {/* Switcher */}
        <div className="mt-4 text-xs text-neutral-400 text-center">
          <span>
            {emailMode === 'signin'
              ? "Don't have an account?"
              : 'Already have an account?'}
          </span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEmailMode(emailMode === 'signin' ? 'signup' : 'signin');
            }}
            className="ml-1.5 font-bold text-[#00D26A] hover:underline cursor-pointer"
          >
            {emailMode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Back to Sign In Options Link */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setView('social');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#00D26A] hover:underline cursor-pointer py-1 px-3 rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In Options</span>
          </button>
        </div>
      </div>

      <div className="w-full h-2 shrink-0 bg-transparent" />
    </div>
  );
};
