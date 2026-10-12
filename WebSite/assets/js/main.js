/* ADMA — interactions de base : menu, en-tête, progression, navigation active, année */
(function () {
  'use strict';
  var doc = document, body = doc.body;
  var header = doc.querySelector('.site-header');
  var bar = doc.querySelector('.progress i');
  var burger = doc.querySelector('.burger');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (bar) {
        var h = doc.documentElement.scrollHeight - window.innerHeight;
        bar.style.setProperty('--p', h > 0 ? Math.min(1, y / h).toFixed(4) : 0);
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Menu mobile */
  function setMenu(open) {
    if (!burger) return;
    body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    doc.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); burger.focus(); } });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* Lien actif selon la section visible */
  var links = Array.prototype.slice.call(doc.querySelectorAll('.nav-links a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { var s = doc.querySelector(a.getAttribute('href')); if (s) map[s.id] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = map[en.target.id]; if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(doc.getElementById(id)); });
  }

  /* Année dynamique */
  doc.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });

  /* Table des matières des pages légales : section courante */
  var toc = Array.prototype.slice.call(doc.querySelectorAll('.toc a'));
  if (toc.length && 'IntersectionObserver' in window) {
    var tmap = {};
    toc.forEach(function (a) { tmap[a.getAttribute('href').slice(1)] = a; });
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        toc.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = tmap[en.target.id]; if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(tmap).forEach(function (id) { var el = doc.getElementById(id); if (el) tio.observe(el); });
  }
})();
