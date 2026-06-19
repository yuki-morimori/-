/* 公式サイト UI ―― ヘッダーの切替 / メニュー / スタッガreveal / 数値カウント */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ヘッダー：ヒーローを抜けたら mix-blend を解除して地の色に
  var head = document.getElementById('head');
  var hero = document.getElementById('hero');
  function onScroll() {
    var threshold = (hero ? hero.offsetHeight : window.innerHeight) - 90;
    if (head) head.classList.toggle('is-solid', (window.scrollY || 0) > threshold);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // メニュー
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // reveal（同一グループ内は data-stagger 順に少し遅らせる）
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var d = parseInt(e.target.getAttribute('data-stagger') || '0', 10);
      e.target.style.transitionDelay = (reduce ? 0 : d * 80) + 'ms';
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });

  // 実績の数値カウント（data-count、小数は data-dec）
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var goal = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      if (reduce) { el.textContent = goal.toFixed(dec); cio.unobserve(el); return; }
      var t0 = performance.now(), dur = 1400;
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        el.textContent = (goal * (1 - Math.pow(1 - k, 3))).toFixed(dec);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { cio.observe(el); });
})();
