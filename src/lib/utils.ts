import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Artifact, ArtifactType } from '../types.ts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function groupSessionsByDate<T extends { updatedAt: number }>(sessions: T[]): {
  today: T[];
  yesterday: T[];
  lastWeek: T[];
  older: T[];
} {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfLastWeek = startOfToday - 7 * 86400000;

  const grouped = {
    today: [] as T[],
    yesterday: [] as T[],
    lastWeek: [] as T[],
    older: [] as T[],
  };

  sessions.forEach((session) => {
    if (session.updatedAt >= startOfToday) {
      grouped.today.push(session);
    } else if (session.updatedAt >= startOfYesterday) {
      grouped.yesterday.push(session);
    } else if (session.updatedAt >= startOfLastWeek) {
      grouped.lastWeek.push(session);
    } else {
      grouped.older.push(session);
    }
  });

  return grouped;
}

/**
 * Parses message text for artifact blocks:
 * ```artifact
 * id: my-app
 * type: code | html | document | sheet
 * title: Sample App
 * language: python
 * [content]
 * ```
 * Also detects large standard code blocks and creates on-demand artifact references.
 */
export function extractArtifacts(rawText: string): {
  displayText: string;
  thinking?: string;
  artifacts: Artifact[];
} {
  const artifacts: Artifact[] = [];
  let displayText = rawText;
  let thinking: string | undefined = undefined;

  // Extract deep thinking block (<thinking>...</thinking> or <thought>...</thought>)
  const closedThinkingRegex = /<(?:thinking|thought|analysis)>([\s\S]*?)<\/(?:thinking|thought|analysis)>/i;
  const closedMatch = closedThinkingRegex.exec(displayText);
  if (closedMatch) {
    thinking = closedMatch[1].trim();
    displayText = displayText.replace(closedMatch[0], '').trimStart();
  } else {
    // Handle in-progress open thinking tag during live streaming
    const openThinkingRegex = /^<(?:thinking|thought|analysis)>([\s\S]*)$/i;
    const openMatch = openThinkingRegex.exec(displayText.trim());
    if (openMatch) {
      thinking = openMatch[1].trim();
      displayText = '';
    }
  }

  // 1. Regex to match explicit completed artifact blocks: ```artifact ... ```
  const artifactRegex = /```artifact\s*([\s\S]*?)```/g;
  let match;

  while ((match = artifactRegex.exec(rawText)) !== null) {
    const blockContent = match[1];
    const lines = blockContent.split('\n');
    let id = 'artifact-' + Math.random().toString(36).substring(2, 9);
    let type: ArtifactType = 'code';
    let title = 'Code Artifact';
    let language = 'typescript';
    let contentStartIdx = 0;

    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().startsWith('id:')) {
        id = line.substring(3).trim();
        contentStartIdx = i + 1;
      } else if (line.toLowerCase().startsWith('type:')) {
        const t = line.substring(5).trim().toLowerCase() as ArtifactType;
        if (['code', 'document', 'sheet', 'html'].includes(t)) {
          type = t;
        }
        contentStartIdx = i + 1;
      } else if (line.toLowerCase().startsWith('title:')) {
        title = line.substring(6).trim();
        contentStartIdx = i + 1;
      } else if (line.toLowerCase().startsWith('language:')) {
        language = line.substring(9).trim().toLowerCase();
        contentStartIdx = i + 1;
      }
    }

    const content = lines.slice(contentStartIdx).join('\n').trim();

    if (type === 'html' && !language) {
      language = 'html';
    }

    const artifact: Artifact = {
      id,
      type,
      title,
      language,
      content,
      versions: [content],
      activeVersionIndex: 0,
    };

    artifacts.push(artifact);

    // Replace in display text with clean artifact card placeholder
    displayText = displayText.replace(
      match[0],
      `\n\n:::artifact{id="${id}" title="${title}" type="${type}" language="${language}"}\n:::\n\n`
    );
  }

  // 2. Hide unclosed in-progress artifact blocks while streaming to prevent raw text dumping
  const openArtifactMatch = /```artifact\s*([\s\S]*)$/.exec(displayText);
  if (openArtifactMatch) {
    const openContent = openArtifactMatch[1];
    const openLines = openContent.split('\n');
    let streamingTitle = 'Interactive Application';
    let streamingType = 'html';
    let streamingLang = 'html';
    for (let i = 0; i < Math.min(openLines.length, 6); i++) {
      const line = openLines[i].trim();
      if (line.toLowerCase().startsWith('title:')) {
        streamingTitle = line.substring(6).trim();
      } else if (line.toLowerCase().startsWith('type:')) {
        streamingType = line.substring(5).trim().toLowerCase();
      } else if (line.toLowerCase().startsWith('language:')) {
        streamingLang = line.substring(9).trim().toLowerCase();
      }
    }
    displayText = displayText.replace(
      openArtifactMatch[0],
      `\n\n:::artifact-streaming{title="${streamingTitle}" type="${streamingType}" language="${streamingLang}"}\n:::\n\n`
    );
  }

  // 3. Elevate ALL substantial code blocks (HTML, SVG, full scripts, or > 4 lines) into preview artifacts
  const codeBlockRegex = /```(html|svg|jsx|tsx|javascript|typescript|python|css|sql|json|sh|bash)?\s*([\s\S]*?)```/g;
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(displayText)) !== null) {
    const rawLang = (codeMatch[1] || '').toLowerCase().trim();
    const codeContent = codeMatch[2].trim();
    const lineCount = codeContent.split('\n').length;
    const isHtmlApp = rawLang === 'html' || codeContent.includes('<!DOCTYPE') || codeContent.includes('<html');
    const isSvgArt = rawLang === 'svg' || (codeContent.startsWith('<svg') && codeContent.includes('</svg>'));
    const isSubstantial = lineCount >= 5 || codeContent.length >= 140 || isHtmlApp || isSvgArt;

    if (isSubstantial) {
      const id = 'artifact-' + Math.random().toString(36).substring(2, 9);
      const type: ArtifactType = (isHtmlApp || isSvgArt) ? 'html' : 'code';
      let title = 'Interactive App';
      if (isHtmlApp) {
        const titleMatch = codeContent.match(/<title[^>]*>([^<]+)<\/title>/i) || codeContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        title = titleMatch ? titleMatch[1].trim() : 'Web Application';
      } else if (isSvgArt) {
        title = 'Vector Graphic';
      } else if (rawLang) {
        title = `${rawLang.toUpperCase()} Component`;
      }

      const language = isSvgArt ? 'html' : (rawLang || (isHtmlApp ? 'html' : 'typescript'));

      const artifact: Artifact = {
        id,
        type,
        title,
        language,
        content: codeContent,
        versions: [codeContent],
        activeVersionIndex: 0,
      };

      artifacts.push(artifact);

      displayText = displayText.replace(
        codeMatch[0],
        `\n\n:::artifact{id="${id}" title="${title}" type="${type}" language="${language}"}\n:::\n\n`
      );
    }
  }

  // 4. Hide unclosed in-progress code blocks at end of stream (e.g. streaming ```html ...)
  const openCodeMatch = /```(html|svg|jsx|tsx|javascript|typescript|python|css)?\s*([\s\S]*)$/.exec(displayText);
  if (openCodeMatch) {
    const rawLang = (openCodeMatch[1] || 'code').trim().toUpperCase();
    displayText = displayText.replace(
      openCodeMatch[0],
      `\n\n:::artifact-streaming{title="Generating ${rawLang} Component..." type="code" language="${rawLang.toLowerCase()}"}\n:::\n\n`
    );
  }

  return { displayText, thinking, artifacts };
}

/**
 * Accurately detects whether a user prompt or conversation turn is requesting
 * an app build, code creation, or file generation vs. a normal chat/greeting.
 */
export function isBuildOrCodeRequest(
  userPrompt?: string,
  attachments?: any[],
  assistantContent?: string,
  hasArtifacts?: boolean
): boolean {
  // If the message produced artifacts or substantial code blocks, it's definitely a build task
  if (hasArtifacts) return true;
  if (assistantContent) {
    if (
      assistantContent.includes(':::artifact') ||
      assistantContent.includes('```artifact') ||
      assistantContent.includes('```html') ||
      assistantContent.includes('```tsx') ||
      assistantContent.includes('```jsx') ||
      assistantContent.includes('```js') ||
      assistantContent.includes('```ts') ||
      assistantContent.includes('```py') ||
      assistantContent.includes('```css')
    ) {
      return true;
    }
  }

  // If user uploaded attachments (images, screenshots, code files), it's an inspect/code task
  if (attachments && attachments.length > 0) return true;

  if (!userPrompt) return false;
  const text = userPrompt.toLowerCase().trim();

  // 1. Explicitly check for casual phrases & greetings
  const casualExact = [
    'hi',
    'hello',
    'hey',
    'how are you',
    'how are you doing',
    'how do you do',
    'how r u',
    'good morning',
    'good afternoon',
    'good evening',
    'what is your name',
    'who are you',
    'thank you',
    'thanks',
    'ok',
    'okay',
    'cool',
    'great',
    'nice',
    'bye',
    'goodbye',
    'tell me a joke',
  ];

  if (casualExact.includes(text)) {
    return false;
  }

  // 2. Planning questions, discussions, and exploratory inquiries
  // (e.g., "What can we build?", "What can you build?", "What should we build?", "Can you explain...")
  // These MUST remain conversational text responses, NOT developer build panels.
  const conversationalPatterns = [
    /^what\s+(?:can|could|should|might|shall)\s+(?:we|you|i)\s+(?:build|make|create|do|code)/i,
    /^what\s+(?:apps?|kind\s+of\s+apps?|things?|projects?)\s+(?:can|could)\s+(?:we|you|i)\s+(?:build|make|create|code)/i,
    /^what\s+(?:can|could)\s+(?:we|you|i)\s+do/i,
    /^what\s+are\s+you\s+(?:capable\s+of|doing|building)/i,
    /^(?:can|could)\s+you\s+(?:tell|explain|suggest|give|list)/i,
    /^how\s+(?:does|do|can|could|would)\s+(?:this|you|it|we)/i,
    /^tell\s+me\s+(?:about|more|ideas?)/i,
    /^give\s+me\s+(?:some\s+)?(?:ideas?|suggestions?|examples?)/i,
    /^suggest\s+(?:some\s+)?(?:ideas?|apps?|projects?)/i,
    /^explain\s+/i,
    /^what\s+is\s+/i,
    /^why\s+/i,
  ];

  if (conversationalPatterns.some((pattern) => pattern.test(text))) {
    return false;
  }

  // Check if it is an exploratory question ending with ?
  if (
    text.endsWith('?') &&
    (text.includes('what can we') ||
      text.includes('what can you') ||
      text.includes('what should we') ||
      text.includes('what should i') ||
      text.includes('what are you') ||
      text.includes('can you explain') ||
      text.includes('how does') ||
      text.includes('what do you think') ||
      text.includes('ideas'))
  ) {
    return false;
  }

  // 3. Explicit Imperative Build & Coding Commands
  const buildCommands = [
    /\b(?:build|create|make|code|develop|generate|implement|design|program|construct)\s+(?:me\s+)?(?:a|an|the|this|some)\b/i,
    /\b(?:build|create|make|code|develop|generate|prototype|deploy)\s+(?:a\s+)?(?:app|web\s*app|application|website|game|tool|dashboard|calculator|widget|tracker|system|interface|component|screen)\b/i,
    /\b(?:fix|debug|refactor|update|modify|edit)\s+(?:this|the|my)?\s*(?:bug|code|component|error|issue|app|logic)\b/i,
    /\b(?:html|javascript|typescript|python|tailwind|css|react)\s+(?:code|app|project|script)\b/i,
  ];

  if (buildCommands.some((regex) => regex.test(text))) {
    return true;
  }

  // 4. Strong build command keywords
  const strongBuildKeywords = [
    'build a',
    'build an',
    'create a',
    'create an',
    'code a',
    'code an',
    'make a',
    'make an',
    'develop a',
    'develop an',
    'generate a',
    'generate an',
    'fix code',
    'fix bug',
    'write code',
    'new app',
    'todo app',
    'calculator app',
    'game app',
    'weather app',
    'dashboard app',
  ];

  return strongBuildKeywords.some((kw) => text.includes(kw));
}

