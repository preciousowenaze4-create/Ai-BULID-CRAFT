import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, X, RotateCcw } from 'lucide-react';

export interface ToastNotice {
  id: string;
  type: 'offline' | 'slow_network' | 'restored' | 'error';
  message: string;
  onRetry?: () => void;
  autoDismiss?: number;
}

interface NetworkToastProps {
  notice: ToastNotice | null;
  onDismiss: () => void;
}

export const NetworkToast: React.FC<NetworkToastProps> = ({ notice, onDismiss }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });

  const [offlineNotice, setOfflineNotice] = useState<ToastNotice | null>(null);

  // Global browser online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineNotice({
        id: 'online-restored',
        type: 'restored',
        message: 'Internet connection restored',
        autoDismiss: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineNotice({
        id: 'offline-alert',
        type: 'offline',
        message: 'No internet connection. Waiting to reconnect...',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeNotice = notice || offlineNotice;

  useEffect(() => {
    if (activeNotice?.autoDismiss) {
      const timer = setTimeout(() => {
        if (activeNotice.id === offlineNotice?.id) {
          setOfflineNotice(null);
        } else {
          onDismiss();
        }
      }, activeNotice.autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [activeNotice, onDismiss, offlineNotice?.id]);

  if (!activeNotice) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-70 flex justify-center px-4 pointer-events-none transition-all duration-200">
      <div
        role="alert"
        className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border animate-in slide-in-from-top-4 fade-in duration-200 max-w-md ${
          activeNotice.type === 'offline'
            ? 'bg-rose-500/90 text-white border-rose-400/40 shadow-rose-950/20'
            : activeNotice.type === 'slow_network'
            ? 'bg-amber-500/95 text-white border-amber-400/40 shadow-amber-950/20'
            : activeNotice.type === 'restored'
            ? 'bg-emerald-600/95 text-white border-emerald-400/40 shadow-emerald-950/20'
            : 'bg-neutral-900/95 text-neutral-100 border-neutral-700/60 shadow-black/40'
        }`}
      >
        {activeNotice.type === 'offline' && <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />}
        {activeNotice.type === 'slow_network' && (
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
        )}
        {activeNotice.type === 'restored' && <Wifi className="w-3.5 h-3.5 shrink-0" />}

        <span className="truncate">{activeNotice.message}</span>

        {activeNotice.onRetry && (
          <button
            onClick={() => {
              activeNotice.onRetry?.();
              onDismiss();
            }}
            className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-semibold tracking-wide transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}

        <button
          onClick={() => {
            if (activeNotice.id === offlineNotice?.id) {
              setOfflineNotice(null);
            } else {
              onDismiss();
            }
          }}
          className="p-0.5 rounded-full hover:bg-black/10 transition-colors opacity-80 hover:opacity-100 shrink-0 ml-0.5"
          aria-label="Dismiss notice"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
