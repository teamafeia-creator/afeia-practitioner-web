'use client';

/**
 * Outil « Route & données » — route active, segments de chemin, query-string,
 * état d'authentification, historique de navigation, et données de page
 * éventuellement enregistrées par l'application.
 *
 * Les données servies à la page ne sont pas accessibles génériquement : une
 * page peut les exposer volontairement via `window.__afeiaDebugPageData`
 * (voir docs/DEBUG-TOOLS.md). Sinon on affiche « non instrumenté ».
 */
import { Map as MapIcon } from 'lucide-react';
import { getEvents } from '@/lib/debug/bus';
import { detectAuth } from '@/lib/debug/context';
import { redactObject } from '@/lib/debug/redact';
import type { DebugTool } from '@/lib/debug/types';
import { useDebugEvents } from '../useDebug';
import { DEBUG_COLORS, CopyButton } from '../ui';

function readRouteSnapshot() {
  if (typeof window === 'undefined') {
    return { pathname: '', segments: [] as string[], query: {} as Record<string, string>, auth: 'inconnu', pageData: undefined as unknown };
  }
  const url = new URL(window.location.href);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  const pageData = (window as { __afeiaDebugPageData?: unknown }).__afeiaDebugPageData;
  return {
    pathname: url.pathname,
    segments: url.pathname.split('/').filter(Boolean),
    query: redactObject(query) as Record<string, string>,
    auth: detectAuth(),
    pageData: pageData !== undefined ? redactObject(pageData) : undefined,
  };
}

function buildReport(): string {
  const s = readRouteSnapshot();
  const navs = getEvents('navigation')
    .slice(-10)
    .map((e) => `  - ${JSON.stringify(e.payload)}`)
    .join('\n');
  return [
    '## Route & données AFEIA',
    `- Route: ${s.pathname}`,
    `- Segments: ${s.segments.join(' / ') || '(racine)'}`,
    `- Query: ${JSON.stringify(s.query)}`,
    `- Auth: ${s.auth}`,
    `- Données de page: ${s.pageData !== undefined ? JSON.stringify(s.pageData) : '(non instrumenté)'}`,
    '- Navigations récentes:',
    navs || '  (aucune)',
  ].join('\n');
}

const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: '4px 0', fontSize: 12.5, borderBottom: `1px solid ${DEBUG_COLORS.border}` };
const keyStyle: React.CSSProperties = { color: DEBUG_COLORS.muted, minWidth: 96 };
const valStyle: React.CSSProperties = { color: DEBUG_COLORS.text, wordBreak: 'break-word', flex: 1 };

function RoutePanel() {
  useDebugEvents('navigation');
  const s = readRouteSnapshot();
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <CopyButton getText={buildReport} label="Copier l'onglet" />
      </div>
      <div style={rowStyle}>
        <span style={keyStyle}>Route</span>
        <span style={valStyle}>{s.pathname}</span>
      </div>
      <div style={rowStyle}>
        <span style={keyStyle}>Segments</span>
        <span style={valStyle}>{s.segments.length ? s.segments.join(' / ') : '(racine)'}</span>
      </div>
      <div style={rowStyle}>
        <span style={keyStyle}>Query</span>
        <span style={valStyle}>{Object.keys(s.query).length ? JSON.stringify(s.query) : '(aucun)'}</span>
      </div>
      <div style={rowStyle}>
        <span style={keyStyle}>Auth</span>
        <span style={valStyle}>{s.auth}</span>
      </div>
      <div style={{ ...rowStyle, borderBottom: 'none', flexDirection: 'column', gap: 4 }}>
        <span style={keyStyle}>Données de page</span>
        <pre
          style={{
            margin: 0,
            background: DEBUG_COLORS.bg,
            border: `1px solid ${DEBUG_COLORS.border}`,
            borderRadius: 6,
            padding: 8,
            color: DEBUG_COLORS.muted,
            fontSize: 11.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {s.pageData !== undefined
            ? JSON.stringify(s.pageData, null, 2)
            : 'Non instrumenté. Une page peut exposer ses données via window.__afeiaDebugPageData (cf. docs/DEBUG-TOOLS.md).'}
        </pre>
      </div>
    </div>
  );
}

export const routeTool: DebugTool = {
  id: 'route',
  label: 'Route',
  icon: <MapIcon size={14} />,
  Panel: RoutePanel,
  copyReport: buildReport,
};
