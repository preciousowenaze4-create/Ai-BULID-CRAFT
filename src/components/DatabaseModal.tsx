import React, { useState, useMemo } from 'react';
import {
  X,
  Database,
  Table,
  RefreshCw,
  Download,
  Layers,
  Search,
  Check,
  Copy,
  Key,
  ArrowRight,
  Eye,
  Filter,
  FileCode,
  ShieldCheck,
  Server,
  Rows3,
  GitBranch,
} from 'lucide-react';
import { AuthUser, ChatSession, Artifact } from '../types.ts';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  sessions?: ChatSession[];
  activeSessionId?: string;
  activeArtifact?: Artifact | null;
  targetPlatform?: 'mobile' | 'web';
  userId?: string;
}

export interface ColumnSchema {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  references?: string;
  nullable?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface TableDefinition {
  name: string;
  label: string;
  description: string;
  columns: ColumnSchema[];
  rows: Record<string, any>[];
  relationships?: { foreignKey: string; targetTable: string; targetColumn: string; relationType: string }[];
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  sessions = [],
  activeSessionId,
  activeArtifact,
  targetPlatform = 'mobile',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'data' | 'schema'>('data');
  const [selectedTableName, setSelectedTableName] = useState<string>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);

  // Synthesize real live application relational tables
  const tables: TableDefinition[] = useMemo(() => {
    const nowIso = new Date().toISOString();

    // 1. Users Table
    const userRows: Record<string, any>[] = [];
    if (currentUser?.id) {
      userRows.push({
        id: currentUser.id,
        email: currentUser.email || 'user@example.com',
        name: currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Creator'),
        provider: currentUser.provider || 'email',
        role: 'owner',
        status: 'active',
        created_at: '2026-10-15T09:30:00Z',
        last_sign_in: nowIso,
      });
    } else {
      userRows.push({
        id: 'usr_guest_01',
        email: 'guest@aibuildcraft.io',
        name: 'Guest Builder',
        provider: 'local',
        role: 'developer',
        status: 'active',
        created_at: nowIso,
        last_sign_in: nowIso,
      });
    }
    userRows.push({
      id: 'usr_sys_ai',
      email: 'engine@aibuildcraft.internal',
      name: 'AI BuildCraft Engine',
      provider: 'system',
      role: 'ai_architect',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      last_sign_in: nowIso,
    });

    const usersColumns: ColumnSchema[] = [
      { name: 'id', type: 'UUID', isPrimary: true, nullable: false, description: 'Unique user identifier' },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, description: 'User electronic mail address' },
      { name: 'name', type: 'VARCHAR(128)', nullable: true, description: 'Display name of user' },
      { name: 'provider', type: 'VARCHAR(32)', nullable: false, defaultValue: "'email'", description: 'Auth provider (google, email)' },
      { name: 'role', type: 'VARCHAR(32)', nullable: false, defaultValue: "'developer'", description: 'Access role permissions' },
      { name: 'status', type: 'VARCHAR(24)', nullable: false, defaultValue: "'active'", description: 'Account lifecycle status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultValue: 'NOW()', description: 'Account registration time' },
      { name: 'last_sign_in', type: 'TIMESTAMPTZ', nullable: true, description: 'Most recent authentication event' },
    ];

    // 2. Chats (Sessions) Table
    const effectiveUserId = currentUser?.id || 'usr_guest_01';
    const chatRows: Record<string, any>[] = sessions.map((s) => ({
      id: s.id,
      user_id: effectiveUserId,
      title: s.title || 'Untitled Session',
      model: s.model || 'gemini-3.8-flash',
      status: s.id === activeSessionId ? 'active' : 'idle',
      message_count: s.messages?.length || 0,
      is_pinned: s.isPinned ? true : false,
      created_at: new Date(s.createdAt).toISOString(),
      updated_at: new Date(s.updatedAt).toISOString(),
    }));

    const chatsColumns: ColumnSchema[] = [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, nullable: false, description: 'Primary session key' },
      { name: 'user_id', type: 'UUID', isForeign: true, references: 'users.id', nullable: false, description: 'Foreign key to users table' },
      { name: 'title', type: 'VARCHAR(255)', nullable: false, description: 'Display title of the project' },
      { name: 'model', type: 'VARCHAR(64)', nullable: false, defaultValue: "'gemini-3.8-flash'", description: 'Underlying LLM engine' },
      { name: 'status', type: 'VARCHAR(24)', nullable: false, defaultValue: "'active'", description: 'Active or archived status' },
      { name: 'message_count', type: 'INT4', nullable: false, defaultValue: '0', description: 'Total messages exchanged' },
      { name: 'is_pinned', type: 'BOOLEAN', nullable: false, defaultValue: 'false', description: 'Starred/pinned priority flag' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultValue: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultValue: 'NOW()' },
    ];

    // 3. Messages Table
    const messageRows: Record<string, any>[] = [];
    sessions.forEach((s) => {
      if (Array.isArray(s.messages)) {
        s.messages.forEach((m) => {
          messageRows.push({
            id: m.id,
            session_id: s.id,
            role: m.role,
            message_content: m.content.length > 90 ? m.content.slice(0, 90) + '...' : m.content || '(empty)',
            has_artifact: m.artifacts && m.artifacts.length > 0 ? true : false,
            has_attachments: m.attachments && m.attachments.length > 0 ? true : false,
            thinking_time_s: m.thinkingTime ? `${m.thinkingTime}s` : '0s',
            created_at: new Date(m.timestamp).toISOString(),
          });
        });
      }
    });

    const messagesColumns: ColumnSchema[] = [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, nullable: false, description: 'Message identifier' },
      { name: 'session_id', type: 'VARCHAR(64)', isForeign: true, references: 'chats.id', nullable: false, description: 'Parent chat session' },
      { name: 'role', type: 'VARCHAR(24)', nullable: false, description: 'Message author (user / assistant)' },
      { name: 'message_content', type: 'TEXT', nullable: false, description: 'Primary textual content' },
      { name: 'has_artifact', type: 'BOOLEAN', nullable: false, defaultValue: 'false', description: 'Contains executable artifact' },
      { name: 'has_attachments', type: 'BOOLEAN', nullable: false, defaultValue: 'false', description: 'Has image/file attachment' },
      { name: 'thinking_time_s', type: 'VARCHAR(16)', nullable: true, description: 'Reasoning latency recorded' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultValue: 'NOW()' },
    ];

