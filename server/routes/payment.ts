/**
 * Stripe odeme route'lari — docs/PAYMENT_INTEGRATION.md ile uyumlu.
 * STRIPE_SECRET_KEY yoksa checkout/webhook 503 doner.
 * Stripe lazy-load: test ortaminda dunder-proto hatasini onlemek icin modul ilk kullanimda yuklenir.
 */

import { Router } from 'express';
import { createRequire } from 'module';
import { getPool } from '../db/client';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { asyncHandler } from '../lib/asyncHandler';

const require = createRequire(import.meta.url);
const router = Router();

function getStripe(): any {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const Stripe = require('stripe');
    return new Stripe(key, { apiVersion: '2024-11-20.acacia' });
  } catch {
    return null;
  }
}

/** POST /v1/create-checkout-session — Stripe Checkout Session olusturur
 * Auth: JWT (authUser) veya API key. plan: 'monthly' | 'yearly' | 'team'
 */
router.post('/create-checkout-session', requireAnyAuth, asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
    const authUser = req.authUser;
    const { plan, priceId, successUrl, cancelUrl } = req.body ?? {};

    // Plan bazli price ID secimi
    let selectedPrice = priceId;
    if (!selectedPrice) {
      if (plan === 'yearly') {
        selectedPrice = process.env.STRIPE_PRICE_YEARLY;
      } else if (plan === 'team') {
        selectedPrice = process.env.STRIPE_PRICE_TEAM;
      } else {
        selectedPrice = process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_PRO;
      }
    }
    if (!selectedPrice) {
      return res.status(500).json({ error: 'Stripe price not configured' });
    }

    const userId = authUser?.userId || req.body?.userId || '';
    const orgId = authUser?.orgId || req.body?.orgId || '';
    const email = authUser?.email || '';

    // Stripe customer olustur/bul
    let customerId: string | undefined;
    const pool = getPool();
    if (pool && orgId) {
      const orgResult = await pool.query(
        'SELECT stripe_customer_id FROM organizations WHERE id = $1::uuid',
        [orgId]
      );
      customerId = orgResult.rows[0]?.stripe_customer_id || undefined;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email,
          metadata: { orgId, userId },
        });
        customerId = customer.id;
        await pool.query(
          'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2::uuid',
          [customerId, orgId]
        );
      }
    }

    const metadata: Record<string, string> = { userId, orgId, plan: plan || 'pro' };
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: selectedPrice, quantity: 1 }],
      success_url: successUrl || `${frontendUrl}/?success=1`,
      cancel_url: cancelUrl || `${frontendUrl}/?cancel=1`,
      metadata,
      subscription_data: { metadata },
    });
    res.json({ url: session.url });
}));

/** POST /v1/create-portal-session — Stripe Customer Portal (abonelik yonetimi) */
router.post('/create-portal-session', requireAnyAuth, asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
    const authUser = req.authUser;
    const orgId = authUser?.orgId;

    if (!orgId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const orgResult = await pool.query(
      'SELECT stripe_customer_id FROM organizations WHERE id = $1::uuid',
      [orgId]
    );
    const customerId = orgResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/?portal_return=1`,
    });

    res.json({ url: portalSession.url });
}));

export default router;

/** Stripe webhook handler — raw body gerekir; server/app.ts icinde express.raw() ile mount edilir */
export function createStripeWebhookHandler() {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return (_req: any, res: any) => res.status(503).send('Webhook not configured');
  }
  return async (req: any, res: any) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const pool = getPool();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.orgId;
        const subId = session.subscription as string | undefined;
        if (pool && orgId && subId) {
          try {
            // Detect plan type from metadata or price
            const planFromMeta = session.metadata?.plan;
            const plan = planFromMeta === 'team' ? 'team' : 'pro';

            await pool.query(
              `UPDATE organizations SET plan = $1, stripe_subscription_id = $2, updated_at = now() WHERE id = $3::uuid`,
              [plan, subId, orgId]
            );
          } catch (e) {
            console.error('[Stripe] DB update failed:', e);
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (pool && sub.id) {
          try {
            await pool.query(
              `UPDATE organizations SET plan = 'free', stripe_subscription_id = NULL, updated_at = now() WHERE stripe_subscription_id = $1`,
              [sub.id]
            );
          } catch (e) {
            console.error('[Stripe] DB update failed:', e);
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        console.warn('[Stripe] Payment failed for subscription:', subId);
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  };
}
