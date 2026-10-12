/* ADMA — motion design (JavaScript natif, sans dépendance).
   Tout est désactivé si l'utilisateur demande moins d'animations. */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canIO = 'IntersectionObserver' in window;
  var raf = window.requestAnimationFrame.bind(window);

  /* 1. Révélations au défilement (le contenu reste visible sans JS) */
  var reveals = doc.querySelectorAll('.reveal');
  if (!canIO || reduce) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { rio.observe(el); });
  }

  /* 2. Manifeste : les mots s'allument au fil du défilement */
  var stm = doc.querySelector('[data-split]');
  if (stm) {
    var words = [];
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var s = doc.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { split(n); }
      });
    })(stm);
    var upd = function () {
      if (reduce) { words.forEach(function (w) { w.classList.add('on'); }); return; }
      var r = stm.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.max(0, Math.min(1, (vh * 0.82 - r.top) / (r.height + vh * 0.22)));
      var n = Math.round(p * words.length);
      words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    };
    window.addEventListener('scroll', function () { raf(upd); }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }

  /* 3. Parallaxe douce du hero */
  var stage = doc.querySelector('.hero-stage');
  if (stage && !reduce) {
    var pt = false;
    window.addEventListener('scroll', function () {
      if (pt) return; pt = true;
      raf(function () { var y = window.pageYOffset; if (y < 1400) stage.style.setProperty('--sy', y); pt = false; });
    }, { passive: true });
  }

  /* 4. Vitrine à défilement fixe : l'écran change avec l'étape */
  var steps = Array.prototype.slice.call(doc.querySelectorAll('.step'));
  var stack = doc.getElementById('stage-screen');
  if (steps.length && stack && canIO) {
    var imgs = Array.prototype.slice.call(stack.querySelectorAll('img[data-id]'));
    var spots = Array.prototype.slice.call(stack.querySelectorAll('.hotspot'));
    var dim = stack.querySelector('.screen-dim'), sheet = stack.querySelector('.screen-sheet');
    var dots = Array.prototype.slice.call(doc.querySelectorAll('.stage-dots i'));
    var current = -1;
    var activate = function (i) {
      if (i === current) return; current = i;
      var st = steps[i];
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      imgs.forEach(function (im) { im.classList.toggle('is-active', im.getAttribute('data-id') === st.getAttribute('data-screen')); });
      spots.forEach(function (h) { h.classList.toggle('is-on', h.getAttribute('data-hot-id') === st.getAttribute('data-hot')); });
      var lang = st.getAttribute('data-sheet') === 'lang';
      if (dim) dim.classList.toggle('is-on', lang); if (sheet) sheet.classList.toggle('is-on', lang);
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
    };
    activate(0);
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) activate(steps.indexOf(en.target)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { sio.observe(s); });
  } else {
    steps.forEach(function (s) { s.classList.add('is-active'); });
  }

  /* 5. Vidéo d'ambiance : lecture uniquement quand elle est visible */
  var vid = doc.getElementById('apk-video');
  if (vid && canIO && !reduce) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } else { vid.pause(); }
      });
    }, { threshold: 0.35 });
    vio.observe(vid);
  }
})();
