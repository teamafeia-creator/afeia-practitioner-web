'use client';

/**
 * Point de montage du mode debug, inclus dans le layout racine.
 *
 * C'est le SEUL code debug toujours présent dans le bundle, et il est minuscule :
 * une vérification d'activation + un import dynamique. Tant que le mode n'est pas
 * activé (`?debug=1`), rien d'autre n'est chargé — `DebugRuntime` et toutes ses
 * dépendances (bus, outils, instrumentation) restent dans un chunk séparé, non
 * téléchargé.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { isDebugEnabled } from '@/lib/debug/activation';

const DebugRuntime = dynamic(() => import('./DebugRuntime'), { ssr: false });

export function DebugMount() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Évalué côté client uniquement : lit ?debug=1 / sessionStorage.
    setActive(isDebugEnabled());
  }, []);

  if (!active) return null;
  return <DebugRuntime />;
}

export default DebugMount;
