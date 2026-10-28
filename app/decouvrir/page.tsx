import type { Metadata } from 'next';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { PresentationVideo } from './PresentationVideo';
import { PreviewImage } from './PreviewImage';

export const metadata: Metadata = {
  title: 'Découvrir Afeia — l’espace des praticiens',
  description:
    'Dossiers, anamnèse, conseillanciers, messages et données de bien-être, réunis dans un seul espace pour les praticiens.'
};

const PREVIEWS = [
  {
    src: '/decouvrir/consultants.webp',
    t: 'Tous vos consultants',
    d: 'Offre, dernière séance, prochain rendez-vous et relances, sur une seule liste.',
    alt: 'Aperçu de la liste des consultants avec filtres et relances'
  },
  {
    src: '/decouvrir/objet-connecte.webp',
    t: 'Sommeil et cycle, sans effort',
    d: 'Avec un objet connecté, les nuits remontent chaque matin, croisées avec le cycle.',
    alt: 'Aperçu du suivi du sommeil croisé avec les phases du cycle'
  },
  {
    src: '/decouvrir/messages.webp',
    t: 'Les échanges au même endroit',
    d: 'Messages et fiches à partager, avec un repère quand une question relève du médecin.',
    alt: 'Aperçu de la messagerie praticien'
  },
  {
    src: '/decouvrir/agenda.webp',
    t: 'Un agenda pensé pour le cabinet',
    d: 'Bilans et suivis au cabinet ou en visio, types de séance et liste d’attente.',
    alt: 'Aperçu de l’agenda de la semaine'
  }
];

export default function DecouvrirPage() {
  const videoSrc = process.env.NEXT_PUBLIC_PRESENTATION_VIDEO_URL ?? '';
  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-light">
            <Leaf className="h-[22px] w-[22px] text-sage" strokeWidth={1.8} />
          </span>
          <span className="font-serif text-[22px] font-medium">Afeia</span>
        </div>
        <span className="flex-1" />
        <Link href="/login" className="inline-flex h-11 items-center px-3.5 text-sm text-charcoal hover:text-sage">Se connecter</Link>
        <Link href="/signup" className="inline-flex h-11 items-center rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep">
          Créer mon compte
        </Link>
      </header>

      <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-[18px] px-6 pb-8 pt-12 text-center">
        <span className="rounded-full border border-divider px-3 py-1.5 text-[13px] font-medium text-[#C9CFDA]">Pour les praticiens</span>
        <h1 className="max-w-[820px] font-serif text-[clamp(36px,5vw,60px)] font-medium leading-[1.08] tracking-[-0.01em]">
          Votre cabinet, de la première séance au suivi entre deux rendez-vous
        </h1>
        <p className="max-w-[620px] text-lg leading-relaxed text-stone">
          Dossiers, anamnèse, conseillanciers, messages et données de bien-être, réunis dans un seul espace.
        </p>
      </section>

      <section aria-label="Vidéo de présentation" className="mx-auto max-w-[1008px] px-6">
        <PresentationVideo src={videoSrc} />
      </section>

      <section className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 pb-6 pt-24">
        <div className="flex max-w-[640px] flex-col gap-2.5">
          <h2 className="font-serif text-4xl font-medium leading-tight">Faites le tour de l&apos;espace praticien</h2>
          <p className="text-base leading-relaxed text-stone">
            Aperçus non cliquables, remplis avec un cabinet imaginaire. Aucune donnée ne concerne une personne réelle.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] gap-7">
          {PREVIEWS.map((p) => (
            <figure key={p.src} className="flex flex-col gap-3.5">
              <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-divider bg-cream">
                <PreviewImage src={p.src} alt={p.alt} />
                <span className="absolute right-3 top-3 rounded-full border border-divider bg-[rgba(10,14,20,0.85)] px-2.5 py-1 text-xs font-medium text-[#C9CFDA]">
                  Aperçu · données fictives
                </span>
              </div>
              <figcaption className="flex flex-col gap-1">
                <span className="text-lg font-semibold">{p.t}</span>
                <span className="text-[15px] leading-normal text-stone">{p.d}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-24 pt-[72px]">
        <div className="flex flex-wrap items-center gap-6 rounded-[20px] border border-divider bg-surface p-10">
          <div className="flex flex-[1_1_360px] flex-col gap-2">
            <h2 className="font-serif text-[30px] font-medium">Prête à l&apos;essayer avec vos consultants ?</h2>
            <p className="text-base text-stone">Créez votre espace, importez vos premiers dossiers, invitez un consultant.</p>
          </div>
          <Link href="/signup" className="inline-flex h-[50px] items-center rounded-[10px] bg-sage px-[22px] text-[15px] font-semibold text-ink hover:bg-sage-deep">
            Créer mon compte
          </Link>
        </div>
      </section>
    </div>
  );
}
