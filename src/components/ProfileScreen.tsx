import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gift,
  Trophy,
  Rocket,
  Wallet,
  Bell,
  Key,
  Star,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  X,
  LogOut,
  Moon,
  Sun,
  Globe,
  Shield,
  Zap,
  Smartphone,
  Layers,
  Database,
  Cpu,
} from 'lucide-react';
import { AuthUser } from '../types.ts';
import { TokenPurchaseModal } from './TokenPurchaseModal.tsx';

interface ProfileScreenProps {
  currentUser: AuthUser | null;
  tokenBalance: number;
  onBack: () => void;
  onSignOut?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenDatabase?: () => void;
  onTokensUpdated?: (newBalance: number) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  tokenBalance = 1000,
  onBack,
  onSignOut,
  theme = 'light',
  onToggleTheme,
  onOpenDatabase,
  onTokensUpdated,
}) => {
  // Modal states for rich interactive features
  const [activeModal, setActiveModal] = useState<
    'credits' | 'invite' | 'showcase' | 'deployment' | 'payment' | 'notifications' | 'account' | 'rate' | 'help' | null
  >(null);

  // Referral link copied state
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Notification toggles
  const [notifications, setNotifications] = useState({
    buildComplete: true,
    errorAlerts: true,
    weeklyUpdates: false,
  });

  // Rating state
  const [rating, setRating] = useState(5);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const userName = currentUser?.name || 'Precious Ddkid';
  const userEmail = currentUser?.email || 'preciousddkid@gmail.com';
  const userInitial = (userName[0] || 'P').toUpperCase();

  const handleCopyInvite = () => {
    const inviteLink = `https://aibuildcraft.app/join?ref=${encodeURIComponent(userName.toLowerCase().replace(/\s+/g, ''))}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none overflow-hidden relative">
      {/* Top Header with Back Navigation */}
      <header className="px-5 pt-[max(env(safe-area-inset-top,0px),16px)] pb-2 flex items-center justify-between z-30 shrink-0 bg-white">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-neutral-100 text-neutral-900 active:scale-95 transition-all cursor-pointer touch-manipulation"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>

        <span className="text-base font-bold text-neutral-900 tracking-tight">
          Profile & Settings
        </span>

        {/* Balance spacer */}
        <div className="w-10" />
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-24 space-y-6">
        {/* User Account Info Header */}
        <div className="flex items-center gap-4 pt-1">
          {/* Avatar with purple gradient / image */}
          <div className="w-16 h-16 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={userName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 truncate">
                {userName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                PRO
              </span>
            </div>
            <p className="text-xs text-neutral-500 truncate mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* Credit / Token Balance Card */}
        <div
          onClick={() => setActiveModal('credits')}
          className="w-full rounded-2xl border border-neutral-200/90 bg-white p-4 flex items-center justify-between shadow-xs hover:border-neutral-300 transition-all cursor-pointer active:scale-[0.99] touch-manipulation group"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-neutral-800" />
            <span className="font-bold text-neutral-900 text-sm sm:text-base">Credits</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-900 font-bold text-xs sm:text-sm font-mono">
              <Sparkles className="w-3.5 h-3.5 fill-neutral-900 text-neutral-900" />
              <span>{tokenBalance.toLocaleString()}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* SECTION 1: AI BUILDCRAFT */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
            AI BuildCraft
          </h3>
          <div className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden divide-y divide-neutral-100 shadow-xs">
            {/* Invite Friends */}
            <button
              type="button"
              onClick={() => setActiveModal('invite')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-neutral-800" />
                <span className="text-sm font-semibold text-neutral-900">Invite friends</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Showcase */}
            <button
              type="button"
              onClick={() => setActiveModal('showcase')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-neutral-800" />
                <span className="text-sm font-semibold text-neutral-900">Showcase</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* SECTION 2: PUBLISHING */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
            Publishing
          </h3>
          <div className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden divide-y divide-neutral-100 shadow-xs">
            {/* Deployment Setup */}
            <button
              type="button"
              onClick={() => setActiveModal('deployment')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5 text-neutral-800 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-neutral-900">Deployment Setup</span>
                  <span className="text-xs text-neutral-400">App Store & Play Store credentials</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
            </button>

            {/* Payment Setup */}
            <button
              type="button"
              onClick={() => setActiveModal('payment')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-neutral-800 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-neutral-900">Payment Setup</span>
                  <span className="text-xs text-neutral-400">In-App Purchases & Subscriptions</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* SECTION 3: GENERAL */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
            General
          </h3>
          <div className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden divide-y divide-neutral-100 shadow-xs">
            {/* Notifications */}
            <button
              type="button"
              onClick={() => setActiveModal('notifications')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-neutral-800" />
                <span className="text-sm font-semibold text-neutral-900">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Account */}
            <button
              type="button"
              onClick={() => setActiveModal('account')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-neutral-800" />
                <span className="text-sm font-semibold text-neutral-900">Account</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Database & Tokens Inspector */}
            {onOpenDatabase && (
              <button
                type="button"
                onClick={onOpenDatabase}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-neutral-900">Supabase Database</span>
                    <span className="text-xs text-neutral-400">user_tokens schema & balances</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {/* Theme Toggle */}
            {onToggleTheme && (
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-neutral-800" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                  <span className="text-sm font-semibold text-neutral-900">Dark Mode</span>
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    theme === 'dark' ? 'bg-neutral-900' : 'bg-neutral-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: SUPPORT */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
            Support
          </h3>
          <div className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden divide-y divide-neutral-100 shadow-xs">
            {/* Rate App */}
            <button
              type="button"
              onClick={() => setActiveModal('rate')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-neutral-800" />
                <span className="text-sm font-semibold text-neutral-900">Rate AI BuildCraft</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Help & Support */}
            <button
              type="button"
              onClick={() => setActiveModal('help')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-neutral-800" />
                <span className="text-sm font-semibold text-neutral-900">Help & Support</span>
              </div>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Sign Out Action Button */}
        {onSignOut && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 text-rose-600 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* Interactive Feature Modals                              */}
      {/* ======================================================== */}

      {/* 1. Scrollable Token Purchase Modal with Live Paystack Integration */}
      <TokenPurchaseModal
        isOpen={activeModal === 'credits'}
        onClose={() => setActiveModal(null)}
        currentUser={currentUser}
        tokenBalance={tokenBalance}
        onTokensUpdated={(newBal) => {
          if (onTokensUpdated) onTokensUpdated(newBal);
        }}
      />

      {/* 2. Invite Friends Modal */}
      {activeModal === 'invite' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Gift className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Invite Friends</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Share your invite link with collaborators and friends. Both of you receive <strong>+500 bonus tokens</strong> when they join!
            </p>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
              <span className="truncate flex-1 text-neutral-700 font-mono">
                https://aibuildcraft.app/join?ref={userName.toLowerCase().replace(/\s+/g, '')}
              </span>
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-semibold text-xs flex items-center gap-1 active:scale-95 transition-all"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedInvite ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 3. Showcase Modal */}
      {activeModal === 'showcase' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">App Showcase</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Explore standout interactive apps crafted using AI BuildCraft:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-neutral-900">Drum Machine Beat Maker</h4>
                  <span className="text-[11px] text-neutral-500">Synthesizer & BPM Sequencer</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Featured
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-neutral-900">Memory Card Match</h4>
                  <span className="text-[11px] text-neutral-500">Smooth flip animations & timer</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  Popular
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. Deployment Setup Modal */}
      {activeModal === 'deployment' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Rocket className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Deployment Setup</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Export and publish your app builds seamlessly:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-neutral-900 block">iOS Home Screen PWA</span>
                    <span className="text-[11px] text-neutral-500">Zero-install standalone web app</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Vercel & Custom Domain</span>
                    <span className="text-[11px] text-neutral-500">Configured via vercel.json</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Ready
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 5. Payment Setup Modal */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Payment Setup</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Monetize your interactive apps with subscriptions or token paywalls:
            </p>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Token Deduction</span>
                <span className="text-emerald-600 font-bold">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Stripe Integration</span>
                <span className="text-neutral-500">Ready to connect</span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}

      {/* 6. Notifications Modal */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Notifications</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                <div>
                  <span className="font-bold text-neutral-900 block">App Generation Complete</span>
                  <span className="text-neutral-500 text-[11px]">Haptic or sound alert when code finishes</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.buildComplete}
                  onChange={(e) => setNotifications({ ...notifications, buildComplete: e.target.checked })}
                  className="w-4 h-4 accent-neutral-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                <div>
                  <span className="font-bold text-neutral-900 block">Error Alerts</span>
                  <span className="text-neutral-500 text-[11px]">Notify if API rate limit or key error occurs</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.errorAlerts}
                  onChange={(e) => setNotifications({ ...notifications, errorAlerts: e.target.checked })}
                  className="w-4 h-4 accent-neutral-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="font-bold text-neutral-900 block">Weekly Digest</span>
                  <span className="text-neutral-500 text-[11px]">Summary of newly created apps</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.weeklyUpdates}
                  onChange={(e) => setNotifications({ ...notifications, weeklyUpdates: e.target.checked })}
                  className="w-4 h-4 accent-neutral-900 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 7. Account Modal */}
      {activeModal === 'account' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Account Security</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">User ID</span>
                <span className="font-mono text-neutral-800 break-all text-[11px]">
                  {currentUser?.id || 'usr_anonymous_demo'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Provider</span>
                <span className="font-semibold text-neutral-800 capitalize">
                  {currentUser?.provider || 'Google OAuth / Supabase'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 8. Rate App Modal */}
      {activeModal === 'rate' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Star className="w-6 h-6 fill-current" />
            </div>

            <h3 className="text-lg font-bold text-neutral-900">Enjoying AI BuildCraft?</h3>
            <p className="text-xs text-neutral-600">
              {ratingSubmitted
                ? 'Thank you for your rating and support!'
                : 'Tap a star to rate your experience building interactive web and mobile apps.'}
            </p>

            {!ratingSubmitted ? (
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 active:scale-125 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        s <= rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <button
              onClick={() => {
                if (!ratingSubmitted) {
                  setRatingSubmitted(true);
                  setTimeout(() => setActiveModal(null), 1500);
                } else {
                  setActiveModal(null);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              {ratingSubmitted ? 'Done' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}

      {/* 9. Help & Support Modal */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Help & Support</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-700">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <h4 className="font-bold text-neutral-900 mb-0.5">How do I export my app?</h4>
                <p className="text-[11px] text-neutral-500">
                  Tap &quot;Preview your app&quot; inside any chat, then click &quot;Export Code&quot; or save to your iOS home screen.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <h4 className="font-bold text-neutral-900 mb-0.5">Where is my data stored?</h4>
                <p className="text-[11px] text-neutral-500">
                  Your chat history and tokens are securely linked to your Supabase account.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
