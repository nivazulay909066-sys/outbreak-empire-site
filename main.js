(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nav turns solid once you scroll.
  var nav = document.querySelector('.nav');
  function onScroll() { nav.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal blocks as they enter the screen.
  var items = document.querySelectorAll('.world__in, .grow__in, .media__in, .pre__in, .comm');
  if ('IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    items.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }

  // Feature showcase: tabs, auto-advance while on screen.
  var show = document.querySelector('.show');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var cur = 0, timer = null, DUR = 7000, visible = false, auto = !still;
  function go(i) {
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) {
      var on = k === cur;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var bar = t.querySelector('i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
    slides.forEach(function (s, k) { s.classList.toggle('is-on', k === cur); });
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (auto && visible) timer = setTimeout(function () { go(cur + 1); }, DUR);
  }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { auto = false; show.classList.remove('is-auto'); go(k); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); auto = false; show.classList.remove('is-auto');
        go(cur + (e.key === 'ArrowRight' ? 1 : -1)); tabs[cur].focus();
      }
    });
  });
  if (auto) {
    show.classList.add('is-auto');
    show.style.setProperty('--dur', DUR / 1000 + 's');
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) go(cur); else clearTimeout(timer);
    }, { threshold: .4 }).observe(show);
  }

  // Lightbox for the concept art.
  var lb = document.querySelector('.lb');
  if (lb && lb.showModal) {
    var big = lb.querySelector('img');
    document.querySelectorAll('.gal__item').forEach(function (b) {
      b.addEventListener('click', function () {
        big.src = b.getAttribute('data-full');
        big.alt = b.querySelector('img').alt;
        lb.showModal();
      });
    });
    lb.querySelector('.lb__x').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  }

  // Embers drifting up over the hero. Pauses when off screen.
  var c = document.querySelector('.embers');
  if (!c || still) return;
  var ctx = c.getContext('2d'), w, h, dpr, parts = [], running = true, raf;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(p, initial) {
    p.x = Math.random() * w;
    p.y = initial ? Math.random() * h : h + 10;
    p.r = Math.random() * 1.5 + .4;
    p.vy = Math.random() * .45 + .2;
    p.vx = (Math.random() - .5) * .3;
    p.a = Math.random() * .55 + .25;
    p.t = Math.random() * 6.28;
    return p;
  }
  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.t += .02; p.y -= p.vy; p.x += p.vx + Math.sin(p.t) * .25;
      var fade = Math.min(1, p.y / (h * .5));
      if (p.y < -10) spawn(p, false);
      ctx.globalAlpha = p.a * fade;
      ctx.fillStyle = p.r > 1.3 ? '#f2c66a' : '#e8742c';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    if (running) raf = requestAnimationFrame(tick);
  }
  size();
  var n = Math.round(Math.min(60, w / 22));
  for (var i = 0; i < n; i++) parts.push(spawn({}, true));
  window.addEventListener('resize', size);
  new IntersectionObserver(function (es) {
    running = es[0].isIntersecting;
    if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  }).observe(c);
})();
