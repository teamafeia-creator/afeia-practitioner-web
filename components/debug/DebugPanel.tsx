'use client';

/**
 * Chrome du panneau debug — NE CONTIENT AUCUNE LOGIQUE MÉTIER D'OUTIL.
 *
 * Il lit le registre (`getRegisteredTools`) et rend la barre d'onglets + le
 * corps de l'outil actif. Ajouter un outil ne modifie jamais ce fichier.
 *
 * Fournit : pastille flottante déplaçable (position mémorisée, couleur d'alerte
 * si erreurs), panneau redimensionnable ancrable en bas ou à droite, raccourci
 * clavier (Ctrl+`), onglets à badges, et les boutons « Copier cet onglet »,
 * « Copier tout le rapport », « Vider ».
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Trash2, X, PanelBottom, PanelRight } from 'lucide-react';
import { getRegisteredTools, subscribeRegistry } from '@/lib/debug/registry';
import { clearEvents, getEvents } from '@/lib/debug/bus';
import { joinReports } from '@/lib/debug/format';
import { useDebugTick } from './useDebug';
import { CopyButton, DEBUG_COLORS } from './ui';

type Dock = 'bottom' | 'right';

const SS = {
  open: 'afeia-debug-open',
  dock: 'afeia-debug-dock',
  size: 'afeia-debug-size',
  pill: 'afeia-debug-pill',
  tab: 'afeia-debug-tab',
};

function readSS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeSS(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / privé : on ignore */
  }
}

