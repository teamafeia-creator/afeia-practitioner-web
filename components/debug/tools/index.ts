/**
 * Enregistrement de tous les outils du panneau debug.
 *
 * ⚠️ C'EST LE SEUL FICHIER À MODIFIER POUR AJOUTER UN OUTIL.
 * 1. Créez `components/debug/tools/MonOutilTool.tsx` exportant un `DebugTool`.
 * 2. Importez-le ici et ajoutez-le à l'appel `registerDebugTool`.
 * Aucun autre fichier (DebugPanel, registry, bus) n'a besoin de changer.
 *
 * Voir `docs/DEBUG-TOOLS.md` pour un exemple complet de bout en bout.
 */
import { registerDebugTool } from '@/lib/debug/registry';
import { errorsTool } from './ErrorsTool';
import { networkTool } from './NetworkTool';
import { routeTool } from './RouteTool';
import { envTool } from './EnvTool';

registerDebugTool(errorsTool);
registerDebugTool(networkTool);
registerDebugTool(routeTool);
registerDebugTool(envTool);
