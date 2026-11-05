import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA on the home screen, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-opacity shadow-xs"
        title="Add to Home Screen"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Add to Home Screen (iOS)"
        >
          <Share className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="/brand-logo.png"
                    alt="AI BuildCraft"
                    className="w-7 h-7 object-contain shrink-0 select-none"
                  />
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Add to iPhone / iPad Home Screen
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-[10px]">
                    1
                  </span>
                  <p>
                    Tap the <strong>Share</strong> button <Share className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" /> in your Safari navigation bar at the bottom.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-[10px]">
                    2
                  </span>
                  <p>
                    Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 mx-0.5" />.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-[10px]">
                    3
                  </span>
                  <p>
                    Tap <strong>Add</strong> in the top right. The app will launch in standalone full-screen mode like a native app!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-neutral-900 dark:bg-neutral-100 py-2.5 text-xs font-medium text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
