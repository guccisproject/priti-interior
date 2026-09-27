/* Priti Interior LLC — site behaviour: navigation, sparkles, cart, checkout, contact, cookies. */
(function () {
  'use strict';

  var Catalog = window.PritiCatalog;
  var CONTACT_EMAIL = 'contact@priti-interior.com';
  var doc = document;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  doc.documentElement.classList.remove('no-js');

  /* ---------------------------------------------------------------- storage */

  function storageGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var money = Catalog.formatPrice;

  /* ---------------------------------------------------------------- navigation */

  function initNav() {
    var toggle = doc.querySelector('.nav__toggle');
    var links = doc.getElementById('nav-links');
    if (!toggle || !links) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      links.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    doc.addEventListener('click', function (e) {
      if (!links.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------- sparkles */

  // A handful of tiny four-point glints that slowly twinkle in the fixed background.
  function initSparkles() {
    var canvas = doc.querySelector('.backdrop__sparkles');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var sparkles = [];
    var w = 0;
    var h = 0;

    function makeSparkle() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: 2.5 + Math.random() * 5.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.55,
        peak: 0.25 + Math.random() * 0.55
      };
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(34, Math.max(14, (w * h) / 42000)));
      sparkles = [];
      for (var i = 0; i < count; i++) sparkles.push(makeSparkle());
      if (reduceMotion) draw(0);
    }

    function drawSparkle(s, alpha) {
      var r = s.size;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = alpha;

      var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
      glow.addColorStop(0, 'rgba(255,255,255,0.35)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.6);
      ctx.quadraticCurveTo(r * 0.14, -r * 0.14, r * 1.6, 0);
      ctx.quadraticCurveTo(r * 0.14, r * 0.14, 0, r * 1.6);
      ctx.quadraticCurveTo(-r * 0.14, r * 0.14, -r * 1.6, 0);
      ctx.quadraticCurveTo(-r * 0.14, -r * 0.14, 0, -r * 1.6);
      ctx.fill();
      ctx.restore();
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < sparkles.length; i++) {
        var s = sparkles[i];
        var wave = reduceMotion ? 0.5 : (Math.sin(t / 1000 * s.speed + s.phase) + 1) / 2;
        var alpha = Math.pow(wave, 3) * s.peak;
        if (alpha > 0.01) drawSparkle(s, alpha);
        if (!reduceMotion && wave < 0.003) {
          s.x = Math.random() * w;
          s.y = Math.random() * h;
        }
      }
    }

    var last = 0;
    function loop(t) {
      if (t - last > 33) { draw(t); last = t; }
      window.requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) window.requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------- reveal */

  function initReveal() {
    var items = doc.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------- toast */

  var toastTimer;
  function toast(message, withCartLink) {
    var el = doc.getElementById('toast');
    if (!el) return;
    el.innerHTML = '<span>' + escapeHtml(message) + '</span>' +
      (withCartLink ? '<a href="cart.html">View cart</a>' : '');
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 3600);
  }

  /* ---------------------------------------------------------------- cart */

  var CART_KEY = 'priti_cart_v1';

  var Cart = {
    lines: function () {
      var lines = storageGet(CART_KEY, []);
      return Array.isArray(lines) ? lines.filter(function (l) { return Catalog.byId[l.id]; }) : [];
    },
    save: function (lines) {
      storageSet(CART_KEY, lines);
      updateCartCount();
    },
    add: function (id, qty) {
      if (!Catalog.byId[id]) return;
      var lines = Cart.lines();
      var line = lines.find(function (l) { return l.id === id; });
      if (line) line.qty = Math.min(20, line.qty + (qty || 1));
      else lines.push({ id: id, qty: qty || 1 });
      Cart.save(lines);
    },
    setQty: function (id, qty) {
      var lines = Cart.lines()
        .map(function (l) { return l.id === id ? { id: l.id, qty: Math.max(0, Math.min(20, qty)) } : l; })
        .filter(function (l) { return l.qty > 0; });
      Cart.save(lines);
    },
    remove: function (id) {
      Cart.save(Cart.lines().filter(function (l) { return l.id !== id; }));
    },
    clear: function () {
      storageRemove(CART_KEY);
      updateCartCount();
    },
    count: function () {
      return Cart.lines().reduce(function (sum, l) { return sum + l.qty; }, 0);
    }
  };

  function updateCartCount() {
    var count = Cart.count();
    doc.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = count;
      el.setAttribute('data-count', count);
    });
    doc.querySelectorAll('.cart-link').forEach(function (el) {
      el.setAttribute('aria-label', 'Cart, ' + count + (count === 1 ? ' item' : ' items'));
    });
  }

  function initAddButtons() {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add-to-cart]');
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute('data-add-to-cart');
      var item = Catalog.byId[id];
      if (!item) return;
      Cart.add(id, 1);
      toast(item.name + ' added to your cart.', true);
      if (btn.hasAttribute('data-go-to-cart')) window.location.href = 'cart.html';
    });
  }

  /* ---------------------------------------------------------------- services page rendering */

  function renderCollections() {
    doc.querySelectorAll('[data-collections]').forEach(renderCollectionGrid);
  }

  function renderCollectionGrid(mount) {
    var filter = mount.getAttribute('data-filter');
    var list = Catalog.collections.filter(function (c) {
      if (filter === 'residential') return c.id.indexOf('commercial') === -1;
      if (filter === 'commercial') return c.id.indexOf('commercial') !== -1;
      return true;
    });
    var limit = Number(mount.getAttribute('data-limit'));
    if (limit) list = list.slice(0, limit);
    mount.innerHTML = list.map(function (c) {
      return '' +
        '<article class="glass card collection reveal" id="' + c.id + '">' +
          (c.featured ? '<span class="badge">Most requested</span>' : '') +
          '<div class="frame"><img src="' + c.image + '" alt="" loading="lazy" width="900" height="560"></div>' +
          '<div class="collection__body">' +
            '<div class="collection__tag">' + escapeHtml(c.tagline) + '</div>' +
            '<h3>' + escapeHtml(c.name) + '</h3>' +
            '<div class="collection__price">' + money(c.price) + '<small>' + escapeHtml(c.unit) + '</small></div>' +
            (c.value ? '<div class="collection__value">' + escapeHtml(c.value) + '</div>' : '') +
            '<p>' + escapeHtml(c.summary) + '</p>' +
            '<ul class="check-list">' + c.includes.map(function (i) { return '<li>' + escapeHtml(i) + '</li>'; }).join('') + '</ul>' +
            '<div class="collection__actions">' +
              '<button class="btn" type="button" data-add-to-cart="' + c.id + '">Add to cart</button>' +
              '<a class="btn btn--ghost" href="contact.html?interest=' + encodeURIComponent(c.name) + '">Ask a question</a>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  function renderServiceMenu() {
    var mount = doc.getElementById('service-menu');
    if (!mount) return;
    var groups = {};
    var order = [];
    Catalog.services.forEach(function (s) {
      if (!groups[s.category]) { groups[s.category] = []; order.push(s.category); }
      groups[s.category].push(s);
    });
    mount.innerHTML = order.map(function (cat) {
      return '<div class="menu-group"><h3>' + escapeHtml(cat) + '</h3>' +
        groups[cat].map(function (s) {
          return '' +
            '<div class="menu-row" id="' + s.id + '">' +
              '<div><h4>' + escapeHtml(s.name) + '</h4><p>' + escapeHtml(s.summary) + '</p></div>' +
              '<div class="menu-row__price">' + money(s.price) + '<small>' + escapeHtml(s.unit) + '</small></div>' +
              '<div><button class="btn btn--ghost btn--sm" type="button" data-add-to-cart="' + s.id + '">Add</button></div>' +
            '</div>';
        }).join('') + '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------- cart page */

  function renderCart() {
    var mount = doc.getElementById('cart-root');
    if (!mount) return;

    var lines = Cart.lines();
    if (!lines.length) {
      mount.innerHTML = '' +
        '<div class="glass panel empty-state">' +
          diamondIcon() +
          '<h2>Your cart is empty</h2>' +
          '<p class="muted">Browse our design collections and individual services to begin.</p>' +
          '<div class="btn-row" style="justify-content:center"><a class="btn" href="services.html">View services</a>' +
          '<a class="btn btn--ghost" href="contact.html">Book a consultation</a></div>' +
        '</div>';
      return;
    }

    var priced = Catalog.priceCart(lines, 'full');
    mount.innerHTML = '' +
      '<div class="cart-layout">' +
        '<section class="glass panel--sm panel" aria-labelledby="cart-items-title">' +
          '<h2 id="cart-items-title" class="visually-hidden">Items</h2>' +
          priced.items.map(function (i) {
            return '' +
              '<div class="cart-line" data-id="' + i.id + '">' +
                '<div><h4>' + escapeHtml(i.name) + '</h4>' +
                  '<div class="muted">' + money(i.price) + ' · ' + escapeHtml(i.unit) + '</div>' +
                  '<button class="remove-btn" type="button" data-remove="' + i.id + '">Remove</button></div>' +
                '<div class="qty" role="group" aria-label="Quantity for ' + escapeHtml(i.name) + '">' +
                  '<button type="button" data-qty="-1" data-id="' + i.id + '" aria-label="Decrease quantity">−</button>' +
                  '<output aria-live="polite">' + i.qty + '</output>' +
                  '<button type="button" data-qty="1" data-id="' + i.id + '" aria-label="Increase quantity">+</button>' +
                '</div>' +
                '<div class="cart-line__total">' + money(i.total) + '</div>' +
              '</div>';
          }).join('') +
        '</section>' +
        '<aside class="glass panel--sm panel" aria-labelledby="summary-title">' +
          '<h3 id="summary-title">Summary</h3>' +
          '<div class="summary-row"><span>Subtotal</span><strong>' + money(priced.subtotal) + '</strong></div>' +
          '<div class="summary-row"><span>Sales tax</span><strong>$0</strong></div>' +
          '<div class="summary-row--total summary-row"><span>Total</span><strong>' + money(priced.subtotal) + '</strong></div>' +
          '<p class="muted mt-1" style="font-size:14px">Design services are billed as listed. Furnishings and materials are quoted and invoiced separately.' +
            (priced.retainerAllowed ? ' Orders of ' + money(Catalog.RETAINER_MIN) + ' or more can reserve with a 50% retainer at checkout.' : '') + '</p>' +
          '<a class="btn btn--block mt-2" href="checkout.html">Proceed to checkout</a>' +
          '<a class="btn btn--ghost btn--block mt-1" href="services.html">Continue browsing</a>' +
          secureNote() +
        '</aside>' +
      '</div>';
  }

  function initCartPage() {
    var mount = doc.getElementById('cart-root');
    if (!mount) return;
    renderCart();
    mount.addEventListener('click', function (e) {
      var qtyBtn = e.target.closest('[data-qty]');
      var removeBtn = e.target.closest('[data-remove]');
      if (qtyBtn) {
        var id = qtyBtn.getAttribute('data-id');
        var line = Cart.lines().find(function (l) { return l.id === id; });
        if (line) Cart.setQty(id, line.qty + Number(qtyBtn.getAttribute('data-qty')));
        renderCart();
      } else if (removeBtn) {
        Cart.remove(removeBtn.getAttribute('data-remove'));
        renderCart();
      }
    });
  }

  function diamondIcon() {
    return '<svg class="icon-diamond" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="0.9" aria-hidden="true">' +
      '<path d="M10 6h20l7 9-17 20L3 15z"/><path d="M3 15h34M14 6l-4 9 10 20 10-20-4-9M10 15l10-9 10 9"/></svg>';
  }

  function secureNote() {
    return '<div class="secure-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">' +
      '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' +
      'Payments are processed securely by Stripe.</div>';
  }

  /* ---------------------------------------------------------------- checkout page */

  function initCheckout() {
    var form = doc.getElementById('checkout-form');
    var summary = doc.getElementById('checkout-summary');
    if (!form || !summary) return;

    var lines = Cart.lines();
    if (!lines.length) {
      var root = doc.getElementById('checkout-root');
      root.className = '';
      root.innerHTML = '' +
        '<div class="glass panel empty-state">' + diamondIcon() +
        '<h2>There is nothing to check out yet</h2>' +
        '<p class="muted">Add a collection or service to your cart first.</p>' +
        '<div class="btn-row" style="justify-content:center"><a class="btn" href="services.html">View services</a></div></div>';
      return;
    }

    var planInputs = form.querySelectorAll('input[name="plan"]');

    function currentPlan() {
      var checked = form.querySelector('input[name="plan"]:checked');
      return checked ? checked.value : 'full';
    }

    function renderSummary() {
      var priced = Catalog.priceCart(Cart.lines(), currentPlan());
      var retainerLabel = form.querySelector('label[data-plan="retainer"]');
      if (retainerLabel) {
        retainerLabel.classList.toggle('is-disabled', !priced.retainerAllowed);
        retainerLabel.querySelector('input').disabled = !priced.retainerAllowed;
        if (!priced.retainerAllowed) form.querySelector('input[value="full"]').checked = true;
      }
      summary.innerHTML = '' +
        '<h3>Your order</h3>' +
        priced.items.map(function (i) {
          return '<div class="summary-row"><span>' + escapeHtml(i.name) + (i.qty > 1 ? ' × ' + i.qty : '') + '</span><strong>' + money(i.total) + '</strong></div>';
        }).join('') +
        '<div class="summary-row" style="border-top:1px solid var(--line);margin-top:8px;padding-top:14px"><span>Subtotal</span><strong>' + money(priced.subtotal) + '</strong></div>' +
        (priced.plan === 'retainer'
          ? '<div class="summary-row"><span>Balance due at design presentation</span><strong>' + money(priced.balance) + '</strong></div>'
          : '') +
        '<div class="summary-row summary-row--total"><span>Due today</span><strong>' + money(priced.dueToday) + '</strong></div>' +
        '<p class="mt-1"><a class="text-link" href="cart.html">Edit cart</a></p>';
    }

    planInputs.forEach(function (input) { input.addEventListener('change', renderSummary); });
    renderSummary();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm(form)) return;

      var status = doc.getElementById('checkout-status');
      var submit = form.querySelector('button[type="submit"]');
      var data = formToObject(form);
      var payload = {
        items: Cart.lines(),
        plan: currentPlan(),
        customer: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company || '',
          address: data.address,
          city: data.city,
          zip: data.zip,
          projectType: data.projectType,
          timeline: data.timeline,
          notes: data.notes || ''
        },
        website: data.website || ''
      };

      submit.disabled = true;
      submit.textContent = 'Preparing secure checkout…';
      status.innerHTML = '';

      postJSON('api/checkout', payload)
        .then(function (res) {
          if (res.url) {
            storageSet('priti_pending_order', { at: Date.now() });
            window.location.href = res.url;
            return;
          }
          if (res.orderId) {
            storageSet('priti_last_order', { id: res.orderId, mode: res.mode, email: payload.customer.email });
            Cart.clear();
            window.location.href = 'order-confirmation.html?order=' + encodeURIComponent(res.orderId);
            return;
          }
          throw new Error(res.error || 'Unexpected response');
        })
        .catch(function (err) {
          submit.disabled = false;
          submit.textContent = 'Continue to secure payment';
          if (err && err.offline) {
            offlineOrderFallback(payload, status);
          } else {
            status.innerHTML = '<div class="notice notice--error">' + escapeHtml((err && err.message) || 'Something went wrong.') +
              ' Please try again, or call <a class="text-link" href="tel:+17027447873">702-744-7873</a>.</div>';
          }
        });
    });
  }

  // When the site is hosted without the checkout server, offer to send the order by email.
  function offlineOrderFallback(payload, status) {
    var priced = Catalog.priceCart(payload.items, payload.plan);
    var c = payload.customer;
    var body = [
      'Hello Priti Interior,',
      '',
      'I would like to book the following:',
      ''
    ].concat(priced.items.map(function (i) { return '- ' + i.name + ' x' + i.qty + ': ' + money(i.total); }))
      .concat([
        '',
        'Subtotal: ' + money(priced.subtotal),
        'Payment preference: ' + (priced.plan === 'retainer' ? '50% retainer' : 'Pay in full'),
        '',
        'Name: ' + c.name,
        'Email: ' + c.email,
        'Phone: ' + c.phone,
        c.company ? 'Company: ' + c.company : '',
        'Project address: ' + c.address + ', ' + c.city + ' ' + c.zip,
        'Project type: ' + c.projectType,
        'Timeline: ' + c.timeline,
        c.notes ? 'Notes: ' + c.notes : '',
        '',
        'Please send me a secure invoice.'
      ]).filter(function (l) { return l !== ''; }).join('\n');

    var href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Booking request — ' + c.name) + '&body=' + encodeURIComponent(body);
    status.innerHTML = '<div class="notice">Almost done. Send your booking to our studio and we will reply within one business day ' +
      'with a secure payment link and available appointment times.' +
      '<div class="btn-row" style="margin-top:14px"><a class="btn btn--sm" href="' + href + '">Send my booking</a>' +
      '<a class="btn btn--ghost btn--sm" href="tel:+17027447873">Call 702-744-7873</a></div></div>';
  }

  /* ---------------------------------------------------------------- confirmation page */

  function initConfirmation() {
    var mount = doc.getElementById('confirmation-root');
    if (!mount) return;
    var params = new URLSearchParams(window.location.search);
    var sessionId = params.get('session_id');
    var orderId = params.get('order');

    function show(title, lead, ref) {
      mount.querySelector('[data-title]').textContent = title;
      mount.querySelector('[data-lead]').textContent = lead;
      var refEl = mount.querySelector('[data-ref]');
      if (ref) { refEl.hidden = false; refEl.querySelector('strong').textContent = ref; }
    }

    if (sessionId) {
      Cart.clear();
      storageRemove('priti_pending_order');
      fetch('api/order-status?session_id=' + encodeURIComponent(sessionId))
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.paid) {
            show('Thank you. Your booking is confirmed.',
              'Your payment of ' + money(res.amount) + ' was received. A receipt is on its way to ' + (res.email || 'your inbox') +
              ', and our studio will contact you within one business day to schedule your first appointment.',
              res.orderId);
          } else {
            show('Your payment is processing.', 'We will email you as soon as it clears. If you have questions, call 702-744-7873.', res.orderId);
          }
        })
        .catch(function () {
          show('Thank you for your booking.', 'Your receipt will arrive by email shortly, and our studio will be in touch within one business day.');
        });
    } else if (orderId) {
      show('Thank you. Your request is in.',
        'We have received your booking request. Within one business day our studio will reply with a secure payment link and available appointment times.',
        orderId);
    }
  }

  /* ---------------------------------------------------------------- contact page */

  function initContact() {
    var form = doc.getElementById('contact-form');
    if (!form) return;
    var params = new URLSearchParams(window.location.search);
    var interest = params.get('interest');
    if (interest) {
      var select = form.querySelector('[name="interest"]');
      var match = Array.prototype.find.call(select.options, function (o) { return o.value === interest; });
      if (match) select.value = interest;
      else {
        var msg = form.querySelector('[name="message"]');
        if (!msg.value) msg.value = 'I am interested in ' + interest + '. ';
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm(form)) return;
      var status = doc.getElementById('contact-status');
      var submit = form.querySelector('button[type="submit"]');
      var data = formToObject(form);
      submit.disabled = true;
      submit.textContent = 'Sending…';

      postJSON('api/contact', data)
        .then(function () {
          form.reset();
          status.innerHTML = '<div class="notice notice--success">Thank you, ' + escapeHtml(data.name.split(' ')[0]) +
            '. Your message has been received and we will reply within one business day.</div>';
        })
        .catch(function (err) {
          if (err && err.offline) {
            var body = 'Name: ' + data.name + '\nEmail: ' + data.email + '\nPhone: ' + (data.phone || '') +
              '\nInterest: ' + data.interest + '\nBudget: ' + (data.budget || '') + '\n\n' + data.message;
            var href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Inquiry from ' + data.name) + '&body=' + encodeURIComponent(body);
            status.innerHTML = '<div class="notice">One last step: <a class="text-link" href="' + href +
              '">tap here to send your message</a>. It opens your email app with everything filled in, and we will reply within one business day.</div>';
          } else {
            status.innerHTML = '<div class="notice notice--error">' + escapeHtml((err && err.message) || 'Something went wrong.') + '</div>';
          }
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = 'Send message';
        });
    });
  }

  /* ---------------------------------------------------------------- forms */

  function formToObject(form) {
    var out = {};
    new FormData(form).forEach(function (value, key) { out[key] = typeof value === 'string' ? value.trim() : value; });
    return out;
  }

  function validateForm(form) {
    var firstBad = null;
    form.querySelectorAll('.field').forEach(function (field) {
      var input = field.querySelector('input, select, textarea');
      var err = field.querySelector('.error');
      if (!input) return;
      var ok = input.checkValidity();
      field.classList.toggle('has-error', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (err) err.textContent = ok ? '' : (input.getAttribute('data-error') || input.validationMessage);
      if (!ok && !firstBad) firstBad = input;
    });
    form.querySelectorAll('.checkbox input[required]').forEach(function (box) {
      var err = form.querySelector('[data-error-for="' + box.id + '"]');
      if (!box.checked) {
        if (err) err.textContent = box.getAttribute('data-error') || 'Required';
        if (!firstBad) firstBad = box;
      } else if (err) err.textContent = '';
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      // 404/405 means the site is being served without the API (static hosting).
      if (res.status === 404 || res.status === 405 || res.status === 501) {
        var off = new Error('API unavailable');
        off.offline = true;
        throw off;
      }
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) throw new Error(json.error || 'Request failed (' + res.status + ')');
        return json;
      });
    }, function () {
      var off = new Error('Network error');
      off.offline = true;
      throw off;
    });
  }

  /* ---------------------------------------------------------------- cookie consent */

  var CONSENT_KEY = 'priti_cookie_consent_v1';
  var CONSENT_VERSION = 1;

  var Consent = {
    get: function () {
      var c = storageGet(CONSENT_KEY, null);
      return c && c.version === CONSENT_VERSION ? c : null;
    },
    set: function (prefs) {
      var record = {
        version: CONSENT_VERSION,
        necessary: true,
        preferences: !!prefs.preferences,
        analytics: !!prefs.analytics,
        marketing: !!prefs.marketing,
        updatedAt: new Date().toISOString()
      };
      storageSet(CONSENT_KEY, record);
      var maxAge = 60 * 60 * 24 * 180;
      doc.cookie = 'priti_consent=' + ['p' + +record.preferences, 'a' + +record.analytics, 'm' + +record.marketing].join('.') +
        '; Max-Age=' + maxAge + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
      doc.dispatchEvent(new CustomEvent('priti:consent', { detail: record }));
      return record;
    }
  };

  window.PritiConsent = {
    get: Consent.get,
    open: function () { openBanner(true); }
  };

  function openBanner(showPrefs) {
    var banner = doc.getElementById('cookie-banner');
    if (!banner) return;
    var current = Consent.get() || {};
    banner.querySelectorAll('[data-consent]').forEach(function (input) {
      input.checked = !!current[input.getAttribute('data-consent')];
    });
    banner.querySelector('.cookie-prefs').classList.toggle('is-open', !!showPrefs);
    banner.querySelector('[data-cookie="save"]').hidden = !showPrefs;
    banner.querySelector('[data-cookie="customize"]').hidden = !!showPrefs;
    banner.hidden = false;
    requestAnimationFrame(function () { banner.classList.add('is-visible'); });
  }

  function closeBanner() {
    var banner = doc.getElementById('cookie-banner');
    if (!banner) return;
    banner.classList.remove('is-visible');
    setTimeout(function () { banner.hidden = true; }, 450);
  }

  function initCookies() {
    var banner = doc.getElementById('cookie-banner');
    if (!banner) return;

    banner.addEventListener('click', function (e) {
      var action = e.target.closest('[data-cookie]');
      if (!action) return;
      var kind = action.getAttribute('data-cookie');
      if (kind === 'accept') { Consent.set({ preferences: true, analytics: true, marketing: true }); closeBanner(); }
      else if (kind === 'reject') { Consent.set({}); closeBanner(); }
      else if (kind === 'customize') { openBanner(true); }
      else if (kind === 'save') {
        var prefs = {};
        banner.querySelectorAll('[data-consent]').forEach(function (input) { prefs[input.getAttribute('data-consent')] = input.checked; });
        Consent.set(prefs);
        closeBanner();
      }
    });

    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-open-cookie-settings]')) {
        e.preventDefault();
        openBanner(true);
      }
    });

    if (!Consent.get()) setTimeout(function () { openBanner(false); }, 700);
  }

  /* ---------------------------------------------------------------- boot */

  function boot() {
    initNav();
    initSparkles();
    renderCollections();
    renderServiceMenu();
    initReveal();
    initAddButtons();
    updateCartCount();
    initCartPage();
    initCheckout();
    initConfirmation();
    initContact();
    initCookies();

    // Keep the cart badge in sync across tabs.
    window.addEventListener('storage', function (e) {
      if (e.key === CART_KEY) { updateCartCount(); renderCart(); }
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
