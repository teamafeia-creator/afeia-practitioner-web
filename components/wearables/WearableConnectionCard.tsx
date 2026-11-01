'use client';

import { useState } from 'react';
import { Watch } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from '@/components/ui';
import {
  formatDay,
  formatRelative,
  isBackfillInProgress,
  readableSyncError,
  type WearableConnectionOverview,
} from '@/lib/wearables/display';
import { DisconnectWearableDialog } from './DisconnectWearableDialog';

export const CONTINUOUS_HR_HELP =
  "Activez la fréquence cardiaque continue dans l'app Polar Flow (On ou Night-time only). Vos données de récupération nocturne apparaîtront après 3 nuits.";

type Props = {
  /** Connexion Polar du consultant, ou null si aucune (ou révoquée). */
  connection: WearableConnectionOverview | null;
  onConnect: () => void;
  connecting?: boolean;
  /** Afficher l'aide de configuration (juste après la connexion). */
  showSetupHelp?: boolean;
  /** Déconnexion demandée par le patient (deleteData : supprimer aussi les données importées). */
  onDisconnect?: (deleteData: boolean) => Promise<void> | void;
  disconnecting?: boolean;
  /** Injectable pour les tests. */
  now?: Date;
};

/**
 * Carte « Objet connecté » du parcours consultant. Trois états :
 *  - non connecté : bouton « Connecter mon objet connecté » ;
 *  - connecté : date de connexion et dernière synchronisation ;
 *  - en erreur : message lisible et bouton « Reconnecter ».
 * Purement présentationnelle : les données et l'action viennent de WearableConnectionSection.
 */
export function WearableConnectionCard({
  connection,
  onConnect,
  connecting = false,
  showSetupHelp = false,
  onDisconnect,
  disconnecting = false,
  now,
}: Props) {
  const state = !connection || connection.status === 'revoked' ? 'disconnected' : connection.status;
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card data-testid="wearable-connection-card" data-state={state}>
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Watch className="mt-0.5 h-5 w-5 shrink-0 text-sage" aria-hidden />
          <div>
            <CardTitle>Objet connecté</CardTitle>
            <CardDescription>
              Partagez votre sommeil, votre récupération et votre activité avec votre praticien.
            </CardDescription>
          </div>
        </div>
        {state === 'active' && <Badge variant="success" className="shrink-0 whitespace-nowrap">Connecté</Badge>}
        {state === 'error' && <Badge variant="warning" className="shrink-0 whitespace-nowrap">À reconnecter</Badge>}
      </CardHeader>

      <CardContent className="space-y-4">
        {state === 'disconnected' && (
          <Button onClick={onConnect} loading={connecting}>
            Connecter mon objet connecté
          </Button>
        )}

        {state === 'active' && connection && (
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-stone">Connecté le</dt>
              <dd className="font-medium text-charcoal">{formatDay(connection.connected_at)}</dd>
            </div>
            <div>
              <dt className="text-stone">Dernière synchronisation</dt>
              <dd className="font-medium text-charcoal">
                {connection.last_sync_at ? formatRelative(connection.last_sync_at, now) : 'En attente des premières données'}
              </dd>
            </div>
          </dl>
        )}

        {state === 'error' && connection && (
          <>
            <p className="text-[13px] text-charcoal" role="alert">
              {readableSyncError(connection.last_error)}
            </p>
            <Button variant="secondary" onClick={onConnect} loading={connecting}>
              Reconnecter
            </Button>
          </>
        )}

        {/* div et non p : Spinner rend une div, interdite dans un p (erreur d'hydratation). */}
        {state === 'active' && isBackfillInProgress(connection) && (
          <div className="flex items-center gap-2 text-[13px] text-stone" role="status" data-testid="wearable-backfill">
            <Spinner size="sm" />
            Import de l&apos;historique en cours
          </div>
        )}

        {showSetupHelp && state === 'active' && (
          <p className="rounded-lg bg-sage-light/50 p-3 text-[13px] text-charcoal" data-testid="wearable-setup-help">
            {CONTINUOUS_HR_HELP}
          </p>
        )}

        {onDisconnect && state !== 'disconnected' ? (
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)} disabled={disconnecting}>
            Déconnecter mon objet connecté
          </Button>
        ) : null}

        <p className="text-xs text-stone">Compatible : Polar</p>
      </CardContent>
      {onDisconnect ? (
        <DisconnectWearableDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          loading={disconnecting}
          onConfirm={async (deleteData) => {
            await onDisconnect(deleteData);
            setConfirmOpen(false);
          }}
        />
      ) : null}
    </Card>
  );
}
