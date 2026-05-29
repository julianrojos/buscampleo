import { ExternalLink, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import RedFlagList from '@/components/jobs/RedFlagList';
import ScoreBadge from '@/components/jobs/ScoreBadge';
import SignalChips from '@/components/jobs/SignalChips';
import StatusBadge from '@/components/jobs/StatusBadge';
import useJobActions from '@/hooks/use-job-actions';
import useJobDetail from '@/hooks/use-job-detail';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function SectionTitle({ children }: { readonly children: string }) {
  return (
    <h2 className="font-heading text-sm font-semibold tracking-widest uppercase text-foreground">
      {children}
    </h2>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: job, isLoading, isError, error } = useJobDetail(id);
  const { save, unsave, apply, markRead } = useJobActions();

  const search = searchParams.toString();
  const backToList = useMemo(
    () => (search ? `/ofertas?${search}` : '/ofertas'),
    [search],
  );

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
          <p className="text-sm leading-relaxed text-muted-foreground">
            {job.summary ?? 'No hay resumen generado todavía.'}
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
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${item.value ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <SectionTitle>Señales positivas</SectionTitle>
            <SignalChips signals={job.positive_signals} max={6} />
          </div>
          <div className="space-y-3">
            <SectionTitle>Red flags</SectionTitle>
            <RedFlagList flags={job.red_flags} />
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Match con perfil</SectionTitle>
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
                {job.description ? 'Descripción suficiente para validar la señal.' : 'La descripción está incompleta o falta.'}
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
