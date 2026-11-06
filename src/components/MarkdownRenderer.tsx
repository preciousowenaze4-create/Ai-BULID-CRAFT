import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Code2,
  FileText,
  Table,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
} from 'lucide-react';
import { Artifact, ArtifactType } from '../types.ts';

interface MarkdownRendererProps {
  content: string;
  onOpenArtifact?: (artifact: Artifact) => void;
  messageArtifacts?: Artifact[];
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onOpenArtifact,
  messageArtifacts = [],
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<Record<string, boolean>>({});
  const [expandedArtifactCode, setExpandedArtifactCode] = useState<Record<string, boolean>>({});

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Split content by code blocks and artifact tags
  const renderFormattedMarkdown = (text: string) => {
    // Check for artifact tags first: :::artifact{...}::: or :::artifact-streaming{...}:::
    const parts = text.split(/(:::artifact(?:-streaming)?\{[^}]*\}[\s\S]*?:::|```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (!part) return null;

      // Handle in-progress streaming artifact card
      const streamingMatch = part.match(/:::artifact-streaming\{([^}]*)\}/);
      if (streamingMatch) {
        const attrString = streamingMatch[1];
        const titleMatch = attrString.match(/title="([^"]*)"/);
        const typeMatch = attrString.match(/type="([^"]*)"/);
        const langMatch = attrString.match(/language="([^"]*)"/);

        const title = titleMatch ? titleMatch[1] : 'Interactive Component';
        const type = typeMatch ? typeMatch[1] : 'code';
        const language = langMatch ? langMatch[1] : 'html';

        return (
          <div
            key={index}
            className="my-3 p-3.5 rounded-2xl border border-purple-200/90 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/30 shadow-xs flex items-center justify-between gap-4 animate-in fade-in"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {title}
                </div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-medium mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping shrink-0" />
                  <span className="truncate">Generating component...</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Handle completed artifact preview card tag
      const artifactMatch = part.match(/:::artifact\{([^}]*)\}/);
      if (artifactMatch) {
        const attrString = artifactMatch[1];
        const idMatch = attrString.match(/id="([^"]*)"/);
        const titleMatch = attrString.match(/title="([^"]*)"/);
        const typeMatch = attrString.match(/type="([^"]*)"/);
        const langMatch = attrString.match(/language="([^"]*)"/);

        const id = idMatch ? idMatch[1] : `art-${index}`;
        const title = titleMatch ? titleMatch[1] : 'Artifact';
        const type = (typeMatch ? typeMatch[1] : 'code') as ArtifactType;
        const language = langMatch ? langMatch[1] : 'text';

        const artifact = messageArtifacts.find((a) => a.id === id) || {
          id,
          type,
          title,
          language,
          content: '',
          versions: [''],
          activeVersionIndex: 0,
        };

        const isCodeExpanded = !!expandedArtifactCode[id];

        const getIcon = () => {
          switch (type) {
            case 'html':
              return <Globe className="w-4 h-4 text-emerald-500" />;
            case 'document':
              return <FileText className="w-4 h-4 text-blue-500" />;
            case 'sheet':
              return <Table className="w-4 h-4 text-amber-500" />;
            default:
              return <Code2 className="w-4 h-4 text-indigo-500" />;
          }
        };

        return (
          <div
            key={index}
            className="my-3 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden transition-all duration-200"
          >
            <div
              onClick={() => onOpenArtifact && onOpenArtifact(artifact)}
              className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                  {getIcon()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {title}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Interactive Component • Ready
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {artifact.content && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedArtifactCode((prev) => ({ ...prev, [id]: !prev[id] }));
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title={isCodeExpanded ? 'Hide Code' : 'View Code'}
                  >
                    <span>{isCodeExpanded ? 'Hide Code' : 'View Code'}</span>
                    {isCodeExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenArtifact && onOpenArtifact(artifact);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  title="Open Full-Screen App Preview"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Collapsible Code Drawer (Collapsed by default, never dumps code into chat!) */}
            {isCodeExpanded && artifact.content && (
              <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-950 text-neutral-100 p-3.5 overflow-x-auto text-[12px] font-mono leading-relaxed max-h-80">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-[11px] text-neutral-400">
                  <span className="font-mono uppercase text-neutral-300">{language}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(artifact.content, `art-${id}`)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    {copiedCodeId === `art-${id}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto">
                  <code>{artifact.content}</code>
                </pre>
              </div>
            )}
          </div>
        );
      }

      // Handle standard code blocks ```lang ... ``` with clean collapsible drawers
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = part.substring(3, firstLineEnd).trim() || 'text';
        const code = part.substring(firstLineEnd + 1, part.length - 3);
        const codeId = `code-${index}`;
        const isCopied = copiedCodeId === codeId;
        const lineCount = code.split('\n').length;
        const isExpanded = !!expandedCodeBlocks[codeId];

        // Short command snippets (<= 3 lines) can display directly; longer blocks collapse by default!
        const isCompact = lineCount <= 3;
        const canOpenAsArtifact = lineCount > 4;

        return (
          <div
            key={index}
            className="my-3 rounded-2xl overflow-hidden border border-neutral-200/90 dark:border-neutral-800 bg-neutral-950 text-neutral-100 shadow-xs"
          >
            <div className="flex items-center justify-between px-3.5 py-2 bg-neutral-900 border-b border-neutral-800/80 text-[11px] text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-mono uppercase font-semibold text-neutral-300">{lang}</span>
                <span className="text-neutral-600">•</span>
                <span>{lineCount} lines</span>
              </div>
              <div className="flex items-center gap-1.5">
                {!isCompact && (
                  <button
                    type="button"
                    onClick={() => setExpandedCodeBlocks((prev) => ({ ...prev, [codeId]: !prev[codeId] }))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
                  >
                    <span>{isExpanded ? 'Hide Code' : 'View Code'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}

                {canOpenAsArtifact && onOpenArtifact && (
                  <button
                    type="button"
                    onClick={() => {
                      const detectedType: ArtifactType =
                        lang === 'html' ? 'html' : lang === 'csv' ? 'sheet' : 'code';
                      onOpenArtifact({
                        id: `artifact-from-code-${index}`,
                        type: detectedType,
                        title: `${lang.toUpperCase()} Snippet`,
                        language: lang,
                        content: code,
                        versions: [code],
                        activeVersionIndex: 0,
                      });
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Open in Artifact Canvas"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Canvas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCopy(code, codeId)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Display code either if expanded OR if short snippet <= 3 lines */}
            {(isExpanded || isCompact) && (
              <div className="p-3.5 overflow-x-auto text-[13px] font-mono leading-relaxed bg-[#0c0d0e] max-h-96">
                <pre>
                  <code>{code}</code>
                </pre>
              </div>
            )}
          </div>
        );
      }

      // Handle normal paragraphs, headers, tables, lists
      return <div key={index}>{renderParagraphs(part)}</div>;
    });
  };

  // Renders markdown paragraphs, block elements, tables, bold, lists
  const renderParagraphs = (raw: string) => {
    const blocks = raw.split(/\n\n+/);

    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Table detection
      if (trimmed.includes('|') && trimmed.includes('\n|') && trimmed.includes('---')) {
        return renderTable(trimmed, bIdx);
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={bIdx} className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 my-2">
            {renderInline(trimmed.substring(2))}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={bIdx} className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 my-2">
            {renderInline(trimmed.substring(3))}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={bIdx} className="text-base font-semibold text-neutral-900 dark:text-neutral-100 my-1.5">
            {renderInline(trimmed.substring(4))}
          </h3>
        );
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote
            key={bIdx}
            className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 my-2 text-neutral-600 dark:text-neutral-400 italic text-sm"
          >
            {renderInline(trimmed.substring(2))}
          </blockquote>
        );
      }

      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const lines = trimmed.split('\n');
        const isNumbered = /^\d+\.\s/.test(trimmed);

        if (isNumbered) {
          return (
            <ol key={bIdx} className="list-decimal list-inside space-y-1 my-2 text-sm leading-relaxed">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>{renderInline(line.replace(/^\d+\.\s+/, ''))}</li>
              ))}
            </ol>
          );
        }

        return (
          <ul key={bIdx} className="list-disc list-inside space-y-1 my-2 text-sm leading-relaxed">
            {lines.map((line, lIdx) => (
              <li key={lIdx}>{renderInline(line.replace(/^[-*]\s+/, ''))}</li>
            ))}
          </ul>
        );
      }

      // Standard text with inline formatting
      return (
        <p key={bIdx} className="my-2 leading-relaxed text-[14px]">
          {renderInline(trimmed)}
        </p>
      );
    });
  };

  // Render markdown table
  const renderTable = (tableText: string, key: number) => {
    const lines = tableText.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) return <p key={key}>{tableText}</p>;

    const headerCols = lines[0]
      .split('|')
      .map((c) => c.trim())
      .filter((c, i, arr) => i > 0 && i < arr.length - 1);

    const bodyRows = lines
      .slice(2)
      .map((line) =>
        line
          .split('|')
          .map((c) => c.trim())
          .filter((c, i, arr) => i > 0 && i < arr.length - 1)
      );

    return (
      <div key={key} className="my-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-neutral-100 dark:bg-neutral-800/70 border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              {headerCols.map((col, cIdx) => (
                <th key={cIdx} className="px-3 py-2 font-semibold text-neutral-800 dark:text-neutral-200">
                  {renderInline(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Inline formatting: **bold**, *italic*, `code`, [link](url)
  const renderInline = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);

    return parts.map((seg, sIdx) => {
      if (!seg) return null;

      // Inline code `code`
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return (
          <code
            key={sIdx}
            className="px-1.5 py-0.5 rounded text-[12px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60"
          >
            {seg.substring(1, seg.length - 1)}
          </code>
        );
      }

      // Bold **text**
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return (
          <strong key={sIdx} className="font-semibold text-neutral-900 dark:text-neutral-100">
            {seg.substring(2, seg.length - 2)}
          </strong>
        );
      }

      // Italic *text*
      if (seg.startsWith('*') && seg.endsWith('*')) {
        return (
          <em key={sIdx} className="italic">
            {seg.substring(1, seg.length - 1)}
          </em>
        );
      }

      // Link [text](url)
      const linkMatch = seg.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={sIdx}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            {linkMatch[1]}
            <ExternalLink className="w-3 h-3 inline ml-0.5" />
          </a>
        );
      }

      return seg;
    });
  };

  return <div className="text-neutral-800 dark:text-neutral-200">{renderFormattedMarkdown(content)}</div>;
};
