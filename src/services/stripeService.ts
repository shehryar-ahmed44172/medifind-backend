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

/**
 * Confirms that a PaymentIntent succeeded, belongs to the user, and paid for the plan.
 */
export async function verifyPlanPayment(
  paymentIntentId: string,
  userId: string,
  plan: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, reason: 'Payments are not configured on the server' };
  }
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return { ok: false, reason: 'Payment has not been completed' };
    }
    if (intent.metadata?.userId !== userId || intent.metadata?.plan !== plan) {
      return { ok: false, reason: 'Payment does not match this account or plan' };
    }
    if (intent.amount_received < planAmount(plan)) {
      return { ok: false, reason: 'Payment amount does not match the plan price' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Could not verify payment' };
  }
}
