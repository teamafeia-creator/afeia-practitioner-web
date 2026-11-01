// @vitest-environment jsdom
// Incident prod : une PolarConfigError levée au démarrage (instrumentation.ts) faisait répondre
// 500 à TOUTE l'app. Règle : une config Polar absente ou invalide ne casse jamais le reste.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const ROOT = path.resolve(__dirname, '../..');
const OPTIONAL_VARS = /^(POLAR_|WEARABLES_)/;

// Aucune variable Polar ni wearables (ni CRON_SECRET) pour tout ce fichier.
beforeAll(() => {
  for (const key of Object.keys(process.env)) if (OPTIONAL_VARS.test(key) || key === 'CRON_SECRET') delete process.env[key];
});

// ---------------------------------------------------------------------------
// Graphe d'imports statique : rien d'exécuté au démarrage ni importé par les pages non Polar
// ne doit atteindre la config Polar.
// ---------------------------------------------------------------------------
const EXTS = ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js'];

function resolveImport(from: string, spec: string): string | null {
  const clean = spec.split('?')[0];
  let base: string;
  if (clean.startsWith('@/')) base = path.join(ROOT, clean.slice(2));
  else if (clean.startsWith('.')) base = path.resolve(path.dirname(from), clean);
  else return null; // paquet npm
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTS) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function reachable(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [path.join(ROOT, entry)];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(t|j|mj)sx?$/.test(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) {
      const target = resolveImport(file, m[1] ?? m[2] ?? m[3] ?? m[4]);
      if (target) stack.push(target);
    }
  }
  return seen;
}

const POLAR_CONFIG_FILES = ['lib/wearables/polar/config.ts', 'lib/wearables/polar/env.ts'].map((f) => path.join(ROOT, f));

describe('démarrage : aucune validation Polar ni wearables', () => {
  it("pas d'instrumentation.ts qui validerait des variables au lancement", () => {
    for (const name of ['instrumentation.ts', 'instrumentation.js', 'src/instrumentation.ts']) {
      const file = path.join(ROOT, name);
      if (fs.existsSync(file)) expect(fs.readFileSync(file, 'utf8')).not.toMatch(/wearables|polar|POLAR_|WEARABLES_/i);
    }
    expect(fs.readFileSync(path.join(ROOT, 'next.config.mjs'), 'utf8')).not.toMatch(/POLAR_|WEARABLES_|wearables\/polar/);
  });

  it.each([
    'middleware.ts',
    'app/layout.tsx',
    'app/page.tsx',
    'app/(app)/consultants/[id]/page.tsx',
    'app/api/messages/route.ts',
    'app/api/waitlist/count/route.ts',
    'app/api/wearables/status/route.ts',
  ])('%s n’importe jamais la config Polar', (entry) => {
    const graph = reachable(entry);
    for (const f of POLAR_CONFIG_FILES) expect([...graph].map((g) => path.relative(ROOT, g))).not.toContain(path.relative(ROOT, f));
  });

  it('contrôle du parcours : la fiche atteint bien la section Objet connecté, la route connect la config', () => {
    const fiche = [...reachable('app/(app)/consultants/[id]/page.tsx')].map((g) => path.relative(ROOT, g));
    expect(fiche).toContain('components/wearables/practitioner/PatientWearableSection.tsx');
    const connect = [...reachable('app/api/wearables/polar/connect/route.ts')].map((g) => path.relative(ROOT, g));
    expect(connect).toContain('lib/wearables/polar/config.ts');
  });

  it("aucun module ne lit de variable POLAR_/WEARABLES_ à l'import (hors getters à la demande)", () => {
    // Les seules lectures de process.env.POLAR_* / WEARABLES_* autorisées sont dans des fonctions
    // appelées à la demande ; on vérifie qu'aucune n'est au niveau module (const X = process.env.POLAR_…).
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name)) {
          const src = fs.readFileSync(p, 'utf8');
          if (/^(?:export\s+)?const\s+\w+\s*=\s*process\.env\.(POLAR_|WEARABLES_)/m.test(src)) offenders.push(path.relative(ROOT, p));
          if (/^\s*(?:assert|get)Polar\w*\(\);?\s*$/m.test(src)) offenders.push(path.relative(ROOT, p));
        }
      }
    };
    for (const d of ['app', 'lib', 'components', 'hooks']) walk(path.join(ROOT, d));
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Une route non Polar répond 200 sans aucune variable Polar.
// ---------------------------------------------------------------------------
const PRACTITIONER = '00000000-0000-0000-0000-00000000aa01';
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'order', 'limit', 'in', 'not']) c[m] = () => c;
  c.maybeSingle = async () => result;
  c.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return c;
}
vi.mock('@/lib/server/supabaseAdmin', () => ({
  createSupabaseAuthClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: PRACTITIONER } }, error: null }) } }),
  createSupabaseAdminClient: () => ({ from: () => chain({ data: [], error: null }) }),
}));

