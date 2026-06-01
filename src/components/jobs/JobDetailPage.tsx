import { ExternalLink, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import ErrorState from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import RedFlagList from '@/components/jobs/RedFlagList';
import ScoreBadge from '@/components/jobs/ScoreBadge';
import SignalChips from '@/components/jobs/SignalChips';
import StatusBadge from '@/components/jobs/StatusBadge';
import useCriteriaConfig from '@/hooks/use-criteria-config';
import useJobActions from '@/hooks/use-job-actions';
import useJobDetail from '@/hooks/use-job-detail';
import useJobMatch from '@/hooks/use-job-match';
import { getMatchedHardExcludes, findWeightedSignalByKeyword } from '@/lib/job-criteria';
import { cn } from '@/lib/utils';
import { getCriteriaConfigSnapshot } from '@/data/criteria-repository';
import type { HardExcludeCriterion } from '@/types/criteria';

function SectionTitle({ children }: { readonly children: string }) {
  return (
    <h2 className="font-heading text-sm font-semibold tracking-widest uppercase text-foreground">
      {children}
    </h2>
  );
}

function SectionHint({ children }: { readonly children: string }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

function ChipLabel({
  children,
  tone = 'neutral',
}: {
  readonly children: string;
  readonly tone?: 'neutral' | 'positive' | 'warning';
}) {
  return (
    <Badge
      className={cn(
        'border px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase',
        tone === 'positive' && 'border-success/30 bg-success/10 text-success',
        tone === 'warning' && 'border-warning/30 bg-warning/10 text-warning',
        tone === 'neutral' && 'border-border bg-muted text-muted-foreground',
      )}
    >
      {children}
    </Badge>
  );
}

function ExcludeCard({ criterion }: { readonly criterion: HardExcludeCriterion }) {
  return (
    <div className="space-y-2 border border-warning/20 bg-warning/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ChipLabel tone="warning">{criterion.pattern}</ChipLabel>
      </div>
      <p className="text-sm text-muted-foreground">{criterion.reason}</p>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: criteria } = useCriteriaConfig();
  const { data: job, isLoading, isError, error } = useJobDetail(id);
  const { data: match } = useJobMatch(id);
  const { save, unsave, apply, markRead } = useJobActions();

  const search = searchParams.toString();
  const backToList = useMemo(() => (search ? `/ofertas?${search}` : '/ofertas'), [search]);
  const criteriaConfig = criteria ?? getCriteriaConfigSnapshot();

  useEffect(() => {
    if (!isLoading && !isError && !job) {
      navigate(backToList, { replace: true });
    }
  }, [backToList, isError, isLoading, job, navigate]);

  useEffect(() => {
    if (job && !job.is_read) {
      markRead(job.id);
    }
  }, [job, markRead]);

  if (isError) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudo cargar el detalle.'}
          onRetry={() => void navigate(backToList, { replace: true })}
        />
      </div>
    );
  }

  if (isLoading || !job) {
    return <div className="h-full min-h-0 overflow-y-auto px-4 py-4 lg:px-6" />;
  }

  const handleBack = () => {
    navigate(backToList);
  };

  const positiveCriteriaSignals = job.positive_signals.filter((signal) =>
    Boolean(findWeightedSignalByKeyword(signal, criteriaConfig)),
  );
  const detectedPositiveSignals = job.positive_signals.filter(
    (signal) => !positiveCriteriaSignals.includes(signal),
  );
  const matchedExcludes = getMatchedHardExcludes(job, criteriaConfig);

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Button variant="outline" className="lg:hidden" onClick={handleBack}>
              <ArrowLeft className="size-3.5" />
              Volver
            </Button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <ScoreBadge score={job.final_score} />
                <StatusBadge status={job.status} />
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
                {job.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {job.company} · {job.source_name}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button
              variant={job.is_saved ? 'secondary' : 'outline'}
              onClick={() => (job.is_saved ? unsave(job.id) : save(job.id))}
            >
              <Save className="size-3.5" />
              {job.is_saved ? 'Guardada' : 'Guardar'}
            </Button>
            <Button variant="outline" onClick={() => apply(job.id)}>
              <CheckCircle2 className="size-3.5" />
              Aplicar
            </Button>
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => markRead(job.id)}
            >
              <ExternalLink className="size-3.5" />
              Oferta original
            </a>
          </div>
        </div>

        <Separator />

        <section className="space-y-2">
          <SectionTitle>Resumen rápido</SectionTitle>
          <SectionHint>
            El detalle combina señales extraídas de la oferta con reglas activas del editor de
            criterios.
          </SectionHint>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {match?.summary ?? job.summary ?? 'No hay resumen generado todavía.'}
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle>Score breakdown</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Fuente', value: job.source_quality_score },
              { label: 'Keywords', value: job.keyword_score },
              { label: 'Semántico', value: job.semantic_score },
              { label: 'Match perfil', value: job.profile_match_score },
            ].map((item) => (
              <div key={item.label} className="space-y-2 rounded-none border border-border p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                  <span>{item.label}</span>
                  <span>{item.value ?? '—'}</span>
                </div>
                <div className="h-2 overflow-hidden bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${item.value ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {match ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SectionTitle>Persistido</SectionTitle>
              <ChipLabel tone="positive">Persistido</ChipLabel>
            </div>
            <SectionHint>Comparación almacenada entre la oferta y el perfil del usuario.</SectionHint>
            <div className="grid gap-4 rounded-none border border-border p-4 lg:grid-cols-3">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Fortalezas
                </h3>
                <SignalChips signals={match.strengths} max={6} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Gaps
                </h3>
                <RedFlagList flags={match.gaps} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Recomendaciones
                </h3>
                <p className="text-sm text-muted-foreground">
                  {match.recommendations[0] ?? 'Sin recomendaciones.'}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTitle>Señales</SectionTitle>
            <ChipLabel tone="positive">Extraído</ChipLabel>
            {positiveCriteriaSignals.length > 0 ? <ChipLabel tone="positive">Criterios</ChipLabel> : null}
          </div>
          <SectionHint>
            Las coincidencias con criterios activos aparecen separadas de las señales detectadas
            automáticamente en la oferta.
          </SectionHint>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-none border border-border p-4">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Criterios
              </h3>
              <SignalChips signals={positiveCriteriaSignals} max={6} />
              {positiveCriteriaSignals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay señales positivas que crucen con criterios activos.
                </p>
              ) : null}
            </div>
            <div className="space-y-3 rounded-none border border-border p-4">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Extraído
              </h3>
              <SignalChips signals={detectedPositiveSignals} max={6} />
              {detectedPositiveSignals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todas las señales positivas están cubiertas por criterios activos.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTitle>Alertas</SectionTitle>
            {matchedExcludes.length > 0 ? <ChipLabel tone="warning">Criterios</ChipLabel> : null}
            <ChipLabel tone="warning">Extraído</ChipLabel>
          </div>
          <SectionHint>
            Las reglas excluyentes activas se muestran aparte de las alertas detectadas en la
            oferta.
          </SectionHint>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-none border border-border p-4">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Criterios
              </h3>
              <div className="space-y-2">
                {matchedExcludes.length > 0 ? (
                  matchedExcludes.map((criterion) => <ExcludeCard key={criterion.id} criterion={criterion} />)
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay exclusiones activas que coincidan con esta oferta.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-3 rounded-none border border-border p-4">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Extraído
              </h3>
              <RedFlagList flags={job.red_flags} />
              {job.red_flags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No se detectaron red flags.</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Match con perfil</SectionTitle>
          <SectionHint>
            El encaje con perfil se basa en el resultado persistido del análisis de la oferta.
          </SectionHint>
          <div className="grid gap-4 rounded-none border border-border p-4 lg:grid-cols-3">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Cubiertos
              </h3>
              <SignalChips signals={job.detected_skills} max={6} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Por confirmar
              </h3>
              <p className="text-sm text-muted-foreground">
                Seniority, salario y alcance exacto requieren revisión manual.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Ambiguos
              </h3>
              <p className="text-sm text-muted-foreground">
                {job.description
                  ? 'Descripción suficiente para validar la señal.'
                  : 'La descripción está incompleta o falta.'}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <SectionTitle>Descripción</SectionTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {job.description ?? 'No se ha extraído descripción para esta oferta.'}
          </p>
        </section>

        <section className="space-y-2">
          <SectionTitle>Datos clave</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-none border border-border p-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Ubicación
              </p>
              <p className="text-sm">{job.location ?? 'No especificada'}</p>
            </div>
            <div className="rounded-none border border-border p-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Modalidad
              </p>
              <p className="text-sm">{job.modality}</p>
            </div>
            <div className="rounded-none border border-border p-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Seniority
              </p>
              <p className="text-sm">{job.seniority ?? 'No especificado'}</p>
            </div>
            <div className="rounded-none border border-border p-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Salario
              </p>
              <p className="text-sm">
                {job.salary_min && job.salary_max && job.salary_currency
                  ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ${job.salary_currency}`
                  : 'No publicado'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
