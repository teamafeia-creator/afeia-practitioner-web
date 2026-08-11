'use client';

/**
 * Outil « Réseau » — journalise toutes les requêtes fetch/XHR (succès comme
 * échecs) : méthode, URL, statut, durée, payload, réponse tronquée à 1000 car.
 * Filtre « erreurs seulement » et bouton « Rejouer ».
 */
import { useMemo, useState } from 'react';
import { Radio } from 'lucide-react';
import { getEvents } from '@/lib/debug/bus';
import { getCurrentRoute, getDebugContext } from '@/lib/debug/context';
import { formatDebugEntry, joinReports } from '@/lib/debug/format';
import type { DebugEntry, DebugEvent, DebugTool } from '@/lib/debug/types';
import type { NetworkPayload } from '@/lib/debug/instrument/network';
import { useDebugEvents } from '../useDebug';
import { CopyButton, DEBUG_COLORS } from '../ui';

function isError(p: NetworkPayload): boolean {
  return !p.ok || p.status === 'ÉCHEC' || (typeof p.status === 'number' && p.status >= 400);
}

function statusColor(p: NetworkPayload): string {
  if (isError(p)) return DEBUG_COLORS.alert;
  return DEBUG_COLORS.ok;
}

function networkToEntry(event: DebugEvent): DebugEntry {
  const p = event.payload as NetworkPayload;
  const { route, url } = getCurrentRoute();
  return {
    kind: 'network',
    timestamp: event.timestamp,
    route,
    url,
    message: `${p.method} ${p.url} → ${p.status}${p.error ? ` (${p.error})` : ''}`,
    suspect: p.url,
    stack: undefined,
    network: {
      method: p.method,
      url: p.url,
      status: p.status,
      durationMs: p.durationMs,
      responseBody: p.responseBody ?? p.error,
    },
    context: getDebugContext(),
  };
}

async function replay(p: NetworkPayload): Promise<void> {
  try {
    await fetch(p.rawUrl, {
      method: p.method,
      credentials: 'include',
      body: p.method !== 'GET' && p.method !== 'HEAD' && p.requestBody ? p.requestBody : undefined,
    });
  } catch {
    /* l'échec est lui-même journalisé par le wrapper fetch */
  }
}

function NetworkPanel() {
  const events = useDebugEvents('network');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const sorted = [...events].sort((a, b) => b.seq - a.seq);
    return errorsOnly ? sorted.filter((e) => isError(e.payload as NetworkPayload)) : sorted;
  }, [events, errorsOnly]);

  return (
    <div style={{ padding: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: DEBUG_COLORS.muted, padding: '2px 4px 8px' }}>
        <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} />
        Erreurs seulement
      </label>
      {rows.length === 0 ? (
        <div style={{ padding: 12, color: DEBUG_COLORS.muted, fontSize: 13 }}>Aucune requête.</div>
      ) : (
        rows.map((event) => {
          const p = event.payload as NetworkPayload;
          const isOpen = openId === event.id;
          return (
            <div
              key={event.id}
              style={{
                border: `1px solid ${DEBUG_COLORS.border}`,
                borderRadius: 8,
                marginBottom: 6,
                background: DEBUG_COLORS.panel,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: DEBUG_COLORS.accent, width: 44 }}>{p.method}</span>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : event.id)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: DEBUG_COLORS.text,
                    cursor: 'pointer',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={p.url}
                >
                  {p.url}
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(p), whiteSpace: 'nowrap' }}>{p.status}</span>
                <span style={{ fontSize: 10, color: DEBUG_COLORS.muted, whiteSpace: 'nowrap' }}>{Math.round(p.durationMs)}ms</span>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${DEBUG_COLORS.border}`, background: DEBUG_COLORS.bg, padding: 10 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => replay(p)}
                      style={{
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: `1px solid ${DEBUG_COLORS.border}`,
                        background: 'transparent',
                        color: DEBUG_COLORS.text,
                      }}
                    >
                      ↻ Rejouer
                    </button>
                    <CopyButton getText={() => formatDebugEntry(networkToEntry(event))} label="Copier" title="Copier cette entrée" />
                  </div>
                  {p.requestBody && (
                    <pre style={preStyle}>Payload requête:{'\n'}{p.requestBody}</pre>
                  )}
                  <pre style={preStyle}>Réponse:{'\n'}{p.responseBody ?? p.error ?? '(vide)'}</pre>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: '0 0 6px',
  color: DEBUG_COLORS.muted,
  fontSize: 11.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 200,
  overflow: 'auto',
};

export const networkTool: DebugTool = {
  id: 'network',
  label: 'Réseau',
  icon: <Radio size={14} />,
  badge: () => {
    const errors = getEvents('network').filter((e) => isError(e.payload as NetworkPayload)).length;
    return errors || null;
  },
  Panel: NetworkPanel,
  copyReport: () => {
    const events = getEvents('network').sort((a, b) => b.seq - a.seq);
    if (events.length === 0) return '';
    // Rapport ciblé sur les requêtes en erreur pour rester exploitable.
    const errored = events.filter((e) => isError(e.payload as NetworkPayload));
    const target = errored.length > 0 ? errored : events.slice(0, 5);
    return joinReports(target.map((event) => formatDebugEntry(networkToEntry(event))));
  },
};
