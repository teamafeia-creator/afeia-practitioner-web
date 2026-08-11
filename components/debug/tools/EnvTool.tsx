'use client';

/**
 * Outil « Environnement » — version du build / commit, variables NEXT_PUBLIC_*
 * non sensibles, viewport et navigateur.
 *
 * Seules des variables statiquement référencées sont accessibles côté client
 * (Next inline `process.env.NEXT_PUBLIC_*` à la compilation). Les clés publiques
 * (anon Supabase, publishable Stripe) sont tronquées par prudence.
 */
import { Settings2 } from 'lucide-react';
import type { DebugTool } from '@/lib/debug/types';
import { DEBUG_COLORS, CopyButton } from '../ui';

function truncateKey(value?: string): string {
  if (!value) return '(absent)';
  if (value.length <= 14) return value;
  return `${value.slice(0, 10)}… (${value.length} car.)`;
}

interface EnvRow {
  label: string;
  value: string;
}

function collectEnv(): EnvRow[] {
  const rows: EnvRow[] = [];
  // Build / déploiement (fournis par Vercel si configurés).
  rows.push({ label: 'NODE_ENV', value: process.env.NODE_ENV || '(inconnu)' });
  rows.push({ label: 'Commit', value: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || '(non fourni)' });
  rows.push({ label: 'Env Vercel', value: process.env.NEXT_PUBLIC_VERCEL_ENV || '(local)' });
  rows.push({ label: 'App URL', value: process.env.NEXT_PUBLIC_APP_URL || '(absent)' });
  rows.push({ label: 'Site URL', value: process.env.NEXT_PUBLIC_SITE_URL || '(absent)' });
  rows.push({ label: 'Supabase URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL || '(absent)' });
  // Clés publiques par nature — tronquées par prudence.
  rows.push({ label: 'Supabase anon', value: truncateKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) });
  rows.push({ label: 'Stripe pk', value: truncateKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) });
  return rows;
}

function collectRuntime(): EnvRow[] {
  if (typeof window === 'undefined') return [];
  return [
    { label: 'Viewport', value: `${window.innerWidth} x ${window.innerHeight}` },
    { label: 'DPR', value: String(window.devicePixelRatio) },
    { label: 'Langue', value: navigator.language },
    { label: 'En ligne', value: navigator.onLine ? 'oui' : 'non' },
    { label: 'User agent', value: navigator.userAgent },
  ];
}

function buildReport(): string {
  const lines = ['## Environnement AFEIA', '', '### Build'];
  collectEnv().forEach((r) => lines.push(`- ${r.label}: ${r.value}`));
  lines.push('', '### Runtime');
  collectRuntime().forEach((r) => lines.push(`- ${r.label}: ${r.value}`));
  return lines.join('\n');
}

const sectionTitle: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: DEBUG_COLORS.muted, margin: '10px 0 4px' };
const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: '3px 0', fontSize: 12.5 };
const keyStyle: React.CSSProperties = { color: DEBUG_COLORS.muted, minWidth: 110 };
const valStyle: React.CSSProperties = { color: DEBUG_COLORS.text, wordBreak: 'break-word', flex: 1 };

function EnvPanel() {
  const env = collectEnv();
  const runtime = collectRuntime();
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CopyButton getText={buildReport} label="Copier l'onglet" />
      </div>
      <div style={sectionTitle}>Build</div>
      {env.map((r) => (
        <div key={r.label} style={rowStyle}>
          <span style={keyStyle}>{r.label}</span>
          <span style={valStyle}>{r.value}</span>
        </div>
      ))}
      <div style={sectionTitle}>Runtime</div>
      {runtime.map((r) => (
        <div key={r.label} style={rowStyle}>
          <span style={keyStyle}>{r.label}</span>
          <span style={valStyle}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export const envTool: DebugTool = {
  id: 'env',
  label: 'Env',
  icon: <Settings2 size={14} />,
  Panel: EnvPanel,
  copyReport: buildReport,
};
