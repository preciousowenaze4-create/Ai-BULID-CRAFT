import React, { useState, useRef } from 'react';
import {
  User,
  Heart,
  Search,
  Plus,
  Smartphone,
  Cloud,
  X,
  Trash2,
  Pencil,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ChatSession } from '../types.ts';

interface AppsDashboardProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectApp: (sessionId: string) => void;
  onNewApp: () => void;
  onOpenSidebar: () => void;
  onOpenProfile?: () => void;
  onCloseDashboard: () => void;
  onDeleteApp: (sessionId: string) => void;
  onRenameApp: (sessionId: string, newTitle: string) => void;
}

// Background colors for the icon square matching modern mobile UI palette
const ICON_COLORS = [
  'bg-[#00C969]', // Emerald green (matches reference)
  'bg-indigo-600',
  'bg-sky-500',
  'bg-violet-600',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-blue-600',
];

function getAppColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ICON_COLORS.length;
  return ICON_COLORS[index];
}

function formatAppDate(timestamp: number): string {
  const d = new Date(timestamp || Date.now());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export const AppsDashboard: React.FC<AppsDashboardProps> = ({
  sessions,
  activeSessionId,
  onSelectApp,
  onNewApp,
  onOpenSidebar,
  onOpenProfile,
  onCloseDashboard,
  onDeleteApp,
  onRenameApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ai_buildcraft_fav_apps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Swipe-to-Action state: which card is currently swiped open
  const [swipedSessionId, setSwipedSessionId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const currentDraggingIdRef = useRef<string | null>(null);

  // Rename Dialog state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('ai_buildcraft_fav_apps', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Filter actual apps created in user sessions
  // Only show sessions that have user messages (never show empty dummy cards like "New Chat")
  const validAppSessions = sessions
    .filter(
      (s) =>
        s.messages &&
        s.messages.some(
          (m) => m.role === 'user' && m.content && m.content.trim().length > 0
        )
    )
    .sort(
      (a, b) =>
        (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    );

  const displaySessions = validAppSessions.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = filterFavorites ? favorites[s.id] : true;
    return matchesSearch && matchesFav;
  });

  // Touch & Mouse Gesture Handlers for Swipe-to-Action
  const handleTouchStart = (e: React.TouchEvent, sessionId: string) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
    currentDraggingIdRef.current = sessionId;
  };

  const handleTouchMove = (e: React.TouchEvent, sessionId: string) => {
    if (!isDraggingRef.current || currentDraggingIdRef.current !== sessionId) return;
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = Math.abs(e.touches[0].clientY - touchStartYRef.current);

    // If scrolling vertically, do not intercept horizontal swipe
    if (diffY > Math.abs(diffX) && Math.abs(diffX) < 15) return;

    // Only allow left swipe (negative diffX) up to -130px
    if (diffX < 0) {
      setDragOffset(Math.max(diffX, -130));
      if (swipedSessionId !== sessionId) {
        setSwipedSessionId(sessionId);
      }
    } else if (swipedSessionId === sessionId && diffX > 0) {
      // Swiping back to the right to close
      setDragOffset(Math.min(0, -130 + diffX));
    }
  };

  const handleTouchEnd = (sessionId: string) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    currentDraggingIdRef.current = null;

    if (dragOffset < -45) {
      // Snap open to reveal action icons
      setSwipedSessionId(sessionId);
      setDragOffset(-125);
    } else {
      // Snap closed
      setSwipedSessionId(null);
      setDragOffset(0);
    }
  };

  // Mouse drag support for desktop users
  const handleMouseDown = (e: React.MouseEvent, sessionId: string) => {
    touchStartXRef.current = e.clientX;
    isDraggingRef.current = true;
    currentDraggingIdRef.current = sessionId;
  };

  const handleMouseMove = (e: React.MouseEvent, sessionId: string) => {
    if (!isDraggingRef.current || currentDraggingIdRef.current !== sessionId) return;
    const diffX = e.clientX - touchStartXRef.current;
    if (diffX < 0) {
      setDragOffset(Math.max(diffX, -130));
      if (swipedSessionId !== sessionId) {
        setSwipedSessionId(sessionId);
      }
    } else if (swipedSessionId === sessionId && diffX > 0) {
      setDragOffset(Math.min(0, -130 + diffX));
    }
  };

  const handleMouseUp = (sessionId: string) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    currentDraggingIdRef.current = null;

    if (dragOffset < -45) {
      setSwipedSessionId(sessionId);
      setDragOffset(-125);
    } else {
      setSwipedSessionId(null);
      setDragOffset(0);
    }
  };

  const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleValue(session.title);
    setSwipedSessionId(null);
    setDragOffset(0);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSessionId && editTitleValue.trim()) {
      onRenameApp(editingSessionId, editTitleValue.trim());
      setEditingSessionId(null);
      setEditTitleValue('');
    }
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteApp(sessionId);
    setSwipedSessionId(null);
    setDragOffset(0);
  };

  return (
    <div
      onClick={() => {
        if (swipedSessionId) {
          setSwipedSessionId(null);
          setDragOffset(0);
        }
      }}
      className="flex-1 flex flex-col h-full bg-white select-none overflow-hidden relative"
    >
      {/* Top Navigation Bar matching reference image IMG_5006 */}
      <header className="px-5 pt-[max(env(safe-area-inset-top,0px),16px)] pb-3 flex items-center justify-between z-30 shrink-0 bg-white border-b border-neutral-100">
        {/* Left: User profile icon */}
        <button
          type="button"
          onClick={onOpenProfile || onOpenSidebar}
          className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors active:scale-95 cursor-pointer touch-manipulation"
          title="Open Profile & Settings"
        >
          <User className="w-6 h-6 stroke-[1.8]" />
        </button>

        {/* Center: App name "AI BuildCraft" with Master Logo */}
        <button
          type="button"
          onClick={onCloseDashboard}
          className="flex items-center gap-2 text-lg font-bold text-neutral-900 tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
          title="Back to App Builder"
        >
          <img
            src="/brand-logo.png"
            alt="AI BuildCraft"
            className="w-5 h-5 object-contain select-none"
          />
          <span>AI BuildCraft</span>
        </button>

        {/* Right: Favorites & Search icons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`p-1.5 rounded-full hover:bg-neutral-100 transition-all active:scale-95 cursor-pointer ${
              filterFavorites ? 'text-rose-500 fill-rose-500' : 'text-neutral-800'
            }`}
            title="Filter favorite apps"
          >
            <Heart
              className={`w-5 h-5 stroke-[1.8] ${filterFavorites ? 'fill-rose-500 text-rose-500' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setShowSearchInput(!showSearchInput)}
            className={`p-1.5 rounded-full hover:bg-neutral-100 transition-all active:scale-95 cursor-pointer ${
              showSearchInput ? 'text-emerald-600 bg-neutral-100' : 'text-neutral-800'
            }`}
            title="Search apps"
          >
            <Search className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>
      </header>

      {/* Optional Search Bar dropdown */}
      {showSearchInput && (
        <div className="px-5 pb-3 pt-2 bg-white animate-in fade-in duration-150 border-b border-neutral-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps by title..."
              autoFocus
              className="w-full pl-9 pr-9 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Apps List Container with Swipe-to-Action Gestures */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 pb-24 space-y-3">
        {displaySessions.length > 0 ? (
          displaySessions.map((session) => {
            const firstLetter = (session.title.trim()[0] || 'A').toUpperCase();
            const iconBg = getAppColor(session.title);
            const dateStr = formatAppDate(session.createdAt || session.updatedAt || Date.now());
            const isFav = !!favorites[session.id];
            const isActive = session.id === activeSessionId;
            const isSwiped = swipedSessionId === session.id;

            // Check if app has backend/data/database/auth
            const hasBackend = session.messages.some(
              (m) =>
                m.content?.toLowerCase().includes('backend') ||
                m.content?.toLowerCase().includes('database') ||
                m.content?.toLowerCase().includes('supabase') ||
                m.content?.toLowerCase().includes('api') ||
                m.content?.toLowerCase().includes('auth')
            );

            // Compute card translation offset
            const currentTranslateX = isSwiped ? (isDraggingRef.current ? dragOffset : -125) : 0;

            return (
              <div
                key={session.id}
                className="relative w-full rounded-2xl overflow-hidden touch-pan-y"
              >
                {/* Background Action Buttons (Revealed when card is swiped left) */}
                <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pl-3 pr-2 z-0">
                  {/* Pencil/Edit Action Button */}
                  <button
                    type="button"
                    onClick={(e) => handleStartRename(e, session)}
                    className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex flex-col items-center justify-center gap-0.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    title="Rename project title"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Edit</span>
                  </button>

                  {/* Delete Action Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, session.id)}
                    className="w-12 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex flex-col items-center justify-center gap-0.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    title="Permanently delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Delete</span>
                  </button>
                </div>

                {/* Foreground Card Surface (Swipes smoothly to the left) */}
                <div
                  onTouchStart={(e) => handleTouchStart(e, session.id)}
                  onTouchMove={(e) => handleTouchMove(e, session.id)}
                  onTouchEnd={() => handleTouchEnd(session.id)}
                  onMouseDown={(e) => handleMouseDown(e, session.id)}
                  onMouseMove={(e) => handleMouseMove(e, session.id)}
                  onMouseUp={() => handleMouseUp(session.id)}
                  onClick={(e) => {
                    if (isSwiped) {
                      e.stopPropagation();
                      setSwipedSessionId(null);
                      setDragOffset(0);
                    } else {
                      onSelectApp(session.id);
                    }
                  }}
                  style={{
                    transform: `translateX(${currentTranslateX}px)`,
                    transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                  className={`relative z-10 w-full rounded-2xl border p-4 flex items-center justify-between gap-3 bg-white cursor-pointer active:scale-[0.99] touch-manipulation group shadow-xs ${
                    isActive
                      ? 'border-neutral-300 ring-1 ring-neutral-200'
                      : 'border-neutral-200/90 hover:border-neutral-300'
                  }`}
                >
                  {/* Left side: App Icon + Title & Date */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Colored App Icon Square matching reference */}
                    <div
                      className={`w-12 h-12 rounded-2xl ${iconBg} text-white flex items-center justify-center font-extrabold text-xl shadow-xs shrink-0 select-none`}
                    >
                      {firstLetter}
                    </div>

                    {/* App Title & Date */}
                    <div className="flex flex-col min-w-0 pr-2">
                      <h3 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug truncate group-hover:text-neutral-700 transition-colors">
                        {session.title || 'Untitled App'}
                      </h3>
                      <span className="text-xs text-neutral-400 font-mono mt-1">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Tags + Favorite action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Tags Stack matching screenshot */}
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Tag 1: mobile */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100/90 text-neutral-800 text-[11px] font-medium select-none">
                        <Smartphone className="w-3 h-3 text-neutral-600" />
                        <span>mobile</span>
                      </div>

                      {/* Tag 2: backend */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100/90 text-neutral-800 text-[11px] font-medium select-none">
                        <Cloud className="w-3 h-3 text-neutral-600" />
                        <span>{hasBackend ? 'backend' : 'backend'}</span>
                      </div>
                    </div>

                    {/* Heart button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, session.id)}
                      className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-300 hover:text-rose-500 transition-colors ml-1"
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'fill-none'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State: Keep dashboard completely empty for new users as in IMG_5009 */
          filterFavorites ? (
            <div className="py-24 text-center text-xs text-neutral-400">
              No favorite apps bookmarked yet
            </div>
          ) : searchQuery ? (
            <div className="py-24 text-center text-xs text-neutral-400">
              No projects matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : null
        )}
      </div>

      {/* Rename Project Dialog / Modal */}
      {editingSessionId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              Rename Project
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter a custom title for this project.
            </p>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <input
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                autoFocus
                placeholder="e.g. WhatsApp Clone, Real Estate App"
                className="w-full px-4 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSessionId(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editTitleValue.trim()}
                  className="px-5 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action (+) Button in bottom-right corner matching reference image */}
      <div className="fixed bottom-7 right-6 z-40">
        <button
          type="button"
          onClick={onNewApp}
          className="w-14 h-14 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer touch-manipulation group"
          title="Create New App"
        >
          <Plus className="w-7 h-7 stroke-[2.2] group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>
    </div>
  );
};
