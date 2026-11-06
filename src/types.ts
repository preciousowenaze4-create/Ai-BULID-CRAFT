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
  role?: 'owner' | 'admin' | 'user';
  isOwner?: boolean;
}

/**
 * Checks if the user is the application owner/admin (Preciousddkid@gmail.com or ddkidcast@gmail.com).
 * Evaluated strictly in code logic to keep sensitive owner routing secure.
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === 'preciousddkid@gmail.com' || clean === 'ddkidcast@gmail.com';
}

/**
 * Privacy helper to mask or conceal user emails in the frontend UI.
 * Never outputs raw email addresses on screen.
 */
export function getMaskedUserEmail(email?: string | null): string {
  if (!email) return 'Member Account';
  if (isOwnerEmail(email)) return 'Verified Owner Account';
  const clean = email.trim();
  const [user, domain] = clean.split('@');
  if (!domain || user.length <= 2) return '••••••@••••';
  const visible = user.slice(0, 2);
  return `${visible}••••@${domain.split('.')[0]}.com`;
}

