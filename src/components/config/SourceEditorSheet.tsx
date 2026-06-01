import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { createSource, patchSource } from '@/data/source-repository';
import useMediaQuery from '@/hooks/use-media-query';
import type { Source, SourceCategory, SourceType } from '@/types/source';

type SourceEditorFormState = {
  readonly name: string;
  readonly url: string;
  readonly type: SourceType;
  readonly category: SourceCategory;
  readonly priority: string;
  readonly parserKey: string;
  readonly notes: string;
  readonly active: boolean;
};

type SourceEditorSheetProps = {
  readonly source: Source | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => Promise<void> | void;
};

const SOURCE_TYPE_OPTIONS: readonly { readonly value: SourceType; readonly label: string }[] = [
  { value: 'rss', label: 'RSS' },
  { value: 'api', label: 'API' },
  { value: 'ats', label: 'ATS' },
  { value: 'scrape', label: 'Scrape' },
  { value: 'manual', label: 'Manual' },
];

const SOURCE_CATEGORY_OPTIONS: readonly {
  readonly value: SourceCategory;
  readonly label: string;
}[] = [
  { value: 'niche-design', label: 'Nicho diseño' },
  { value: 'design-systems', label: 'Design systems' },
  { value: 'design-engineering', label: 'Design engineering' },
  { value: 'remote', label: 'Remoto' },
  { value: 'generalist', label: 'Generalista' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'community', label: 'Comunidad' },
  { value: 'ats-direct', label: 'ATS directo' },
];

const DEFAULT_FORM_STATE: SourceEditorFormState = {
  name: '',
  url: '',
  type: 'manual',
  category: 'generalist',
  priority: '5',
  parserKey: '',
  notes: '',
  active: true,
};

function buildFormState(source: Source | null): SourceEditorFormState {
  if (!source) {
    return DEFAULT_FORM_STATE;
  }

  return {
    name: source.name,
    url: source.url,
    type: source.type,
    category: source.category,
    priority: String(source.priority),
    parserKey: source.parser_key ?? '',
    notes: source.notes ?? '',
    active: source.active,
  };
}

function normalizePriority(value: string): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : 5;
}

export default function SourceEditorSheet({
  source,
  open,
  onClose,
  onSaved,
}: SourceEditorSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [form, setForm] = useState<SourceEditorFormState>(buildFormState(source));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateField<K extends keyof SourceEditorFormState>(
    key: K,
    value: SourceEditorFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedUrl = form.url.trim();
    if (!trimmedName || !trimmedUrl) {
      setError('Nombre y URL son obligatorios.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const timestamp = new Date().toISOString();

    try {
      if (source) {
        await patchSource(source.id, {
          name: trimmedName,
          url: trimmedUrl,
          type: form.type,
          category: form.category,
          priority: normalizePriority(form.priority),
          parser_key: form.parserKey.trim() || null,
          notes: form.notes.trim() || null,
          active: form.active,
          updated_at: timestamp,
        });
      } else {
        await createSource({
          name: trimmedName,
          url: trimmedUrl,
          type: form.type,
          category: form.category,
          active: form.active,
          priority: normalizePriority(form.priority),
          parser_key: form.parserKey.trim() || null,
          last_success_at: null,
          last_error_at: null,
          consecutive_failures: 0,
          offers_found: 0,
          notes: form.notes.trim() || null,
          created_at: timestamp,
          updated_at: timestamp,
        });
      }

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la fuente.');
    } finally {
      setIsSaving(false);
    }
  }

  const side = isDesktop ? 'right' : 'bottom';

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <SheetContent side={side} className="w-full overflow-hidden">
        <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>{source ? 'Editar fuente' : 'Añadir fuente'}</SheetTitle>
            <SheetDescription>
              {source
                ? 'Actualiza la configuración de la fuente y su salud operativa.'
                : 'Configura una nueva fuente con todos los campos relevantes.'}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="source-name">
                  Nombre
                </label>
                <Input
                  id="source-name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Design Systems Jobs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="source-url">
                  URL base
                </label>
                <Input
                  id="source-url"
                  type="url"
                  value={form.url}
                  onChange={(event) => updateField('url', event.target.value)}
                  placeholder="https://example.com/jobs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Tipo</span>
                  <Select
                    value={form.type}
                    onValueChange={(value) => updateField('type', value as SourceType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Categoría</span>
                  <Select
                    value={form.category}
                    onValueChange={(value) => updateField('category', value as SourceCategory)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="source-priority">
                    Prioridad
                  </label>
                  <Input
                    id="source-priority"
                    type="number"
                    min="1"
                    max="10"
                    value={form.priority}
                    onChange={(event) => updateField('priority', event.target.value)}
                    placeholder="5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="source-parser-key">
                    Parser asignado
                  </label>
                  <Input
                    id="source-parser-key"
                    value={form.parserKey}
                    onChange={(event) => updateField('parserKey', event.target.value)}
                    placeholder="greenhouse-json"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="source-notes">
                  Notas
                </label>
                <Textarea
                  id="source-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder="Notas operativas, observaciones o parser específico"
                />
              </div>

              <div className="flex items-center justify-between gap-3 border border-border px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Fuente activa</p>
                  <p className="text-xs text-muted-foreground">
                    Las fuentes inactivas se conservan pero no entran en el scraping.
                  </p>
                </div>
                <Toggle
                  pressed={form.active}
                  onPressedChange={(value) => updateField('active', Boolean(value))}
                >
                  {form.active ? 'Activa' : 'Inactiva'}
                </Toggle>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-border px-6 py-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
