import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { DEFAULT_CRITERIA_CONFIG } from '@/data/criteria';
import { cn } from '@/lib/utils';
import type {
  ConditionalRuleCriterion,
  ConditionalSeverity,
  CriteriaCategory,
  HardExcludeCriterion,
  TargetRoleCriterion,
  WeightedSignalCriterion,
} from '@/types/criteria';

const CATEGORY_LABELS: Record<CriteriaCategory, string> = {
  'design-systems': 'Design systems',
  'design-code': 'Design/code',
  accessibility: 'Accesibilidad',
  modality: 'Modalidad',
  maturity: 'Madurez',
  collaboration: 'Colaboración',
  exclusion: 'Exclusión',
  role: 'Rol',
};

const CATEGORY_OPTIONS = (Object.entries(CATEGORY_LABELS) as [CriteriaCategory, string][]).map(
  ([value, label]) => ({ value, label }) as const,
);

const SEVERITY_OPTIONS: readonly {
  readonly value: ConditionalSeverity;
  readonly label: string;
  readonly tone: 'danger' | 'warning';
}[] = [
  { value: 'block', label: 'Bloquea', tone: 'danger' },
  { value: 'penalize', label: 'Penaliza', tone: 'warning' },
] as const;

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function patchById<T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function removeById<T extends { readonly id: string }>(items: readonly T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

function toggleById<T extends { readonly id: string; readonly active: boolean }>(
  items: readonly T[],
  id: string,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, active: !item.active } : item));
}

function safeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countActive<T extends { readonly active: boolean }>(items: readonly T[]): number {
  return items.filter((item) => item.active).length;
}

function countWeightedByTone(items: readonly WeightedSignalCriterion[]): {
  readonly positive: number;
  readonly negative: number;
  readonly neutral: number;
} {
  return {
    positive: items.filter((item) => item.weight > 0).length,
    negative: items.filter((item) => item.weight < 0).length,
    neutral: items.filter((item) => item.weight === 0).length,
  };
}

function severityLabel(severity: ConditionalSeverity): string {
  return SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ?? severity;
}

function weightTone(weight: number): 'positive' | 'negative' | 'neutral' {
  if (weight > 0) {
    return 'positive';
  }

  if (weight < 0) {
    return 'negative';
  }

  return 'neutral';
}

function toneClasses(tone: 'positive' | 'negative' | 'neutral'): string {
  switch (tone) {
    case 'positive':
      return 'border-success/30 bg-success/10';
    case 'negative':
      return 'border-warning/30 bg-warning/10';
    case 'neutral':
      return 'border-border bg-muted/20';
  }
}

function weightBadgeClasses(weight: number): string {
  if (weight > 0) {
    return 'border-success/30 bg-success/10 text-success';
  }

  if (weight < 0) {
    return 'border-warning/30 bg-warning/10 text-warning';
  }

  return 'border-border bg-muted/30 text-muted-foreground';
}

