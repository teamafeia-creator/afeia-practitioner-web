/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Optimisation activée (redimensionnement + AVIF/WebP). Les images distantes
    // proviennent du stockage Supabase ; on autorise ce seul hôte.
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: ['@excalidraw/excalidraw'],
  webpack: (config, { isServer }) => {
    // Fichiers texte importés tels quels (`import texte from './fichier.md?raw'`), ex. le texte
    // de consentement content/consents/wearables-v1.md.
    config.module.rules.push({ resourceQuery: /raw/, type: 'asset/source' });
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  // Local uniquement (NEXT_PUBLIC_SUPABASE_VIA_APP=1) : relaie Supabase sous /supabase pour
  // tester l'app depuis un téléphone via un tunnel. Sans effet en production.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_SUPABASE_VIA_APP !== '1' || !process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    return [{ source: '/supabase/:path*', destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*` }];
  },
  async headers() {
    return [
      {
        // Autoriser CORS pour tous les endpoints API
        source: '/api/:path*',
        headers: [
          // Pas de "Allow-Credentials: true" avec un Origin joker : l'API mobile
          // s'authentifie par Bearer JWT (pas de cookies) et le web est same-origin.
          // Autoriser toute origine AVEC credentials serait une faille (exfiltration
          // cross-origin de réponses authentifiées).
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
