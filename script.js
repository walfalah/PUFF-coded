/* ==========================================================================
   Mykonos blue tumbler — page behaviour. Vanilla JS, no build step.

     01 helpers              05 count-up figures
     02 theme (light/dark)   06 FAQ accordion
     03 the 3D stages        07 finish + pack
     04 scroll camera move   08 sticky bar and cart

   Motion policy from the design system: one orchestrated moment (the model
   settling into the stage) plus state-change feedback. No scroll fade-ups.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 01 helpers ------------------------------------------------ */

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mv     = $('#mv');
  const mvDemo = $('#mv2');
  const hint   = $('#stage-hint');

  /* Camera views. The model is Y-up, in metres, origin at the underside of
     the base pad (see assets/model/validation.json). */
  const VIEW = {
    hero:    { orbit: '-28deg 78deg 0.70m', target: '0m 0.105m 0m', fov: '27deg' },
    straw:   { orbit: '18deg 52deg 0.42m',  target: '0m 0.150m 0m', fov: '26deg' },
    explode: { orbit: '18deg 70deg 0.85m',  target: '0m 0.160m 0m', fov: '30deg' }
  };

  const setView = (viewer, v) => {
    if (!viewer) return;
    viewer.cameraOrbit  = v.orbit;
    viewer.cameraTarget = v.target;
    viewer.fieldOfView  = v.fov;
  };

  /* ---------- 02 theme -------------------------------------------------- */

  /* The document may carry no data-theme at all, which means "follow the
     system" — the toggle reads the resolved mode, then pins the opposite. */
  const root = document.documentElement;
  const toggle = $('#theme-toggle');

  const resolvedTheme = () => {
    if (root.dataset.theme === 'dark' || root.dataset.theme === 'light') return root.dataset.theme;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const syncToggleLabel = () => {
    if (!toggle) return;
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' mode');
  };

  if (toggle) {
    syncToggleLabel();
    toggle.addEventListener('click', () => {
      const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (err) { /* private mode */ }
      syncToggleLabel();
    });
    // Follow the system while the reader has not pinned a mode.
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncToggleLabel);
  }

  /* ---------- 03 the 3D stages ------------------------------------------ */

  /* Two viewers share one GLB (the browser caches the fetch): the hero one
     sells, the demo one is what the demo controls actually drive. Lighting is
     identical in both modes and both stages — a colder environment in dark
     mode would shift the matte blue's hue between them. */
  const wireStage = (viewer, opts) => {
    if (!viewer) return () => {};
    const stage = viewer.closest('.stage');
    let resume = null;

    const pauseSpin = () => {
      viewer.removeAttribute('auto-rotate');
      clearTimeout(resume);
      if (!opts.spins || reduceMotion) return;
      // Hand control back only once the reader has stopped for a moment.
      resume = setTimeout(() => viewer.setAttribute('auto-rotate', ''), 3200);
    };

    viewer.addEventListener('load', () => {
      // The one orchestrated moment: settle in, then start turning.
      if (stage) stage.classList.add('is-settled');
      if (opts.spins && !reduceMotion) {
        viewer.setAttribute('rotation-per-second', '45deg');   // 8s per turn
        setTimeout(() => viewer.setAttribute('auto-rotate', ''), 520);
      }
      try {
        const names = viewer.availableAnimations || [];
        if (names.length) { viewer.animationName = names[0]; viewer.pause(); }
      } catch (err) { /* the exploded view is a nice-to-have, never fatal */ }
    });

    viewer.addEventListener('camera-change', (e) => {
      if (e.detail && e.detail.source === 'user-interaction') {
        pauseSpin();
        if (hint) hint.classList.add('is-hidden');
      }
    });

    viewer.addEventListener('error', () => {
      const caption = $('.stage__caption');
      if (caption) caption.textContent = 'The 3D model could not be loaded. Check assets/model/tumbler.glb.';
      if (stage) stage.classList.add('is-settled');
    });

    return pauseSpin;
  };

  const pauseHero = wireStage(mv, { spins: true });
  wireStage(mvDemo, { spins: false });

  // The hint has done its job after a few seconds either way.
  if (hint) setTimeout(() => hint.classList.add('is-hidden'), 7000);

  /* ---------- 03b hotspots -> callout ----------------------------------- */

  const panel    = $('#hotspot-panel');
  const hotspots = $$('.hotspot');
  const partRows = $$('#parts .parts__row');
  const PART_ROW = { lid: 'Lid', body: 'Body', base: 'Base pad' };

  const showHotspot = (btn) => {
    const slot = btn.getAttribute('slot') || '';
    // Both viewers carry the same three markers, so highlight them in step.
    hotspots.forEach((h) => h.classList.toggle('is-active', h.getAttribute('slot') === slot));

    if (panel) {
      panel.innerHTML = '<p class="label"></p><h3></h3><p class="note"></p>';
      $('.label', panel).textContent = btn.dataset.part || 'Detail';
      $('h3', panel).textContent     = btn.dataset.label || '';
      $('.note', panel).textContent  = btn.dataset.note || '';
    }

    const key = slot.replace('hotspot-', '');
    partRows.forEach((row) => {
      const dt = $('dt', row);
      row.classList.toggle('is-active', !!dt && dt.textContent.trim() === PART_ROW[key]);
    });
  };

  hotspots.forEach((btn) => {
    btn.addEventListener('click', () => {
      showHotspot(btn);
      if (mv && btn.closest('model-viewer') === mv) pauseHero();
    });
  });

  /* ---------- 04 scroll: one camera move -------------------------------- */

  /* Entering the demo section tilts the demo viewer onto the straw opening
     and stills the hero; scrolling back restores both, so the hero is never
     left showing a stray close-up. */
  const demo = $('#demo');
  if (demo && mv && 'IntersectionObserver' in window) {
    let inDemo = false;
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting === inDemo) return;
        inDemo = entry.isIntersecting;
        if (inDemo) {
          setView(mvDemo, VIEW.straw);
          mv.removeAttribute('auto-rotate');
        } else {
          setView(mv, VIEW.hero);
          if (!reduceMotion) mv.setAttribute('auto-rotate', '');
        }
      });
    }, { threshold: 0.35 }).observe(demo);
  }

  const explodeBtn = $('#btn-explode');
  if (explodeBtn && mvDemo) {
    explodeBtn.addEventListener('click', () => {
      if (!mvDemo.availableAnimations || !mvDemo.availableAnimations.length) {
        toast('This model has no exploded-view animation.');
        return;
      }
      setView(mvDemo, VIEW.explode);
      mvDemo.currentTime = 0;
      mvDemo.play({ repetitions: 1 });
      explodeBtn.textContent = 'Play it again';
    });
  }

  const resetBtn = $('#btn-reset');
  if (resetBtn && mvDemo) {
    resetBtn.addEventListener('click', () => {
      try { mvDemo.pause(); mvDemo.currentTime = 0; } catch (err) {}
      setView(mvDemo, VIEW.straw);
      hotspots.forEach((h) => h.classList.remove('is-active'));
      partRows.forEach((row) => row.classList.remove('is-active'));
      if (panel) panel.innerHTML = '<p class="callout__hint">Tap a marker on the model to read about that part.</p>';
    });
  }

  /* ---------- 05 count-up figures --------------------------------------- */

  const fmt = (n, decimals) =>
    decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-US');

  const countUp = (el) => {
    const target   = parseFloat(el.dataset.countup);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix   = el.dataset.suffix || '';
    if (!isFinite(target)) return;
    if (reduceMotion) { el.textContent = fmt(target, decimals) + suffix; return; }

    const dur = 1100;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* Scroll-position based rather than IntersectionObserver: a figure the page
     jumped past (anchor link, restored scroll) must still end up counted. */
  const watchers = [];
  let pending = false;

  const sweep = () => {
    pending = false;
    for (let i = watchers.length - 1; i >= 0; i--) {
      const w = watchers[i];
      if (w.el.getBoundingClientRect().top < innerHeight - 40) {
        watchers.splice(i, 1);
        w.fn(w.el);
      }
    }
  };
  const queueSweep = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(sweep);
  };

  addEventListener('scroll', queueSweep, { passive: true });
  addEventListener('resize', queueSweep);

  $$('[data-countup]').forEach((el) => watchers.push({ el: el, fn: countUp }));
  sweep();

  /* ---------- 06 FAQ accordion ------------------------------------------ */

  $$('.faq__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const answer = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') === 'true';

      // One at a time — this is a scan-and-close list, not a checklist.
      $$('.faq__q').forEach((other) => {
        if (other === btn) return;
        other.setAttribute('aria-expanded', 'false');
        const oa = document.getElementById(other.getAttribute('aria-controls'));
        if (oa) oa.hidden = true;
      });

      btn.setAttribute('aria-expanded', String(!open));
      if (answer) answer.hidden = open;
    });
  });

  /* ---------- 07 finish + pack -> price --------------------------------- */

  const state = { finish: 'Mykonos blue', pack: 'Single', price: 34, qty: 1 };

  const priceLabels  = $$('[data-price-label]');
  const variantLabel = $('[data-variant-label]');
  const heroCta      = $('[data-hero-cta]');

  const syncPrice = () => {
    priceLabels.forEach((el) => { el.textContent = '$' + state.price; });
    if (variantLabel) variantLabel.textContent = state.finish + ' · ' + state.pack;
    if (heroCta) heroCta.textContent = 'Add to cart, $' + state.price;
  };

  const pickRadio = (group, chosen) => {
    group.forEach((el) => {
      const on = el === chosen;
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-checked', String(on));
    });
  };

  const swatches = $$('.swatch');
  swatches.forEach((el) => {
    el.addEventListener('click', () => {
      pickRadio(swatches, el);
      state.finish = el.dataset.finish;
      syncPrice();
    });
  });

  const packs = $$('.pack');
  packs.forEach((el) => {
    el.addEventListener('click', () => {
      pickRadio(packs, el);
      state.pack  = $('.pack__name', el).textContent.trim();
      state.price = parseInt(el.dataset.price, 10);
      state.qty   = parseInt(el.dataset.qty, 10);
      syncPrice();
    });
  });

  syncPrice();

  /* ---------- 08 sticky bar and cart ----------------------------------- */

  const bar  = $('#cta-bar');
  const hero = $('.hero');
  if (bar && hero) {
    const setBar = (show) => {
      if (show) {
        bar.hidden = false;
        requestAnimationFrame(() => bar.classList.add('is-visible'));
      } else {
        bar.classList.remove('is-visible');
      }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => setBar(!entry.isIntersecting));
      }, { threshold: 0, rootMargin: '-120px 0px 0px 0px' }).observe(hero);
    } else {
      addEventListener('scroll', () => setBar(scrollY > 400), { passive: true });
    }
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { el.hidden = true; }, 260);
    }, 3200);
  }

  // TODO: replace with the real cart endpoint. Cart lives in memory only.
  const cart = { items: 0 };
  $$('[data-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cart.items += state.qty;
      const spare = cart.items === state.qty ? ' Spare straw added.' : '';
      toast('Added: ' + state.pack + ', ' + state.finish + ' — $' + state.price + '.' + spare);
    });
  });
})();
