(function () {
  'use strict';
  var doc = document.documentElement, win = window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var motionQ = win.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = win.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // "still" = motion is off. It starts from the device setting; the button on the page switches it.
  // The choice is not saved: the site stores nothing on the visitor's device.
  var still = doc.classList.contains('still');

  var nav = $('.nav'), bar = $('.bar i'), hero = $('.hero');
  var tick = $('.tick'), tickRow = $('.tick__row');
  var world = $('.world'), worldBg = $('.world__bg'), scrub = $('.scrub');
  var feats = $$('.feat'), featsBox = $('.feats');
  var grow = $('.grow'), pin = $('.grow__pin'), gWords = $$('.grow__word span'), gSteps = $$('.grow__steps li');
  var pre = $('.pre'), preImg = $('.pre__bg img'), foot = $('.foot'), footMega = $('.foot__mega span');

  /* ---------- text that lights up word by word ---------- */
  var words = [], lit = -1;
  if (scrub) $$('p', scrub).forEach(function (p) {
    var parts = p.textContent.split(/\s+/).filter(Boolean);
    p.textContent = '';
    parts.forEach(function (t, i) {
      var s = document.createElement('span');
      s.className = 'w'; s.textContent = t;
      p.appendChild(s);
      if (i < parts.length - 1) p.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  });
  function light(n) {
    if (n === lit) return;
    var a = Math.min(n, lit < 0 ? 0 : lit), b = Math.max(n, lit < 0 ? words.length : lit), i;
    for (i = a; i < b; i++) words[i].classList.toggle('on', i < n);
    lit = n;
  }

  /* ---------- reveal on entry ---------- */
  var revs = $$('.rv');
  if ('IntersectionObserver' in win) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    revs.forEach(function (el) { io.observe(el); });
    var fo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); fo.unobserve(e.target); } });
    }, { threshold: .3 });
    feats.forEach(function (el) { fo.observe(el); });
  } else {
    revs.concat(feats).forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- the settlement that grows: lights on a dark map ---------- */
  var city = $('.grow__city'), cctx = null, cells = [], rings = [], CS = 1200, CN = 48;
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function buildCity() {
    if (!city || !city.getContext) return;
    city.width = city.height = CS;
    cctx = city.getContext('2d');
    var r = rng(11), cs = CS / CN, i, j;
    for (i = 0; i < CN; i++) for (j = 0; j < CN; j++) {
      var dx = i - (CN - 1) / 2, dy = j - (CN - 1) / 2;
      var d = Math.sqrt(dx * dx + dy * dy) / (CN / 2) + (r() - .5) * .1, b = r(), hue = r();
      if (d > 1) continue;
      var road = i % 6 === 3 || j % 6 === 3;
      if (!road && b < d * .42) continue;           // the edges are built more thinly
      cells.push({ x: i * cs, y: j * cs, d: Math.max(0, d), road: road, b: b, hue: hue });
    }
    cells.sort(function (a, b) { return a.d - b.d; });
    [.12, .3, .52, .73, .94].forEach(function (rad) {
      var pts = [], n = 9 + Math.round(rad * 9), k;
      for (k = 0; k < n; k++) {
        var a = k / n * 6.2832 + r() * .22, rr = rad * (1 + (r() - .5) * .14) * CS / 2;
        pts.push([CS / 2 + Math.cos(a) * rr, CS / 2 + Math.sin(a) * rr]);
      }
      rings.push({ r: rad, pts: pts });
    });
  }
  function drawCity(p) {
    if (!cctx) return;
    var R = .1 + p * .9, cs = CS / CN, i, c, a, k;
    cctx.globalCompositeOperation = 'source-over'; cctx.globalAlpha = 1;
    cctx.clearRect(0, 0, CS, CS);
    var g = cctx.createRadialGradient(CS / 2, CS / 2, 0, CS / 2, CS / 2, R * CS * .56);
    g.addColorStop(0, 'rgba(255,120,30,.36)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    cctx.fillStyle = g; cctx.fillRect(0, 0, CS, CS);
    cctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < cells.length; i++) {
      c = cells[i];
      if (c.d >= R) break;
      a = Math.min(1, (R - c.d) / .08);
      if (c.road) { cctx.fillStyle = 'rgba(255,150,60,' + (.17 * a).toFixed(3) + ')'; cctx.fillRect(c.x, c.y, cs, cs); continue; }
      cctx.fillStyle = 'rgba(' + (c.hue < .62 ? '255,138,46' : c.hue < .9 ? '255,198,120' : '255,242,220') + ',' + ((.22 + c.b * .78) * a).toFixed(3) + ')';
      cctx.fillRect(c.x + 3, c.y + 3, cs - 6, cs - 6);
      if (c.b > .78) { cctx.fillStyle = 'rgba(255,150,60,' + (.13 * a).toFixed(3) + ')'; cctx.fillRect(c.x - 5, c.y - 5, cs + 10, cs + 10); }
    }
    for (k = 0; k < rings.length; k++) {
      var ring = rings[k];
      if (R <= ring.r) continue;
      a = Math.min(1, (R - ring.r) / .05);
      cctx.beginPath();
      ring.pts.forEach(function (pt, n) { if (n) cctx.lineTo(pt[0], pt[1]); else cctx.moveTo(pt[0], pt[1]); });
      cctx.closePath();
      cctx.lineJoin = 'round';
      cctx.strokeStyle = 'rgba(255,122,31,' + (.22 * a).toFixed(3) + ')'; cctx.lineWidth = 14; cctx.stroke();
      cctx.strokeStyle = 'rgba(255,196,128,' + (.95 * a).toFixed(3) + ')'; cctx.lineWidth = 3; cctx.stroke();
      cctx.fillStyle = 'rgba(255,226,180,' + a.toFixed(3) + ')';
      ring.pts.forEach(function (pt) { cctx.fillRect(pt[0] - 5, pt[1] - 5, 10, 10); });
    }
  }
  var gp = -1;
  function setGrow(p) {
    if (!pin || Math.abs(p - gp) < .0015) return;
    gp = p;
    var q = p * 4.2, stage = Math.min(3, Math.floor(q));
    pin.style.setProperty('--gp', p.toFixed(3));
    gWords.forEach(function (w, k) { w.classList.toggle('on', k === stage); w.classList.toggle('was', k < stage); });
    gSteps.forEach(function (li, k) { li.classList.toggle('on', k <= stage); li.style.setProperty('--f', clamp(q - k).toFixed(3)); });
    drawCity(p);
  }

  /* ---------- everything that follows the scroll, in one pass per frame ---------- */
  var queued = false, worldHover = false;
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  function update() {
    queued = false;
    var y = win.pageYOffset, vh = win.innerHeight, max = doc.scrollHeight - vh, r;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max) : 0).toFixed(4) + ')';
    if (nav) nav.classList.toggle('is-solid', y > 40);
    if (still) return;

    if (hero && y < vh * 1.3) hero.style.setProperty('--sy', clamp(y / vh).toFixed(3));
    if (tick) {
      r = tick.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) tickRow.style.transform = 'translate3d(' + (-140 - (vh - r.top) * .5).toFixed(1) + 'px,0,0)';
    }
    if (scrub) {
      r = scrub.getBoundingClientRect();
      var sp = clamp((vh * .84 - r.top) / (r.height + vh * .22));
      light(Math.round(sp * words.length));
      if (!worldHover) {
        var wr = world.getBoundingClientRect();
        worldBg.style.setProperty('--ly', (16 + clamp((vh - wr.top) / (wr.height + vh)) * 62).toFixed(1) + '%');
      }
    }
    if (featsBox) {
      r = featsBox.getBoundingClientRect();
      if (r.top < vh * 1.2 && r.bottom > -vh * .2) {
        var fh = feats[0].offsetHeight;
        feats.forEach(function (f, i) {
          var top = r.top + i * fh;
          f.style.setProperty('--en', clamp(1 - top / vh).toFixed(3));
          f.style.setProperty('--cov', i < feats.length - 1 ? clamp(-top / fh).toFixed(3) : '0');
        });
      }
    }
    if (grow) {
      r = grow.getBoundingClientRect();
      setGrow(clamp(-r.top / Math.max(1, r.height - vh)));
    }
    if (pre) {
      r = pre.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) preImg.style.setProperty('--pp', clamp((vh - r.top) / vh).toFixed(3));
    }
    if (foot) {
      r = foot.getBoundingClientRect();
      if (r.top < vh) footMega.style.setProperty('--fp', clamp((vh - r.top) / Math.min(r.height, vh)).toFixed(3));
    }
  }

  /* ---------- hero: embers, and layers that follow the pointer ---------- */
  var c = $('.embers'), ctx = c && c.getContext ? c.getContext('2d') : null;
  var w = 0, h = 0, parts = [], heroOn = true, raf = 0, last = 0, sprite = null;
  var mx = 0, my = 0, tx = 0, ty = 0;
  function makeSprite() {
    sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    var g = sprite.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(.18, 'rgba(255,170,70,.85)');
    gr.addColorStop(.5, 'rgba(240,90,20,.2)'); gr.addColorStop(1, 'rgba(240,90,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  function size() {
    if (!ctx) return;
    var dpr = Math.min(win.devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(96, Math.max(34, w / 15)));
    while (parts.length < n) parts.push(spawn({}, true));
    parts.length = n;
  }
  function spawn(p, initial) {
    p.z = Math.random();                              // 0 = far, 1 = close to the lens
    p.s = 4 + p.z * p.z * 20;
    p.x = Math.random() * w;
    p.y = initial ? Math.random() * h : h + 24;
    p.vy = .25 + p.z * 1.15;
    p.vx = (Math.random() - .5) * .4;
    p.a = .35 + Math.random() * .6;
    p.t = Math.random() * 6.28;
    return p;
  }
  function frame(now) {
    raf = 0;
    if (still || !heroOn) return;
    var k = last ? Math.min(3, (now - last) / 16.67) : 1, i, p;
    last = now;
    if (Math.abs(tx - mx) > .001 || Math.abs(ty - my) > .001) {
      mx += (tx - mx) * .06 * k; my += (ty - my) * .06 * k;
      hero.style.setProperty('--mx', mx.toFixed(3)); hero.style.setProperty('--my', my.toFixed(3));
    }
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      p.t += (.018 + p.z * .02) * k;
      p.y -= p.vy * k;
      p.x += (p.vx + Math.sin(p.t) * (.3 + p.z * .5) + mx * p.z * .7) * k;
      if (p.y < -24 || p.x < -40 || p.x > w + 40) spawn(p, false);
      ctx.globalAlpha = p.a * Math.min(1, p.y / (h * .42)) * (.72 + .28 * Math.sin(p.t * 3.1));
      ctx.drawImage(sprite, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    raf = requestAnimationFrame(frame);
  }
  function play() { if (ctx && !raf && !still && heroOn && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  if (ctx) {
    makeSprite(); size();
    if ('IntersectionObserver' in win) new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; play(); }).observe(c);
    document.addEventListener('visibilitychange', play);
    if (fine) hero.addEventListener('pointermove', function (e) {
      tx = (e.clientX / win.innerWidth - .5) * 2; ty = (e.clientY / win.innerHeight - .5) * 2;
    });
  }
  if (fine && world) {
    world.addEventListener('pointermove', function (e) {
      if (still) return;
      var r = world.getBoundingClientRect();
      worldHover = true;
      worldBg.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      worldBg.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    world.addEventListener('pointerleave', function () { worldHover = false; });
  }

  /* ---------- concept art reel ---------- */
  var reel = $('.reel'), shots = $$('.shot'), dragged = false;
  if (reel) {
    var prevB = $('.reel__btn--prev'), nextB = $('.reel__btn--next');
    var stepW = function () { return reel.children[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(reel).columnGap) || 0); };
    var ends = function () {
      var m = reel.scrollWidth - reel.clientWidth;
      prevB.setAttribute('aria-disabled', reel.scrollLeft < 4 ? 'true' : 'false');
      nextB.setAttribute('aria-disabled', reel.scrollLeft > m - 4 ? 'true' : 'false');
    };
    var move = function (dir) { reel.scrollBy({ left: dir * stepW(), behavior: still ? 'auto' : 'smooth' }); };
    prevB.addEventListener('click', function () { move(-1); });
    nextB.addEventListener('click', function () { move(1); });
    reel.addEventListener('scroll', ends, { passive: true });
    win.addEventListener('resize', ends);
    ends();

    // Drag with the mouse. A drag is not a click, so it never opens the viewer.
    var down = false, moved = false, sx = 0, sl = 0;
    reel.addEventListener('dragstart', function (e) { e.preventDefault(); });
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = reel.scrollLeft;
    });
    win.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; reel.classList.add('drag'); }
      if (moved) reel.scrollLeft = sl - dx;
    });
    win.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (moved) { dragged = true; setTimeout(function () { dragged = false; reel.classList.remove('drag'); }, 0); }
    });
    reel.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);

    if (fine) shots.forEach(function (s) {
      s.addEventListener('pointermove', function (e) {
        if (still || down) return;
        var r = s.getBoundingClientRect();
        s.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 9).toFixed(2) + 'deg');
        s.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 7).toFixed(2) + 'deg');
      });
      s.addEventListener('pointerleave', function () { s.style.removeProperty('--rx'); s.style.removeProperty('--ry'); });
    });
  }

  /* ---------- picture viewer ---------- */
  var lb = $('.lb');
  if (lb && lb.showModal && shots.length) {
    var big = document.createElement('img'), cur = 0;
    big.alt = '';
    lb.insertBefore(big, lb.firstChild);
    var cap = $('.lb__cap span', lb);
    cap.parentNode.setAttribute('aria-live', 'polite');
    var show = function (i) {
      cur = (i + shots.length) % shots.length;
      big.src = shots[cur].getAttribute('data-full');
      big.alt = $('img', shots[cur]).alt;
      cap.textContent = big.alt;
    };
    shots.forEach(function (b, i) { b.addEventListener('click', function () { show(i); lb.showModal(); }); });
    $('.lb__go--prev', lb).addEventListener('click', function () { show(cur - 1); });
    $('.lb__go--next', lb).addEventListener('click', function () { show(cur + 1); });
    $('.lb__x', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(cur + 1); else if (e.key === 'ArrowLeft') show(cur - 1);
    });
  }

  /* ---------- the motion switch ---------- */
  var mBtn = $('.motion');
  function clearProps(el, names) { if (el) names.forEach(function (n) { el.style.removeProperty(n); }); }
  function setStill(v) {
    still = v;
    doc.classList.toggle('still', v);
    if (mBtn) mBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
    gp = -1;
    if (v) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (ctx) ctx.clearRect(0, 0, w, h);
      mx = my = tx = ty = 0;
      clearProps(hero, ['--sy', '--mx', '--my']);
      clearProps(worldBg, ['--lx', '--ly']);
      clearProps(preImg, ['--pp']); clearProps(footMega, ['--fp']);
      if (tickRow) tickRow.style.transform = '';
      feats.forEach(function (f) { clearProps(f, ['--en', '--cov']); });
      shots.forEach(function (s) { clearProps(s, ['--rx', '--ry']); });
      light(words.length);
      setGrow(1);
    } else {
      play();
    }
    update();
  }
  if (mBtn) {
    mBtn.hidden = false;
    mBtn.addEventListener('click', function () { setStill(!still); });
  }
  if (motionQ.addEventListener) motionQ.addEventListener('change', function (e) { setStill(e.matches); });

  /* ---------- start ---------- */
  buildCity();
  if (still) setStill(true); else update();
  win.addEventListener('scroll', queue, { passive: true });
  win.addEventListener('resize', function () { size(); gp = -1; queue(); });
  win.addEventListener('load', queue);
})();