export function DebugPanel() {
  useDebugTick(); // re-render sur mutation du bus (badges, alerte)
  const [, forceRegistry] = useState(0);
  useEffect(() => subscribeRegistry(() => forceRegistry((x) => x + 1)), []);

  const tools = getRegisteredTools();

  const [open, setOpen] = useState<boolean>(() => readSS(SS.open, false));
  const [dock, setDock] = useState<Dock>(() => readSS<Dock>(SS.dock, 'bottom'));
  const [size, setSize] = useState<number>(() => readSS(SS.size, 340));
  const [pill, setPill] = useState<{ x: number; y: number }>(() => readSS(SS.pill, { x: 24, y: 120 }));
  const [activeTab, setActiveTab] = useState<string>(() => readSS(SS.tab, 'errors'));

  useEffect(() => writeSS(SS.open, open), [open]);
  useEffect(() => writeSS(SS.dock, dock), [dock]);
  useEffect(() => writeSS(SS.size, size), [size]);
  useEffect(() => writeSS(SS.pill, pill), [pill]);
  useEffect(() => writeSS(SS.tab, activeTab), [activeTab]);

  const errorCount = getEvents('error').length;

  // Onglet actif valide (repli sur le premier outil).
  const active = useMemo(() => {
    return tools.find((t) => t.id === activeTab) ?? tools[0];
  }, [tools, activeTab]);

  // Raccourci clavier : Ctrl+` (Backquote) ouvre/ferme.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.code === 'Backquote' || e.key === '`')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Pastille déplaçable -------------------------------------------------
  const dragState = useRef<{ moved: boolean; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const onPillPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragState.current = { moved: false, startX: e.clientX, startY: e.clientY, originX: pill.x, originY: pill.y };
    },
    [pill]
  );

  const onPillPointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) st.moved = true;
    if (st.moved) {
      const x = Math.max(8, Math.min(window.innerWidth - 56, st.originX + dx));
      const y = Math.max(8, Math.min(window.innerHeight - 56, st.originY + dy));
      setPill({ x, y });
    }
  }, []);

  const onPillPointerUp = useCallback((e: React.PointerEvent) => {
    const st = dragState.current;
    dragState.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (st && !st.moved) setOpen((o) => !o);
  }, []);

  // --- Redimensionnement ---------------------------------------------------
  const resizeState = useRef<{ start: number; origin: number } | null>(null);
  const onResizeDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      resizeState.current = { start: dock === 'bottom' ? e.clientY : e.clientX, origin: size };
    },
    [dock, size]
  );
  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      const st = resizeState.current;
      if (!st) return;
      const delta = dock === 'bottom' ? st.start - e.clientY : st.start - e.clientX;
      const max = dock === 'bottom' ? window.innerHeight - 80 : window.innerWidth - 80;
      setSize(Math.max(200, Math.min(max, st.origin + delta)));
    },
    [dock]
  );
  const onResizeUp = useCallback((e: React.PointerEvent) => {
    resizeState.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  const copyAll = useCallback(() => {
    const reports = tools.map((t) => t.copyReport?.() ?? '').filter(Boolean);
    const header = `# Rapport debug AFEIA — ${new Date().toISOString()}\n`;
    return reports.length ? `${header}\n${joinReports(reports)}` : `${header}\n(aucun contenu à rapporter)`;
  }, [tools]);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Ouvrir le panneau debug"
        onPointerDown={onPillPointerDown}
        onPointerMove={onPillPointerMove}
        onPointerUp={onPillPointerUp}
        style={{
          position: 'fixed',
          left: pill.x,
          top: pill.y,
          zIndex: 2147483000,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: `1px solid ${DEBUG_COLORS.border}`,
          background: errorCount > 0 ? DEBUG_COLORS.alert : DEBUG_COLORS.bg,
          color: errorCount > 0 ? '#fff' : DEBUG_COLORS.accent,
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
        title="Panneau debug (Ctrl+`)"
      >
        <Bug size={20} />
        {errorCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              background: '#fff',
              color: DEBUG_COLORS.alert,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {errorCount > 99 ? '99+' : errorCount}
          </span>
        )}
      </button>
    );
  }

  const panelStyle: React.CSSProperties =
    dock === 'bottom'
      ? { left: 0, right: 0, bottom: 0, height: size, width: '100%' }
      : { top: 0, bottom: 0, right: 0, width: size, height: '100%' };

  const resizeHandleStyle: React.CSSProperties =
    dock === 'bottom'
      ? { position: 'absolute', top: -3, left: 0, right: 0, height: 6, cursor: 'ns-resize' }
      : { position: 'absolute', left: -3, top: 0, bottom: 0, width: 6, cursor: 'ew-resize' };

  const Body = active?.Panel;

  return (
    <div
      role="dialog"
      aria-label="Panneau debug AFEIA"
      style={{
        position: 'fixed',
        zIndex: 2147483000,
        background: DEBUG_COLORS.bg,
        color: DEBUG_COLORS.text,
        borderTop: dock === 'bottom' ? `1px solid ${DEBUG_COLORS.border}` : undefined,
        borderLeft: dock === 'right' ? `1px solid ${DEBUG_COLORS.border}` : undefined,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        ...panelStyle,
      }}
    >
      <div style={resizeHandleStyle} onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeUp} />

      {/* Barre d'onglets + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: `1px solid ${DEBUG_COLORS.border}`, flexWrap: 'wrap' }}>
        <Bug size={15} color={DEBUG_COLORS.accent} />
        <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0, overflowX: 'auto' }}>
          {tools.map((tool) => {
            const isActive = active?.id === tool.id;
            const badge = tool.badge?.();
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTab(tool.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: `1px solid ${isActive ? DEBUG_COLORS.accent : DEBUG_COLORS.border}`,
                  background: isActive ? 'rgba(79,156,249,0.12)' : 'transparent',
                  color: isActive ? DEBUG_COLORS.text : DEBUG_COLORS.muted,
                  cursor: 'pointer',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                {tool.icon}
                {tool.label}
                {badge ? (
                  <span
                    style={{
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 8,
                      background: DEBUG_COLORS.alert,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        {active?.copyReport && (
          <CopyButton getText={() => active.copyReport?.() ?? ''} label="Copier l'onglet" title="Copier cet onglet" />
        )}
        <CopyButton getText={copyAll} label="Copier tout" title="Copier tout le rapport" style={{ borderColor: DEBUG_COLORS.accent }} />
        <button type="button" onClick={() => clearEvents()} title="Vider" style={iconBtn}>
          <Trash2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => setDock((d) => (d === 'bottom' ? 'right' : 'bottom'))}
          title={dock === 'bottom' ? 'Ancrer à droite' : 'Ancrer en bas'}
          style={iconBtn}
        >
          {dock === 'bottom' ? <PanelRight size={14} /> : <PanelBottom size={14} />}
        </button>
        <button type="button" onClick={() => setOpen(false)} title="Fermer (Échap)" style={iconBtn}>
          <X size={14} />
        </button>
      </div>

      {/* Corps de l'outil actif */}
      <div style={{ flex: 1, overflow: 'auto' }}>{Body ? <Body /> : <div style={{ padding: 16, color: DEBUG_COLORS.muted }}>Aucun outil enregistré.</div>}</div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: 6,
  border: `1px solid ${DEBUG_COLORS.border}`,
  background: 'transparent',
  color: DEBUG_COLORS.text,
  cursor: 'pointer',
};

export default DebugPanel;