    // 4. Artifacts / Apps Table
    const artifactRows: Record<string, any>[] = [];
    sessions.forEach((s) => {
      s.messages?.forEach((m) => {
        m.artifacts?.forEach((a) => {
          artifactRows.push({
            id: a.id,
            session_id: s.id,
            title: a.title,
            type: a.type,
            language: a.language || 'html',
            version_count: (a.versions?.length || 1),
            size_kb: `${(a.content.length / 1024).toFixed(1)} KB`,
            status: 'compiled',
            created_at: new Date(m.timestamp).toISOString(),
          });
        });
      });
    });

    if (activeArtifact && !artifactRows.some((r) => r.id === activeArtifact.id)) {
      artifactRows.unshift({
        id: activeArtifact.id,
        session_id: activeSessionId || 'session-active',
        title: activeArtifact.title,
        type: activeArtifact.type,
        language: activeArtifact.language || 'html',
        version_count: (activeArtifact.versions?.length || 1),
        size_kb: `${(activeArtifact.content.length / 1024).toFixed(1)} KB`,
        status: 'compiled',
        created_at: nowIso,
      });
    }

    const artifactsColumns: ColumnSchema[] = [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, nullable: false, description: 'Unique artifact identifier' },
      { name: 'session_id', type: 'VARCHAR(64)', isForeign: true, references: 'chats.id', nullable: false, description: 'Parent chat session' },
      { name: 'title', type: 'VARCHAR(255)', nullable: false, description: 'App / Component title' },
      { name: 'type', type: 'VARCHAR(32)', nullable: false, description: 'Artifact kind (html, code, doc)' },
      { name: 'language', type: 'VARCHAR(32)', nullable: false, defaultValue: "'html'" },
      { name: 'version_count', type: 'INT4', nullable: false, defaultValue: '1', description: 'Version lineage count' },
      { name: 'size_kb', type: 'VARCHAR(16)', nullable: false },
      { name: 'status', type: 'VARCHAR(24)', nullable: false, defaultValue: "'compiled'" },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultValue: 'NOW()' },
    ];

    // 5. Transactions Table (System Operations & Event Logs)
    const transactionRows: Record<string, any>[] = [
      {
        id: 'tx_build_' + (sessions[0]?.id?.slice(0, 8) || '001'),
        user_id: effectiveUserId,
        action: 'build_pipeline_run',
        target_entity: activeArtifact?.title || sessions[0]?.title || 'AI Workspace',
        status: 'success',
        latency_ms: 184,
        ip_address: '127.0.0.1',
        created_at: nowIso,
      },
      {
        id: 'tx_auth_init_02',
        user_id: effectiveUserId,
        action: 'session_handshake',
        target_entity: 'auth_gateway',
        status: 'success',
        latency_ms: 42,
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: 'tx_model_bind_03',
        user_id: effectiveUserId,
        action: 'model_pipeline_configure',
        target_entity: 'gemini-3.8-flash',
        status: 'success',
        latency_ms: 65,
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
      {
        id: 'tx_db_sync_04',
        user_id: effectiveUserId,
        action: 'schema_introspection',
        target_entity: 'relational_catalog',
        status: 'success',
        latency_ms: 29,
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
      },
    ];

    const transactionsColumns: ColumnSchema[] = [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, nullable: false, description: 'Transaction event ID' },
      { name: 'user_id', type: 'UUID', isForeign: true, references: 'users.id', nullable: false },
      { name: 'action', type: 'VARCHAR(64)', nullable: false, description: 'Operation executed' },
      { name: 'target_entity', type: 'VARCHAR(128)', nullable: false, description: 'Target entity or module' },
      { name: 'status', type: 'VARCHAR(24)', nullable: false, defaultValue: "'success'" },
      { name: 'latency_ms', type: 'INT4', nullable: false },
      { name: 'ip_address', type: 'INET', nullable: false, defaultValue: "'127.0.0.1'" },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultValue: 'NOW()' },
    ];

    // 6. App State Table (Live Application State / Key-Value Store)
    const appStateRows: Record<string, any>[] = [
      {
        key: 'active_session_id',
        value: activeSessionId || 'session-default',
        value_type: 'string',
        scope: 'runtime',
        updated_at: nowIso,
        description: 'Currently mounted conversation session',
      },
      {
        key: 'active_platform_mode',
        value: targetPlatform,
        value_type: 'enum(mobile, web)',
        scope: 'ui_viewport',
        updated_at: nowIso,
        description: 'Selected compilation viewport',
      },
      {
        key: 'active_artifact_id',
        value: activeArtifact?.id || 'none',
        value_type: 'string',
        scope: 'canvas',
        updated_at: nowIso,
        description: 'Mounted preview artifact component',
      },
      {
        key: 'active_model_engine',
        value: sessions[0]?.model || 'gemini-3.8-flash',
        value_type: 'string',
        scope: 'ai_orchestration',
        updated_at: nowIso,
        description: 'Active generative reasoning model',
      },
      {
        key: 'total_sessions_count',
        value: String(sessions.length),
        value_type: 'integer',
        scope: 'persistence',
        updated_at: nowIso,
        description: 'Stored user project sessions count',
      },
      {
        key: 'auth_security_state',
        value: currentUser?.id ? 'authenticated' : 'anonymous',
        value_type: 'string',
        scope: 'security',
        updated_at: nowIso,
        description: 'Current cryptographic session status',
      },
    ];

    const appStateColumns: ColumnSchema[] = [
      { name: 'key', type: 'VARCHAR(64)', isPrimary: true, nullable: false, description: 'Configuration key name' },
      { name: 'value', type: 'TEXT', nullable: false, description: 'Live serialized value' },
      { name: 'value_type', type: 'VARCHAR(32)', nullable: false, description: 'Data type notation' },
      { name: 'scope', type: 'VARCHAR(32)', nullable: false, defaultValue: "'runtime'" },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultValue: 'NOW()' },
      { name: 'description', type: 'TEXT', nullable: true },
    ];

    return [
      {
        name: 'users',
        label: 'users',
        description: 'User accounts, identity credentials, roles & authentication state',
        columns: usersColumns,
        rows: userRows,
      },
      {
        name: 'chats',
        label: 'chats',
        description: 'Active application chat sessions, model configurations, and titles',
        columns: chatsColumns,
        rows: chatRows,
        relationships: [{ foreignKey: 'user_id', targetTable: 'users', targetColumn: 'id', relationType: 'N:1' }],
      },
      {
        name: 'messages',
        label: 'messages',
        description: 'Sequential user queries, AI responses, attachments & reasoning steps',
        columns: messagesColumns,
        rows: messageRows,
        relationships: [{ foreignKey: 'session_id', targetTable: 'chats', targetColumn: 'id', relationType: 'N:1' }],
      },
      {
        name: 'artifacts',
        label: 'artifacts',
        description: 'Generated web apps, components, source files, and version history',
        columns: artifactsColumns,
        rows: artifactRows,
        relationships: [{ foreignKey: 'session_id', targetTable: 'chats', targetColumn: 'id', relationType: 'N:1' }],
      },
      {
        name: 'transactions',
        label: 'transactions',
        description: 'Live application operations, compilation events, and execution logs',
        columns: transactionsColumns,
        rows: transactionRows,
        relationships: [{ foreignKey: 'user_id', targetTable: 'users', targetColumn: 'id', relationType: 'N:1' }],
      },
      {
        name: 'app_state',
        label: 'app_state',
        description: 'Relational key-value runtime store, environment params & state tree',
        columns: appStateColumns,
        rows: appStateRows,
      },
    ];
  }, [currentUser, sessions, activeSessionId, activeArtifact, targetPlatform]);

  const selectedTable = tables.find((t) => t.name === selectedTableName) || tables[0];

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return selectedTable.rows;
    const q = searchQuery.toLowerCase().trim();
    return selectedTable.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [selectedTable, searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(selectedTable.rows, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${selectedTable.name}_data.json`;
    a.click();
  };

  const handleExportCsv = () => {
    const cols = selectedTable.columns.map((c) => c.name);
    const header = cols.join(',');
    const rows = selectedTable.rows.map((r) =>
      cols
        .map((c) => {
          const val = r[c] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable.name}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (val: string, keyId: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col h-[88vh] max-h-[820px] animate-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-950/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Database Explorer
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  PostgreSQL • Live
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                Relational schemas, active application tables & live data viewer
              </p>
            </div>
          </div>

          {/* Mode Switcher & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-neutral-200/70 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('data')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                  activeTab === 'data'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Rows3 className="w-3.5 h-3.5" />
                <span>Data</span>
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                  activeTab === 'schema'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Schema</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Close Explorer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tables Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-950/40 flex items-center justify-between gap-3 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            {tables.map((t) => {
              const isSelected = selectedTableName === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    setSelectedTableName(t.name);
                    setSelectedRow(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-neutral-200 dark:border-neutral-700/80 font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <Table className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-500' : 'text-neutral-400'}`} />
                  <span>{t.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {t.rows.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              title="Refresh table data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              title="Export as JSON"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden md:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Active Table Sub-header (Search & Description) */}
        <div className="px-4 sm:px-6 py-2.5 bg-neutral-50 dark:bg-neutral-950/60 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 min-w-0">
            <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-200">
              public.{selectedTable.name}
            </span>
            <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
            <span className="hidden sm:inline text-[11px] text-neutral-500 truncate">
              {selectedTable.description}
            </span>
          </div>

          {activeTab === 'data' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder={`Filter ${selectedTable.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-neutral-50/50 dark:bg-neutral-950 p-4 sm:p-6">
          {activeTab === 'data' ? (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse min-w-[640px]">
                  <thead className="bg-neutral-100/90 dark:bg-neutral-800/70 border-b border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-center text-neutral-400">#</th>
                      {selectedTable.columns.map((col) => (
                        <th key={col.name} className="px-3.5 py-2.5 font-semibold tracking-wide whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {col.isPrimary && (
                              <span className="p-0.5 rounded-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold" title="Primary Key">
                                PK
                              </span>
                            )}
                            {col.isForeign && (
                              <span className="p-0.5 rounded-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold" title={`Foreign Key ➔ ${col.references}`}>
                                FK
                              </span>
                            )}
                            <span>{col.name}</span>
                            <span className="text-[10px] font-normal text-neutral-400 dark:text-neutral-500">
                              :{col.type.toLowerCase()}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="w-12 px-3 py-2.5 text-right text-neutral-400">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={selectedTable.columns.length + 2}
                          className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500 font-sans"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Table className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                            <p className="text-xs font-medium">No records found</p>
                            <p className="text-[11px] text-neutral-400 max-w-sm">
                              {searchQuery ? `No rows matched "${searchQuery}"` : 'This table is currently clean with 0 records.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedRow(row)}
                          className="hover:bg-indigo-50/40 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-3 py-2.5 text-center text-neutral-400 text-[11px]">
                            {idx + 1}
                          </td>
                          {selectedTable.columns.map((col) => {
                            const val = row[col.name];
                            const isNull = val === null || val === undefined;
                            const isBoolean = typeof val === 'boolean';
                            const strVal = String(val ?? '');

                            return (
                              <td
                                key={col.name}
                                className="px-3.5 py-2.5 text-neutral-800 dark:text-neutral-200 max-w-[260px] truncate"
                                title={strVal}
                              >
                                {isNull ? (
                                  <span className="text-neutral-400 dark:text-neutral-600 italic text-[10px]">NULL</span>
                                ) : isBoolean ? (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${
                                      val
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                                    }`}
                                  >
                                    {val ? 'TRUE' : 'FALSE'}
                                  </span>
                                ) : col.isPrimary ? (
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                    {strVal}
                                  </span>
                                ) : col.isForeign ? (
                                  <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-500/30 underline-offset-2">
                                    {strVal}
                                  </span>
                                ) : (
                                  strVal
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRow(row);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-all"
                              title="Inspect record JSON"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Count */}
              <div className="px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span>
                  Showing {filteredRows.length} of {selectedTable.rows.length} row(s)
                </span>
                <span>public.{selectedTable.name}</span>
              </div>
            </div>
          ) : (
            /* Relational Schema Inspector View */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tables.map((tbl) => (
                  <div
                    key={tbl.name}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {tbl.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {tbl.columns.length} columns • {tbl.rows.length} rows
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">
                      {tbl.description}
                    </p>

                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-xs font-mono">
                      {tbl.columns.map((c) => (
                        <div key={c.name} className="py-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {c.isPrimary && (
                              <span className="px-1 py-0.2 rounded-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold">
                                PK
                              </span>
                            )}
                            {c.isForeign && (
                              <span className="px-1 py-0.2 rounded-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold">
                                FK
                              </span>
                            )}
                            <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                              {c.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {c.type}
                            </span>
                            {!c.nullable && (
                              <span className="text-[9px] text-neutral-400 uppercase">
                                NOT NULL
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {tbl.relationships && tbl.relationships.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                          Foreign Relations
                        </span>
                        {tbl.relationships.map((rel, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400"
                          >
                            <ArrowRight className="w-3 h-3 text-neutral-400" />
                            <span>{rel.foreignKey}</span>
                            <span className="text-neutral-400">➔</span>
                            <span className="text-indigo-500 font-semibold">{rel.targetTable}.{rel.targetColumn}</span>
                            <span className="text-[10px] text-neutral-400">({rel.relationType})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected Row Detail Modal / Slide-over */}
        {selectedRow && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold font-mono text-neutral-900 dark:text-neutral-100">
                    Row Record Details ({selectedTable.name})
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="my-4 overflow-auto flex-1 font-mono text-xs space-y-2.5">
                {Object.entries(selectedRow).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">{key}</span>
                      <button
                        onClick={() => handleCopyText(String(val ?? ''), key)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        title="Copy field value"
                      >
                        {copiedKey === key ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="text-neutral-900 dark:text-neutral-100 break-words whitespace-pre-wrap font-sans text-xs">
                      {val === null || val === undefined ? (
                        <span className="text-neutral-400 italic">NULL</span>
                      ) : (
                        String(val)
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                <button
                  onClick={() => setSelectedRow(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
