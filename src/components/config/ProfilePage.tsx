import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ProfilePage() {
  const [headline, setHeadline] = useState('UI / Design Systems / CSS');
  const [summary, setSummary] = useState(
    'Diseñador enfocado en sistemas de interfaz, componentes y colaboración con ingeniería.',
  );
  const [skills, setSkills] = useState('Figma, Design Systems, CSS, HTML, Accessibility');
  const [linkedinText, setLinkedinText] = useState('');

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
            Perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura el perfil profesional que se usará para comparar ofertas.
          </p>
        </div>

        <section className="space-y-4 rounded-none border border-border p-4">
          <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
            Perfil base
          </h2>
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Titular profesional</span>
              <Input value={headline} onChange={(event) => setHeadline(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Resumen</span>
              <Textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Skills</span>
              <Textarea rows={3} value={skills} onChange={(event) => setSkills(event.target.value)} />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-none border border-border p-4">
          <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
            LinkedIn
          </h2>
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">URL de LinkedIn</span>
              <Input placeholder="https://linkedin.com/in/..." />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Texto del perfil</span>
              <Textarea
                rows={8}
                value={linkedinText}
                onChange={(event) => setLinkedinText(event.target.value)}
                placeholder="Pega aquí el texto de LinkedIn o tu exportación."
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-none border border-border p-4">
          <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
            CV PDF
          </h2>
          <input type="file" accept="application/pdf" />
          <div className="rounded-none border border-dashed border-border p-4 text-sm text-muted-foreground">
            Aquí se mostrará el texto extraído del CV una vez procesado.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">Reanalizar CV</Button>
            <Button type="button" variant="outline">
              Borrar CV
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
