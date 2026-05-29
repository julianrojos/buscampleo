import { FileSliders, Mail, Clock3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

const items = [
  {
    to: '/criterios',
    title: 'Criterios',
    description: 'Keywords positivas/negativas y roles objetivo.',
    icon: FileSliders,
  },
  {
    to: '/emails',
    title: 'Emails',
    description: 'Frecuencia, score mínimo y email de prueba.',
    icon: Mail,
  },
  {
    to: '/historial',
    title: 'Historial',
    description: 'Ejecuciones, errores y resultados del scraping.',
    icon: Clock3,
  },
];

export default function SettingsHub() {
  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
            Ajustes
          </h1>
          <p className="text-sm text-muted-foreground">
            Atajos para la configuración que se consulta con menos frecuencia.
          </p>
        </div>

        <div className="grid gap-3">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-start gap-3 border border-border bg-background p-4 transition-colors hover:bg-muted/30',
                    isActive && 'border-primary/70 bg-muted/30',
                  )
                }
              >
                <div className="flex size-10 items-center justify-center border border-border bg-muted">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="font-semibold tracking-wide uppercase">{item.title}</h2>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
