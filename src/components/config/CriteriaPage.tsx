import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KeywordItem {
  readonly term: string;
  readonly weight: number;
}

const INITIAL_POSITIVE: KeywordItem[] = [
  { term: 'Design Systems', weight: 1.5 },
  { term: 'Figma Variables', weight: 1.4 },
  { term: 'CSS', weight: 1.3 },
  { term: 'HTML', weight: 1.2 },
];

const INITIAL_NEGATIVE: KeywordItem[] = [
  { term: 'tolerancia a la frustración', weight: 1 },
  { term: 'ninja', weight: 0.8 },
  { term: 'diseñador 360', weight: 1.2 },
];

function KeywordSection({
  title,
  description,
  items,
  onChange,
}: {
  readonly title: string;
  readonly description: string;
  readonly items: KeywordItem[];
  readonly onChange: (next: KeywordItem[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [weightDraft, setWeightDraft] = useState('1');

  return (
    <section className="space-y-3 rounded-none border border-border p-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.term} className="flex items-center gap-2">
            <div className="flex-1 rounded-none border border-border px-3 py-2 text-sm">
              {item.term}
            </div>
            <Input
              aria-label={`Peso de ${item.term}`}
              type="number"
              min="0"
              step="0.1"
              value={item.weight}
              onChange={(event) =>
                onChange(
                  items.map((current) =>
                    current.term === item.term
                      ? { ...current, weight: Number(event.target.value) }
                      : current,
                  ),
                )
              }
              className="w-20"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(items.filter((current) => current.term !== item.term))}
            >
              ×
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label={`Añadir keyword a ${title}`}
          placeholder="Nueva keyword"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Input
          aria-label={`Peso de nueva keyword en ${title}`}
          type="number"
          min="0"
          step="0.1"
          value={weightDraft}
          onChange={(event) => setWeightDraft(event.target.value)}
          className="sm:w-24"
        />
        <Button
          type="button"
          onClick={() => {
            if (!draft.trim()) {
              return;
            }

            onChange([...items, { term: draft.trim(), weight: Number(weightDraft) || 1 }]);
            setDraft('');
            setWeightDraft('1');
          }}
        >
          Añadir
        </Button>
      </div>
    </section>
  );
}

export default function CriteriaPage() {
  const [positive, setPositive] = useState(INITIAL_POSITIVE);
  const [negative, setNegative] = useState(INITIAL_NEGATIVE);

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
            Criterios
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona keywords positivas y negativas para afinar el radar de ofertas.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <KeywordSection
            title="Keywords positivas"
            description="Señales que suman relevancia y afinidad."
            items={positive}
            onChange={setPositive}
          />
          <KeywordSection
            title="Keywords negativas"
            description="Señales que penalizan, pero no descartan automáticamente."
            items={negative}
            onChange={setNegative}
          />
        </div>

        <section className="space-y-3 rounded-none border border-border p-4">
          <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
            Roles objetivo
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Product Designer',
              'UI Designer',
              'Design System Designer',
              'Design Engineer',
              'UI Engineer',
              'Design Ops',
            ].map((role) => (
              <div key={role} className="rounded-none border border-border px-3 py-2 text-sm">
                {role}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