function SummaryMetric({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}) {
  return (
    <div className="space-y-1 rounded-none border border-border bg-background p-3">
      <p className="text-[0.625rem] font-semibold tracking-widest uppercase text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-xl font-semibold tracking-wide">{value}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function SectionShell({
  title,
  description,
  badge,
  tone = 'default',
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly badge: string;
  readonly tone?: 'default' | 'danger';
  readonly children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'space-y-4 rounded-none border p-4 sm:p-5',
        tone === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-border bg-background',
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">{title}</h2>
            <Badge
              className={cn(
                'border px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase',
                tone === 'danger'
                  ? 'border-danger/30 bg-danger/10 text-danger'
                  : 'border-border bg-muted/30 text-muted-foreground',
              )}
            >
              {badge}
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  label,
  hint,
  children,
  className,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <label className={cn('space-y-1 text-sm', className)}>
      <span className="block text-[0.625rem] font-semibold tracking-widest uppercase text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function EmptyStateLine({ text }: { readonly text: string }) {
  return (
    <div className="rounded-none border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function HardExcludeRow({
  item,
  onToggle,
  onUpdate,
  onRemove,
}: {
  readonly item: HardExcludeCriterion;
  readonly onToggle: () => void;
  readonly onUpdate: (patch: Partial<HardExcludeCriterion>) => void;
  readonly onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-none border border-danger/20 bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-danger/30 bg-danger/10 text-danger">
              Exclusión dura
            </Badge>
            <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
            <Badge variant="secondary">{item.active ? 'Activa' : 'Inactiva'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Estas reglas eliminan la oferta del radar.
          </p>
        </div>
        <Toggle pressed={item.active} onPressedChange={onToggle} variant="outline" size="sm">
          {item.active ? 'Activa' : 'Inactiva'}
        </Toggle>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr_auto]">
        <FieldLabel label="Patrón">
          <Input
            value={item.pattern}
            onChange={(event) => onUpdate({ pattern: event.target.value })}
            placeholder="Término de exclusión"
          />
        </FieldLabel>

        <FieldLabel label="Razón">
          <Input
            value={item.reason}
            onChange={(event) => onUpdate({ reason: event.target.value })}
            placeholder="Motivo breve"
          />
        </FieldLabel>

        <div className="flex items-end">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full lg:w-auto"
            onClick={onRemove}
            aria-label={`Eliminar exclusión dura ${item.pattern}`}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

function WeightedSignalRow({
  item,
  onToggle,
  onUpdate,
  onRemove,
}: {
  readonly item: WeightedSignalCriterion;
  readonly onToggle: () => void;
  readonly onUpdate: (patch: Partial<WeightedSignalCriterion>) => void;
  readonly onRemove: () => void;
}) {
  const tone = weightTone(item.weight);

  return (
    <div className={cn('space-y-3 rounded-none border p-3', toneClasses(tone))}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('border px-2 py-1', weightBadgeClasses(item.weight))}>
              {tone === 'positive' ? 'Suma' : tone === 'negative' ? 'Penaliza' : 'Neutra'}
            </Badge>
            <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
            <Badge variant="secondary">{item.active ? 'Activa' : 'Inactiva'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            La polaridad la determina el signo del peso.
          </p>
        </div>
        <Toggle pressed={item.active} onPressedChange={onToggle} variant="outline" size="sm">
          {item.active ? 'Activa' : 'Inactiva'}
        </Toggle>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.8fr_0.6fr_auto]">
        <FieldLabel label="Patrón">
          <Input
            value={item.pattern}
            onChange={(event) => onUpdate({ pattern: event.target.value })}
            placeholder="Keyword o frase"
          />
        </FieldLabel>

        <FieldLabel label="Categoría">
          <Select
            value={item.category}
            onValueChange={(value) => onUpdate({ category: value as CriteriaCategory })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>

        <FieldLabel label="Peso">
          <Input
            type="number"
            step="0.1"
            value={item.weight}
            onChange={(event) => onUpdate({ weight: safeNumber(event.target.value) })}
            className={cn(
              'w-full',
              item.weight > 0 && 'text-success',
              item.weight < 0 && 'text-warning',
              item.weight === 0 && 'text-muted-foreground',
            )}
          />
        </FieldLabel>

        <div className="flex items-end">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full lg:w-auto"
            onClick={onRemove}
            aria-label={`Eliminar señal ${item.pattern}`}
          >
            Eliminar
          </Button>
        </div>
      </div>

      <FieldLabel
        label="Explicación"
        hint="Visible siempre en el criterio y reutilizable en el detalle."
      >
        <Textarea
          value={item.explain}
          onChange={(event) => onUpdate({ explain: event.target.value })}
          placeholder="Por qué esta señal suma o penaliza"
          rows={3}
        />
      </FieldLabel>
    </div>
  );
}

function ConditionalRuleCard({
  item,
  onToggle,
  onUpdate,
}: {
  readonly item: ConditionalRuleCriterion;
  readonly onToggle: () => void;
  readonly onUpdate: (patch: Partial<ConditionalRuleCriterion>) => void;
}) {
  const tone = item.severity === 'block' ? 'danger' : 'warning';

  return (
    <div
      className={cn(
        'space-y-3 rounded-none border p-4',
        tone === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-warning/30 bg-warning/5',
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                'border px-2 py-1',
                tone === 'danger'
                  ? 'border-danger/30 bg-danger/10 text-danger'
                  : 'border-warning/30 bg-warning/10 text-warning',
              )}
            >
              {severityLabel(item.severity)}
            </Badge>
            <Badge variant="secondary">{item.active ? 'Activa' : 'Inactiva'}</Badge>
          </div>
          <h3 className="font-heading text-base font-semibold tracking-wide">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
        <Toggle pressed={item.active} onPressedChange={onToggle} variant="outline" size="sm">
          {item.active ? 'Activa' : 'Inactiva'}
        </Toggle>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.7fr_1fr]">
        <FieldLabel label="Severidad">
          <Select
            value={item.severity}
            onValueChange={(value) => onUpdate({ severity: value as ConditionalSeverity })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>

        <div className="space-y-1">
          <span className="block text-[0.625rem] font-semibold tracking-widest uppercase text-muted-foreground">
            Explicación fija
          </span>
          <div className="rounded-none border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {item.explain}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleChip({
  item,
  onToggle,
}: {
  readonly item: TargetRoleCriterion;
  readonly onToggle: () => void;
}) {
  return (
    <Toggle
      pressed={item.active}
      onPressedChange={onToggle}
      variant="outline"
      size="sm"
      className={cn(
        'justify-start px-4',
        item.active && 'border-success/30 bg-success/10 text-success',
      )}
    >
      {item.label}
    </Toggle>
  );
}

export default function CriteriaPage() {
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA_CONFIG);

  const [hardExcludeDraft, setHardExcludeDraft] = useState({
    pattern: '',
    reason: '',
  });

  const [weightedDraft, setWeightedDraft] = useState({
    pattern: '',
    category: 'design-systems' as CriteriaCategory,
    weight: '1',
    explain: '',
  });

  const hardExcludeActive = countActive(criteria.hard_excludes);
  const weightedActive = countActive(criteria.weighted_signals);
  const weightedCounts = countWeightedByTone(criteria.weighted_signals);
  const conditionalActive = countActive(criteria.conditional_rules);
  const rolesActive = countActive(criteria.target_roles);

  const addHardExclude = () => {
    const pattern = hardExcludeDraft.pattern.trim();

    if (!pattern) {
      return;
    }

    setCriteria((current) => ({
      ...current,
      hard_excludes: [
        ...current.hard_excludes,
        {
          id: createId('he'),
          pattern,
          category: 'exclusion',
          reason: hardExcludeDraft.reason.trim() || 'Motivo pendiente de completar.',
          active: true,
        },
      ],
    }));

    setHardExcludeDraft({ pattern: '', reason: '' });
  };

  const addWeightedSignal = () => {
    const pattern = weightedDraft.pattern.trim();

    if (!pattern) {
      return;
    }

    setCriteria((current) => ({
      ...current,
      weighted_signals: [
        ...current.weighted_signals,
        {
          id: createId('ws'),
          pattern,
          category: weightedDraft.category,
          weight: safeNumber(weightedDraft.weight),
          explain: weightedDraft.explain.trim() || 'Explicación pendiente de completar.',
          active: true,
        },
      ],
    }));

    setWeightedDraft({
      pattern: '',
      category: 'design-systems',
      weight: '1',
      explain: '',
    });
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">Criterios</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Editor declarativo de señales y reglas. La prioridad es descartar poco, puntuar con
            explicación y reservar las reglas condicionales para cortafuegos claros.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric
            label="Señales"
            value={`${weightedActive}/${criteria.weighted_signals.length}`}
            hint={`${weightedCounts.positive} suma, ${weightedCounts.negative} penaliza, ${weightedCounts.neutral} neutras`}
          />
          <SummaryMetric
            label="Exclusiones"
            value={`${hardExcludeActive}/${criteria.hard_excludes.length}`}
            hint="Reglas que eliminan la oferta del radar"
          />
          <SummaryMetric
            label="Condicionales"
            value={`${conditionalActive}/${criteria.conditional_rules.length}`}
            hint="Cortafuegos y reglas de contexto"
          />
          <SummaryMetric
            label="Roles"
            value={`${rolesActive}/${criteria.target_roles.length}`}
            hint="Roles objetivo secundarios"
          />
        </div>

        <SectionShell
          title="Exclusiones duras"
          badge={`${hardExcludeActive}/${criteria.hard_excludes.length}`}
          tone="danger"
          description="Estas reglas eliminan la oferta del radar. Deben ser pocas, claras y difíciles de confundir con una simple penalización."
        >
          <div className="space-y-3">
            {criteria.hard_excludes.length > 0 ? (
              criteria.hard_excludes.map((item) => (
                <HardExcludeRow
                  key={item.id}
                  item={item}
                  onToggle={() =>
                    setCriteria((current) => ({
                      ...current,
                      hard_excludes: toggleById(current.hard_excludes, item.id),
                    }))
                  }
                  onUpdate={(patch) =>
                    setCriteria((current) => ({
                      ...current,
                      hard_excludes: patchById(current.hard_excludes, item.id, patch),
                    }))
                  }
                  onRemove={() =>
                    setCriteria((current) => ({
                      ...current,
                      hard_excludes: removeById(current.hard_excludes, item.id),
                    }))
                  }
                />
              ))
            ) : (
              <EmptyStateLine text="No hay exclusiones duras definidas." />
            )}

            <div className="grid gap-3 rounded-none border border-border bg-background p-3 lg:grid-cols-[1fr_1.2fr_auto]">
              <FieldLabel label="Nuevo patrón">
                <Input
                  value={hardExcludeDraft.pattern}
                  onChange={(event) =>
                    setHardExcludeDraft((current) => ({ ...current, pattern: event.target.value }))
                  }
                  placeholder="p. ej. volunteer"
                />
              </FieldLabel>

              <FieldLabel label="Razón">
                <Input
                  value={hardExcludeDraft.reason}
                  onChange={(event) =>
                    setHardExcludeDraft((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Motivo breve"
                />
              </FieldLabel>

              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  className="w-full lg:w-auto"
                  onClick={addHardExclude}
                >
                  Añadir exclusión
                </Button>
              </div>
            </div>
          </div>
        </SectionShell>

        <SectionShell
          title="Señales ponderadas"
          badge={`${weightedActive}/${criteria.weighted_signals.length}`}
          description="Un solo array, polaridad por signo y explicación visible. El usuario puede ajustar peso, categoría y texto explicativo sin perder la trazabilidad."
        >
          <div className="space-y-4">
            <div className="grid gap-3 rounded-none border border-border bg-background p-3 lg:grid-cols-[1fr_0.8fr_0.6fr_auto]">
              <FieldLabel label="Nuevo patrón">
                <Input
                  value={weightedDraft.pattern}
                  onChange={(event) =>
                    setWeightedDraft((current) => ({ ...current, pattern: event.target.value }))
                  }
                  placeholder="p. ej. Design Systems"
                />
              </FieldLabel>

              <FieldLabel label="Categoría">
                <Select
                  value={weightedDraft.category}
                  onValueChange={(value) =>
                    setWeightedDraft((current) => ({
                      ...current,
                      category: value as CriteriaCategory,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldLabel>

              <FieldLabel label="Peso">
                <Input
                  type="number"
                  step="0.1"
                  value={weightedDraft.weight}
                  onChange={(event) =>
                    setWeightedDraft((current) => ({ ...current, weight: event.target.value }))
                  }
                />
              </FieldLabel>

              <FieldLabel
                label="Explicación"
                className="lg:col-span-3"
                hint="Se mostrará junto a la señal; no la dejes en blanco si la señal es importante."
              >
                <Textarea
                  value={weightedDraft.explain}
                  onChange={(event) =>
                    setWeightedDraft((current) => ({ ...current, explain: event.target.value }))
                  }
                  placeholder="Por qué suma o penaliza"
                  rows={3}
                />
              </FieldLabel>

              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  className="w-full lg:w-auto"
                  onClick={addWeightedSignal}
                >
                  Añadir señal
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              {(['positive', 'negative', 'neutral'] as const).map((tone) => {
                const items = criteria.weighted_signals.filter(
                  (item) => weightTone(item.weight) === tone,
                );
                const title =
                  tone === 'positive' ? 'Suma' : tone === 'negative' ? 'Penaliza' : 'Neutras';

                return (
                  <div key={tone} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base font-semibold tracking-wide uppercase">
                        {title}
                      </h3>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>

                    {items.length > 0 ? (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <WeightedSignalRow
                            key={item.id}
                            item={item}
                            onToggle={() =>
                              setCriteria((current) => ({
                                ...current,
                                weighted_signals: toggleById(current.weighted_signals, item.id),
                              }))
                            }
                            onUpdate={(patch) =>
                              setCriteria((current) => ({
                                ...current,
                                weighted_signals: patchById(
                                  current.weighted_signals,
                                  item.id,
                                  patch,
                                ),
                              }))
                            }
                            onRemove={() =>
                              setCriteria((current) => ({
                                ...current,
                                weighted_signals: removeById(current.weighted_signals, item.id),
                              }))
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyStateLine
                        text={`No hay señales en el bloque ${title.toLowerCase()}.`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SectionShell>

        <SectionShell
          title="Reglas condicionales"
          badge={`${conditionalActive}/${criteria.conditional_rules.length}`}
          description="Son reglas predefinidas. Solo se permite activar, desactivar o cambiar su severidad; la lógica de la condición permanece fija."
        >
          <div className="space-y-3">
            {criteria.conditional_rules.length > 0 ? (
              criteria.conditional_rules.map((item) => (
                <ConditionalRuleCard
                  key={item.id}
                  item={item}
                  onToggle={() =>
                    setCriteria((current) => ({
                      ...current,
                      conditional_rules: toggleById(current.conditional_rules, item.id),
                    }))
                  }
                  onUpdate={(patch) =>
                    setCriteria((current) => ({
                      ...current,
                      conditional_rules: patchById(current.conditional_rules, item.id, patch),
                    }))
                  }
                />
              ))
            ) : (
              <EmptyStateLine text="No hay reglas condicionales definidas." />
            )}
          </div>
        </SectionShell>

        <SectionShell
          title="Roles objetivo"
          badge={`${rolesActive}/${criteria.target_roles.length}`}
          description="Bloque secundario. Los roles ayudan a orientar el radar, pero no sustituyen las señales ni las reglas."
        >
          {criteria.target_roles.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {criteria.target_roles.map((item) => (
                <RoleChip
                  key={item.id}
                  item={item}
                  onToggle={() =>
                    setCriteria((current) => ({
                      ...current,
                      target_roles: toggleById(current.target_roles, item.id),
                    }))
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyStateLine text="No hay roles objetivo definidos." />
          )}
        </SectionShell>
      </div>
    </div>
  );
}
