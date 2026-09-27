#!/usr/bin/env node
/*
 * Priti Interior — web server (no dependencies, Node 18+).
 *
 *  - Serves the static site in ./public
 *  - POST /api/checkout      → Stripe Checkout Session (or a booking request if Stripe is not configured)
 *  - GET  /api/order-status  → confirms a Stripe Checkout Session after redirect
 *  - POST /api/contact       → stores contact inquiries (and emails them if configured)
 *
 * Environment variables (see .env.example):
 *   PORT, SITE_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, NOTIFY_EMAIL, NOTIFY_FROM
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Catalog = require('./public/assets/js/catalog.js');

loadDotEnv();

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'contact@priti-interior.com';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data: https://images.unsplash.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self'",
    "connect-src 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'self'",
    "base-uri 'self'"
  ].join('; ')
};

/* ------------------------------------------------------------------ helpers */

function loadDotEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({}, SECURITY_HEADERS, headers));
  res.end(body);
}

function sendJSON(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}

function readJSON(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
}

function cleanMultiline(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function appendRecord(file, record) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(path.join(DATA_DIR, file), JSON.stringify(record) + '\n');
}

function newOrderId() {
  return 'PI-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${req.headers.host}`;
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

// Very small in-memory rate limiter: `max` requests per `windowMs` per IP and route.
const hits = new Map();
function rateLimited(req, key, max, windowMs) {
  const id = key + ':' + clientIp(req);
  const now = Date.now();
  const entry = hits.get(id) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count += 1;
  hits.set(id, entry);
  return entry.count > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
}, 60 * 1000).unref();

/* ------------------------------------------------------------------ email (optional) */

async function notify(subject, text, replyTo) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || 'Priti Interior Website <website@priti-interior.com>',
        to: [NOTIFY_EMAIL],
        reply_to: replyTo || undefined,
        subject,
        text
      })
    });
    if (!res.ok) console.error('Email notification failed:', res.status, await res.text());
  } catch (err) {
    console.error('Email notification error:', err.message);
  }
}

/* ------------------------------------------------------------------ Stripe */

function toForm(obj, prefix, out = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') toForm(value, name, out);
    else out.push(encodeURIComponent(name) + '=' + encodeURIComponent(String(value)));
  }
  return out.join('&');
}

async function stripe(method, endpoint, params) {
  const res = await fetch('https://api.stripe.com/v1/' + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20'
    },
    body: method === 'GET' ? undefined : toForm(params || {})
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error((json.error && json.error.message) || 'Stripe request failed');
    err.status = 502;
    throw err;
  }
  return json;
}

/* ------------------------------------------------------------------ API handlers */

async function handleCheckout(req, res) {
  if (rateLimited(req, 'checkout', 10, 10 * 60 * 1000)) return sendJSON(res, 429, { error: 'Too many attempts. Please wait a few minutes.' });
  const body = await readJSON(req);
  if (body.website) return sendJSON(res, 400, { error: 'Unable to process request.' }); // honeypot

  const c = body.customer || {};
  const customer = {
    name: clean(c.name, 120),
    email: clean(c.email, 160),
    phone: clean(c.phone, 40),
    company: clean(c.company, 120),
    address: clean(c.address, 200),
    city: clean(c.city, 80),
    zip: clean(c.zip, 10),
    projectType: clean(c.projectType, 20),
    timeline: clean(c.timeline, 40),
    notes: cleanMultiline(c.notes, 2000)
  };

  const missing = ['name', 'email', 'phone', 'address', 'city', 'zip'].filter((k) => !customer[k]);
  if (missing.length) return sendJSON(res, 400, { error: 'Please complete all required fields.' });
  if (!EMAIL_RE.test(customer.email)) return sendJSON(res, 400, { error: 'Please enter a valid email address.' });
  if (!/^\d{5}(-\d{4})?$/.test(customer.zip)) return sendJSON(res, 400, { error: 'Please enter a valid ZIP code.' });

  const priced = Catalog.priceCart(Array.isArray(body.items) ? body.items.slice(0, 50) : [], body.plan);
  if (!priced.items.length) return sendJSON(res, 400, { error: 'Your cart is empty.' });

  const orderId = newOrderId();
  const order = {
    orderId,
    createdAt: new Date().toISOString(),
    customer,
    items: priced.items,
    subtotal: priced.subtotal,
    plan: priced.plan,
    dueToday: priced.dueToday,
    balance: priced.balance
  };

  const summaryText = [
    `Order ${orderId}`,
    ...priced.items.map((i) => `- ${i.name} x${i.qty}: ${Catalog.formatPrice(i.total)}`),
    `Subtotal: ${Catalog.formatPrice(priced.subtotal)}`,
    `Plan: ${priced.plan === 'retainer' ? '50% retainer' : 'Paid in full'} (due today ${Catalog.formatPrice(priced.dueToday)})`,
    '',
    `${customer.name} <${customer.email}> ${customer.phone}`,
    customer.company ? `Company: ${customer.company}` : '',
    `${customer.address}, ${customer.city} ${customer.zip}`,
    `${customer.projectType} · Start: ${customer.timeline}`,
    customer.notes ? `Notes: ${customer.notes}` : ''
  ].filter(Boolean).join('\n');

  // No Stripe key: record a booking request so the studio can send an invoice.
  if (!STRIPE_KEY) {
    appendRecord('orders.jsonl', Object.assign({ status: 'requested', mode: 'request' }, order));
    await notify(`New booking request ${orderId} — ${customer.name}`, summaryText + '\n\nNo online payment was taken. Please send an invoice.', customer.email);
    return sendJSON(res, 200, { orderId, mode: 'request' });
  }

  const base = siteUrl(req);
  let lineItems;
  if (priced.plan === 'retainer') {
    lineItems = [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: priced.dueToday,
        product_data: {
          name: 'Design retainer (50%)',
          description: priced.items.map((i) => `${i.name}${i.qty > 1 ? ' ×' + i.qty : ''}`).join(', ').slice(0, 480)
        }
      }
    }];
  } else {
    lineItems = priced.items.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: 'usd',
        unit_amount: i.price,
        product_data: { name: i.name, description: `Priti Interior design service · ${i.unit}` }
      }
    }));
  }

  const params = {
    mode: 'payment',
    customer_email: customer.email,
    client_reference_id: orderId,
    success_url: `${base}/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout.html`,
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: 'true' },
    line_items: lineItems,
    metadata: {
      order_id: orderId,
      plan: priced.plan,
      subtotal_cents: String(priced.subtotal),
      balance_cents: String(priced.balance),
      customer_name: customer.name,
      customer_phone: customer.phone,
      company: customer.company,
      project_address: `${customer.address}, ${customer.city} ${customer.zip}`.slice(0, 480),
      project_type: customer.projectType,
      timeline: customer.timeline,
      notes: customer.notes.slice(0, 480)
    },
    payment_intent_data: {
      description: `Priti Interior ${orderId}`,
      metadata: { order_id: orderId }
    }
  };

  const session = await stripe('POST', 'checkout/sessions', params);
  appendRecord('orders.jsonl', Object.assign({ status: 'pending_payment', mode: 'stripe', stripeSessionId: session.id }, order));
  await notify(`New checkout started ${orderId} — ${customer.name}`, summaryText + '\n\nAwaiting Stripe payment.', customer.email);
  return sendJSON(res, 200, { url: session.url, orderId });
}

