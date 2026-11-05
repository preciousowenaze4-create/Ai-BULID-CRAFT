import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Check,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  CreditCard,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AuthUser } from '../types.ts';
import { addUserTokens } from '../lib/tokens.ts';

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  tokensFormatted: string;
  priceNgn: number;
  priceFormatted: string;
  badge?: string;
  popular?: boolean;
  description?: string;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 5000,
    tokensFormatted: '5,000 Tokens',
    priceNgn: 16000,
    priceFormatted: '₦16,000',
    description: 'Perfect for quick tools, small scripts & components',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    tokens: 12000,
    tokensFormatted: '12,000 Tokens',
    priceNgn: 50000,
    priceFormatted: '₦50,000',
    description: 'Ideal for frequent app builders & iterations',
  },
  {
    id: 'master',
    name: 'Master Build Pack',
    tokens: 18000,
    tokensFormatted: '18,000 Tokens',
    priceNgn: 65000,
    priceFormatted: '₦65,000',
    badge: 'Popular',
    popular: true,
    description: 'Our most popular choice for multi-page apps',
  },
  {
    id: 'elite',
    name: 'Elite Pack',
    tokens: 24000,
    tokensFormatted: '24,000 Tokens',
    priceNgn: 75000,
    priceFormatted: '₦75,000',
    description: 'High capacity for complex full-stack apps',
  },
  {
    id: 'ai-buildcraft-pro',
    name: 'AI BuildCraft Pro',
    tokens: 32000,
    tokensFormatted: '32,000 Tokens',
    priceNgn: 99000,
    priceFormatted: '₦99,000',
    badge: 'Recommended',
    description: 'Studio power with deep thinking & screenshot analysis',
  },
  {
    id: 'ai-buildcraft-max',
    name: 'AI BuildCraft Max',
    tokens: 40000,
    tokensFormatted: '40,000 Tokens',
    priceNgn: 150000,
    priceFormatted: '₦150,000',
    description: 'Heavy production generation & extensive simulations',
  },
  {
    id: 'ai-buildcraft-enterprise',
    name: 'AI BuildCraft Enterprise',
    tokens: 48000,
    tokensFormatted: '48,000 Tokens',
    priceNgn: 300000,
    priceFormatted: '₦300,000',
    badge: 'Best Value',
    description: 'Maximum volume for production teams & deployment scale',
  },
];

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  tokenBalance: number;
  onTokensUpdated?: (newBalance: number) => void;
}

export const TokenPurchaseModal: React.FC<TokenPurchaseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  tokenBalance,
  onTokensUpdated,
}) => {
  if (!isOpen) return null;

  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(TOKEN_PACKAGES[2]); // Master Build Pack default
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ tokens: number; newBalance: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userEmail = currentUser?.email || 'ddkidcast@gmail.com';
  const userId = currentUser?.id || 'usr_current_user';

  const handleCheckout = async (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. Initialize Paystack transaction on backend
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          amount: pkg.priceNgn,
          tokens: pkg.tokens,
          tierId: pkg.id,
          userId,
        }),
      });

      const initData = await initRes.json().catch(() => ({}));

      // 2. Load and trigger Paystack Popup if public key or access code available
      let verified = false;
      const paystackPublicKey =
        initData.publicKey ||
        (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || (import.meta.env as any).PAYSTACK_PUBLIC_KEY)) ||
        '';

      if (paystackPublicKey && (window as any).PaystackPop) {
        // Use Paystack Popup
        await new Promise<void>((resolve, reject) => {
          const handler = (window as any).PaystackPop.setup({
            key: paystackPublicKey,
            email: userEmail,
            amount: pkg.priceNgn * 100,
            currency: 'NGN',
            ref: initData.reference || 'pstk_' + Date.now(),
            metadata: {
              userId,
              tokens: pkg.tokens,
              tierId: pkg.id,
            },
            callback: async (response: any) => {
              try {
                // Verify via backend
                const verifyRes = await fetch('/api/paystack/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reference: response.reference || initData.reference,
                    userId,
                    tokens: pkg.tokens,
                  }),
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                  verified = true;
                  resolve();
                } else {
                  reject(new Error(verifyData.error || 'Verification failed'));
                }
              } catch (e) {
                reject(e);
              }
            },
            onClose: () => {
              reject(new Error('Payment window closed'));
            },
          });
          handler.openIframe();
        });
      } else {
        // Fallback: Verify directly through backend transaction verification
        const verifyRes = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: initData.reference || 'pstk_ref_' + Date.now(),
            userId,
            tokens: pkg.tokens,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          verified = true;
        } else {
          throw new Error(verifyData.error || 'Payment could not be completed');
        }
      }

      if (verified) {
        // Immediate client balance sync & celebration
        const newBal = await addUserTokens(userId, pkg.tokens);
        if (onTokensUpdated) onTokensUpdated(newBal);

        setSuccessInfo({ tokens: pkg.tokens, newBalance: newBal });
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
        });
      }
    } catch (err: any) {
      if (err.message !== 'Payment window closed') {
        console.warn('Paystack checkout note:', err.message);
        setErrorMsg(err.message || 'Unable to connect to Paystack payment gateway');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl max-h-[92dvh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-neutral-900 border-t sm:border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/80 dark:bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Purchase Tokens
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Paystack
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Instant top-up synced with your Supabase account
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="px-5 py-3 bg-neutral-100/70 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Current Available Balance:
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{tokenBalance.toLocaleString()} Tokens</span>
            </div>
          </div>

          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Live Sync
          </span>
        </div>

        {/* Success Alert Banner */}
        {successInfo && (
          <div className="m-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">Payment Successful!</h4>
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                <strong>+{successInfo.tokens.toLocaleString()} Tokens</strong> have been credited to your account. Your new balance is{' '}
                <strong>{successInfo.newBalance.toLocaleString()} Tokens</strong>.
              </p>
            </div>
            <button
              onClick={() => setSuccessInfo(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="m-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Token Packages Lineup */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Select Token Package
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              7 Tiers Available
            </span>
          </div>

          <div className="space-y-2.5">
            {TOKEN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.id === pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full p-4 rounded-2xl border transition-all cursor-pointer relative flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  {/* Left Column: Name, Tokens (Top in Bold), Price (Directly Below it) */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                        {pkg.name}
                      </span>
                      {pkg.badge && (
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                            pkg.popular
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {pkg.badge}
                        </span>
                      )}
                    </div>

                    {/* TOKEN QUANTITY MUST BE POSITIONED AT THE TOP IN BOLD */}
                    <div className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono tracking-tight">
                      {pkg.tokensFormatted}
                    </div>

                    {/* PRICE AMOUNT MUST BE POSITIONED DIRECTLY BELOW IT */}
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {pkg.priceFormatted}
                    </div>

                    {pkg.description && (
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 line-clamp-1">
                        {pkg.description}
                      </p>
                    )}
                  </div>

                  {/* Right Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckout(pkg);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                        isSelected
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                          : 'bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900'
                      }`}
                    >
                      {isProcessing && selectedPackage.id === pkg.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Pay with Paystack</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info & Security note */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/80 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-neutral-400" />
            <span>256-Bit SSL Encrypted via Paystack Gateway</span>
          </div>

          <span className="font-semibold text-neutral-700 dark:text-neutral-300 font-mono">
            NGN (₦) Currency
          </span>
        </div>

      </div>
    </div>
  );
};
