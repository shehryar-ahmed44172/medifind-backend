import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY is not set — payment endpoints will fail.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia',
});

// PKR amounts in paisa (1 PKR = 100 paisa)
const PLAN_AMOUNT: Record<string, number> = {
  PROFESSIONAL: 49900,   // PKR 499
  EXECUTIVE:    249900,  // PKR 2499
};

export function planAmount(plan: string): number {
  return PLAN_AMOUNT[plan] ?? 0;
}
