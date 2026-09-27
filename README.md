# Priti Interior LLC — Website

Website for Priti Interior LLC, a residential and commercial interior design studio in Las Vegas, NV.

## Pages

| Page | File |
| --- | --- |
| Home | `src/pages/index.html` |
| About | `src/pages/about.html` |
| Services & Pricing | `src/pages/services.html` |
| Contact (with form) | `src/pages/contact.html` |
| Cart | `src/pages/cart.html` |
| Checkout | `src/pages/checkout.html` |
| Order confirmation | `src/pages/order-confirmation.html` |
| Terms & Conditions | `src/pages/terms.html` |
| Privacy Policy | `src/pages/privacy.html` |
| Cookie Policy | `src/pages/cookies.html` |
| Cancellation & Refund Policy | `src/pages/refunds.html` |
| Legal Notice | `src/pages/legal.html` |

The cookie consent banner, header navigation (with cart) and footer are shared and defined once in `build.js`.

## How it fits together

- `src/pages/*.html`: page content. Edit these, then run `npm run build`.
- `build.js`: wraps each page with the shared layout and writes the finished pages (`index.html`, `about.html`, …) to the repository root.
- `*.html` in the root plus `assets/`: the built site (committed, so GitHub Pages can serve it as is).
- `assets/js/catalog.js`: **all services, collections and prices**. Edit prices here. The server uses the same file, so customers can't change prices from the browser.
- `assets/js/main.js`: navigation, sparkles, cart, checkout, contact form and cookie consent.
- `assets/css/styles.css`: all styles.
- `server.js`: a small Node server (no dependencies) that serves the site and handles checkout and the contact form. It only serves the site files, never its own code or data.

## Running locally

Requires Node.js 18 or newer.

```bash
cp .env.example .env    # then fill in values
npm run dev             # builds pages and starts http://localhost:3000
```

## Payments (Stripe)

1. Create a Stripe account and copy your **secret key** from https://dashboard.stripe.com/apikeys.
2. Put it in `.env` as `STRIPE_SECRET_KEY=sk_test_...` (switch to `sk_live_...` when ready).
3. Set `SITE_URL` to your public domain so customers return to the right place after paying.

Checkout sends customers to Stripe's hosted payment page, then back to `/order-confirmation.html`, which verifies the payment with Stripe. Card details never touch this server.

**Without a Stripe key**, checkout still works: orders are saved as *booking requests* in `data/orders.jsonl` and the customer is told they'll get a secure invoice. If the site is hosted somewhere without the Node server (plain static hosting), checkout and the contact form automatically fall back to a pre-filled email to contact@priti-interior.com.

## Contact form and order notifications

Submissions are saved to `data/inquiries.jsonl` and `data/orders.jsonl`. To receive them by email, create a free [Resend](https://resend.com) account, verify the priti-interior.com domain, and set `RESEND_API_KEY`, `NOTIFY_EMAIL` and `NOTIFY_FROM` in `.env`.

## Deploying

**GitHub Pages (free):** in Settings → Pages, choose *Deploy from a branch*, pick the site's branch and the `/ (root)` folder. The pages are already built, so no extra setup is needed. (Choosing *GitHub Actions* also works, using `.github/workflows/pages.yml`.) Card payments need the Node server, so on GitHub Pages checkout and the contact form fall back to a pre-filled email.

**Node hosting (for Stripe payments):** Any host that runs Node works (Render, Railway, Fly.io, a VPS, etc.): run `npm start` with the environment variables above. Put it behind HTTPS (most hosts do this automatically).

## Images

Photos are loaded from Unsplash under the [Unsplash License](https://unsplash.com/license), and photographers are credited on the Legal Notice page. Replace them with photos of your own projects when available: search for `images.unsplash.com` in `src/pages`, `assets/js/catalog.js` and `assets/css/styles.css` (background), then run `npm run build`.

## Before launch

The policy pages are drafted for a Nevada LLC offering decorative (non-structural) design services. Have a Nevada attorney review them before going live.
