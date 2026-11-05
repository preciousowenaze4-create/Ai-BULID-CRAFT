import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  X,
  FileCode,
  FileText,
  Mic,
  MicOff,
  Loader2,
  AlertCircle,
  Smartphone,
  Plus,
  Lightbulb,
  Gamepad2,
  HelpCircle,
  Heart,
  Briefcase,
  RotateCw,
  ChevronRight,
  Send,
  Image as ImageIcon,
  Database,
  Key,
  Bug,
  Play,
  Box,
  Music,
  Package,
  UploadCloud,
} from 'lucide-react';
import { Attachment } from '../types.ts';
import { formatFileSize } from '../lib/utils.ts';

interface ChatInputProps {
  onSendMessage: (content: string, attachments: Attachment[], enableThinking: boolean) => void;
  isLoading: boolean;
  onStop: () => void;
  hasStartedChat?: boolean;
  hasArtifact?: boolean;
  onOpenPreview?: () => void;
  onOpenEnv?: () => void;
  onOpenDatabase?: () => void;
  onOpenAssets?: () => void;
  onOpenErrors?: () => void;
  targetPlatform?: 'mobile' | 'web';
  onTogglePlatform?: (platform: 'mobile' | 'web') => void;
}

interface SuggestionPill {
  id: string;
  title: string;
  icon: React.ElementType;
  isHighlighted?: boolean;
  hasChevron?: boolean;
  isRefresh?: boolean;
  prompt?: string;
}