describe('routes non Polar sans configuration Polar', () => {
  it('GET /api/messages → 200', async () => {
    const { GET } = await import('@/app/api/messages/route');
    const res = await GET(new Request('https://afeia.fr/api/messages', { headers: { authorization: 'Bearer session' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversations: [] });
  });
});

// ---------------------------------------------------------------------------
// Fiche consultant : la section « Objet connecté » s'affiche « indisponible » au lieu de planter.
// ---------------------------------------------------------------------------
let overviewResult: Promise<{ data: unknown; error: unknown }> = Promise.resolve({ data: null, error: null });
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const c: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) c[m] = () => c;
      c.maybeSingle = () => overviewResult;
      return c;
    },
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/consultants/x',
  useSearchParams: () => new URLSearchParams(),
}));

describe('fiche consultant : section Objet connecté', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('erreur de lecture → état « indisponible », pas d’exception', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    overviewResult = Promise.resolve({ data: null, error: { code: '42P01', message: 'relation does not exist' } });
    const { PatientWearableSection } = await import('@/components/wearables/practitioner/PatientWearableSection');
    render(<PatientWearableSection consultantId="c1" />);
    await waitFor(() => expect(screen.getByTestId('patient-wearable-unavailable')).toBeTruthy());
  });

  it('requête rejetée → état « indisponible »', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    overviewResult = Promise.reject(new Error('réseau'));
    const { PatientWearableSection } = await import('@/components/wearables/practitioner/PatientWearableSection');
    render(<PatientWearableSection consultantId="c1" />);
    await waitFor(() => expect(screen.getByTestId('patient-wearable-unavailable')).toBeTruthy());
  });

  it('erreur de rendu dans la section → la barrière affiche « indisponible », la fiche reste debout', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { PatientWearableErrorBoundary } = await import('@/components/wearables/practitioner/PatientWearableSection');
    const Boom = () => {
      throw new Error('boom');
    };
    render(
      <div>
        <p data-testid="reste-de-la-fiche">Notes</p>
        <PatientWearableErrorBoundary>
          <Boom />
        </PatientWearableErrorBoundary>
      </div>
    );
    expect(screen.getByTestId('reste-de-la-fiche')).toBeTruthy();
    expect(screen.getByTestId('patient-wearable-unavailable')).toBeTruthy();
  });

  it('aucune connexion → état normal « pas encore connecté » (pas « indisponible »)', async () => {
    overviewResult = Promise.resolve({ data: null, error: null });
    const { PatientWearableSection } = await import('@/components/wearables/practitioner/PatientWearableSection');
    render(<PatientWearableSection consultantId="c1" />);
    await waitFor(() => expect(screen.getByTestId('patient-wearable-empty')).toBeTruthy());
    expect(screen.queryByTestId('patient-wearable-unavailable')).toBeNull();
  });
});
