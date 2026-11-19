/**
 * LLM provider abstraction.
 *
 * The interface is provider-agnostic; only the detected provider
 * (Mistral) is implemented. Adding a second provider means adding
 * another file and a factory branch — no handler changes needed.
 */

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly tool_call_id?: string;
}

export interface ToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

export interface ChatResponse {
  readonly content: string | null;
  readonly toolCalls: readonly ToolCall[];
  readonly usage?: { promptTokens: number; completionTokens: number };
}


/* ------------------------------------------------------------------ */
/*  Provider interface                                                 */
/* ------------------------------------------------------------------ */

export interface LLMProvider {
  /** Simple chat completion (no tools). */
  chat(messages: readonly ChatMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    model?: string;
  }): Promise<ChatResponse>;

  /** Chat with function-calling tools. */
  chatWithTools(
    messages: readonly ChatMessage[],
    tools: readonly ToolDefinition[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      toolChoice?: 'auto' | 'none' | 'required';
    },
  ): Promise<ChatResponse>;
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

export interface NovaConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly draftModel: string;
  readonly classificationModel: string;
  readonly maxQuestionsPerHour: number;
  readonly timeoutMs: number;
  readonly maxHistoryMessages: number;
  readonly braveSearchApiKey: string;
}

const DEFAULT_MODEL = 'mistral-large-latest';
const DEFAULT_DRAFT_MODEL = 'mistral-small-latest';
const DEFAULT_CLASSIFICATION_MODEL = 'mistral-small-latest';
const DEFAULT_MAX_QUESTIONS_PER_HOUR = 20;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_HISTORY_MESSAGES = 6;

export function loadConfig(): NovaConfig {
  const apiKey = process.env.MISTRAL_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'MISTRAL_API_KEY is not set. Nova requires a Mistral API key on the server.',
    );
  }
  return {
    apiKey,
    model: process.env.NOVA_MODEL ?? DEFAULT_MODEL,
    draftModel: process.env.NOVA_DRAFT_MODEL ?? DEFAULT_DRAFT_MODEL,
    classificationModel: process.env.NOVA_CLASSIFICATION_MODEL ?? DEFAULT_CLASSIFICATION_MODEL,
    maxQuestionsPerHour: Number(process.env.NOVA_MAX_QUESTIONS_PER_HOUR) || DEFAULT_MAX_QUESTIONS_PER_HOUR,
    timeoutMs: Number(process.env.NOVA_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    maxHistoryMessages: Number(process.env.NOVA_MAX_HISTORY_MESSAGES) || DEFAULT_MAX_HISTORY_MESSAGES,
    braveSearchApiKey: process.env.BRAVE_SEARCH_API_KEY ?? '',
  };
}

/* ------------------------------------------------------------------ */
/*  Mistral implementation                                             */
/* ------------------------------------------------------------------ */

const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';

/**
 * Extract text content from a Mistral message content field.
 * Models with "thinking" mode return an array of content blocks instead of a string.
 * Example: [{"type":"thinking","thinking":[...]}, {"type":"text","text":"actual JSON"}]
 */
function extractTextContent(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (content === null || content === undefined) return null;
  if (Array.isArray(content)) {
    // Find the last 'text' block (the actual output, not thinking)
    for (let i = content.length - 1; i >= 0; i--) {
      const block = content[i];
      if (block && typeof block === 'object' && 'type' in block) {
        if (block.type === 'text' && typeof block.text === 'string') {
          return block.text;
        }
      }
    }
    // Fallback: concatenate all text blocks if no 'text' type found
    const texts: string[] = [];
    for (const block of content) {
      if (block && typeof block === 'object') {
        if ('text' in block && typeof block.text === 'string') texts.push(block.text);
        else if ('content' in block && typeof block.content === 'string') texts.push(block.content);
      }
    }
    return texts.length > 0 ? texts.join('') : null;
  }
  return String(content);
}

export function createMistralProvider(config: NovaConfig): LLMProvider {
  const headers = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    async chat(messages, options = {}) {
      const body: Record<string, unknown> = {
        model: options.model ?? config.model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1024,
      };
      if (options.jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetchWithTimeout(`${MISTRAL_API_BASE}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Mistral API error ${res.status}: ${text.slice(0, 200)}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;

      const choice = json.choices[0]!;
      return {
        content: extractTextContent(choice.message.content),
        toolCalls: choice.message.tool_calls ?? [],
        usage: json.usage
          ? { promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens }
          : undefined,
      };
    },

    async chatWithTools(messages, tools, options = {}) {
      const body: Record<string, unknown> = {
        model: config.model,
        messages,
        tools,
        tool_choice: options.toolChoice ?? 'auto',
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2048,
      };

      const res = await fetchWithTimeout(`${MISTRAL_API_BASE}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Mistral API error ${res.status}: ${text.slice(0, 200)}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json2 = await res.json() as any;
      const choice2 = json2.choices[0]!;
      return {
        content: extractTextContent(choice2.message.content),
        toolCalls: choice2.message.tool_calls ?? [],
        usage: json2.usage
          ? { promptTokens: json2.usage.prompt_tokens, completionTokens: json2.usage.completion_tokens }
          : undefined,
      };
    },

  };
}
