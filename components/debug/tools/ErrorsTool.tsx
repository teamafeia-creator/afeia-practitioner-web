'use client';

/**
 * Outil « Erreurs » — capture et affiche erreurs JS, promesses rejetées,
 * erreurs de rendu React, console.error / console.warn et erreurs serveur.
 *
 * Les entrées sont dépliables, les plus récentes en haut. Chaque entrée expose
 * « Copier cette entrée » au format de rapport AFEIA. `copyReport()` concatène
 * toutes les entrées dans ce même format.
 */
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getEvents } from '@/lib/debug/bus';
import { formatDebugEntry, joinReports } from '@/lib/debug/format';
import type { DebugEntry, DebugEvent, DebugTool } from '@/lib/debug/types';
import type { ErrorPayload } from '@/lib/debug/instrument/errors';
import { useDebugEvents } from '../useDebug';
import { CopyButton, DEBUG_COLORS } from '../ui';

function eventToEntry(event: DebugEvent): DebugEntry {
  const p = event.payload as ErrorPayload;
  return {
    kind: p.kind,
    timestamp: event.timestamp,
    route: p.route,
    url: p.url,
    message: p.message,
    suspect: p.suspect,
    stack: p.stack,
    context: p.context,
  };
}

/** Événements « erreur » + « console (warn) », plus récents d'abord. */
function collectErrorEvents(): DebugEvent[] {
  return [...getEvents('error'), ...getEvents('console')].sort((a, b) => b.seq - a.seq);
}

function kindColor(kind: string): string {
  if (kind === 'console') return DEBUG_COLORS.warn;
  return DEBUG_COLORS.alert;
}

function ErrorsPanel() {
  const errorEvents = useDebugEvents('error');
  const consoleEvents = useDebugEvents('console');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const entries = useMemo(
    () => [...errorEvents, ...consoleEvents].sort((a, b) => b.seq - a.seq),
    [errorEvents, consoleEvents]
  );

  if (entries.length === 0) {
    return <div style={{ padding: 16, color: DEBUG_COLORS.muted, fontSize: 13 }}>Aucune erreur capturée.</div>;
  }

  return (
    <div style={{ padding: 8 }}>
      {entries.map((event) => {
        const p = event.payload as ErrorPayload;
        const isOpen = expanded.has(event.id);
        const isWarn = event.type === 'console' && p.kind === 'console';
        return (
          <div
            key={event.id}
            style={{
              border: `1px solid ${DEBUG_COLORS.border}`,
              borderLeft: `3px solid ${kindColor(p.kind)}`,
              borderRadius: 8,
              marginBottom: 8,
              background: DEBUG_COLORS.panel,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(event.id)) next.delete(event.id);
                    else next.add(event.id);
                    return next;
                  })
                }
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: DEBUG_COLORS.text,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={p.message}
              >
                <span style={{ color: kindColor(p.kind), fontWeight: 600, marginRight: 6 }}>
                  {isWarn ? 'warn' : p.kind}
                </span>
                {p.message || '(sans message)'}
              </button>
              <span style={{ fontSize: 10, color: DEBUG_COLORS.muted, whiteSpace: 'nowrap' }}>
                {new Date(event.timestamp).toLocaleTimeString('fr-FR')}
              </span>
              <CopyButton getText={() => formatDebugEntry(eventToEntry(event))} label="Copier" title="Copier cette entrée" />
            </div>
            {isOpen && (
              <pre
                style={{
                  margin: 0,
                  padding: '8px 10px',
                  borderTop: `1px solid ${DEBUG_COLORS.border}`,
                  background: DEBUG_COLORS.bg,
                  color: DEBUG_COLORS.muted,
                  fontSize: 11.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 260,
                  overflow: 'auto',
                }}
              >
                {formatDebugEntry(eventToEntry(event))}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const errorsTool: DebugTool = {
  id: 'errors',
  label: 'Erreurs',
  icon: <AlertTriangle size={14} />,
  badge: () => getEvents('error').length || null,
  Panel: ErrorsPanel,
  copyReport: () => {
    const events = collectErrorEvents();
    if (events.length === 0) return '';
    return joinReports(events.map((event) => formatDebugEntry(eventToEntry(event))));
  },
};
