import { useState } from 'react';

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

export default function EmailsPage() {
  const [enabled, setEnabled] = useState(true);
  const recipientId = 'emails-recipient';
  const frequencyId = 'emails-frequency';
  const minScoreId = 'emails-min-score';
  const maxOffersId = 'emails-max-offers';

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">Emails</h1>
          <p className="text-sm text-muted-foreground">
            Configura los digests por correo y cómo se priorizan.
          </p>
        </div>

        <section className="space-y-4 rounded-none border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
                Activación
              </h2>
              <p className="text-sm text-muted-foreground">
                Activa o desactiva el envío de emails.
              </p>
            </div>
            <Toggle pressed={enabled} onPressedChange={setEnabled} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor={recipientId} className="text-sm font-medium">
                Email destinatario
              </label>
              <Input id={recipientId} type="email" placeholder="tu@email.com" />
            </div>
            <div className="space-y-2">
              <span id={frequencyId} className="text-sm font-medium">
                Frecuencia
              </span>
              <Select defaultValue="daily">
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
              <Input id={minScoreId} type="number" min="0" max="100" placeholder="70" />
            </div>
            <div className="space-y-2">
              <label htmlFor={maxOffersId} className="text-sm font-medium">
                Máx. ofertas por email
              </label>
              <Input id={maxOffersId} type="number" min="1" max="20" placeholder="5" />
            </div>
          </div>

          <Button type="button">Enviar email de prueba</Button>
        </section>
      </div>
    </div>
  );
}
