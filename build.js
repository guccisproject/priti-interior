#!/usr/bin/env node
/*
 * Tiny static build: wraps each page in src/pages with the shared layout
 * (head, header, footer, cookie banner) and writes it to public/.
 *
 * Each page starts with a meta comment:
 *   <!--meta {"title": "...", "description": "...", "nav": "home"} -->
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src', 'pages');
const OUT = path.join(__dirname, 'public');
const SITE_URL = process.env.SITE_URL || 'https://priti-interior.com';
// Cache-busting version derived from asset contents, so rebuilding unchanged assets yields identical pages.
const ASSET_VERSION = require('crypto')
  .createHash('sha1')
  .update(['assets/css/styles.css', 'assets/js/catalog.js', 'assets/js/main.js']
    .map((f) => fs.readFileSync(path.join(OUT, f))).join(''))
  .digest('hex')
  .slice(0, 8);

const NAV = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'about', href: '/about.html', label: 'About' },
  { key: 'services', href: '/services.html', label: 'Services' },
  { key: 'contact', href: '/contact.html', label: 'Contact' }
];

const POLICIES = [
  { key: 'terms', href: '/terms.html', label: 'Terms &amp; Conditions' },
  { key: 'privacy', href: '/privacy.html', label: 'Privacy Policy' },
  { key: 'cookies', href: '/cookies.html', label: 'Cookie Policy' },
  { key: 'refunds', href: '/refunds.html', label: 'Cancellation &amp; Refunds' },
  { key: 'legal', href: '/legal.html', label: 'Legal Notice' }
];

const cartIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>`;

const brandMark = `<svg class="brand__mark" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="0.9" aria-hidden="true"><path d="M20 3 L37 20 L20 37 L3 20 Z"/><path d="M20 10 L30 20 L20 30 L10 20 Z" opacity=".55"/><path d="M20 17.5 L22.5 20 L20 22.5 L17.5 20 Z" fill="currentColor"/></svg>`;

function header(active) {
  const items = NAV.map(
    (n) => `<li><a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a></li>`
  ).join('\n          ');
  return `
  <header class="site-header">
    <div class="container">
      <nav class="nav glass" aria-label="Primary">
        <a class="brand" href="/" aria-label="Priti Interior, home">
          ${brandMark}
          <span><span class="brand__name">Priti</span><span class="brand__sub">Interior</span></span>
        </a>
        <a class="nav__mobile-cart nav__links-cart cart-link" href="/cart.html" aria-label="Cart">${cartIcon}<span class="cart-count" data-count="0">0</span></a>
        <ul class="nav__links" id="nav-links">
          ${items}
          <li class="cart-item"><a class="cart-link" href="/cart.html"${active === 'cart' ? ' aria-current="page"' : ''} aria-label="Cart">${cartIcon}<span>Cart</span><span class="cart-count" data-count="0">0</span></a></li>
        </ul>
        <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Menu"><span></span></button>
      </nav>
    </div>
  </header>`;
}

function footer() {
  const nav = NAV.concat([{ href: '/cart.html', label: 'Cart' }])
    .map((n) => `<li><a href="${n.href}">${n.label}</a></li>`)
    .join('\n              ');
  const policies = POLICIES.map((p) => `<li><a href="${p.href}">${p.label}</a></li>`).join('\n              ');
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer glass">
        <div class="footer__top">
          <div>
            <a class="brand" href="/" aria-label="Priti Interior, home">
              ${brandMark}
              <span><span class="brand__name">Priti</span><span class="brand__sub">Interior</span></span>
            </a>
            <p class="footer__blurb">Residential and commercial interiors, composed with intention. Serving Las Vegas, Henderson and Summerlin by appointment.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              ${nav}
            </ul>
          </div>
          <div>
            <h4>Policies</h4>
            <ul>
              ${policies}
              <li><button type="button" data-open-cookie-settings>Cookie Settings</button></li>
            </ul>
          </div>
          <div>
            <h4>Studio</h4>
            <address>
              Priti Interior LLC<br>
              Las Vegas, Nevada<br>
              <a href="tel:+17027447873">702-744-7873</a><br>
              <a href="mailto:contact@priti-interior.com">contact@priti-interior.com</a><br>
              <span class="faint">Nevada Business ID 1504042</span>
            </address>
          </div>
        </div>
        <div class="footer__bottom">
          <span>Copyright &copy; Priti Interior LLC 2026. All rights reserved.</span>
          <span>By appointment &middot; Las Vegas, NV</span>
        </div>
      </div>
    </div>
  </footer>`;
}

const cookieBanner = `
  <div class="cookie-banner glass" id="cookie-banner" role="dialog" aria-live="polite" aria-labelledby="cookie-title" hidden>
    <h2 id="cookie-title">A note on cookies</h2>
    <p>We use essential storage to keep your cart and remember your choices. With your permission we may also use preference, analytics and marketing cookies. See our <a class="text-link" href="/cookies.html">Cookie Policy</a>.</p>
    <div class="cookie-prefs">
      <div class="cookie-pref">
        <div><strong>Strictly necessary</strong><small>Cart, checkout, security and this consent choice. Always on.</small></div>
        <label class="switch"><input type="checkbox" checked disabled aria-label="Strictly necessary cookies (always on)"><span></span></label>
      </div>
      <div class="cookie-pref">
        <div><strong>Preferences</strong><small>Remembers settings such as form details you have started.</small></div>
        <label class="switch"><input type="checkbox" data-consent="preferences" aria-label="Preference cookies"><span></span></label>
      </div>
      <div class="cookie-pref">
        <div><strong>Analytics</strong><small>Anonymous statistics that help us improve the site.</small></div>
        <label class="switch"><input type="checkbox" data-consent="analytics" aria-label="Analytics cookies"><span></span></label>
      </div>
      <div class="cookie-pref">
        <div><strong>Marketing</strong><small>Measures the performance of our advertising.</small></div>
        <label class="switch"><input type="checkbox" data-consent="marketing" aria-label="Marketing cookies"><span></span></label>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn--sm" type="button" data-cookie="accept">Accept all</button>
      <button class="btn btn--ghost btn--sm" type="button" data-cookie="reject">Essential only</button>
      <button class="btn btn--ghost btn--sm" type="button" data-cookie="customize">Customize</button>
      <button class="btn btn--sm" type="button" data-cookie="save" hidden>Save choices</button>
    </div>
  </div>`;

function layout(meta, body, file) {
  const pagePath = file === 'index.html' ? '/' : '/' + file;
  const title = meta.title === 'Home'
    ? 'Priti Interior | Residential & Commercial Interior Design, Las Vegas'
    : `${meta.title} | Priti Interior`;
  const robots = meta.noindex ? '\n  <meta name="robots" content="noindex">' : '';
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${title}</title>
  <meta name="description" content="${meta.description}">${robots}
  <meta name="theme-color" content="#0b0b0c">
  <link rel="canonical" href="${SITE_URL}${pagePath}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Priti Interior">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${meta.description}">
  <meta property="og:url" content="${SITE_URL}${pagePath}">
  <meta property="og:image" content="https://images.unsplash.com/photo-1656345129661-53a0177189ce?auto=format&fit=crop&w=1200&h=630&q=70">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://images.unsplash.com">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/styles.css?v=${ASSET_VERSION}">${meta.schema ? `\n  <script type="application/ld+json">${JSON.stringify(meta.schema)}</script>` : ''}
</head>
<body data-page="${meta.nav || ''}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="backdrop" aria-hidden="true">
    <div class="backdrop__photo"></div>
    <div class="backdrop__dim"></div>
    <div class="backdrop__lattice"></div>
    <canvas class="backdrop__sparkles"></canvas>
  </div>
${header(meta.nav)}

  <main id="main">
${body.trim()}
  </main>
${footer()}
${cookieBanner}
  <div class="toast glass" id="toast" role="status" aria-live="polite"></div>

  <script src="/assets/js/catalog.js?v=${ASSET_VERSION}"></script>
  <script src="/assets/js/main.js?v=${ASSET_VERSION}"></script>
</body>
</html>
`;
}

const localBusiness = {
  '@context': 'https://schema.org',
  '@type': 'InteriorDesigner',
  name: 'Priti Interior LLC',
  url: SITE_URL,
  email: 'contact@priti-interior.com',
  telephone: '+1-702-744-7873',
  image: 'https://images.unsplash.com/photo-1656345129661-53a0177189ce?auto=format&fit=crop&w=1200&q=70',
  priceRange: '$$$',
  address: { '@type': 'PostalAddress', addressLocality: 'Las Vegas', addressRegion: 'NV', addressCountry: 'US' },
  areaServed: ['Las Vegas', 'Henderson', 'Summerlin', 'North Las Vegas']
};

function build() {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.html'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
    const match = raw.match(/^<!--meta\s+([\s\S]*?)-->/);
    if (!match) throw new Error(`${file}: missing <!--meta {...} --> header`);
    const meta = JSON.parse(match[1]);
    if (meta.nav === 'home') meta.schema = localBusiness;
    const body = raw.slice(match[0].length);
    fs.writeFileSync(path.join(OUT, file), layout(meta, body, file));
    console.log('built', file);
  }
}

build();
