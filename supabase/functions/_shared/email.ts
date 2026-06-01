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

export interface TransactionalEmailInput {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface TransactionalEmailResult {
  readonly provider: 'resend';
  readonly providerMessageId: string | null;
  readonly rawResponse: Record<string, unknown> | null;
}

export function getEmailFromAddress(): string {
  return readEnv('EMAIL_FROM') || 'Buscampleo <onboarding@resend.dev>';
}

export function hasTransactionalEmailConfig(): boolean {
  return Boolean(readEnv('RESEND_API_KEY'));
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<TransactionalEmailResult> {
  const apiKey = readEnv('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('email.provider_not_configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const rawResponse = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new Error(
      `email.resend.request_failed: ${response.status} ${response.statusText}${
        rawResponse ? ` - ${JSON.stringify(rawResponse)}` : ''
      }`,
    );
  }

  return {
    provider: 'resend',
    providerMessageId: typeof rawResponse?.id === 'string' ? rawResponse.id : null,
    rawResponse,
  };
}
