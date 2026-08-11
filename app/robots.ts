import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://afeia.fr';

/**
 * robots.txt — autorise les pages publiques, interdit l'espace authentifié et l'API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/admin',
          '/dashboard',
          '/consultants',
          '/agenda',
          '/messages',
          '/facturation',
          '/billing',
          '/statistics',
          '/settings',
          '/questionnaires',
          '/plans',
          '/consultations',
          '/consultation',
          '/bibliotheque',
          '/morning-review',
          '/onboarding',
          '/consultant/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