async function handleOrderStatus(req, res, url) {
  const sessionId = url.searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return sendJSON(res, 400, { error: 'Invalid session.' });
  if (!STRIPE_KEY) return sendJSON(res, 503, { error: 'Payments are not configured.' });
  const session = await stripe('GET', 'checkout/sessions/' + encodeURIComponent(sessionId));
  const paid = session.payment_status === 'paid';
  if (paid) {
    appendRecord('payments.jsonl', {
      at: new Date().toISOString(),
      orderId: session.client_reference_id,
      sessionId: session.id,
      amount: session.amount_total,
      email: session.customer_details && session.customer_details.email
    });
  }
  return sendJSON(res, 200, {
    paid,
    orderId: session.client_reference_id,
    amount: session.amount_total,
    email: session.customer_details ? session.customer_details.email : session.customer_email
  });
}

async function handleContact(req, res) {
  if (rateLimited(req, 'contact', 5, 10 * 60 * 1000)) return sendJSON(res, 429, { error: 'Too many messages. Please try again later.' });
  const body = await readJSON(req);
  if (body.website) return sendJSON(res, 200, { ok: true }); // honeypot: pretend success

  const inquiry = {
    at: new Date().toISOString(),
    name: clean(body.name, 120),
    email: clean(body.email, 160),
    phone: clean(body.phone, 40),
    interest: clean(body.interest, 80),
    projectType: clean(body.projectType, 20),
    budget: clean(body.budget, 40),
    message: cleanMultiline(body.message, 4000),
    consent: body.consent === 'yes'
  };

  if (!inquiry.name || !inquiry.email || !inquiry.message || !inquiry.interest) return sendJSON(res, 400, { error: 'Please complete all required fields.' });
  if (!EMAIL_RE.test(inquiry.email)) return sendJSON(res, 400, { error: 'Please enter a valid email address.' });
  if (!inquiry.consent) return sendJSON(res, 400, { error: 'Please confirm the privacy acknowledgement.' });

  appendRecord('inquiries.jsonl', inquiry);
  await notify(
    `New inquiry — ${inquiry.name} (${inquiry.interest})`,
    `${inquiry.name} <${inquiry.email}> ${inquiry.phone}\n${inquiry.projectType} · Budget: ${inquiry.budget || 'n/a'}\n\n${inquiry.message}`,
    inquiry.email
  );
  return sendJSON(res, 200, { ok: true });
}

/* ------------------------------------------------------------------ static files */

function serveStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (e) {
    return send(res, 400, 'Bad request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!path.extname(pathname)) pathname += '.html'; // clean URLs: /about → /about.html

  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      const notFound = path.join(PUBLIC_DIR, '404.html');
      return fs.readFile(notFound, (e, html) =>
        send(res, 404, e ? 'Not found' : html, { 'Content-Type': MIME['.html'] })
      );
    }
    const ext = path.extname(filePath).toLowerCase();
    const isAsset = pathname.startsWith('/assets/');
    res.writeHead(200, Object.assign({}, SECURITY_HEADERS, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': isAsset ? 'public, max-age=604800' : 'no-cache'
    }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ------------------------------------------------------------------ router */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'POST' && url.pathname === '/api/checkout') return await handleCheckout(req, res);
      if (req.method === 'GET' && url.pathname === '/api/order-status') return await handleOrderStatus(req, res, url);
      if (req.method === 'POST' && url.pathname === '/api/contact') return await handleContact(req, res);
      if (req.method === 'GET' && url.pathname === '/api/health') return sendJSON(res, 200, { ok: true, payments: STRIPE_KEY ? 'stripe' : 'request' });
      return sendJSON(res, 404, { error: 'Not found' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    return serveStatic(req, res, url);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJSON(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : 'We could not process that request. Please try again.' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Priti Interior running at http://localhost:${PORT}`);
    console.log(STRIPE_KEY ? 'Payments: Stripe Checkout enabled' : 'Payments: STRIPE_SECRET_KEY not set, checkout records booking requests');
  });
}

module.exports = server;
