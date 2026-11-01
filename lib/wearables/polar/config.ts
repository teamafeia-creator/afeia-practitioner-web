// lib/wearables/polar/config.ts
// Config Polar validée À LA DEMANDE (voir ./env.ts). Ne jamais importer ce module depuis du code
// exécuté au démarrage ou par des pages non Polar : seules les routes et services Polar l'utilisent.
import 'server-only';

export * from './env';
