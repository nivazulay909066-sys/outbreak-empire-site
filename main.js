(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Top bar turns solid once you scroll.
  var bar = document.querySelector('.bar');
  function onScroll() { bar.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal blocks as they enter the screen.
  var items = document.querySelectorAll('.row, .band__in, .coal__txt, .coal__img, .steps, .pledges, .radio, .join__in');
  if ('IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }

  // FAQ: one answer open at a time.
  var qs = document.querySelectorAll('.faq details');
  qs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) qs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

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
    p.r = Math.random() * 1.6 + .4;
    p.vy = Math.random() * .5 + .25;
    p.vx = (Math.random() - .5) * .3;
    p.a = Math.random() * .6 + .3;
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
      ctx.fillStyle = p.r > 1.3 ? '#e8b04a' : '#e8742c';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    if (running) raf = requestAnimationFrame(tick);
  }
  size();
  var n = Math.round(Math.min(70, w / 18));
  for (var i = 0; i < n; i++) parts.push(spawn({}, true));
  window.addEventListener('resize', size);
  new IntersectionObserver(function (es) {
    running = es[0].isIntersecting;
    if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  }).observe(c);
})();
