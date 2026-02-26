# Stripe / iyzico Entegrasyon Rehberi

Super Reasoning için abonelik ve kredi satışı entegrasyonu. **Stripe** (global) ve **iyzico** (Türkiye) desteklenir.

---

## 1. Genel Akış

```
Kullanıcı → Plan seçer → Checkout (Stripe/iyzico) → Ödeme → Webhook → Limit güncelle
```

- **Stripe:** Subscription (abonelik) veya one-time (kredi paketi)
- **iyzico:** Türk kartları için; subscription veya tek seferlik

---

## 2. Stripe Kurulumu

### 2.1 Hesap ve API Key'ler

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys
2. **Publishable key** (pk_test_...) → Frontend
3. **Secret key** (sk_test_...) → Backend (env: `STRIPE_SECRET_KEY`)
4. Webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 2.2 Paket Kurulumu

```bash
npm install stripe
```

### 2.3 Abonelik Planları (Stripe Dashboard)

| Plan  | Price ID              | Limit (prompt/dk) |
|-------|------------------------|-------------------|
| Free  | —                      | 10                |
| Pro   | price_xxx (₺99/ay)     | 100               |
| Team  | price_yyy (₺299/ay)    | 500               |

**Products & Prices** → Yeni Product → Recurring (monthly) → Price ID'yi kopyala.

### 2.4 Webhook

1. Developers → Webhooks → Add endpoint
2. URL: `https://api.example.com/v1/webhooks/stripe`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
4. Signing secret'ı `.env`'e ekle

### 2.5 Backend Snippet (Express)

```ts
// server/routes/payment.ts
import Stripe from 'stripe';
import express from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' });

const router = express.Router();

// Checkout session oluştur
router.post('/create-checkout-session', async (req, res) => {
  const { priceId, userId, successUrl, cancelUrl } = req.body;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      trial_period_days: 0,
      metadata: { userId },
    },
  });
  res.json({ url: session.url });
});

// Webhook
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subId = session.subscription as string;
      // DB: userId → subscriptionId, plan=Pro
      // await updateUserPlan(userId, 'pro', subId);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      // DB: subscriptionId → plan=Free
      break;
    }
  }
  res.json({ received: true });
});
```

**Önemli:** Webhook route'u `express.raw()` ile body'yi almalı; diğer route'larda `express.json()` kullanın.

---

## 3. iyzico Kurulumu (Türkiye)

### 3.1 Hesap

1. [iyzico.com](https://www.iyzico.com) → Merchant hesabı
2. API Key + Secret Key (sandbox/live)

### 3.2 Paket

```bash
npm install iyzipay
```

### 3.3 Örnek (Tek Çekim)

```ts
import Iyzipay from 'iyzipay';

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_URI ?? 'https://sandbox-api.iyzipay.com',
});

// Tek çekim
const request = {
  price: '99.00',
  paidPrice: '99.00',
  currency: Iyzipay.CURRENCY.TRY,
  basketId: 'B' + Date.now(),
  paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
  callbackUrl: 'https://yoursite.com/payment/callback',
  enabledInstallments: [1, 2, 3, 6, 9],
  buyer: { /* ... */ },
  shippingAddress: { /* ... */ },
  billingAddress: { /* ... */ },
  basketItems: [{ id: '1', name: 'Pro 1 Ay', category1: 'Subscription', itemType: 'VIRTUAL', price: '99.00' }],
};

iyzipay.checkoutFormInitialize.create(request, (err, result) => {
  if (err) return console.error(err);
  // result.checkoutFormContent → frontend'de iframe/form
});
```

### 3.4 Callback / Webhook

- iyzico, ödeme sonrası `callbackUrl`'e redirect eder
- Token ile ödeme durumunu doğrulayın: `iyzipay.checkoutForm.retrieve()`

---

## 4. Limit Uygulama

Ödeme/webhook sonrası kullanıcı planı güncellenir. `server/middleware/rateLimit.ts` içinde:

- `API_KEYS` = Free (10/dk)
- `API_KEYS_PRO` = Pro (100/dk)

Alternatif: API key yerine `userId` + DB'den plan okuma. Her istekte `x-api-key` → userId → plan → limit.

---

## 5. Ortam Değişkenleri

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_TEAM=price_yyy

# iyzico
IYZICO_API_KEY=xxx
IYZICO_SECRET_KEY=xxx
IYZICO_URI=https://sandbox-api.iyzipay.com
```

---

## 6. Test

- **Stripe:** [test cards](https://stripe.com/docs/testing#cards) — 4242 4242 4242 4242
- **iyzico:** Sandbox modda test kartları
- Webhook: `stripe listen --forward-to localhost:4000/v1/webhooks/stripe`

---

**PROPRIETARY | SUPER REASONING v2.2**
