'use client';

/**
 * Squelettes de page, un par forme d'écran.
 *
 * Utilisés deux fois :
 *  - par les `loading.tsx` de chaque route (Next.js les affiche pendant la navigation,
 *    le temps que le code de la page arrive) ;
 *  - par les pages elles-mêmes pendant le chargement de leurs données (auth + requêtes),
 *    pour que le squelette reste identique jusqu'à l'affichage réel.
 *
 * Le titre réel de la page est affiché tout de suite : on sait où l'on est.
 */

import { Skeleton } from './Skeleton';
import { cn } from '../../lib/cn';

/* ---------- Briques ---------- */

export function PageTitleSkeleton({ title, subtitle, back, action = true }: { title?: string; subtitle?: boolean; back?: boolean; action?: boolean }) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-5" aria-busy="true">
      <div className="flex flex-col gap-1.5">
        {back ? <Skeleton width={120} height={14} /> : null}
        {title ? (
          <h1 className="font-serif text-[36px] font-medium leading-tight text-charcoal">{title}</h1>
        ) : (
          <Skeleton width={260} height={36} variant="rounded" />
        )}
        {subtitle !== false ? <Skeleton width={340} height={14} className="max-w-full" /> : null}
      </div>
      {action ? <Skeleton width={160} height={40} variant="rounded" /> : null}
    </section>
  );
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-2xl border border-divider bg-surface p-5 shadow-card', className)}>{children}</div>;
}

function Lines({ n = 3, widths = ['90%', '70%', '50%'] }: { n?: number; widths?: string[] }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} height={12} />
      ))}
    </div>
  );
}

function Rows({ n = 6, avatar = true }: { n?: number; avatar?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-divider bg-surface p-4">
          {avatar ? <Skeleton variant="circular" width={44} height={44} /> : null}
          <div className="flex-1 space-y-2">
            <Skeleton width={`${55 - (i % 3) * 8}%`} height={15} />
            <Skeleton width={`${35 + (i % 2) * 10}%`} height={12} />
          </div>
          <Skeleton width={72} height={28} variant="rounded" className="hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

function Filters({ n = 3 }: { n?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton width={260} height={40} variant="rounded" className="max-w-full" />
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} width={96} height={32} variant="rounded" />
      ))}
    </div>
  );
}

function Tabs({ n = 5 }: { n?: number }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-divider pb-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} width={88 + (i % 3) * 16} height={34} variant="rounded" />
      ))}
    </div>
  );
}

function StatTiles({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <Panel key={i}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton width={96} height={12} />
              <Skeleton width={64} height={28} />
            </div>
            <Skeleton variant="circular" width={44} height={44} />
          </div>
        </Panel>
      ))}
    </div>
  );
}

const Wrap = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('flex max-w-[1180px] flex-col gap-6', className)} role="status" aria-live="polite" aria-label="Chargement de la page">
    {children}
    <span className="sr-only">Chargement…</span>
  </div>
);

/* ---------- Pages ---------- */

/** Liste (consultants, questionnaires, bibliothèque, facturation…). */
export function ListPageSkeleton({ title, rows = 6, filters = true }: { title?: string; rows?: number; filters?: boolean }) {
  return (
    <Wrap>
      <PageTitleSkeleton title={title} />
      {filters ? <Filters /> : null}
      <Rows n={rows} />
    </Wrap>
  );
}

/** Tableau de bord : tuiles de chiffres, graphique et liste. */
export function DashboardPageSkeleton({ title = 'Tableau de bord' }: { title?: string }) {
  return (
    <Wrap>
      <PageTitleSkeleton title={title} action={false} />
      <StatTiles />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <Skeleton width={160} height={18} className="mb-4" />
          <Skeleton height={220} variant="rounded" />
        </Panel>
        <Panel className="space-y-4">
          <Skeleton width={140} height={18} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="circular" width={36} height={36} />
              <div className="flex-1 space-y-1.5">
                <Skeleton width="80%" height={13} />
                <Skeleton width="50%" height={11} />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </Wrap>
  );
}

/** Revue du matin : file de cartes « consultant + raison ». */
export function QueuePageSkeleton({ title = 'Revue du matin' }: { title?: string }) {
  return (
    <Wrap>
      <PageTitleSkeleton title={title} back action={false} />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Panel key={i} className="flex gap-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <Skeleton width={150} height={16} />
                <Skeleton width={96} height={22} variant="rounded" />
              </div>
              <Skeleton width="85%" height={14} />
              <Skeleton width="45%" height={12} />
            </div>
            <div className="hidden flex-col gap-2 sm:flex">
              <Skeleton width={120} height={34} variant="rounded" />
              <Skeleton width={120} height={34} variant="rounded" />
            </div>
          </Panel>
        ))}
      </div>
    </Wrap>
  );
}

/** Dossier : en-tête identité, onglets, deux colonnes. */
export function RecordPageSkeleton() {
  return (
    <Wrap>
      <Skeleton width={120} height={14} />
      <Panel className="flex flex-wrap items-center gap-4">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="flex-1 space-y-2">
          <Skeleton width={220} height={26} />
          <Skeleton width={160} height={13} />
        </div>
        <div className="flex gap-2">
          <Skeleton width={120} height={38} variant="rounded" />
          <Skeleton width={120} height={38} variant="rounded" />
        </div>
      </Panel>
      <Tabs n={6} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="space-y-4 lg:col-span-2">
          <Skeleton width={180} height={18} />
          <Lines n={4} />
          <Skeleton height={140} variant="rounded" />
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel className="space-y-3">
            <Skeleton width={120} height={16} />
            <Lines n={3} />
          </Panel>
          <Panel className="space-y-3">
            <Skeleton width={120} height={16} />
            <Lines n={2} />
          </Panel>
        </div>
      </div>
    </Wrap>
  );
}

