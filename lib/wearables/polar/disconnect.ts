// lib/wearables/polar/disconnect.ts
// Déconnexion de l'objet connecté à la demande du patient (POL-17).
//  1. Désinscription chez Polar : DELETE /v3/users/{user-id} (révoque aussi le jeton chez Polar).
//  2. Quelle que soit la réponse de Polar : connexion revoked, jeton et secret Vault effacés,
//     et, si deleteData, suppression des données du patient (une transaction).
// Une erreur Polar est journalisée, jamais bloquante. Aucun jeton dans les logs.
import 'server-only';
import { getAccessToken, getConnection, revokeAndPurge, sanitizeErrorMessage, type DisconnectCounts } from '@/lib/wearables/connections';
import { polarRequest } from './client';

const LOG = '[wearables/polar/disconnect]';

export type DisconnectResult = {
  status: 'disconnected' | 'not_connected';
  /** deregistered : Polar a confirmé ; failed : erreur Polar (journalisée) ; skipped : rien à désinscrire. */
  polar: 'deregistered' | 'failed' | 'skipped';
  deleted: DisconnectCounts;
};

export async function disconnectPolar(consultantId: string, opts: { deleteData: boolean }): Promise<DisconnectResult> {
  const connection = await getConnection(consultantId, 'polar');
  if (!connection) return { status: 'not_connected', polar: 'skipped', deleted: {} };

  // Déjà révoquée : pas d'appel Polar, mais la suppression des données reste possible.
  if (connection.status === 'revoked') {
    const { deleted } = await revokeAndPurge(consultantId, 'polar', opts.deleteData);
    return { status: 'disconnected', polar: 'skipped', deleted };
  }

  let polar: DisconnectResult['polar'] = 'skipped';
  const token = await getAccessToken(consultantId, 'polar');
  if (token) {
    try {
      // 204 attendu ; 404 = déjà désinscrit chez Polar (succès aussi).
      await polarRequest(`/v3/users/${encodeURIComponent(connection.providerUserId)}`, {
        token,
        method: 'DELETE',
        passthroughStatuses: [404],
        emptyStatuses: [204],
      });
      polar = 'deregistered';
    } catch (error) {
      polar = 'failed';
      console.error(LOG, 'désinscription Polar échouée, révocation côté Afeia quand même', {
        consultantId,
        error: sanitizeErrorMessage((error as Error)?.message ?? 'erreur inconnue'),
      });
    }
  }

  const { deleted } = await revokeAndPurge(consultantId, 'polar', opts.deleteData);
  console.info(LOG, 'objet connecté déconnecté', { consultantId, polar, deleteData: opts.deleteData, deleted });
  return { status: 'disconnected', polar, deleted };
}
