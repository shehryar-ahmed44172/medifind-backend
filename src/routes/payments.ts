import { Router } from 'express';
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createPaymentIntent, handleWebhook } from '../controllers/paymentController';

const router = Router();

// Webhook must receive raw body for Stripe signature verification.
// This route is mounted BEFORE global express.json() in server.ts.
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// All other payment routes need JSON body + auth.
router.post('/create-intent', express.json(), authMiddleware, createPaymentIntent);

export default router;
