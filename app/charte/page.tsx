import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Charte de pratique — Afeia' };

const CHARTE = [
  'Je n’établis pas de diagnostic médical et je ne le laisse pas entendre.',
  'Je ne modifie, n’interromps ni ne déconseille jamais un traitement prescrit par un médecin. J’invite mes consultants à vérifier avec leur médecin la compatibilité de mes recommandations.',
  'J’oriente vers un professionnel de santé dès qu’un signe le justifie.',
  'Je garde confidentielles les informations que mes consultants me confient et je ne les utilise que pour leur accompagnement.',
  'Je présente honnêtement ma formation et mes compétences.',
];

const CONDITIONS = [
  'L’accès à Afeia est réservé aux praticiens dont l’inscription a été vérifiée par l’équipe Afeia (SIRET actif, justificatif de formation, identité).',
  'Vous êtes responsable des contenus que vous saisissez et des recommandations que vous transmettez à vos consultants.',
  'La pièce d’identité déposée à l’inscription sert uniquement à vérifier votre identité ; elle est supprimée une fois la demande traitée.',
  'Afeia peut suspendre un compte qui ne respecte pas la charte de pratique.',
];

export default function ChartePage() {
  return (
    <main className="min-h-screen bg-cream px-4 py-12 text-charcoal sm:px-8">
      <div className="mx-auto flex max-w-[680px] flex-col gap-8">
        <Link href="/signup" className="text-sm text-sage">← Retour à l’inscription</Link>
        <section className="flex flex-col gap-4">
          <h1 className="font-serif text-[32px] font-medium">Charte de pratique</h1>
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-[15px] leading-relaxed text-[#C9CFDA]">
            {CHARTE.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </section>
        <section id="conditions" className="flex flex-col gap-4">
          <h2 className="font-serif text-[26px] font-medium">Conditions d’utilisation</h2>
          <ul className="flex list-disc flex-col gap-3 pl-5 text-[15px] leading-relaxed text-[#C9CFDA]">
            {CONDITIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
