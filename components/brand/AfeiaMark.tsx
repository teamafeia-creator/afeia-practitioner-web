import { cn } from '@/lib/cn';

/**
 * Le symbole AFEIA (public/afeia_symbol.svg), colorié avec la couleur de texte courante.
 * Le SVG est monochrome : on l'applique en masque, ce qui permet `text-sage`, `text-white`…
 * Remplace l'icône générique « feuille » qui servait de logo.
 */
export function AfeiaMark({ className, title }: { className?: string; title?: string }) {
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        WebkitMaskImage: 'url(/afeia_symbol.svg)',
        maskImage: 'url(/afeia_symbol.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        aspectRatio: '560 / 640',
      }}
    />
  );
}
