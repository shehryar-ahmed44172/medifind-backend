import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { stripe, planAmount } from '../services/stripeService';
import { sendSuccess, sendError } from '../utils/response';

const prisma = new PrismaClient();

/**
 * POST /api/payments/create-intent
 * Creates a Stripe PaymentIntent and returns the clientSecret to the app.
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { plan } = req.body;
    if (!plan || !['PROFESSIONAL', 'EXECUTIVE'].includes(plan)) {
      return sendError(res, 'plan must be PROFESSIONAL or EXECUTIVE', 400);
    }

    const amount = planAmount(plan);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'pkr',
      metadata: {
        userId: req.user.userId,
        plan,
      },
      automatic_payment_methods: { enabled: true },
    });

    sendSuccess(res, { clientSecret: paymentIntent.client_secret }, 'Payment intent created');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/payments/webhook
 * Stripe webhook — upgrades the user's subscription on payment_intent.succeeded.
 * Must receive the raw request body for signature verification.
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // No secret configured — parse body directly (dev/testing only)
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).send('Invalid payload');
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { userId, plan } = intent.metadata ?? {};

    if (userId && plan) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionPlan: plan as any },
        });
        console.log(`[Stripe] Upgraded user ${userId} to ${plan}`);
      } catch (err: any) {
        console.error('[Stripe Webhook] DB update failed:', err.message);
      }
    }
  }

  res.json({ received: true });
};
