// L'essentiel de chaque écran de la lecture guidée : une phrase, calculée depuis les insights.
// Module pur (testable). Jamais de cause, jamais de diagnostic : des écarts à l'habituel et des comptes.
import type { Insights } from './index';
import { METRIC_SHORT, type Metric } from './series';

export type Essential = { text: string | null; tone: 'good' | 'watch' | 'flat' };

const METRIC_SUBJECT: Record<Metric, string> = { sleep: 'Sommeil', hrv: 'VFC nocturne', hr: 'FC de la nuit', steps: 'Pas' };

export function essentialNight(ins: Insights): Essential {
  const n = ins.lastNight;
  if (n.status !== 'ok') return { text: 'Aucune nuit mesurée ces 7 derniers jours.', tone: 'flat' };
  const off = n.tiles.filter((t) => t.tone !== 'flat' && t.delta);
  const when = n.ageNights === 0 ? 'La nuit dernière' : n.ageNights === 1 ? 'L’avant-dernière nuit' : 'La dernière nuit mesurée';
  if (!off.length) {
    const sleep = n.tiles.find((t) => t.metric === 'sleep');
    return { text: `${when} : ${sleep && sleep.value !== '—' ? `${sleep.value} de sommeil, ` : ''}tout dans son habituel.`, tone: 'flat' };
  }
  const parts = off.map((t) => `${METRIC_SUBJECT[t.metric].toLowerCase()} ${t.delta.replace(/^[▲▼] /, '').replace(/^= /, '')}`);
  const watch = off.some((t) => t.tone === 'watch');
  return { text: `${when} : ${parts.join(', ')}.`, tone: watch ? 'watch' : 'good' };
}

export function essentialWeek(ins: Insights): Essential {
  const tiles = ins.tiles.filter((t) => t.delta && t.tone !== 'flat');
  if (!tiles.length) {
    const measured = ins.tiles.find((t) => t.metric === 'sleep')?.sentence ?? '';
    return { text: measured.startsWith('Aucune') ? measured : 'Semaine dans son habituel sur les quatre mesures.', tone: 'flat' };
  }
  // La plus parlante : « watch » d'abord, puis la phrase de la tuile.
  const pick = tiles.find((t) => t.tone === 'watch') ?? tiles[0];
  return { text: pick.sentence, tone: pick.tone };
}

export function essentialRhythm(ins: Insights): Essential {
  const r = ins.rhythm;
  if (r.known < 3) return { text: r.sentence, tone: 'flat' };
  const ratio = r.regular / r.known;
  return { text: r.sentence, tone: ratio >= 0.75 ? 'good' : ratio >= 0.5 ? 'flat' : 'watch' };
}

export function essentialSession(ins: Insights): Essential {
  const p = ins.points;
  if (p.status === 'no_session') return { text: 'Pas encore de séance passée : les points à aborder apparaîtront après la première.', tone: 'flat' };
  if (p.status === 'not_enough') return { text: p.text, tone: 'flat' };
  if (p.status === 'none') return { text: p.text, tone: 'flat' };
  const att = p.points.filter((x) => x.kind === 'att').length;
  const fav = p.points.filter((x) => x.kind === 'fav').length;
  const text =
    p.points.length === 1
      ? p.points[0].text
      : `${p.points.length} points à aborder${att ? ` dont ${att} à surveiller` : ''}${fav ? ` et ${fav} favorable${fav > 1 ? 's' : ''}` : ''}.`;
  return { text, tone: att ? 'watch' : fav ? 'good' : 'flat' };
}

export function essentialFeel(ins: Insights): Essential {
  const j = ins.journal;
  if (j.stress.status === 'ok' && j.stress.strong && j.stress.text) return { text: j.stress.text, tone: 'watch' };
  if (j.shortNights.status === 'ok' && j.shortNights.strong && j.shortNights.text) return { text: j.shortNights.text, tone: 'watch' };
  if (j.quality.repeated) {
    const n = j.quality.gaps.filter((g) => g.kind === j.quality.repeated).length;
    return {
      text: j.quality.repeated === 'tired_good_night' ? `Se dit mal reposé·e ${n} fois alors que la nuit mesurée était dans son habituel.` : `Se dit bien reposé·e ${n} fois après une nuit mesurée courte.`,
      tone: 'watch',
    };
  }
  const gaps = ins.feel.gaps.filter((g) => g.date !== '—').length + j.quality.gaps.length;
  if (gaps) return { text: `${gaps} ${gaps > 1 ? 'décalages' : 'décalage'} entre ce qui est noté et ce qui est mesuré sur 14 jours : à explorer en séance.`, tone: 'flat' };
  return { text: 'Ressenti et mesures vont dans le même sens sur ces 14 jours.', tone: 'good' };
}

export function essentialHelps(ins: Insights): Essential {
  const ba = ins.beforeAfter;
  if (ba.status === 'ok') {
    const fav = ba.rows.filter((r) => r.verdict === 'fav');
    const watch = ba.rows.filter((r) => r.verdict === 'watch');
    if (fav.length || watch.length) {
      const f = fav.map((r) => METRIC_SHORT[r.metric].toLowerCase());
      const w = watch.map((r) => METRIC_SHORT[r.metric].toLowerCase());
      const text = `Depuis le conseillancier v${ba.version} : ${f.length ? `mieux sur ${f.join(', ')}` : ''}${f.length && w.length ? ' ; ' : ''}${w.length ? `à surveiller sur ${w.join(', ')}` : ''}.`;
      return { text, tone: watch.length && !fav.length ? 'watch' : fav.length ? 'good' : 'flat' };
    }
  }
  const h = ins.habits.rows.filter((r) => r.delta !== null && r.metric !== null);
  if (h.length) return { text: `${h[0].label} : ${h[0].effect}`, tone: 'flat' };
  return { text: ba.status === 'no_plan' ? 'Pas encore de conseillancier partagé : rien à comparer.' : 'Pas encore assez de nuits de chaque côté pour comparer.', tone: 'flat' };
}
