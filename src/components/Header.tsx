import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  MoreHorizontal,
  Plus,
  PanelRightOpen,
  PanelRightClose,
  User,
  Settings,
  Database,
  Trash2,
} from 'lucide-react';
import { ModelOption, AuthUser } from '../types.ts';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenDashboard?: () => void;
  onOpenProfile?: () => void;
  onBackToDashboard?: () => void;
  hasStartedChat?: boolean;
  projectTitle?: string;
  models?: ModelOption[];
  currentModel?: string;
  onSelectModel?: (modelId: string) => void;
  onNewChat?: () => void;
  hasArtifact?: boolean;
  isArtifactPanelOpen?: boolean;
  onToggleArtifactPanel?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
  tokenBalance?: number;
  onOpenDatabase?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenDashboard,
  onOpenProfile,
  onBackToDashboard,
  hasStartedChat = false,
  projectTitle,
  hasArtifact = false,
  isArtifactPanelOpen = false,
  onToggleArtifactPanel,
  onNewChat,
  onOpenSettings,
  onOpenDatabase,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Clean title without placeholder "Hello" or "New Chat"
  const displayTitle =
    projectTitle && projectTitle !== 'New Chat' && projectTitle !== 'Hello'
      ? projectTitle
      : '';

  return (
    <header className="w-full bg-white select-none px-4 sm:px-6 pt-[max(env(safe-area-inset-top,0px),14px)] pb-2.5 flex items-center justify-between z-30 shrink-0 transition-all">
      {hasStartedChat ? (
        /* Active Chat Session Header (Matching Image 2: IMG_5010) */
        <>
          {/* Top-Left: Back Arrow '<' navigating back to main project dashboard */}
          <button
            type="button"
            onClick={onBackToDashboard || onOpenDashboard}
            className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-900 transition-colors active:scale-95 cursor-pointer touch-manipulation -ml-1"
            title="Back to Projects Dashboard"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Center: Clean Project Title (no generic "Hello") */}
          <div className="flex-1 text-center px-2 min-w-0">
            {displayTitle && (
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                {displayTitle}
              </h2>
            )}
          </div>

          {/* Top-Right: Canvas Preview Toggle + More Options '...' */}
          <div className="flex items-center gap-1 relative" ref={menuRef}>
            {hasArtifact && onToggleArtifactPanel && (
              <button
                type="button"
                onClick={onToggleArtifactPanel}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isArtifactPanelOpen
                    ? 'bg-neutral-900 text-white'
                    : 'hover:bg-neutral-100 text-neutral-800'
                }`}
                title="Toggle Canvas Preview"
              >
                {isArtifactPanelOpen ? (
                  <PanelRightClose className="w-5 h-5" />
                ) : (
                  <PanelRightOpen className="w-5 h-5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-900 transition-colors active:scale-95 cursor-pointer touch-manipulation -mr-1"
              title="More options"
            >
              <MoreHorizontal className="w-6 h-6 stroke-[2.2]" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-12 w-52 rounded-2xl bg-white border border-neutral-200/90 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onNewChat?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                >
                  <Plus className="w-4 h-4 stroke-[2]" />
                  <span>New Project</span>
                </button>

                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile & Account</span>
                  </button>
                )}

                {onOpenDatabase && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenDatabase();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                  >
                    <Database className="w-4 h-4" />
                    <span>Database & Tokens</span>
                  </button>
                )}

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4" />
                    <span>System Settings</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Clean Initial Home Dashboard Header (Matching Image 1: IMG_5011) */
        <>
          <button
            type="button"
            onClick={onOpenDashboard || onToggleSidebar}
            className="flex items-center gap-2.5 py-1 text-left group active:opacity-80 transition-opacity cursor-pointer touch-manipulation"
            title="Open Apps Dashboard"
          >
            {/* Master Brand Logo (Clean independent asset, no background box/square) */}
            <img
              src="/brand-logo.png"
              alt="AI BuildCraft"
              className="w-6 h-6 object-contain shrink-0 select-none"
            />

            <span className="text-[17px] font-bold text-neutral-900 tracking-tight">
              AI BuildCraft
            </span>
          </button>

          {/* Right: Quick Profile / Menu access if needed */}
          <div className="flex items-center gap-2">
            {hasArtifact && onToggleArtifactPanel && (
              <button
                type="button"
                onClick={onToggleArtifactPanel}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isArtifactPanelOpen
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                title="Toggle Canvas Preview"
              >
                {isArtifactPanelOpen ? (
                  <PanelRightClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelRightOpen className="w-3.5 h-3.5" />
                )}
                <span className="text-xs">Preview</span>
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
};