/** Messagerie : liste de conversations + fil. */
export function MessagesPageSkeleton({ title = 'Messages' }: { title?: string }) {
  return (
    <Wrap>
      <PageTitleSkeleton title={title} action={false} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
        <Panel className="space-y-3 p-3">
          <Skeleton height={40} variant="rounded" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-1.5">
                <Skeleton width="60%" height={14} />
                <Skeleton width="85%" height={11} />
              </div>
            </div>
          ))}
        </Panel>
        <Panel className="hidden min-h-[520px] flex-col justify-between md:flex">
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn('flex', i % 2 ? 'justify-end' : '')}>
                <Skeleton width={i % 2 ? 220 : 280} height={i % 3 ? 48 : 72} variant="rounded" />
              </div>
            ))}
          </div>
          <Skeleton height={48} variant="rounded" />
        </Panel>
      </div>
    </Wrap>
  );
}

/** Agenda : barre de navigation et grille semaine. */
export function AgendaPageSkeleton({ title = 'Agenda' }: { title?: string }) {
  return (
    <Wrap>
      <PageTitleSkeleton title={title} />
      <Panel className="p-0">
        <div className="flex items-center justify-between border-b border-divider p-4">
          <div className="flex gap-2">
            <Skeleton width={36} height={36} variant="rounded" />
            <Skeleton width={36} height={36} variant="rounded" />
            <Skeleton width={110} height={36} variant="rounded" />
          </div>
          <Skeleton width={180} height={20} />
          <Skeleton width={150} height={36} variant="rounded" />
        </div>
        <div className="grid grid-cols-7 border-b border-divider">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-3">
              <Skeleton width={28} height={10} />
              <Skeleton variant="circular" width={30} height={30} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-divider/40">
          {Array.from({ length: 7 }).map((_, col) => (
            <div key={col} className="min-h-[360px] space-y-2 bg-surface p-2">
              {col % 2 === 0 ? <Skeleton height={64 + (col % 3) * 20} variant="rounded" /> : null}
              {col % 3 === 1 ? <Skeleton height={48} variant="rounded" className="mt-20" /> : null}
            </div>
          ))}
        </div>
      </Panel>
    </Wrap>
  );
}

/** Statistiques : sélecteur de période et graphiques. */
export function StatsPageSkeleton({ title = 'Statistiques' }: { title?: string }) {
  return (
    <Wrap>
      <PageTitleSkeleton title={title} />
      <StatTiles />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Panel key={i}>
            <Skeleton width={160} height={18} className="mb-4" />
            <Skeleton height={240} variant="rounded" />
          </Panel>
        ))}
      </div>
    </Wrap>
  );
}

/** Réglages / formulaire : sections de champs. */
export function FormPageSkeleton({ title = 'Paramètres', sections = 3 }: { title?: string; sections?: number }) {
  return (
    <Wrap>
      <PageTitleSkeleton title={title} action={false} />
      {Array.from({ length: sections }).map((_, s) => (
        <Panel key={s} className="space-y-5">
          <Skeleton width={180} height={18} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton width={110} height={12} />
                <Skeleton height={42} variant="rounded" />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Skeleton width={130} height={40} variant="rounded" />
          </div>
        </Panel>
      ))}
    </Wrap>
  );
}

/** Document long (conseillancier, compte rendu, fiche) : titre et paragraphes. */
export function DocumentPageSkeleton() {
  return (
    <Wrap>
      <Skeleton width={120} height={14} />
      <PageTitleSkeleton />
      <Panel className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton width={200} height={18} />
            <Lines n={4} widths={['100%', '95%', '85%', '60%']} />
          </div>
        ))}
      </Panel>
    </Wrap>
  );
}

/** Espace consultant (fond sombre) : cartes empilées. */
export function ConsultantHomeSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 p-4" role="status" aria-live="polite" aria-label="Chargement de votre espace">
      <div className="space-y-2 pt-4">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/10" />
      </div>
      {[180, 120, 140, 110].map((h, i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-white/[0.06] p-5" style={{ height: h }}>
          <div className="mb-3 h-4 w-40 rounded bg-white/10" />
          <div className="h-3 w-56 rounded bg-white/10" />
        </div>
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

/** Admin : tuiles de métriques et tableau. */
export function AdminPageSkeleton({ title }: { title?: string }) {
  return (
    <Wrap className="max-w-none">
      <PageTitleSkeleton title={title} action={false} />
      <StatTiles />
      <Panel className="p-0">
        <div className="flex gap-4 border-b border-divider p-4">
          {[80, 200, 120, 100, 90].map((w, i) => (
            <Skeleton key={i} width={w} height={14} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-divider/60 p-4 last:border-0">
            <Skeleton width={80} height={13} />
            <Skeleton width="30%" height={13} />
            <Skeleton width="18%" height={13} />
            <Skeleton width="14%" height={13} />
            <Skeleton width={64} height={24} variant="rounded" />
          </div>
        ))}
      </Panel>
    </Wrap>
  );
}
