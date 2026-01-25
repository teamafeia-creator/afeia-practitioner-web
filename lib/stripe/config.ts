// lib/stripe/config.ts

/**
 * Configuration Stripe centralisée
 */
export const stripeConfig = {
  // Clés API
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Product & Price IDs
  productId: process.env.STRIPE_PRODUCT_ID!,
  prices: {
    monthly: process.env.STRIPE_PRICE_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_YEARLY!,
  },

  // URLs
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const;

/**
 * Vérifie que toutes les variables d'environnement Stripe requises sont définies
 */
export function validateStripeConfig() {
  const required = [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_PRODUCT_ID',
    'STRIPE_PRICE_MONTHLY',
    'STRIPE_PRICE_YEARLY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Stripe environment variables: ${missing.join(', ')}`
    );
  }
}
