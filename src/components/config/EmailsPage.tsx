import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { getSettingsSnapshot } from '@/data/settings-repository';
import useEmailLogs from '@/hooks/use-email-logs';
import useSettings from '@/hooks/use-settings';
import { useSession } from '@/lib/auth/session';
import type { UserSettings } from '@/types/account';

type EmailSettingsPanelProps = {
  readonly initialSettings: UserSettings;
  readonly isSaving: boolean;
  readonly onSave: (settings: UserSettings) => Promise<void>;
};

function EmailSettingsPanel({ initialSettings, isSaving, onSave }: EmailSettingsPanelProps) {
  const { data: logs = [] } = useEmailLogs();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(initialSettings.email_enabled);
  const [recipient, setRecipient] = useState(initialSettings.email_recipient);
  const [frequency, setFrequency] = useState(initialSettings.email_frequency);
  const [minScore, setMinScore] = useState(String(initialSettings.min_score));
  const [maxJobs, setMaxJobs] = useState(String(initialSettings.max_jobs));
  const [includeUnanalyzed, setIncludeUnanalyzed] = useState(initialSettings.include_unanalyzed);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const recipientId = 'emails-recipient';
  const frequencyId = 'emails-frequency';
  const minScoreId = 'emails-min-score';
  const maxOffersId = 'emails-max-offers';

  async function handleSave() {
    await onSave({
      ...initialSettings,
      email_enabled: enabled,
      email_recipient: recipient,
      email_frequency: frequency,
      min_score: Number(minScore) || 0,
      max_jobs: Number(maxJobs) || 0,
      include_unanalyzed: includeUnanalyzed,
    });
  }

  async function handleTestEmail() {
    setTestStatus('sending');
    setTestMessage(null);

    try {
      const response = await fetch('/api/send-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ test: true }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          readonly error?: string;
        } | null;
        throw new Error(body?.error ?? 'No se pudo enviar el email de prueba.');
      }

      setTestStatus('success');
      setTestMessage('Se registró el email de prueba correctamente.');
      void queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    } catch (error) {
      setTestStatus('error');
      setTestMessage(
        error instanceof Error ? error.message : 'No se pudo enviar el email de prueba.',
      );
    }
  }

  return (
    <>
      <section className="space-y-4 rounded-none border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
              Activación
            </h2>
            <p className="text-sm text-muted-foreground">Activa o desactiva el envío de emails.</p>
          </div>
          <Toggle pressed={enabled} onPressedChange={setEnabled} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={recipientId} className="text-sm font-medium">
              Email destinatario
            </label>
            <Input
              id={recipientId}
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="tu@email.com"
            />
          </div>
          <div className="space-y-2">
            <span id={frequencyId} className="text-sm font-medium">
              Frecuencia
            </span>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as typeof frequency)}
            >
              <SelectTrigger aria-labelledby={frequencyId}>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diaria</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="high-score">Solo alto score</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor={minScoreId} className="text-sm font-medium">
              Score mínimo
            </label>
            <Input
              id={minScoreId}
              type="number"
              min="0"
              max="100"
              value={minScore}
              onChange={(event) => setMinScore(event.target.value)}
              placeholder="70"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={maxOffersId} className="text-sm font-medium">
              Máx. ofertas por email
            </label>
            <Input
              id={maxOffersId}
              type="number"
              min="1"
              max="20"
              value={maxJobs}
              onChange={(event) => setMaxJobs(event.target.value)}
              placeholder="5"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Toggle pressed={includeUnanalyzed} onPressedChange={setIncludeUnanalyzed} />
          <span>Incluir ofertas aún no analizadas</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            Guardar emails
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleTestEmail()}
            disabled={testStatus === 'sending'}
          >
            Enviar email de prueba
          </Button>
        </div>
        {testMessage ? (
          <p
            className={
              testStatus === 'error' ? 'text-sm text-danger' : 'text-sm text-muted-foreground'
            }
          >
            {testMessage}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-none border border-border p-4">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Últimos emails
        </h2>
        <div className="space-y-2">
          {logs.slice(0, 3).map((log) => (
            <div key={log.id} className="rounded-none border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{log.subject}</span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {log.status}
                </span>
              </div>
              <p className="text-muted-foreground">{log.recipient_email}</p>
            </div>
          ))}
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay envíos registrados.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default function EmailsPage() {
  const { saveSettings, data: settingsData, isLoading } = useSettings();
  const initialSettings = settingsData ?? getSettingsSnapshot();

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">Emails</h1>
          <p className="text-sm text-muted-foreground">
            Configura los digests por correo y cómo se priorizan.
          </p>
        </div>

        <EmailSettingsPanel
          key={initialSettings.updated_at}
          initialSettings={initialSettings}
          isSaving={isLoading}
          onSave={saveSettings}
        />
      </div>
    </div>
  );
}
