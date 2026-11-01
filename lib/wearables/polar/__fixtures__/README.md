# Fixtures Polar AccessLink

Réponses de l'API AccessLink v3 utilisées par les tests (POL-10/11).

**État actuel : fixtures construites à partir des exemples de la doc officielle**
(https://www.polar.com/accesslink-api/, schémas `sleep`, `nightly-recharge`,
`continuous-heartrate`, `activity-summary-with-all-samples`), avec des dates et des
valeurs réalistes. `activity-list-multi.json` reproduit le cas « plusieurs
enregistrements d'activité pour un même jour » (réponse de `GET /v3/users/activities`).

Pour les remplacer par de vraies réponses : `npm run polar:spike` (POL-03). Le spike
écrit les mêmes noms de fichiers, anonymisés (identifiant utilisateur Polar → `123456`,
`member-id` → `member-fixture`, `device_id` → `DEVICE00`, nom/prénom/date de
naissance/poids/taille remplacés, jeton remplacé par `fixture-access-token`).
Relire chaque fichier avant de le commiter : les dates, horaires et mesures sont réels.

## Total de sommeil Polar Flow (`flow-totals.json`)

Pour valider la règle `total_sleep_s` (docs/wearables/polar.md §6.6) : après le spike, ouvrir
la nuit dans l'app Polar Flow, relever le temps de sommeil affiché et le saisir en secondes
dans `flow-totals.json` pour le fichier correspondant. Le test passe alors de « à faire » à
une vérification réelle.
