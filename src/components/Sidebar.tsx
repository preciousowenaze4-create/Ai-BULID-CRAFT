import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Pin,
  Moon,
  Sun,
  Settings,
  X,
  Edit2,
  Check,
  MoreVertical,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { ChatSession, AuthUser, isOwnerEmail } from '../types.ts';
import { groupSessionsByDate } from '../lib/utils.ts';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onTogglePinSession: (id: string) => void;
  onClearAllSessions?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  onClearAllSessions,
  theme,
  onToggleTheme,
  onOpenSettings,
  currentUser,
  onSignOut,
  onOpenProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Swipe-to-delete state: id of currently swiped session
  const [swipedSessionId, setSwipedSessionId] = useState<string | null>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  // Long-press / Hold state
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heldSession, setHeldSession] = useState<ChatSession | null>(null);

  // Clear All confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Only display sessions that have user messages
  const filteredSessions = sessions.filter((s) => {
    const hasMessages =
      s.messages &&
      s.messages.some(
        (m) => m.role === 'user' && m.content && m.content.trim().length > 0
      );
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    return hasMessages && matchesSearch;
  });

  const pinnedSessions = filteredSessions.filter((s) => s.isPinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.isPinned);
  const grouped = groupSessionsByDate(unpinnedSessions);

  const handleStartRename = (e: React.MouseEvent, s: ChatSession) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
    setHeldSession(null);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Touch handlers for Swipe-Left-to-Delete
  const handleTouchStart = (e: React.TouchEvent, session: ChatSession) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;

    // Start long-press / hold timer (450ms)
    longPressTimerRef.current = setTimeout(() => {
      try {
        navigator.vibrate?.(35);
      } catch {}
      setHeldSession(session);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent, session: ChatSession) => {
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartYRef.current);

    // If user is scrolling vertically or moved significantly, cancel long press
    if (Math.abs(deltaX) > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // If horizontal swipe left
    if (deltaX < -30 && deltaY < 20) {
      isSwipingRef.current = true;
      setSwipedSessionId(session.id);
    } else if (deltaX > 20) {
      // Swiping right cancels swipe
      if (swipedSessionId === session.id) {
        setSwipedSessionId(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Mouse hold handlers for desktop
  const handleMouseDown = (session: ChatSession) => {
    longPressTimerRef.current = setTimeout(() => {
      setHeldSession(session);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const renderSessionItem = (session: ChatSession) => {
    const isActive = session.id === activeSessionId;
    const isEditing = editingId === session.id;
    const isSwiped = swipedSessionId === session.id;

    return (
      <div
        key={session.id}
        className="relative overflow-hidden rounded-xl mb-1 select-none"
      >
        {/* Underneath Delete Button (Revealed on Swipe Left) */}
        <div className="absolute inset-y-0 right-0 w-20 bg-rose-600 flex items-center justify-center z-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(session.id);
              setSwipedSessionId(null);
            }}
            className="w-full h-full flex flex-col items-center justify-center text-white hover:bg-rose-700 active:bg-rose-800 transition-colors"
            title="Delete this chat"
          >
            <Trash2 className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-semibold">Delete</span>
          </button>
        </div>

        {/* Foreground Session Card */}
        <div
          onClick={() => {
            if (isSwiped) {
              setSwipedSessionId(null);
              return;
            }
            if (!isEditing) onSelectSession(session.id);
          }}
          onTouchStart={(e) => handleTouchStart(e, session)}
          onTouchMove={(e) => handleTouchMove(e, session)}
          onTouchEnd={handleTouchEnd}
          onMouseDown={() => handleMouseDown(session)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => {
            e.preventDefault();
            setHeldSession(session);
          }}
          style={{
            transform: isSwiped ? 'translateX(-76px)' : 'translateX(0)',
          }}
          className={`group relative z-10 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-transform duration-200 ease-out ${
            isActive
              ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold shadow-xs'
              : 'bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(e as any, session.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 rounded text-xs text-neutral-900 dark:text-neutral-100 w-full focus:outline-none"
              />
            ) : (
              <span className="truncate">{session.title}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 sm:opacity-0 transition-opacity">
            {isEditing ? (
              <button
                onClick={(e) => handleSaveRename(e, session.id)}
                className="p-1 hover:text-emerald-500 rounded"
                title="Save"
              >
                <Check className="w-3 h-3" />
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePinSession(session.id);
                  }}
                  className={`p-1 rounded hover:text-neutral-900 dark:hover:text-neutral-100 ${
                    session.isPinned ? 'text-amber-500 opacity-100' : 'text-neutral-400'
                  }`}
                  title={session.isPinned ? 'Unpin' : 'Pin to top'}
                >
                  <Pin className="w-3 h-3 fill-current" />
                </button>
                <button
                  onClick={(e) => handleStartRename(e, session)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  title="Rename"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="p-1 rounded text-neutral-400 hover:text-rose-500"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header with Safe Area Clearance for Mobile Notch / Dynamic Island */}
        <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,0px),2.75rem)] lg:pt-3.5 pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-2.5">
            <img
              src="/brand-logo.png"
              alt="AI BuildCraft"
              className="w-6 h-6 object-contain shrink-0 select-none"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                AI BuildCraft
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">v3.2.0</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-all active:scale-95 touch-manipulation cursor-pointer shadow-xs"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button & Search */}
        <div className="p-3 space-y-2 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl text-xs font-medium shadow-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-neutral-800 dark:bg-neutral-200 text-neutral-300 dark:text-neutral-700 rounded font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Search box & Clear All Button */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              />
            </div>

            {/* Clear All Past Chats Button */}
            {onClearAllSessions && sessions.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900/60 transition-colors"
                title="Delete all chat history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-[10px] text-neutral-400 px-1 pt-0.5 flex items-center justify-between">
            <span>Swipe left or hold to delete</span>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Pinned section */}
          {pinnedSessions.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-2.5 h-2.5 text-amber-500 fill-current" />
                <span>Pinned</span>
              </div>
              <div className="space-y-0.5">{pinnedSessions.map(renderSessionItem)}</div>
            </div>
          )}

          {/* Today */}
          {grouped.today.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Today
              </div>
              <div className="space-y-0.5">{grouped.today.map(renderSessionItem)}</div>
            </div>
          )}

          {/* Yesterday */}
          {grouped.yesterday.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Yesterday
              </div>
              <div className="space-y-0.5">{grouped.yesterday.map(renderSessionItem)}</div>
            </div>
          )}

          {/* Previous 7 Days */}
          {grouped.lastWeek.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Previous 7 Days
              </div>
              <div className="space-y-0.5">{grouped.lastWeek.map(renderSessionItem)}</div>
            </div>
          )}

          {/* Older */}
          {grouped.older.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Older
              </div>
              <div className="space-y-0.5">{grouped.older.map(renderSessionItem)}</div>
            </div>
          )}

          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-neutral-400 text-xs">
              No conversations found
            </div>
          )}
        </div>

        {/* Footer with Authenticated User & Controls */}
        <div className="p-2.5 pb-[max(env(safe-area-inset-bottom,0px),0.85rem)] border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-950">
          <button
            type="button"
            onClick={() => {
              if (onOpenProfile) {
                onOpenProfile();
                onClose();
              }
            }}
            className="flex items-center gap-2 px-1 py-1 min-w-0 flex-1 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors cursor-pointer text-left"
            title="Open Profile & Settings"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-neutral-300 dark:border-neutral-700 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                {(isOwnerEmail(currentUser?.email) ? 'P' : currentUser?.name || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1 pr-1">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-[11px] truncate flex items-center gap-1">
                {isOwnerEmail(currentUser?.email) ? 'Precious' : currentUser?.name || 'AI BuildCraft User'}
                {isOwnerEmail(currentUser?.email) && (
                  <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    OWNER
                  </span>
                )}
              </span>
              <span className="text-[9px] text-neutral-400 truncate">
                {isOwnerEmail(currentUser?.email) ? 'System Owner' : 'Verified Developer'}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-neutral-400 hover:text-rose-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Hold-to-show Action Sheet Modal */}
      {heldSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setHeldSession(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150"
          >
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate block">
                {heldSession.title}
              </span>
              <span className="text-[10px] text-neutral-400">
                {heldSession.messages.length} messages
              </span>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => {
                  onDeleteSession(heldSession.id);
                  setHeldSession(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Delete Chat</span>
              </button>

              <button
                onClick={(e) => {
                  handleStartRename(e, heldSession);
                  setHeldSession(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Rename</span>
              </button>

              <button
                onClick={() => {
                  onTogglePinSession(heldSession.id);
                  setHeldSession(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Pin className="w-4 h-4 text-amber-500" />
                <span>{heldSession.isPinned ? 'Unpin' : 'Pin to top'}</span>
              </button>
            </div>

            <button
              onClick={() => setHeldSession(null)}
              className="w-full py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clear All Past Chats Confirmation Modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Delete All Chat History?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  This will permanently delete all your previous conversations and projects.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllSessions?.();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-xs"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
