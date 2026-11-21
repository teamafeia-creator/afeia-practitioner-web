import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

export const metadata = { title: 'Objet connecté : aide' };

/**
 * Page d'aide courte, inspirée des « Vous avez un problème ? » des apps d'objets connectés.
 * Pas de diagnostic : les quatre causes qui expliquent presque tous les cas « je n'ai pas de données ».
 */
export default function WearableHelpPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div>
        <Link href="/consultant/home" className="text-sm text-sage hover:underline">
          ← Retour à l’accueil
        </Link>
        <h1 className="mt-2 font-serif text-[26px] font-medium">Un problème avec votre objet connecté ?</h1>
        <p className="text-sm text-stone">Dans presque tous les cas, c’est l’un de ces quatre points.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pas de nouvelle nuit depuis plusieurs jours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-charcoal">
          <p>
            <b>1. La batterie.</b> Un bracelet déchargé n’enregistre plus. Mettez-le en charge et vérifiez qu’il s’allume.
          </p>
          <p>
            <b>2. L’application Polar Flow.</b> Le bracelet envoie ses données au téléphone uniquement via l’app Polar Flow. Ouvrez-la,
            Bluetooth activé, bracelet à portée : la synchronisation démarre toute seule. Les jours en mémoire remontent d’un coup.
          </p>
          <p>
            <b>3. Le port la nuit.</b> Le sommeil, la récupération et la fréquence cardiaque nocturne ne sont mesurés que si le bracelet est
            porté pendant la nuit, assez serré pour rester en contact avec la peau.
          </p>
          <p>
            <b>4. Le délai.</b> Polar traite la nuit après le réveil et la synchronisation. Les données arrivent dans AFEIA le matin, pas en
            temps réel. Le bouton <b>Synchroniser maintenant</b> de la carte récupère les trois derniers jours.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>« Connexion interrompue » ou « À reconnecter »</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-charcoal">
          <p>L’autorisation donnée à AFEIA côté Polar a expiré ou a été retirée. Cliquez sur <b>Reconnecter</b> sur la carte : vous repassez par
            Polar, vos données déjà importées sont conservées.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>« AFEIA apprend vos nuits »</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-charcoal">
          <p>Ce n’est pas un problème. Les comparaisons avec votre habituel demandent au moins 7 nuits mesurées, et deviennent complètes à 28
            nuits. Pendant ce temps, vos nuits sont bien enregistrées et visibles par votre praticien.</p>
        </CardContent>
      </Card>

      <p className="text-xs text-stone">Toujours bloqué ? Écrivez à votre praticien depuis la messagerie : il voit l’état de la connexion de son côté.</p>
    </div>
  );
}
