/*
 * Priti Interior — service & collection catalog.
 * Shared by the browser (window.PritiCatalog) and the Node server (require),
 * so prices are always computed from this single source of truth.
 * Prices are in US cents.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PritiCatalog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var IMG = 'https://images.unsplash.com/';
  var Q = '?auto=format&fit=crop&w=900&q=70';

  var collections = [
    {
      id: 'col-refresh',
      type: 'collection',
      name: 'The Refresh',
      tagline: 'One room, thoughtfully reset',
      price: 165000,
      unit: 'per room',
      image: IMG + 'photo-1714924674541-9e11b2d1dd1d' + Q,
      summary: 'For a single room that needs clarity, not construction. We edit what you have, fill the gaps and style it to finish.',
      includes: [
        '90-minute in-home design consultation',
        'Room-specific color palette with sample swatches',
        'Furniture layout plan (scaled)',
        'Curated, shoppable selection list',
        'One half-day styling session'
      ],
      value: 'Over $2,200 in individual services'
    },
    {
      id: 'col-signature',
      type: 'collection',
      name: 'The Signature Room',
      tagline: 'Complete design for a single space',
      price: 395000,
      unit: 'per room',
      featured: true,
      image: IMG + 'photo-1696762932825-2737db830bbe' + Q,
      summary: 'Our most requested collection. One room, fully resolved, from furniture plan to the final placed object.',
      includes: [
        'Design consultation and lifestyle brief',
        'Space planning with two layout options',
        'Furniture, fabric, lighting and décor selections',
        'Concept board and photorealistic 3D rendering',
        'Procurement coordination with to-the-trade sourcing',
        'Two styling visits and a full installation day'
      ],
      value: 'Over $4,700 in individual services'
    },
    {
      id: 'col-residence',
      type: 'collection',
      name: 'The Residence',
      tagline: 'Up to three connected spaces',
      price: 950000,
      unit: 'per project',
      image: IMG + 'photo-1648881806148-e5c51179c826' + Q,
      summary: 'Living, dining and a primary suite, or any three spaces, designed together so the whole house feels considered.',
      includes: [
        'Everything in The Signature Room, for three spaces',
        'Whole-home color and material story',
        'Decorative lighting and window treatment plan',
        'Four styling and progress visits',
        'Dedicated procurement tracking portal',
        'Two installation and styling days'
      ],
      value: 'Over $11,000 in individual services'
    },
    {
      id: 'col-estate',
      type: 'collection',
      name: 'The Estate',
      tagline: 'Whole-home design, up to six spaces',
      price: 1750000,
      unit: 'per project',
      image: IMG + 'photo-1455593984172-9f753a2e1ebd' + Q,
      summary: 'For new homes, full moves and complete refurnishing. One studio overseeing every room, piece and delivery.',
      includes: [
        'Everything in The Residence, for up to six spaces',
        'Custom furniture, upholstery and bedding design',
        'Art and accessory curation',
        'Move-in planning and furniture placement map',
        'Bi-weekly delivery and progress management for up to 12 weeks',
        'White-glove final installation and reveal'
      ],
      value: 'Over $23,000 in individual services'
    },
    {
      id: 'col-studio-commercial',
      type: 'collection',
      name: 'Commercial Studio',
      tagline: 'Boutique spaces up to 1,500 sq ft',
      price: 650000,
      unit: 'per project',
      image: IMG + 'photo-1600162461364-053367f48809' + Q,
      summary: 'Salons, boutiques, private offices and lounges furnished and styled to feel like your brand from the moment the door opens.',
      includes: [
        'On-site brand and operations assessment',
        'Furniture plan that works around guest and staff flow',
        'Furniture, décor, textile and art direction',
        'Concept board and 3D rendering',
        'Procurement coordination for furniture and décor',
        'Three styling visits and an installation day'
      ]
    },
    {
      id: 'col-commercial-suite',
      type: 'collection',
      name: 'Commercial Suite',
      tagline: 'Hospitality and office up to 4,000 sq ft',
      price: 1450000,
      unit: 'per project',
      image: IMG + 'photo-1758448721149-aa0ce8e1b2c9' + Q,
      summary: 'Lobbies, restaurants, clinics and executive suites, furnished and styled from the first layout through opening day.',
      includes: [
        'Everything in Commercial Studio',
        'Multi-zone furniture and seating plans',
        'Durable commercial-grade furnishings and textiles',
        'Art program and brand-led décor',
        'Bi-weekly delivery and installation management',
        'Opening-day installation and styling'
      ]
    }
  ];

  var services = [
    {
      id: 'svc-consult',
      type: 'service',
      category: 'Consulting',
      name: 'In-Home Design Consultation',
      price: 22500,
      unit: '90 minutes',
      summary: 'A walkthrough of your space with direction on layout, color, furnishings and next steps. Notes delivered within 48 hours.'
    },
    {
      id: 'svc-virtual',
      type: 'service',
      category: 'Consulting',
      name: 'Virtual Design Consultation',
      price: 15000,
      unit: '60 minutes',
      summary: 'A video session for quick decisions, second opinions or out-of-town clients. Send photos ahead and we arrive prepared.'
    },
    {
      id: 'svc-commercial-consult',
      type: 'service',
      category: 'Consulting',
      name: 'Commercial Space Assessment',
      price: 49500,
      unit: '2 hours on-site',
      summary: 'Brand, flow and experience review for an existing or planned commercial space, with a written priority plan.'
    },
    {
      id: 'svc-palette',
      type: 'service',
      category: 'Design',
      name: 'Whole-Home Color Palette',
      price: 39500,
      unit: 'up to 8 spaces',
      summary: 'A cohesive paint and tonal palette that carries room to room, with sheen guidance and large-format samples for your painter.'
    },
    {
      id: 'svc-space-plan',
      type: 'service',
      category: 'Design',
      name: 'Space Planning & Layout',
      price: 65000,
      unit: 'per room',
      summary: 'Measured, scaled furniture plan with two layout options designed around circulation, light and how you live. No walls move.'
    },
    {
      id: 'svc-finishes',
      type: 'service',
      category: 'Design',
      name: 'Furnishings & Material Selections',
      price: 89500,
      unit: 'per room',
      summary: 'Furniture, upholstery fabrics, rugs, window treatments, decorative lighting and accessories, specified and scheduled.'
    },
    {
      id: 'svc-edesign',
      type: 'service',
      category: 'Design',
      name: 'E-Design',
      price: 59500,
      unit: 'per room',
      summary: 'A fully remote design: concept board, layout and a shoppable list you can source at your own pace.'
    },
    {
      id: 'svc-render',
      type: 'service',
      category: 'Design',
      name: 'Photorealistic 3D Rendering',
      price: 45000,
      unit: 'per view',
      summary: 'See the finished room before anything is ordered. Includes one round of revisions.'
    },
    {
      id: 'svc-styling',
      type: 'service',
      category: 'Styling',
      name: 'Decorative Styling',
      price: 75000,
      unit: 'per room, half day',
      summary: 'Art placement, shelving, bedding and accessories styled so the room looks finished and photographs well.'
    },
    {
      id: 'svc-procurement',
      type: 'service',
      category: 'Project Management',
      name: 'Procurement Coordination',
      price: 125000,
      unit: 'up to 40 line items',
      summary: 'Ordering, tracking, receiving and inspecting furnishings and décor, with access to trade pricing where available.'
    },
    {
      id: 'svc-site-visit',
      type: 'service',
      category: 'Project Management',
      name: 'Styling Check-In Visit',
      price: 27500,
      unit: 'per visit',
      summary: 'An on-site visit to review deliveries, placement and details, with a written list of next steps afterward.'
    },
    {
      id: 'svc-oversight',
      type: 'service',
      category: 'Project Management',
      name: 'Delivery & Installation Management',
      price: 185000,
      unit: 'per month',
      summary: 'Weekly check-ins, vendor and white-glove delivery scheduling, and on-site placement while your furnishings arrive.'
    },
    {
      id: 'svc-hours',
      type: 'service',
      category: 'Flexible',
      name: 'Design Hours',
      price: 77500,
      unit: 'block of 5 hours',
      summary: 'Flexible time for smaller requests, sourcing help or ongoing guidance. Unused hours stay valid for 6 months.'
    }
  ];

  var all = collections.concat(services);
  var byId = {};
  all.forEach(function (item) { byId[item.id] = item; });

  var RETAINER_MIN = 250000; // 50% retainer option available at $2,500+

  function formatPrice(cents) {
    var dollars = cents / 100;
    return '$' + dollars.toLocaleString('en-US', {
      minimumFractionDigits: dollars % 1 ? 2 : 0,
      maximumFractionDigits: 2
    });
  }

  /*
   * Recalculate a cart from item ids and quantities only. Never trust client prices.
   * lines: [{ id, qty }], plan: 'full' | 'retainer'
   */
  function priceCart(lines, plan) {
    var items = [];
    (lines || []).forEach(function (line) {
      var item = byId[line && line.id];
      var qty = Math.floor(Number(line && line.qty));
      if (!item || !(qty > 0)) return;
      qty = Math.min(qty, 20);
      items.push({ id: item.id, name: item.name, unit: item.unit, price: item.price, qty: qty, total: item.price * qty });
    });
    var subtotal = items.reduce(function (sum, i) { return sum + i.total; }, 0);
    var retainerAllowed = subtotal >= RETAINER_MIN;
    var effectivePlan = plan === 'retainer' && retainerAllowed ? 'retainer' : 'full';
    var dueToday = effectivePlan === 'retainer' ? Math.round(subtotal / 2) : subtotal;
    return {
      items: items,
      subtotal: subtotal,
      plan: effectivePlan,
      retainerAllowed: retainerAllowed,
      dueToday: dueToday,
      balance: subtotal - dueToday
    };
  }

  return {
    collections: collections,
    services: services,
    all: all,
    byId: byId,
    RETAINER_MIN: RETAINER_MIN,
    formatPrice: formatPrice,
    priceCart: priceCart
  };
});
