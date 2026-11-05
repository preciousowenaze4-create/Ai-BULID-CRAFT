export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64Data?: string;
  textData?: string;
  previewUrl?: string;
  assetType?: 'image' | '3d' | 'audio' | 'video' | 'archive' | 'document' | 'other';
  metadata?: Record<string, any>;
}

export type ArtifactType = 'code' | 'document' | 'sheet' | 'html';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  language?: string;
  content: string;
  versions: string[];
  activeVersionIndex: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  thinking?: string;
  thinkingTime?: number;
  artifacts?: Artifact[];
  groundingSources?: Array<{ title?: string; uri?: string }>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model: string;
  isPinned?: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  speed: string;
  capabilities: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: 'google' | 'apple' | 'email' | 'supabase';
}
