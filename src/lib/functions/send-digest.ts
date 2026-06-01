import { z } from 'zod';

import type { Job, JobAnalysisStatus } from '../../types/job';

export const SendDigestBodySchema = z.object({
  test: z.boolean().optional(),
});

export interface DigestSelectionSettings {
  readonly min_score: number;
  readonly max_jobs: number;
  readonly include_unanalyzed: boolean;
}

export interface DigestJobCandidate {
  readonly id: string;
  readonly is_hidden: boolean;
  readonly analysis_status: JobAnalysisStatus;
  readonly final_score: number | null;
}

export function selectDigestJobs<T extends DigestJobCandidate>(
  jobs: readonly T[],
  settings: DigestSelectionSettings,
): T[] {
  return [...jobs]
    .sort((left, right) => {
      const scoreDelta = (right.final_score ?? 0) - (left.final_score ?? 0);
      return scoreDelta !== 0 ? scoreDelta : 0;
    })
    .filter((job) => !job.is_hidden)
    .filter((job) => {
      const isAnalyzed = job.analysis_status === 'done';
      if (!isAnalyzed) return settings.include_unanalyzed;
      return (job.final_score ?? 0) >= settings.min_score;
    })
    .slice(0, settings.max_jobs);
}

export interface DigestEmailContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly jobs: readonly Job[];
}

function sortJobsByScore(jobs: readonly Job[]): Job[] {
  return [...jobs].sort((left, right) => {
    const scoreDelta = (right.final_score ?? 0) - (left.final_score ?? 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return right.updated_at.localeCompare(left.updated_at);
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(0);
}

function buildJobText(job: Job): string {
  const parts = [
    `${job.title} · ${job.company}`,
    `Score: ${formatScore(job.final_score)}`,
    job.location ? `Ubicación: ${job.location}` : null,
    job.summary ?? job.description ?? 'Sin resumen disponible.',
    `Oferta original: ${job.url}`,
  ].filter(Boolean);

  return parts.join('\n');
}

function buildJobHtml(job: Job): string {
  const score = formatScore(job.final_score);
  const summary = escapeHtml(job.summary ?? job.description ?? 'Sin resumen disponible.');

  return `
    <article style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin:0 0 16px 0;background:#fff;">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
        <div>
          <p style="margin:0 0 4px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;">${escapeHtml(job.source_name)}</p>
          <h2 style="margin:0;font-size:18px;line-height:1.3;color:#111827;">${escapeHtml(job.title)}</h2>
          <p style="margin:4px 0 0 0;color:#4b5563;">${escapeHtml(job.company)}${job.location ? ` · ${escapeHtml(job.location)}` : ''}</p>
        </div>
        <div style="min-width:64px;text-align:right;font-weight:700;color:#111827;">${score}</div>
      </div>
      <p style="margin:12px 0 0 0;color:#374151;line-height:1.6;">${summary}</p>
      <p style="margin:12px 0 0 0;font-size:14px;"><a href="${escapeHtml(job.url)}" style="color:#0f766e;text-decoration:underline;">Ver oferta</a></p>
    </article>
  `;
}

export function buildDigestEmailSubject(
  jobsCount: number,
  settings: DigestSelectionSettings,
  test = false,
): string {
  if (test) {
    return `Buscampleo · email de prueba (${jobsCount} ofertas)`;
  }

  const cadence = settings.include_unanalyzed ? 'incluye pendientes' : 'solo analizadas';
  return `Buscampleo · ${jobsCount} ofertas nuevas (${cadence})`;
}

export function renderDigestEmail(
  jobs: readonly Job[],
  settings: DigestSelectionSettings,
  options: { readonly test?: boolean } = {},
): DigestEmailContent {
  const selectedJobs = sortJobsByScore(jobs).slice(0, settings.max_jobs);
  const subject = buildDigestEmailSubject(selectedJobs.length, settings, options.test);
  const heading = options.test
    ? 'Este es un email de prueba de Buscampleo.'
    : 'Tu digest de Buscampleo ya está listo.';
  const intro = selectedJobs.length > 0
    ? `Se han seleccionado ${selectedJobs.length} ofertas con score mínimo ${settings.min_score}.`
    : 'No hay ofertas elegibles para este envío.';

  const text = [
    heading,
    intro,
    '',
    ...selectedJobs.map((job) => buildJobText(job)),
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;color:#111827;padding:24px;">
      <div style="max-width:720px;margin:0 auto;">
        <div style="margin-bottom:24px;">
          <p style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#6b7280;">Buscampleo digest</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${escapeHtml(heading)}</h1>
          <p style="margin:12px 0 0 0;color:#4b5563;line-height:1.6;">${escapeHtml(intro)}</p>
        </div>
        ${selectedJobs.length > 0 ? selectedJobs.map((job) => buildJobHtml(job)).join('') : '<p style="color:#6b7280;">No hay ofertas elegibles para este envío.</p>'}
      </div>
    </div>
  `;

  return {
    subject,
    text,
    html,
    jobs: selectedJobs,
  };
}