const SUGGESTION_PILLS: SuggestionPill[] = [
  {
    id: 'web-to-mobile',
    title: 'Web to mobile app',
    icon: Smartphone,
    isHighlighted: true,
    hasChevron: true,
    prompt: 'Build a Web to mobile app converter with real-time responsive preview',
  },
  {
    id: 'memory-card',
    title: 'Memory Card Match',
    icon: Lightbulb,
    prompt: 'Build a Memory Card Match game with timers, score tracking, and smooth card flip animations',
  },
  {
    id: 'drum-machine',
    title: 'Drum Machine Beat',
    icon: Gamepad2,
    prompt: 'Build an interactive Drum Machine Beat maker with synth pads and tempo sequencer',
  },
  {
    id: 'movie-night',
    title: 'Movie Night Picker',
    icon: Gamepad2,
    prompt: 'Build a Movie Night Picker app with genre filters, random generator, and watchlist',
  },
  {
    id: 'retro-tank',
    title: 'Retro Tank Battle',
    icon: Lightbulb,
    prompt: 'Build a 2D Retro Tank Battle game with obstacle maps and arcade controls',
  },
  {
    id: 'workout-timer',
    title: 'Workout Timer',
    icon: HelpCircle,
    prompt: 'Build an interval Workout Timer with HIIT presets, sound alerts, and round counters',
  },
  {
    id: 'bucket-list',
    title: 'Bucket List Adventure Track',
    icon: Heart,
    prompt: 'Build a Bucket List Adventure Tracker with categories, map pins, and progress badges',
  },
  {
    id: 'luxury-real-estate',
    title: 'Luxury Real Estate Explorer',
    icon: Briefcase,
    prompt: 'Build a Luxury Real Estate Explorer with photo galleries and mortgage estimator',
  },
  {
    id: 'refresh',
    title: 'Refresh',
    icon: RotateCw,
    isRefresh: true,
  },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onStop,
  hasStartedChat = false,
  hasArtifact = false,
  onOpenPreview,
  onOpenEnv,
  onOpenDatabase,
  onOpenAssets,
  onOpenErrors,
  targetPlatform = 'mobile',
  onTogglePlatform,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [enableThinking] = useState(false);

  // Voice note recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pillsScrollRef = useRef<HTMLDivElement>(null);

  // Audio recording & speech recognition references
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Base text tracker
  const baseContentRef = useRef<string>('');
  const liveTranscriptRef = useRef<string>('');

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [content]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      stopVoiceRecording();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isLoading) return;
    if (isRecordingRef.current) {
      stopVoiceRecording();
    }
    if (!content.trim() && attachments.length === 0) return;

    onSendMessage(content.trim(), attachments, enableThinking);
    setContent('');
    setAttachments([]);
    baseContentRef.current = '';
    liveTranscriptRef.current = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handlePillClick = (pill: SuggestionPill) => {
    if (pill.isRefresh) {
      if (pillsScrollRef.current) {
        pillsScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
      return;
    }

    const textToSet = pill.prompt || `Build ${pill.title} for me`;
    setContent(textToSet);
    baseContentRef.current = textToSet;
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const parseUniversalFile = async (file: File): Promise<Attachment> => {
    const id = 'att-' + Math.random().toString(36).substring(2, 9);
    const name = file.name;
    const size = file.size;
    const ext = name.split('.').pop()?.toLowerCase() || '';

    // 1. Images
    if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve({
            id,
            name,
            size,
            mimeType: file.type || 'image/png',
            base64Data,
            previewUrl: result,
            assetType: 'image',
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // 2. Audio tracks
    if (file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve({
            id,
            name,
            size,
            mimeType: file.type || 'audio/mp3',
            base64Data,
            previewUrl: result,
            assetType: 'audio',
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // 3. 3D Models (GLB, GLTF, OBJ, STL, FBX)
    if (['glb', 'gltf', 'obj', 'stl', 'fbx', 'dae'].includes(ext)) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve({
            id,
            name,
            size,
            mimeType: ext === 'glb' ? 'model/gltf-binary' : (file.type || 'model/gltf+json'),
            base64Data,
            assetType: '3d',
            metadata: { format: ext.toUpperCase() },
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // 4. Apple iOS IPA Packages & Archives
    if (['ipa', 'zip', 'tar', 'gz'].includes(ext)) {
      return {
        id,
        name,
        size,
        mimeType: ext === 'ipa' ? 'application/octet-stream' : (file.type || 'application/zip'),
        assetType: 'archive',
        metadata: { isIpa: ext === 'ipa', format: ext.toUpperCase() },
      };
    }

    // 5. PDF Documents
    if (file.type === 'application/pdf' || ext === 'pdf') {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve({
            id,
            name,
            size,
            mimeType: 'application/pdf',
            base64Data,
            assetType: 'document',
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // 6. Text / Code Documents
    try {
      const textData = await file.text();
      if (!/[\x00-\x08\x0E-\x1F]/.test(textData.slice(0, 500))) {
        return {
          id,
          name,
          size,
          mimeType: file.type || 'text/plain',
          textData,
          assetType: 'document',
        };
      }
    } catch {}

    // 7. General Binary Fallback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve({
          id,
          name,
          size,
          mimeType: file.type || 'application/octet-stream',
          base64Data,
          assetType: 'other',
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const processFileList = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const parsed: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const att = await parseUniversalFile(files[i]);
      parsed.push(att);
    }
    setAttachments((prev) => [...prev, ...parsed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFileList(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFileList(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  // Voice note speech recognition handling
  const startVoiceRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    baseContentRef.current = content;
    liveTranscriptRef.current = '';

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            baseContentRef.current =
              (baseContentRef.current ? baseContentRef.current + ' ' : '') + finalTranscript.trim();
          }

          const combined = (
            (baseContentRef.current ? baseContentRef.current + ' ' : '') + interimTranscript
          ).trim();

          setContent(combined);
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition error:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition failed to start:', err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkLevel = () => {
            if (!isRecordingRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(avg);
            animFrameRef.current = requestAnimationFrame(checkLevel);
          };
          animFrameRef.current = requestAnimationFrame(checkLevel);
        }
      } catch (e) {
        console.warn('AudioContext level visualization unsupported:', e);
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setMicError('Microphone permission required for voice notes.');
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-[max(env(safe-area-inset-bottom,0px),14px)] pt-2 select-none">
      {/* Microphone Error Notification */}
      {micError && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{micError}</span>
          </div>
          <button
            onClick={() => setMicError(null)}
            className="p-1 text-amber-600 hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Suggestion Pills: Only visible on Initial Home Screen / New Session (Hidden in Active Chat) */}
      {!hasStartedChat && (
        <div
          ref={pillsScrollRef}
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 mb-2.5 scroll-smooth"
        >
          {SUGGESTION_PILLS.map((pill) => {
            const IconComponent = pill.icon;
            const isGreen = pill.isHighlighted;

            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => handlePillClick(pill)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold shrink-0 transition-all active:scale-95 cursor-pointer ${
                  isGreen
                    ? 'bg-[#E8FAF0] border border-[#00C969]/50 text-[#00A855] hover:bg-[#d7f7e4]'
                    : 'bg-[#F8FAFC] border border-neutral-200/90 text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${isGreen ? 'text-[#00C969]' : 'text-neutral-700'}`}
                />
                <span className="whitespace-nowrap">{pill.title}</span>
                {pill.hasChevron && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#00C969] -mr-1" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Input Bar: Rounded card with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-[28px] border transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/40 shadow-lg ring-2 ring-indigo-500/20'
            : 'border-neutral-200/90 bg-white shadow-xs focus-within:border-neutral-400'
        } p-3`}
      >
        {/* Drag & Drop Visual Hint */}
        {isDragging && (
          <div className="absolute inset-0 z-20 rounded-[28px] bg-white/90 backdrop-blur-xs flex items-center justify-center gap-2 text-indigo-600 font-semibold text-xs pointer-events-none">
            <UploadCloud className="w-5 h-5 animate-bounce" />
            <span>Drop 3D models (GLB), IPAs, audio, or media here</span>
          </div>
        )}

        {/* Attachment preview chips with rich format badges */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 pb-2 mb-2 border-b border-neutral-100">
            {attachments.map((att) => {
              const ext = att.name.split('.').pop()?.toUpperCase() || '';
              return (
                <div
                  key={att.id}
                  className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-neutral-100 text-xs border border-neutral-200 shadow-2xs"
                >
                  {att.previewUrl && att.assetType === 'image' ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-7 h-7 rounded object-cover"
                    />
                  ) : att.assetType === '3d' ? (
                    <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-800 flex items-center gap-1 font-bold text-[10px]">
                      <Box className="w-3.5 h-3.5" />
                      <span>{ext}</span>
                    </div>
                  ) : att.assetType === 'audio' ? (
                    <div className="p-1.5 rounded-lg bg-violet-100 text-violet-800 flex items-center gap-1 font-bold text-[10px]">
                      <Music className="w-3.5 h-3.5" />
                      <span>AUDIO</span>
                    </div>
                  ) : att.assetType === 'archive' ? (
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 flex items-center gap-1 font-bold text-[10px]">
                      <Package className="w-3.5 h-3.5" />
                      <span>{att.metadata?.isIpa ? 'IPA' : ext}</span>
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-neutral-200 text-neutral-700">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate max-w-[120px] text-neutral-800 font-semibold text-[11px]">
                      {att.name}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-mono">
                      {formatFileSize(att.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            baseContentRef.current = e.target.value;
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording
              ? 'Listening to voice note... speak now...'
              : hasStartedChat
              ? 'Continue building...'
              : 'Ask anything or request an artifact (code, document, spreadsheet)...'
          }
          rows={1}
          className="w-full px-3 pt-1 pb-2 text-sm sm:text-base bg-transparent text-neutral-900 placeholder-neutral-400 resize-none focus:outline-none max-h-36 leading-relaxed font-sans"
        />

        {/* Bottom Control Bar: Plus Icon + Mobile/Web Toggle + Microphone/Send Icon */}
        <div className="flex items-center justify-between pt-1 px-1">
          {/* Left: Plus (+) Button */}
          <div className="flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200/90 text-neutral-800 flex items-center justify-center transition-all active:scale-95 cursor-pointer touch-manipulation shadow-xs"
              title="Add attachment or image"
            >
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Center: Mobile / Web Toggle Switch */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-100 text-xs">
            <button
              type="button"
              onClick={() => onTogglePlatform?.('mobile')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetPlatform === 'mobile'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Mobile
            </button>
            <button
              type="button"
              onClick={() => onTogglePlatform?.('web')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetPlatform === 'web'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Web
            </button>
          </div>

          {/* Right: Microphone / Send / Stop Button */}
          <div className="flex items-center gap-1.5">
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-mono text-[11px] font-semibold">
                  {recordingSeconds}s
                </span>
              </div>
            )}

            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                title="Stop generating"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : content.trim() || attachments.length > 0 ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer shadow-xs"
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
                title={isRecording ? 'Stop recording voice note' : 'Record voice note'}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Bottom Utility Dock: Hidden on welcome screen, smoothly revealed once chat/building begins */}
      {hasStartedChat && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 px-0.5 select-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          {/* Button 1: Assets */}
          <button
            type="button"
            onClick={onOpenAssets}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-300 text-neutral-800 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs hover:bg-neutral-50 touch-manipulation"
            title="Project Assets & Media"
          >
            <ImageIcon className="w-4 h-4 text-neutral-600 stroke-[1.8]" />
            <span>Assets</span>
          </button>

          {/* Button 2: Database */}
          <button
            type="button"
            onClick={onOpenDatabase}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-300 text-neutral-800 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs hover:bg-neutral-50 touch-manipulation"
            title="Database & Tokens"
          >
            <Database className="w-4 h-4 text-neutral-600 stroke-[1.8]" />
            <span>Database</span>
          </button>

          {/* Button 3: Env */}
          <button
            type="button"
            onClick={onOpenEnv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-300 text-neutral-800 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs hover:bg-neutral-50 touch-manipulation"
            title="Environment Variables"
          >
            <Key className="w-4 h-4 text-neutral-600 stroke-[1.8]" />
            <span>Env</span>
          </button>

          {/* Button 4: Errors (Debug) */}
          <button
            type="button"
            onClick={onOpenErrors}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-300 text-neutral-800 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs hover:bg-neutral-50 touch-manipulation"
            title="Errors & Diagnostics"
          >
            <Bug className="w-4 h-4 text-neutral-600 stroke-[1.8]" />
            <span>Errors</span>
          </button>

          {/* Button 5: Preview (Showroom / Canvas) */}
          {onOpenPreview && (
            <button
              type="button"
              onClick={onOpenPreview}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-300 text-neutral-800 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs hover:bg-neutral-50 touch-manipulation"
              title="Live App Preview"
            >
              <Play className="w-4 h-4 text-emerald-600 stroke-[1.8]" />
              <span>Preview</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
