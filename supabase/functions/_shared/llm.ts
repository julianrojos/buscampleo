import { z, type ZodTypeAny } from 'zod';

type ProviderName = 'openrouter' | 'openai' | 'anthropic';

interface LlmConfig {
  readonly provider: ProviderName;
  readonly apiKey: string;
  readonly model: string;
  readonly endpoint: string;
  readonly headers: Record<string, string>;
  readonly responseFormat?: 'json_object';
}

function readEnv(...keys: readonly string[]): string {
  for (const key of keys) {
    const denoValue = typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined;
    const nodeValue = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    const value = denoValue ?? nodeValue;
    if (value?.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getAppReferer(): string {
  return readEnv('APP_URL', 'SITE_URL', 'PUBLIC_URL') || 'https://julianrojos.github.io/buscampleo';
}

export function getLlmConfig(): LlmConfig | null {
  const openrouterKey = readEnv('OPENROUTER_API_KEY');
  if (openrouterKey) {
    return {
      provider: 'openrouter',
      apiKey: openrouterKey,
      model: readEnv('OPENROUTER_MODEL') || 'anthropic/claude-3.5-haiku',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': getAppReferer(),
        'X-Title': 'Buscampleo',
      },
      responseFormat: 'json_object',
    };
  }

  const openaiKey = readEnv('OPENAI_API_KEY');
  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: readEnv('OPENAI_MODEL') || 'gpt-4o-mini',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      responseFormat: 'json_object',
    };
  }

  const anthropicKey = readEnv('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: readEnv('ANTHROPIC_MODEL') || 'claude-3-5-haiku-latest',
      endpoint: 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    };
  }

  return null;
}

function stripCodeFences(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }

  return trimmed;
}

function extractResponseText(payload: unknown, provider: ProviderName): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`llm.${provider}.invalid_response`);
  }

  if (provider === 'anthropic') {
    const content = (payload as { readonly content?: unknown }).content;
    if (!Array.isArray(content)) {
      throw new Error('llm.anthropic.invalid_response');
    }

    const text = content
      .map((block) => {
        if (block && typeof block === 'object' && 'text' in block && typeof block.text === 'string') {
          return block.text;
        }
        return '';
      })
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('llm.anthropic.empty_response');
    }

    return text;
  }

  const choices = (payload as { readonly choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error(`llm.${provider}.invalid_response`);
  }

  const firstChoice = choices[0];
  if (
    !firstChoice ||
    typeof firstChoice !== 'object' ||
    !('message' in firstChoice) ||
    !firstChoice.message ||
    typeof firstChoice.message !== 'object' ||
    !('content' in firstChoice.message) ||
    typeof firstChoice.message.content !== 'string'
  ) {
    throw new Error(`llm.${provider}.invalid_response`);
  }

  const text = firstChoice.message.content.trim();
  if (!text) {
    throw new Error(`llm.${provider}.empty_response`);
  }

  return text;
}

export interface StructuredCompletionOptions<TSchema extends ZodTypeAny> {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly schema: TSchema;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface StructuredCompletionResult<TSchema extends ZodTypeAny> {
  readonly provider: ProviderName;
  readonly model: string;
  readonly rawText: string;
  readonly value: z.infer<TSchema>;
}

export async function generateStructuredCompletion<TSchema extends ZodTypeAny>(
  options: StructuredCompletionOptions<TSchema>,
): Promise<StructuredCompletionResult<TSchema>> {
  const config = getLlmConfig();
  if (!config) {
    throw new Error('llm.not_configured');
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(
      config.provider === 'anthropic'
        ? {
            model: config.model,
            system: options.systemPrompt,
            messages: [{ role: 'user', content: options.userPrompt }],
            max_tokens: options.maxTokens ?? 1200,
            temperature: options.temperature ?? 0.15,
          }
        : {
            model: config.model,
            messages: [
              { role: 'system', content: options.systemPrompt },
              { role: 'user', content: options.userPrompt },
            ],
            temperature: options.temperature ?? 0.15,
            max_tokens: options.maxTokens ?? 1200,
            ...(config.responseFormat ? { response_format: { type: config.responseFormat } } : {}),
          },
    ),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `llm.${config.provider}.request_failed: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ''
      }`,
    );
  }

  const payload = (await response.json()) as unknown;
  const rawText = stripCodeFences(extractResponseText(payload, config.provider));

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `llm.${config.provider}.invalid_json: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }

  const value = options.schema.parse(parsed);
  return {
    provider: config.provider,
    model: config.model,
    rawText,
    value,
  };
}
