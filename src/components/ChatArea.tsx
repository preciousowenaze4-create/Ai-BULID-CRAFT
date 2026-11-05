import React, { useRef, useEffect, useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Brain,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Volume2,
  VolumeX,
  Loader2,
  Box,
  Music,
  Package,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { Message, Artifact } from '../types.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
import { formatChatTimestamp, isBuildOrCodeRequest } from '../lib/utils.ts';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onOpenArtifact: (artifact: Artifact) => void;
  onRegenerate: () => void;
  currentModelName: string;
}

import { ThinkingIndicator } from './ThinkingIndicator.tsx';

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onOpenArtifact,
  onRegenerate,
  currentModelName,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [openThinkingIds, setOpenThinkingIds] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});

  // Kokoro TTS Audio state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stop any active audio when switching or unmounting
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingMessageId(null);
    setAudioLoadingId(null);
  };

  const handleSpeakMessage = async (msgId: string, rawContent: string) => {
    // If this message is currently playing, tap again to stop
    if (playingMessageId === msgId) {
      stopAllAudio();
      return;
    }

    // Stop any other active audio
    stopAllAudio();

    // Clean text: strip code blocks, artifact directives, URLs, and asterisks
    const cleanText = rawContent
      .replace(/:::artifact[\s\S]*?:::/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#~>]/g, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    setAudioLoadingId(msgId);

    const fallbackToWebSpeech = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setAudioLoadingId(null);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 1000));
        utterance.rate = 1.02;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Karen') ||
              v.default)
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => {
          setAudioLoadingId(null);
          setPlayingMessageId(msgId);
        };
        utterance.onend = () => {
          setPlayingMessageId(null);
        };
        utterance.onerror = () => {
          setAudioLoadingId(null);
          setPlayingMessageId(null);
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setAudioLoadingId(null);
        setPlayingMessageId(null);
      }
    };

    try {
      // Call Kokoro / Unreal Speech streaming audio endpoint
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceId: 'Scarlett',
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (response.ok && contentType.includes('audio/')) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          setAudioLoadingId(null);
          setPlayingMessageId(msgId);
        };
        audio.onended = () => {
          setPlayingMessageId(null);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          fallbackToWebSpeech();
        };

        await audio.play();
      } else {
        fallbackToWebSpeech();
      }
    } catch (e) {
      console.warn('Kokoro TTS remote stream note, falling back to client synthesis:', e);
      fallbackToWebSpeech();
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleThinking = (id: string) => {
    setOpenThinkingIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback((prev) => ({
      ...prev,
      [id]: prev[id] === type ? (null as any) : type,
    }));
  };

  // If there are no messages, show the minimalist center headline
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none my-auto">
        <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-neutral-900 leading-tight max-w-[280px] sm:max-w-md mx-auto">
          What app should I build for you?
        </h1>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isLast = index === messages.length - 1;
          const previousUserMsg = messages
            .slice(0, index)
            .reverse()
            .find((m) => m.role === 'user');
          const isBuildReq = isBuildOrCodeRequest(
            previousUserMsg?.content,
            previousUserMsg?.attachments,
            msg.content,
            !!(msg.artifacts && msg.artifacts.length > 0)
          );

          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 animate-in fade-in duration-200 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Assistant Brand Avatar (Clean independent asset) */}
              {!isUser && (
                <img
                  src="/brand-logo.png"
                  alt="AI BuildCraft"
                  className="w-7 h-7 object-contain shrink-0 mt-1 select-none"
                />
              )}

              {/* Message Content Bubble */}
              <div
                className={`rounded-3xl transition-all ${
                  isUser
                    ? 'max-w-[85%] sm:max-w-[78%] bg-neutral-100 text-neutral-900 px-5 py-3.5 shadow-xs text-sm sm:text-base leading-relaxed'
                    : 'w-full bg-neutral-50/90 border border-neutral-200/60 text-neutral-900 p-5 shadow-xs text-sm sm:text-base leading-relaxed'
                }`}
              >
                {/* User Attachment Previews */}
                {isUser && msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-neutral-200">
                    {msg.attachments.map((att) => {
                      const ext = att.name.split('.').pop()?.toUpperCase() || '';
                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white text-neutral-800 text-[11px] font-medium border border-neutral-200 shadow-2xs"
                        >
                          {att.previewUrl && att.assetType === 'image' ? (
                            <img
                              src={att.previewUrl}
                              alt={att.name}
                              className="w-5 h-5 rounded object-cover"
                            />
                          ) : att.assetType === '3d' || ['GLB', 'GLTF', 'OBJ', 'STL', 'FBX'].includes(ext) ? (
                            <div className="p-1 rounded bg-cyan-100 text-cyan-800 flex items-center gap-0.5 font-bold text-[9px]">
                              <Box className="w-3 h-3" />
                              <span>{ext}</span>
                            </div>
                          ) : att.assetType === 'audio' || ['MP3', 'WAV', 'OGG', 'M4A'].includes(ext) ? (
                            <div className="p-1 rounded bg-violet-100 text-violet-800 flex items-center gap-0.5 font-bold text-[9px]">
                              <Music className="w-3 h-3" />
                              <span>AUDIO</span>
                            </div>
                          ) : att.assetType === 'archive' || ext === 'IPA' ? (
                            <div className="p-1 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5 font-bold text-[9px]">
                              <Package className="w-3 h-3" />
                              <span>{att.metadata?.isIpa ? 'IPA' : ext}</span>
                            </div>
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-neutral-500" />
                          )}
                          <span className="truncate max-w-[120px]">{att.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dynamic Real-Time Thinking Indicator & Build Checklist */}
                {!isUser && (msg.thinking || (isLoading && isLast)) && (
                  <ThinkingIndicator
                    isLoading={isLoading}
                    isLast={isLast}
                    isBuildRequest={isBuildReq}
                    timestamp={msg.timestamp}
                    thinkingText={msg.thinking}
                    thinkingTime={msg.thinkingTime}
                    artifacts={msg.artifacts}
                    messageContent={msg.content}
                    userPrompt={previousUserMsg?.content}
                    isOpenThinking={!!openThinkingIds[msg.id]}
                    onToggleThinking={() => toggleThinking(msg.id)}
                  />
                )}

                {/* Text Body */}
                {isUser ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                ) : (
                  msg.content ? (
                    <>
                      <MarkdownRenderer
                        content={msg.content}
                        onOpenArtifact={onOpenArtifact}
                        messageArtifacts={msg.artifacts}
                      />
                      {/* Search Grounding Citations */}
                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-neutral-200/80 flex flex-wrap items-center gap-1.5">
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 mr-1">
                            <Globe className="w-3 h-3 text-indigo-500" /> Web Sources:
                          </span>
                          {msg.groundingSources.map((source, sIdx) => (
                            <a
                              key={sIdx}
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200/80 text-[10px] text-neutral-700 transition-colors"
                            >
                              <span className="truncate max-w-[140px]">{source.title || source.uri}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-neutral-400" />
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null
                )}

                {/* Footer Toolbar for Assistant */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 mt-2 pt-1 text-neutral-400 dark:text-neutral-500 text-xs">
                    <span className="text-[10px]">{formatChatTimestamp(msg.timestamp)}</span>
                    <span>•</span>
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="p-1 rounded hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                      title="Copy response"
                    >
                      {copiedMessageId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleFeedback(msg.id, 'up')}
                      className={`p-1 rounded transition-colors ${
                        feedback[msg.id] === 'up'
                          ? 'text-emerald-500'
                          : 'hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                      title="Good response"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleFeedback(msg.id, 'down')}
                      className={`p-1 rounded transition-colors ${
                        feedback[msg.id] === 'down'
                          ? 'text-rose-500'
                          : 'hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                      title="Bad response"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Speaker / Kokoro Voice Read-Aloud Button */}
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(msg.id, msg.content)}
                      disabled={audioLoadingId === msg.id}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        playingMessageId === msg.id
                          ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/50'
                          : 'hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                      title={
                        playingMessageId === msg.id
                          ? 'Stop read aloud'
                          : audioLoadingId === msg.id
                          ? 'Loading Kokoro voice...'
                          : 'Read aloud with natural Kokoro voice'
                      }
                    >
                      {audioLoadingId === msg.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                      ) : playingMessageId === msg.id ? (
                        <VolumeX className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isLast && !isLoading && (
                      <button
                        onClick={onRegenerate}
                        className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[11px] hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                        title="Regenerate message"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* User message is self-contained bubble on right matching Image 2 */}
            </div>
          );
        })}

        {/* Streaming Loading Indicator (only if assistant message placeholder is not rendered) */}
        {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
          <div className="flex gap-3 sm:gap-4 justify-start items-center">
            <img
              src="/brand-logo.png"
              alt="AI BuildCraft"
              className="w-7 h-7 object-contain shrink-0 select-none"
            />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-pulse [animation-delay:200ms]" />
              <span className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-pulse [animation-delay:400ms]" />
              <span className="ml-2 text-[11px]">{currentModelName} is thinking & streaming...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
