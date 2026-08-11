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
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
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
