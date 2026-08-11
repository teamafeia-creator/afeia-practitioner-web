import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://afeia.fr';

/**
 * sitemap.xml — pages publiques indexables.
 * (Les pages de réservation /rdv/[slug] sont propres à chaque praticien et ne
 * sont pas énumérées ici ; elles peuvent être ajoutées dynamiquement plus tard.)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/welcome', '/login', '/signup', '/questionnaire'];
  return routes.map((route) => ({
    url: `${base}${route}`,
    changeFrequency: 'monthly',
    priority: route === '/welcome' ? 1 : 0.5,
  }));
}
