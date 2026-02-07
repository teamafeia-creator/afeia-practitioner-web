import Link from 'next/link';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';

const METRICS = [
  { title: 'Sommeil', description: 'Durée, régularité, qualité perçue et récupération nocturne.' },
  { title: 'Stress & récupération', description: 'Niveau de charge quotidienne et capacité à récupérer.' },
  { title: 'Activité & mouvement', description: 'Volume d’activité, mobilité et intensité au fil des jours.' },
  { title: 'Fréquence cardiaque', description: 'Tendance de la fréquence cardiaque au repos et en activité.' },
  { title: 'Variabilité cardiaque (VFC)', description: 'Indicateur clé d’équilibre et d’adaptation de l’organisme.' },
  { title: 'Température corporelle', description: 'Variations subtiles pour anticiper fatigue ou déséquilibre.' },
  { title: 'SpO2', description: 'Saturation en oxygène pour suivre la respiration et la vitalité.' }
];

const FAQS = [
  {
    question: 'Est-ce médical ?',
    answer:
      'Non. Circular ne remplace aucun diagnostic médical. Il s’agit d’un outil d’observation et de suivi.'
  },
  {
    question: 'Faut-il un abonnement ?',
    answer:
      'Oui, Circular est inclus dans l’offre Premium AFEIA pour accéder au suivi biométrique.'
  },
  {
    question: 'Quelles données sont visibles ?',
    answer:
      'Le praticien voit des synthèses et tendances, jamais des données intrusives ou médicales brutes.'
  },
  {
    question: 'Comment relier un consultant ?',
    answer:
      'Le consultant active Circular et donne son consentement depuis son espace. La liaison est sécurisée.'
  }
];

const actionBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30 focus-visible:ring-offset-2 focus-visible:ring-offset-sable/40';

const actionVariants = {
  primary:
    'bg-teal text-white shadow-[0_10px_26px_rgba(42,128,128,0.18)] hover:bg-teal-deep',
  secondary:
    'border border-teal/30 bg-white text-teal shadow-sm hover:border-teal/50 hover:bg-teal/5'
};

export default function CircularLearnMorePage() {
  return (
    <PageShell className="space-y-10">
      <PageHeader
        title="Circular x AFEIA"
        subtitle="Suivi biométrique intelligent au service de la naturopathie."
      />

      <section className="rounded-3xl border border-sable/60 bg-white/70 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warmgray">
              Circular
            </p>
            <h1 className="text-3xl font-semibold text-charcoal md:text-4xl">Circular x AFEIA</h1>
            <p className="text-sm text-marine md:text-base">
              Une lecture douce des signaux du corps pour enrichir votre accompagnement, sans
              surcharger le consultant ni les consultations.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/billing/manage" className={cn(actionBase, actionVariants.primary)}>
              Activer Circular
            </Link>
            <Link href="#comprendre-circular" className={cn(actionBase, actionVariants.secondary)}>
              Comprendre Circular
            </Link>
          </div>
        </div>
      </section>

      <section id="comprendre-circular" className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Ce que mesure Circular</h2>
          <p className="text-sm text-marine">
            Des indicateurs pensés pour comprendre l’équilibre global, pas pour médicaliser la pratique.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {METRICS.map((metric) => (
            <div
              key={metric.title}
              className="rounded-2xl border border-sable/60 bg-white/80 p-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-charcoal">{metric.title}</h3>
              <p className="mt-2 text-sm text-marine">{metric.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-2xl border border-sable/60 bg-white/80 p-6">
          <h2 className="text-lg font-semibold text-charcoal">Pourquoi c’est utile en naturopathie</h2>
          <ul className="space-y-2 text-sm text-marine">
            <li>• Objectiver les ressentis du consultant avec des repères simples.</li>
            <li>• Suivre les effets des recommandations semaine après semaine.</li>
            <li>• Détecter les déséquilibres avant qu’ils ne s’installent.</li>
            <li>• Affiner l’accompagnement grâce à des tendances fiables.</li>
          </ul>
        </div>
        <div className="space-y-3 rounded-2xl border border-sable/60 bg-white/80 p-6">
          <h2 className="text-lg font-semibold text-charcoal">Pour les professionnels</h2>
          <ul className="space-y-2 text-sm text-marine">
            <li>• Données exploitables directement dans le suivi consultant.</li>
            <li>• Vision long terme pour repérer les cycles et ajuster les plans.</li>
            <li>• Approche basée sur des tendances, jamais sur un diagnostic médical.</li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-sable/60 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-charcoal">Confidentialité</h2>
        <p className="mt-2 text-sm text-marine">
          Les données sont partagées uniquement avec le consentement du consultant. Le praticien dispose
          d’une lecture seule, centrée sur les tendances utiles à l’accompagnement, dans le respect de
          la vie privée.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {FAQS.map((item) => (
            <div key={item.question} className="rounded-2xl border border-sable/60 bg-white/80 p-4">
              <h3 className="text-sm font-semibold text-charcoal">{item.question}</h3>
              <p className="mt-2 text-sm text-marine">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
