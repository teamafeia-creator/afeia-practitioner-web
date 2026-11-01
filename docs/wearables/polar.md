# Polar Loop × AccessLink v3 : fiche de référence

> Source de vérité pour les tickets `POL-*`. Toute affirmation renvoie à une source
> officielle. Ce qui n'est pas confirmé par une source est marqué **à vérifier**.
>
> Sources consultées le 2026-11-01 :
> - Doc AccessLink v3 : <https://www.polar.com/accesslink-api/> (dernier changelog : 13.01.2026)
> - SDK BLE officiel : <https://github.com/polarofficial/polar-ble-sdk> (commit `b58e64d`, 28.10.2026)
> - Manuel utilisateur Polar Loop v3.0 EN 10/2026 : <https://support.polar.com/e_manuals/polar-loop/polar-loop-user-manual-english/manual.pdf>
> - Pages support Polar vers lesquelles la doc AccessLink renvoie pour ses listes « Supported devices »
>
> Les pages commerciales (polar.com/…/loop, boutique) n'ont pas été utilisées.

## 1. Ce qu'il faut retenir

- La Loop n'a pas d'écran. Elle se synchronise en Bluetooth avec l'app **Polar Flow**, qui
  envoie les données au compte Polar Flow. **AccessLink lit ce compte Flow** : on ne parle
  jamais à la Loop directement côté serveur.
  ([manuel Loop, « Introduction » et « Syncing »](https://support.polar.com/e_manuals/polar-loop/polar-loop-user-manual-english/manual.pdf))
- Le SDK BLE (`polar-ble-sdk`) décrit ce que **l'appareil** sait produire en Bluetooth. Il
  ne prouve pas qu'une donnée est exposée par AccessLink. Une donnée est notée « oui » dans
  le tableau seulement si la doc AccessLink ou une page support qu'elle cite la confirme
  pour la Loop.
- Le SDK appelle l'appareil **« loop gen 2 »**
  ([`polar_device_capabilities.json`](https://github.com/polarofficial/polar-ble-sdk/blob/master/documentation/products/polar_device_capabilities.json)).
  Les pages support disent simplement **« Polar Loop »**. On considère qu'il s'agit du même
  produit (la Loop 2025), et non de l'ancienne Loop de 2013 (**à vérifier** sur une vraie
  Loop au moment de l'enregistrement).
- **Il n'existe pas d'événement webhook pour Nightly Recharge.** Il faut aller le chercher
  quand on reçoit `SLEEP` (voir §3).

## 2. Tableau des capacités

Légende pour « Dispo Loop » :
- **oui** : une source officielle confirme que la Loop produit la donnée et qu'AccessLink l'expose.
- **non** : une source dit explicitement que la donnée n'est pas disponible.
- **inconnu** : aucune source ne le confirme pour la Loop.

Tous les endpoints sont relatifs à `https://www.polaraccesslink.com` et s'appellent avec le
**jeton utilisateur** (`Authorization: Bearer <access-token>`).

| Type de donnée | Dispo Loop | Endpoint v3 (non déprécié) | Événement webhook | Historique disponible | Sources |
|---|---|---|---|---|---|
| **Sommeil** (Sleep Plus Stages : phases, score, continuité, interruptions) | **oui** | `GET /v3/users/sleep` (liste) · `GET /v3/users/sleep/{date}` · `GET /v3/users/sleep/available` | `SLEEP` | Liste et `available` : 28 derniers jours. `/{date}` : limite non précisée (**à vérifier**) | [AccessLink §Sleep](https://www.polar.com/accesslink-api/#sleep) · [manuel Loop, chap. « Sleep Plus Stages »](https://support.polar.com/e_manuals/polar-loop/polar-loop-user-manual-english/sleep-stages.htm) · [SDK `Polar360.md` « Sleep data »](https://github.com/polarofficial/polar-ble-sdk/blob/master/documentation/products/Polar360.md#data-export) |
| **Nightly Recharge** (charge SNA, HRV, FC et respiration nocturnes) | **oui** | `GET /v3/users/nightly-recharge` · `GET /v3/users/nightly-recharge/{date}` | **aucun** (pas de `NIGHTLY_RECHARGE` dans la liste des événements) | Liste : 28 derniers jours. `/{date}` : limite non précisée (**à vérifier**) | [AccessLink §Nightly Recharge](https://www.polar.com/accesslink-api/#nightly-recharge) · [AccessLink §Webhook payload](https://www.polar.com/accesslink-api/#webhooks) · [support « Nightly Recharge », « Applies to: … Polar Loop »](https://support.polar.com/en/nightly-recharge-recovery-measurement) · [SDK `getNightlyRecharge`](https://github.com/polarofficial/polar-ble-sdk/blob/master/documentation/products/Polar360.md#data-export) |
| **Fréquence cardiaque continue** (échantillons toutes les 5 min, hors séances) | **oui** | `GET /v3/users/continuous-heart-rate/{date}` · `GET /v3/users/continuous-heart-rate?from=&to=` | `CONTINUOUS_HEART_RATE` | Limites de date et de plage non précisées (**à vérifier**) | [AccessLink §Continuous Heart Rate](https://www.polar.com/accesslink-api/#continuous-heart-rate) · [support « Continuous Heart Rate », lien « Supported devices » de la doc : « Applies to: … Polar Loop »](https://support.polar.com/en/support/the_what_and_how_of_polars_continuous_heart_rate) |
| **Activité quotidienne** (pas, calories, durée active/inactive, distance) | **oui** | `GET /v3/users/activities` · `GET /v3/users/activities/{date}` (options `steps`, `activity_zones`, `inactivity_stamps`) | `ACTIVITY_SUMMARY` | Jusqu'à **365 jours** en arrière. Plage `from`→`to` de **28 jours max**. Sans paramètre : 28 derniers jours | [AccessLink §Daily activity](https://www.polar.com/accesslink-api/#daily-activity) · [manuel Loop, « Activity data in Flow app »](https://support.polar.com/e_manuals/polar-loop/polar-loop-user-manual-english/manual.pdf) · [SDK « Activity data »](https://github.com/polarofficial/polar-ble-sdk/blob/master/documentation/products/Polar360.md#data-export) |
| Échantillons d'activité (pas par minute, zones d'activité) | **oui** | `GET /v3/users/activities/samples` · `GET /v3/users/activities/samples/{date}` | `ACTIVITY_SUMMARY` (même événement, **à vérifier**) | 365 jours, plage de 28 jours max | [AccessLink §Daily activity](https://www.polar.com/accesslink-api/#daily-activity) |
| SleepWise™ : vigilance (alertness) | **oui** | `GET /v3/users/sleepwise/alertness` · `GET /v3/users/sleepwise/alertness/date?from=&to=` | `SLEEP_WISE_ALERTNESS` | 28 derniers jours. Plage de 28 jours max. Calculé seulement après 5 jours de sommeil | [AccessLink §SleepWise](https://www.polar.com/accesslink-api/) · [support SleepWise, lien « Supported devices » de la doc : « Applies to: … Polar Loop »](https://support.polar.com/en/polar-sleepwise) |
| SleepWise™ : heure de coucher circadienne | **oui** | `GET /v3/users/sleepwise/circadian-bedtime` · `GET /v3/users/sleepwise/circadian-bedtime/date?from=&to=` | `SLEEP_WISE_CIRCADIAN_BEDTIME` | 28 derniers jours. Plage de 28 jours max | idem |
| Séances d'entraînement (exercices) | **oui** (enregistrement manuel ou auto, voir manuel) | `GET /v3/exercises` · `GET /v3/exercises/{exerciseId}` (+ `/fit`, `/tcx`, `/gpx`) | `EXERCISE` | **30 jours**, et seulement les séances envoyées sur Flow **après** l'enregistrement de l'utilisateur chez nous | [AccessLink §Exercises](https://www.polar.com/accesslink-api/#exercises) · [manuel Loop, « Training »](https://support.polar.com/e_manuals/polar-loop/polar-loop-user-manual-english/manual.pdf) |
| Cardio load | **inconnu** (le manuel Loop décrit Cardio Load, mais la doc AccessLink ne liste pas les appareils compatibles) | `GET /v3/users/cardio-load` · `/{date}` · `/date?from=&to=` · `/period/days/{days}` · `/period/months/{months}` | aucun | Liste : 28 derniers jours. Autres limites **à vérifier** | [AccessLink §Cardio load](https://www.polar.com/accesslink-api/#cardio-load) · [manuel Loop, « Cardio Load »](https://support.polar.com/e_manuals/polar-loop/polar-loop-user-manual-english/manual.pdf) |
| Infos physiques (poids, taille, FC max/repos, VO2max, objectif de sommeil) | **oui** (données du profil Flow, quel que soit l'appareil) | `GET /v3/users/physical-info` | `PHYSICAL_INFORMATION` | Non précisé (**à vérifier**) | [AccessLink §Physical info](https://www.polar.com/accesslink-api/#physical-info) · [changelog 13.01.2026](https://www.polar.com/accesslink-api/) |
| Température cutanée pendant le sommeil | **inconnu** (le SDK confirme le capteur et une mesure toutes les 5 min en BLE, pas l'export AccessLink) | `GET /v3/users/biosensing/skintemperature` | aucun | 28 derniers jours. Plage de 28 jours max | [AccessLink §Elixir Biosensing](https://www.polar.com/accesslink-api/) · [SDK `getSkinTemperature`](https://github.com/polarofficial/polar-ble-sdk/blob/master/documentation/products/Polar360.md#data-export) |
| Température corporelle | **inconnu** | `GET /v3/users/biosensing/bodytemperature` | aucun | 28 jours, plage de 28 jours max | [AccessLink §Elixir Biosensing](https://www.polar.com/accesslink-api/) |
| Contacts peau (port du bracelet) | **inconnu** | `GET /v3/users/biosensing/skincontacts` | aucun | 28 jours, plage de 28 jours max | idem |
| SpO2 (test ponctuel) | **inconnu** (absent du manuel Loop et du SDK) | `GET /v3/users/biosensing/spo2` | aucun | 28 jours, plage de 28 jours max | idem |
| ECG au poignet (test ponctuel) | **inconnu** (absent du manuel Loop et du SDK) | `GET /v3/users/biosensing/ecg` | aucun | 28 jours, plage de 28 jours max | idem |
| Signal brut (PPG, PPI, accéléromètre, FC en temps réel) | **non via AccessLink** : uniquement en Bluetooth avec le SDK, depuis une app mobile | aucun | aucun | sans objet | [SDK `Polar360.md` « Online streaming and offline recording »](https://github.com/polarofficial/polar-ble-sdk/blob/master/documentation/products/Polar360.md#online-streaming-and-offline-recording) |

## 3. Périmètre MVP

Le MVP couvre uniquement ces quatre familles. Le reste du tableau est hors périmètre pour l'instant.

| # | Donnée | Endpoint(s) | Déclencheur |
|---|---|---|---|
| 1 | **Sommeil** | `GET /v3/users/sleep/{date}` (rattrapage avec `GET /v3/users/sleep`) | webhook `SLEEP` |
| 2 | **Nightly Recharge** | `GET /v3/users/nightly-recharge/{date}` (rattrapage avec `GET /v3/users/nightly-recharge`) | **pas de webhook**. On l'interroge à la réception de `SLEEP` (même `date`), avec une nouvelle tentative plus tard si la réponse est vide. Qu'il soit calculé en même temps que le sommeil est **à vérifier** |
| 3 | **FC continue** | `GET /v3/users/continuous-heart-rate/{date}` | webhook `CONTINUOUS_HEART_RATE` |
| 4 | **Activité quotidienne** | `GET /v3/users/activities/{date}` (rattrapage avec `GET /v3/users/activities?from=&to=`, 28 jours max par appel) | webhook `ACTIVITY_SUMMARY` |

Le webhook à créer souscrit donc à `SLEEP`, `CONTINUOUS_HEART_RATE` et `ACTIVITY_SUMMARY`.

Conditions côté utilisateur, d'après les pages support et le manuel :
- La FC continue doit être activée (« On » ou « Night-time only »), sinon pas de sommeil
  détaillé ni de Nightly Recharge.
- Nightly Recharge n'apparaît qu'après **3 nuits** de mesure réussies.
- Une nuit doit durer au moins 4 h pour produire des métriques Sleep Plus Stages.
- SleepWise demande au moins 5 jours de sommeil.

([support Nightly Recharge](https://support.polar.com/en/nightly-recharge-recovery-measurement), [support Sleep Plus Stages](https://support.polar.com/en/sleep-plus-stages-sleep-tracking), [AccessLink §SleepWise](https://www.polar.com/accesslink-api/))

## 4. Flux OAuth 2

Source : [AccessLink §Authentication](https://www.polar.com/accesslink-api/).

1. **Autorisation** : on redirige l'utilisateur vers
   `GET https://flow.polar.com/oauth2/authorization?response_type=code&client_id=…&redirect_uri=…&scope=accesslink.read_all&state=…`
   - `response_type=code` : seul flux supporté.
   - `redirect_uri` : facultatif, mais s'il est fourni il doit être **identique** à une URL
     déclarée pour le client sur admin.polaraccesslink.com. Sans lui, Polar utilise l'URL par défaut du client.
   - `scope` : facultatif. AccessLink utilise `accesslink.read_all`.
   - `state` : chaîne opaque renvoyée telle quelle à la redirection. Elle protège contre le CSRF : **à utiliser systématiquement**.
   - Retour : `?code=…&state=…`, ou `?error=…` (`access_denied`, `invalid_scope`, etc.).
   - Le **code expire après 10 minutes** et ne sert **qu'une fois**. S'il est réutilisé, la
     requête est refusée et **tous les jetons déjà émis sont supprimés**.
2. **Échange du code** : `POST https://polarremote.com/v2/oauth2/token`
   - En-têtes : `Authorization: Basic base64(client_id:client_secret)`,
     `Content-Type: application/x-www-form-urlencoded`, `Accept: application/json;charset=UTF-8`.
   - Corps : `grant_type=authorization_code`, `code=…`, plus `redirect_uri=…` **obligatoire si**
     on l'a passé à l'étape 1.
   - Réponse : `access_token`, `token_type: "bearer"`, `expires_in` (en secondes), `x_user_id` (identifiant utilisateur Polar).
3. **Durée de vie du jeton** : la doc se contredit.
   - §Token endpoint : `expires_in` « 31535999 » signifie que le jeton expire **environ un an** après son émission.
   - §User token authentication : « Access tokens will not expire unless explicitly revoked by partners or users ».
   - **Aucun refresh token n'est documenté.**
   - Choix prudent : stocker `expires_in` et la date d'émission, et traiter tout `401` comme
     « reconnexion nécessaire ». Le comportement réel est **à vérifier**.
4. **Deux modes d'authentification sur l'API** :
   - Jeton utilisateur (`Bearer`) pour `/v3/users/**`.
   - Identifiants client (`Basic base64(client_id:client_secret)`) pour les ressources du client
     (`/v3/webhooks`, `/v3/notifications`, …).
   - Selon la doc, les endpoints `/v3/exercises` sont aussi appelés avec le jeton utilisateur
     (exemples de code), ce qui contredit la règle « tout le reste en Basic » (**à vérifier**).

## 5. Enregistrement de l'utilisateur

Source : [AccessLink §Users](https://www.polar.com/accesslink-api/#users).

Juste après l'obtention du jeton, il faut enregistrer l'utilisateur : `POST /v3/users`
(jeton utilisateur), corps `{"member-id": "<notre identifiant interne>"}`. Sans cette étape,
on n'a pas accès à ses données.

| Code | Signification | Que faire |
|---|---|---|
| 200 | Utilisateur enregistré, son profil est renvoyé | Enregistrer `polar-user-id` |
| 403 | L'utilisateur n'a pas accepté tous les consentements obligatoires | L'inviter à les accepter sur <https://account.polar.com> |
| **409** | **Utilisateur déjà enregistré** chez ce client, **ou `member-id` déjà utilisé** | Considérer comme un succès (reconnexion) ; ne pas renvoyer d'erreur |
| 204 | « No content when user with given userId is not found » (tel quel dans la doc) | Sens exact **à vérifier** |

- Désinscription : `DELETE /v3/users/{user-id}`. Profil : `GET /v3/users/{user-id}`.
- Comme `member-id` doit être unique, il faut un identifiant stable et non personnel
  (par exemple l'UUID interne du consultant), jamais un e-mail.

## 6. Webhooks

Sources : [AccessLink §Accesslink webhooks et §Webhooks](https://www.polar.com/accesslink-api/#webhooks).

- **Un seul webhook par client** (« Client application can only have one webhook registered »).
  C'est pour ça qu'on a deux clients, « Afeia dev » et « Afeia prod » (POL-01).
- **Création** : `POST /v3/webhooks` (identifiants client), corps `{"events": [...], "url": "https://…"}`.
  - À la création, Polar **envoie un PING** à l'URL. Si elle ne répond pas **200**, le
    webhook **n'est pas créé**. Notre route doit donc être déployée et joignable **avant** l'appel.
  - Exemple de PING : en-têtes `Polar-Webhook-Event: PING` et `Polar-Webhook-Signature: …`,
    corps `{"timestamp": "…", "event": "PING"}`.
  - La réponse `201` contient `data.id`, `data.events`, `data.url` et **`data.signature_secret_key`**.
    Cette clé n'est donnée **qu'une seule fois** : il faut la stocker tout de suite comme secret serveur.
- **Événements disponibles** : `EXERCISE`, `SLEEP`, `CONTINUOUS_HEART_RATE`,
  `SLEEP_WISE_CIRCADIAN_BEDTIME`, `SLEEP_WISE_ALERTNESS`, `ACTIVITY_SUMMARY`, `PHYSICAL_INFORMATION`.
- **Contenu d'une notification** : `event`, `user_id`, `date` (ou `entity_id` pour `EXERCISE`),
  `timestamp`, `url` (l'URL de la ressource à récupérer).
  - Exemple `SLEEP` : `url = https://www.polaraccesslink.com/v3/users/sleep/2019-12-31`.
  - La notification ne contient pas les données : il faut ensuite appeler `url` avec le jeton de l'utilisateur.
- **En-têtes** : `Polar-Webhook-Event` (type d'événement) et **`Polar-Webhook-Signature`**.
- **Signature** : HMAC SHA-256 du corps de la requête, calculé avec `signature_secret_key`.
  L'exemple Java de la doc produit une chaîne **hexadécimale**.
  - Il faut calculer le HMAC sur le **corps brut**, avant tout parsing JSON, et le comparer en temps constant.
  - Que la signature porte exactement sur les octets bruts du corps est **à vérifier** avec un vrai PING.
- **Livraison** : `POST`, Polar attend un **200**. Il faut répondre 200 rapidement et faire
  le traitement en différé. Le nombre et le rythme des nouvelles tentatives ne sont pas
  documentés (**à vérifier**).
- **Désactivation automatique** si aucune notification n'a pu être livrée pendant **7 jours**.
  - Réactivation : `POST /v3/webhooks/activate`, qui refait un PING.
  - Pause volontaire : `POST /v3/webhooks/deactivate`.
- **Autres opérations** : voir le tableau de référence ci-dessous.

### 6.1 Référence exacte des endpoints webhook

Vérifié dans la doc officielle le 2026-11-01 ([§Webhooks](https://www.polar.com/accesslink-api/#webhooks),
schémas `webhookRequest`, `createdWebhook`, `webhookInfo`, `webhookPatch`, `webhookPing`, `error`).
Toutes les requêtes utilisent les **identifiants client** :
`Authorization: Basic base64(client_id:client_secret)`, avec `Accept: application/json`.

| Opération | Requête | Corps | Réponses | PING envoyé ? |
|---|---|---|---|---|
| Créer | `POST /v3/webhooks` | `{"events": ["SLEEP", …], "url": "https://…"}` (les deux obligatoires) | `201` `{"data": {"id", "events", "url", "signature_secret_key"}}` · `400` création impossible · `409` un webhook existe déjà | **Oui**, vers `url` ; sans réponse `200`, rien n'est créé |
| Lire | `GET /v3/webhooks` | aucun | `200` `{"data": [{"id", "events", "url", "active"}]}`, un **tableau** (vide s'il n'y a pas de webhook) | Non |
| Modifier | `PATCH /v3/webhooks/{webhook-id}` | `{"events"?: [...], "url"?: "…"}` | `200` `webhookInfo` · `400` · `404` | **Oui** si l'URL change ; sans réponse `200`, rien n'est modifié |
| Activer | `POST /v3/webhooks/activate` | aucun | `200` activé · **`204` aucun webhook** | **Oui** ; l'activation n'aboutit que si l'URL répond `200` |
| Désactiver | `POST /v3/webhooks/deactivate` | aucun | `200` désactivé · **`204` aucun webhook** | Non |
| Supprimer | `DELETE /v3/webhooks/{webhook-id}` | aucun | `204` supprimé · `404` introuvable | Non |

- **Format d'erreur** : `{"timestamp", "status", "errorType", "message", "corrId"}`.
  Le `corrId` sert à contacter le support (b2bhelpdesk@polar.com).
- **PING** : `POST` vers l'URL, avec les en-têtes `Polar-Webhook-Event: PING` et
  `Polar-Webhook-Signature`, et le corps `{"timestamp": "…", "event": "PING"}`. Il doit recevoir `200 OK`.
- **Pas d'événement Nightly Recharge** : la liste ci-dessus est exhaustive. Le Nightly Recharge
  se récupère à la réception de `SLEEP` (voir §3).
- **⚠ Le PING de création arrive avant que l'on connaisse le secret.** Le `signature_secret_key`
  n'est renvoyé que dans la réponse à `POST /v3/webhooks`, une fois le PING validé. La route
  webhook (POL-08) doit donc **répondre `200` à un PING même sans pouvoir vérifier sa
  signature**, par exemple quand `POLAR_WEBHOOK_SECRET` n'est pas encore défini. Un PING ne
  déclenche aucun traitement, donc l'accepter sans vérification ne présente pas de risque.
  Tous les autres événements doivent être signés et vérifiés.

### 6.2 Script d'administration (`npm run polar:webhook`)

`scripts/polar-webhook.ts` (POL-07). Il lit `POLAR_CLIENT_ID` et `POLAR_CLIENT_SECRET` dans
`.env.local`, ou dans le fichier donné par `--env-file`.

```bash
npm run polar:webhook -- get
npm run polar:webhook -- create          # défaut : https://afeia.fr/api/webhooks/polar, événements MVP
npm run polar:webhook -- create --url https://… --events SLEEP,CONTINUOUS_HEART_RATE,ACTIVITY_SUMMARY
npm run polar:webhook -- update --events SLEEP,ACTIVITY_SUMMARY
npm run polar:webhook -- activate
npm run polar:webhook -- deactivate
npm run polar:webhook -- delete          # demande confirmation (--yes pour passer)
```

- `create` refuse de continuer si le client a déjà un webhook. Il fait d'abord sa propre
  pré-vérification, un PING vers l'URL (que `--skip-preflight` désactive), puis il affiche
  **une seule fois** le `signature_secret_key`, encadré. Ce secret est à copier dans
  `POLAR_WEBHOOK_SECRET` sur Vercel, puis il faut redéployer. Le script ne l'écrit nulle part.
- Si le secret est perdu, la seule solution est `delete` puis `create`, qui en donne un nouveau.
- `POLAR_WEBHOOK_SECRET` est **obligatoire en production Vercel** (`VERCEL_ENV=production`) et
  facultatif ailleurs (`lib/wearables/polar/env.ts`).
- Ordre de mise en service : déployer POL-08, puis lancer `create`, copier le secret dans
  Vercel, redéployer, et enfin vérifier avec `get`.

- **Filet de sécurité** : `GET /v3/notifications` (identifiants client) liste les données
  disponibles. Son exemple de réponse renvoie toutefois vers les URL `activity-transactions`
  dépréciées : l'intérêt de cet endpoint hors transactions est **à vérifier**.

### 6.3 Réception et traitement (POL-08)

- **Route** `POST /api/webhooks/polar` (`app/api/webhooks/polar/route.ts`) :
  1. elle lit le corps brut ;
  2. un PING reçoit `200` sans rien enregistrer ;
  3. pour tout autre événement, elle vérifie le HMAC avec `POLAR_WEBHOOK_SECRET`, et répond `401` si la signature ou le secret manque ;
  4. elle enregistre l'événement dans `wearable_events`, répond `200`, puis lance le traitement avec `waitUntil` de `@vercel/functions`. Next 14 n'a pas `after()`.
- **Une ligne par ressource** : la clé d'idempotence est `polar:{event}:{user_id}:{date|entity_id}`,
  sans timestamp. Un doublon met à jour `last_notified_at`. Si l'événement était `done`,
  `failed` ou `ignored`, il repasse en `pending` avec `attempts` remis à 0, et il est retraité.
- **Notification pendant le traitement** : si `last_notified_at` est plus récent que
  `processing_started_at` à la fin du traitement, l'événement repasse en `pending` et il est
  retraité une fois.
- **`processPolarEvent`** (`lib/wearables/polar/process-event.ts`) :
  - un utilisateur Polar inconnu ou révoqué donne `ignored` ;
  - le jeton n'est envoyé qu'à `https://www.polaraccesslink.com/v3/…` ;
  - après un `SLEEP`, elle va chercher `/v3/users/nightly-recharge/{date}`. Si la réponse est
    vide, elle crée un événement interne `NIGHTLY_RECHARGE` en `pending`, à rejouer dans 6 h ;
  - un `401` ou `403` de Polar met la connexion en `error` avec le message « Accès révoqué
    côté Polar, reconnexion nécessaire » ;
  - le stockage se fait dans `wearable_raw` via `ingestPolarResource` (POL-10).

### 6.4 Rattrapage quotidien et surveillance (POL-09)

- **Cron Vercel** `GET /api/cron/polar-sync`, déclaré dans `vercel.json` avec `0 3 * * *` (UTC).
  Les crons Vercel sont en UTC : cela donne 4 h à Paris en hiver (CET) et 5 h en été (CEST).
  La route exige `Authorization: Bearer ${CRON_SECRET}` et répond `401` sinon, y compris
  quand `CRON_SECRET` n'est pas défini.
- **Ordre d'exécution** (`lib/wearables/polar/sync.ts`) :
  1. **Webhook** : `GET /v3/webhooks`. S'il est absent ou inactif, un e-mail part à l'équipe,
     par le même canal que les inscriptions praticien (`sendEmail` vers `adminEmails()`).
     L'alerte est renvoyée chaque jour tant que le problème dure.
  2. **Connexions `active`**, par lots de 5, les moins récemment synchronisées d'abord. Pour
     chacune, le cron lit sommeil, Nightly Recharge, FC continue et activité sur les 3
     derniers jours (12 appels) et les ingère avec `ingestPolarResource`, qui est idempotent.
     - Un `401` ou `403` met la connexion en `error` (« Accès révoqué côté Polar, reconnexion nécessaire »).
     - Une synchronisation réussie met à jour `last_sync_at`.
  3. **Rejeu** avec `wearable_requeue_due_events` : les événements `failed` avec moins de 5
     tentatives et dus, les `pending` dus (dont les Nightly Recharge différés) et les
     `processing` bloqués depuis plus de 15 min. `attempts` n'est pas remis à zéro.
- **Budget** : `maxDuration = 300` s, et le traitement s'arrête de lui-même 60 s avant. Les
  connexions restantes sont reportées au lendemain et comptées dans `deferred`.
- **Coût en requêtes** : 12 appels par connexion et par jour, bien en dessous de la limite de
  15 min (`500 + 20 × n`).
- **Journal** : un récapitulatif par exécution, avec les connexions (total, traitées,
  reportées, révoquées, en erreur), les ressources ingérées, les événements rejoués par
  résultat, l'état du webhook et les erreurs.

### 6.5 Données brutes (POL-10)

- **`wearable_raw`** garde tout ce que Polar renvoie, tel quel. Les tables normalisées
  (POL-11) peuvent donc être recalculées à tout moment.
  - Une ligne par enregistrement : contrainte d'unicité sur (`provider`, `data_type`, `provider_record_id`).
  - Une nouvelle version **remplace** l'ancienne (upsert) et met à jour `fetched_at`.
  - Valeurs de `data_type` : `sleep`, `nightly_recharge`, `continuous_hr`, `daily_activity`.
- **`ingestPolarResource(type, json, consultantId, options)`** (`lib/wearables/ingest.ts`) :
  - **sommeil, Nightly Recharge, FC continue** : un enregistrement par utilisateur et par
    jour. `provider_record_id` vaut `<id de polar_user>:<date>`, et `data_date` vaut `date`.
    Les listes `nights` et `recharges` sont acceptées ;
  - **activité quotidienne** : la ressource ne contient pas l'utilisateur, qui est donc fourni
    par l'appelant. `data_date` suit la règle de date d'activité du §6.6. S'il y a plusieurs
    enregistrements pour un même jour, on garde le plus récent, celui dont le `end_time` est le plus grand ;
  - après l'upsert, la fonction appelle `normalize()` (`lib/wearables/normalize.ts`, voir §6.6).

### 6.6 Tables normalisées et adaptateur Polar (POL-11)

Le reste de l'app ne lit que ces tables. Pour ajouter un fournisseur, il suffit d'écrire ses
mappers ; les écrans ne changent pas.

| Table | Clé métier (unique) | Source Polar |
|---|---|---|
| `sleep_sessions` | (`consultant_id`, `provider`, `night_date`) | sommeil |
| `hrv_nightly` | (`consultant_id`, `provider`, `night_date`) | Nightly Recharge |
| `hr_samples` | (`consultant_id`, `provider`, `recorded_at`) | FC continue |
| `daily_activity` | (`consultant_id`, `provider`, `activity_date`) | activité |

Chaque ligne porte `consultant_id`, `provider` et `source_raw_id` (clé étrangère vers
`wearable_raw`, suppression en cascade).

**Accès (POL-12, migration `20261107`)** : RLS activée et forcée, lecture seule pour `authenticated`.
- Un **consultant** lit ses propres lignes : `consultant_memberships.consultant_user_id = auth.uid()`.
- Un **praticien** lit les lignes de ses consultants : `consultants.practitioner_id = auth.uid()`.
- Ces deux règles sont celles qu'utilise déjà le reste de l'app. Elles sont regroupées dans
  `auth_self_consultant_ids()` et `auth_practitioner_consultant_ids()`, deux fonctions en
  SECURITY INVOKER : elles s'exécutent sous la RLS existante, sans élargir aucun accès.
- `anon` n'a aucun droit.
- Insertion, modification et suppression sont réservées à `service_role` : aucune politique
  d'écriture, aucun privilège d'écriture.
- L'app mobile s'authentifie avec son propre JWT, pas avec une session Supabase. Elle doit
  donc lire ces données par une route API (client admin filtré par `resolveConsultantId`).
- Tests : `supabase/tests/wearable_normalized_rls.test.sql`.

**Conventions**
- **Unité dans le nom des colonnes** : `_s`, `_ms`, `_bpm`, `_kcal`, `_m`, `_per_min`.
  Les durées sont en **secondes**, comme Polar les fournit.
- **Champ absent** dans la réponse → `NULL`, jamais 0. Un 0 fourni par Polar reste 0.
- **Horodatages en `timestamptz` (UTC).** Le fuseau se détermine ainsi : le décalage fourni
  par Polar s'il existe, sinon `consultants.timezone`, sinon `Europe/Paris`.
  - Sommeil : `sleep_start_time` et `sleep_end_time` contiennent leur décalage.
  - FC continue : `sample_time` est l'heure de l'appareil, sans décalage. Elle est donc
    interprétée dans le fuseau du consultant.
  - Changement d'heure : une heure qui n'existe pas (passage à l'heure d'été) est placée
    juste après le saut. Une heure ambiguë (passage à l'heure d'hiver) prend sa première occurrence.
- **Date de la nuit** (`night_date`) : le champ `date` de Polar (« Result date of the
  sleep »), c'est-à-dire **le jour du réveil**. Une nuit du 30 au 31 octobre a la date du 31.
  Sommeil et Nightly Recharge partagent cette date. **À vérifier** sur de vraies données.
- **Date d'activité** (`activity_date`), dans cet ordre :
  1. la date contenue dans la réponse, `date` puis `samples.date` ;
  2. sinon, le jour local de `start_time` ;
  3. sinon, en repli, la date demandée à Polar.

  Si la date de la réponse diffère de la date demandée, un avertissement est journalisé.
  La doc décrit `start_time` comme une heure « UTC » mais l'exemple ressemble à une heure
  locale : **à vérifier**.
- **Total de sommeil** : `total_sleep_s` = `light_sleep` + `deep_sleep` + `rem_sleep` +
  `unrecognized_sleep_stage`.
  - Il vaut `NULL` si le léger, le profond ou le paradoxal manque : pas de somme partielle.
  - Le stade non reconnu compte pour 0 s'il est absent.
  - Justification : d'après la doc AccessLink, le stade non reconnu est du temps endormi dont
    le stade n'a pas pu être identifié, donc il fait partie du sommeil. Contrôle de cohérence
    testé : `total_sleep_s` ≈ (`sleep_end_time` − `sleep_start_time`) − `total_interruption_duration`.
  - **À confirmer contre l'app Polar Flow**, sur une vraie nuit : saisir le total affiché
    dans `lib/wearables/polar/__fixtures__/flow-totals.json`. Le test correspondant de
    `__tests__/wearables/mappers.test.ts` passe alors de « à faire » à une vérification réelle.
- **Restent seulement dans `wearable_raw`** : la continuité, les cycles, `sleep_charge`,
  l'objectif et la note de sommeil, les scores par thème, l'hypnogramme, les échantillons
  nocturnes de FC, de VFC et de respiration, les échantillons de pas et de zones, et le
  nombre d'alertes d'inactivité.

**Code**
- **Mappers purs** : `lib/wearables/polar/mappers/{sleep,nightlyRecharge,continuousHr,dailyActivity}.ts`.
- **Écriture** : `lib/wearables/normalized.ts`, un upsert sur la clé métier. Le module est pur
  (client passé en paramètre) et partagé par `normalize()` et par le script de reconstruction.
- **Reconstruction** : `npm run wearables:rebuild`, qui demande confirmation (sauf avec `--yes`).
  Il vide les 4 tables (`wearable_truncate_normalized()`), relit `wearable_raw` par pages de
  500 et réapplique les mappers. On peut le relancer sans risque.

### 6.7 Import de l'historique à la connexion (POL-14)

- **Déclenchement** : juste après `saveConnection`, le callback OAuth lance `runBackfill` en
  arrière-plan (`waitUntil`) ; la redirection ne l'attend pas. `wearable_save_connection` remet
  `backfill_status` à `pending` et efface le curseur, aussi à chaque reconnexion.
- **Période** : `backfill_days` (90 jours par défaut, 365 au plus) jusqu'à aujourd'hui. Elle est
  parcourue **du plus récent au plus ancien, par tranches de 28 jours au plus**
  (`lib/wearables/polar/backfill.ts`). Chaque type est borné par l'historique disponible chez Polar :

  | Type | Profondeur | Requêtes |
  |---|---|---|
  | activité | 365 j | `GET /v3/users/activities?from=&to=`, une par tranche |
  | sommeil | 28 j | `GET /v3/users/sleep` (liste des 28 derniers jours), une fois |
  | Nightly Recharge | 28 j | `GET /v3/users/nightly-recharge`, une fois |
  | FC continue | 28 j (**à vérifier**, non documentée) | `GET /v3/users/continuous-heart-rate/{date}`, une par jour : la forme de la réponse sur une plage n'est pas documentée |

  Pour 90 jours, cela représente environ 34 requêtes, bien en dessous des quotas.
- **Avancement** (`wearable_connections`) :
  - `backfill_status` vaut `pending`, `running`, `done` ou `failed` ;
  - `backfill_cursor` est la date la plus ancienne importée, enregistrée après **chaque tranche** ;
  - `backfill_updated_at` sert à repérer un import bloqué.

  La prise en charge est atomique (`wearable_claim_backfill`) : le callback et le cron ne lancent
  jamais deux fois le même import. Un `running` resté sans progrès pendant plus de 10 min est repris.
- **Interruptions** :
  - durée dépassée (arrêt avant `maxDurationMs`), quota Polar ou erreur passagère → `pending`,
    avec le curseur conservé. Le cron reprend l'import à la tranche suivante. Une tranche
    interrompue en cours de route est refaite, ce qui est sans effet grâce à l'upsert ;
  - `401` ou `403` → `failed`, et la connexion passe en `error`.
- **Cron** : avant le rattrapage quotidien, `polar-sync` reprend les imports `pending` ou `running`
  des connexions actives, sur la moitié de son budget de temps au plus.
- **Interface** : la vue `wearable_connection_overview` expose `backfill_status` et
  `backfill_cursor`. `WearableConnectionCard` affiche « Import de l'historique en cours » tant
  que l'import n'est pas terminé, et l'état est rafraîchi toutes les 15 s pendant ce temps.
- **Pas de doublon** : relancer l'import, par exemple après une reconnexion, refait les mêmes
  upserts sur `wearable_raw` et sur les tables normalisées.

## 7. Limites de débit

Source : [AccessLink §Rate limiting](https://www.polar.com/accesslink-api/).

- Les limites s'appliquent **au client** et augmentent avec le nombre d'utilisateurs enregistrés. Elles sont recalculées chaque jour.
  - Sur 15 min : `500 + 20 × nb_utilisateurs`.
  - Sur 24 h : `5000 + 100 × nb_utilisateurs`.
- Chaque fenêtre repart de zéro 15 min (ou 24 h) **après la première requête** de la fenêtre.
- Chaque réponse contient les en-têtes `RateLimit-Usage`, `RateLimit-Limit` et `RateLimit-Reset`.
  Chacun porte deux valeurs séparées par une virgule : d'abord la fenêtre courte, puis la longue.
  Le reset est exprimé en secondes.
- Un dépassement renvoie `429 Too Many Requests`. Les requêtes refusées pour la fenêtre de
  15 min **comptent quand même** dans la fenêtre de 24 h.
- Conséquence pour nous : on fait les rattrapages par plages de 28 jours, on ne fait pas de
  polling (on s'appuie sur les webhooks), et on attend la durée indiquée par
  `RateLimit-Reset` après un 429.

## 8. Endpoints dépréciés à ne pas utiliser

Source : [AccessLink, sections « (deprecated) » et changelog](https://www.polar.com/accesslink-api/#daily-activity--deprecated-).
Tous les endpoints à « transactions » sont dépréciés : **n'en utiliser aucun**.

| Ressource dépréciée | Endpoints | Déprécié le | Remplacement |
|---|---|---|---|
| Daily activity (transactions) | `POST /v3/users/{user-id}/activity-transactions`, `GET`/`PUT …/activity-transactions/{transaction-id}`, `…/activities/{activity-id}`, `…/step-samples`, `…/zone-samples` | 18.08.2025 | `GET /v3/users/activities[/{date}]`, `GET /v3/users/activities/samples[/{date}]` |
| Exercises (transactions) | `POST /v3/users/{user-id}/exercise-transactions`, `GET`/`PUT …/exercise-transactions/{transaction-id}`, `…/exercises/{exercise-id}` (+ `/fit`, `/gpx`, `/tcx`, `/heart-rate-zones`, `/samples`, `/samples/{type-id}`) | 18.08.2025 | `GET /v3/exercises[/{exerciseId}]` (+ `/fit`, `/tcx`, `/gpx`) |
| Physical info (transactions) | `POST /v3/users/{user-id}/physical-information-transactions`, `GET`/`PUT …/{transaction-id}`, `…/physical-informations/{physical-info-id}` | 13.01.2026 | `GET /v3/users/physical-info` + webhook `PHYSICAL_INFORMATION` |

## 9. Points à vérifier

À valider avec une vraie Loop et le client « Afeia dev » :

1. Le « Polar Loop » des pages support est bien la Loop Gen 2 du SDK.
2. La durée de vie réelle du jeton (≈ 1 an ou illimitée) et la manière dont un jeton expiré se manifeste.
3. L'historique accessible pour `sleep/{date}`, `nightly-recharge/{date}` et `continuous-heart-rate`
   (date maximale, plage maximale), et si les données antérieures à l'enregistrement sont accessibles.
4. Si Nightly Recharge est disponible dès la réception du webhook `SLEEP`, ou plus tard.
5. Si les échantillons d'activité sont couverts par l'événement `ACTIVITY_SUMMARY`.
6. Le calcul exact de la signature (octets bruts du corps, encodage hexadécimal en minuscules), et si le PING de création est signé avec la clé qui sera renvoyée.
7. La politique de nouvelle tentative des webhooks avant la désactivation au bout de 7 jours.
8. Si la Loop alimente la température cutanée, la température corporelle, les contacts peau et Cardio load dans AccessLink.
9. Le sens du code `204` sur `POST /v3/users`.
10. Le mode d'authentification réel de `/v3/exercises` (Bearer ou Basic).
