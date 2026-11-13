/* The two WebGL scenes of the home page: the city that grows, and depth in the hero picture.
   No library. Both are decoration only: when WebGL2 is missing, fails or is lost, main.js keeps the flat versions. */
(function () {
  'use strict';
  var win = window;

  /* ---------- small helpers ---------- */
  function context(canvas) {
    var o = { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false };
    try { return canvas.getContext('webgl2', o); } catch (e) { return null; }
  }
  function shader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, '#version 300 es\n' + vs));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float;\n' + fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, info;
    for (i = 0; i < n; i++) { info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }
  function buffer(gl, data) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return b;
  }
  function attr(gl, loc, size, stride, offset, perInstance) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
    gl.vertexAttribDivisor(loc, perInstance ? 1 : 0);
  }
  // Size the drawing buffer to the element. Returns true when it changed.
  function fit(c, cap, scale) {
    var d = Math.min(win.devicePixelRatio || 1, cap) * scale;
    var w = Math.max(2, Math.round(c.clientWidth * d)), h = Math.max(2, Math.round(c.clientHeight * d));
    if (c.width === w && c.height === h) return false;
    c.width = w; c.height = h;
    return true;
  }
  // Drops the resolution when the device cannot keep up. Long gaps (a hidden tab) are ignored.
  function governor() {
    var last = 0, sum = 0, n = 0, scale = 1;
    return function () {
      var now = performance.now(), dt = now - last;
      last = now;
      if (dt > 0 && dt < 250) { sum += dt; n++; }
      if (n >= 45) {
        if (sum / n > 30 && scale > .55) scale *= .78;
        sum = 0; n = 0;
      }
      return scale;
    };
  }
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function perspective(fovy, aspect, near, far, down) {
    var t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = t / aspect; m[5] = t; m[9] = down; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = 2 * far * near / (near - far);
    return m;
  }
  function lookAt(e, c) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.sqrt(zx * zx + zy * zy + zz * zz);
    zx /= l; zy /= l; zz /= l;
    var xx = zz, xz = -zx; l = Math.sqrt(xx * xx + xz * xz); xx /= l; xz /= l;
    var yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
    return new Float32Array([xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  }
  function multiply(a, b) {
    var o = new Float32Array(16), i, j;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) o[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    return o;
  }

  /* =====================================================================
     The city. p runs from 0 (a camp) to 1 (a metropolis); R is how far the built area reaches.
     ===================================================================== */
  var CITY_N = 44, CELL = 2 / CITY_N, RINGS = [.12, .3, .52, .73, .94];
  var FOG = 'float fogOf(vec3 w) { vec3 d = w - uEye; return 1. - exp(-dot(d, d) * uFog); }\n';
  var BG = 'vec3(.0157, .0157, .0196)';

  var V_BOX = [
    'layout(location=0) in vec3 aP; layout(location=1) in vec3 aN;',
    'layout(location=2) in vec4 iPos; layout(location=3) in vec4 iDim; layout(location=4) in float iSeed;',
    'uniform mat4 uVP; uniform float uR;',
    'out vec3 vW; out vec3 vN; out vec3 vL; out vec4 vI; out float vD;',
    'void main() {',
    '  float d = iPos.w, kind = iDim.w;',
    '  float g = smoothstep(0., .09, uR - d);',                       // 0 = not built yet, 1 = standing
    '  float m = clamp((uR - d) / .75, 0., 1.);',                     // how long it has been part of the city
    '  float h = iDim.y * (kind < .5 ? g * (.26 + .74 * m * m) : g);',
    '  vec3 q = aP * vec3(iDim.x, h, iDim.z);',
    '  float c = cos(iPos.z), s = sin(iPos.z);',
    '  vW = vec3(q.x * c - q.z * s + iPos.x, q.y, q.x * s + q.z * c + iPos.y);',
    '  vN = vec3(aN.x * c - aN.z * s, aN.y, aN.x * s + aN.z * c);',
    '  vL = q; vI = vec4(h, kind, iSeed, g); vD = d;',
    '  gl_Position = g > 0. ? uVP * vec4(vW, 1.) : vec4(2., 2., 2., 1.);',
    '}'].join('\n');
  var F_BOX = [
    'in vec3 vW; in vec3 vN; in vec3 vL; in vec4 vI; in float vD;',
    'uniform vec3 uEye; uniform float uR, uT, uFog;',
    'out vec4 o;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    FOG,
    'void main() {',
    '  vec3 N = normalize(vN);',
    '  float kind = vI.y, seed = vI.z, top = step(.5, N.y);',
    '  float dif = max(dot(N, normalize(vec3(-.45, .8, .35))), 0.);',
    '  vec3 col = mix(vec3(.046, .05, .062), vec3(.082, .078, .076), seed) * (.3 + dif * 1.35);',
    '  col += vec3(1., .42, .1) * exp(-vW.y * 30.) * .24 * (1. - top);',          // street light on the lower walls
    '  if (kind < .5) {',
    '    if (top < .5) {',
    '      float u = abs(N.x) > abs(N.z) ? vL.z : vL.x;',
    '      vec2 g = vec2(u / .0105 + seed * 7., vW.y / .0125);',
    '      vec2 id = floor(g), f = fract(g);',
    '      float share = .1 + .52 * clamp((uR - vD) / .6, 0., 1.);',              // more lit windows as the district ages
    '      float r = hash(id + seed * 91.7);',
    '      float lit = step(1. - share, r);',
    '      float win = step(.2, f.x) * step(f.x, .8) * step(.24, f.y) * step(f.y, .76);',
    '      float sharp = clamp(1.3 - fwidth(g.x) * 1.6, 0., 1.);',                // far away the grid melts into an even glow
    '      float tw = .86 + .14 * sin(uT * (.7 + r * 2.) + r * 40.);',
    '      vec3 wc = mix(vec3(1., .52, .16), vec3(1., .86, .6), hash(id.yx + seed * 3.));',
    '      col += wc * mix(share * .36, win * lit * tw, sharp) * 1.15;',
    '    } else {',
    '      col += vec3(1., .5, .15) * step(.86, fract(seed * 13.7)) * .22;',
    '    }',
    '  } else {',
    '    col = vec3(.075, .064, .056) * (.4 + dif * 1.1);',
    '    col += vec3(1., .5, .14) * smoothstep(.8, 1., vL.y / max(vI.x, .0001)) * (kind > 1.5 ? 1.3 : .75);',
    '  }',
    '  col += vec3(1., .58, .2) * vI.w * (1. - vI.w) * 2.6;',                     // glows while it is going up
    '  o = vec4(mix(col, ' + BG + ', fogOf(vW)), 1.);',
    '}'].join('\n');

  var V_GROUND = [
    'layout(location=0) in vec2 aP;',
    'uniform mat4 uVP;',
    'out vec3 vW;',
    'void main() { vW = vec3(aP.x, 0., aP.y); gl_Position = uVP * vec4(vW, 1.); }'].join('\n');
  var F_GROUND = [
    'in vec3 vW;',
    'uniform vec3 uEye; uniform float uR, uT, uFog, uCell;',
    'out vec4 o;',
    FOG,
    'void main() {',
    '  vec2 p = vW.xz; float d = length(p);',
    '  vec3 col = vec3(.02, .02, .024);',
    '  vec2 q = p / (uCell * 5.), fw = fwidth(q);',
    '  vec2 gg = abs(fract(q - .5) - .5) / max(fw, vec2(.0001));',
    '  col += vec3(.6, .34, .16) * (1. - min(min(gg.x, gg.y), 1.)) * .05;',       // the survey grid of the land around
    '  float inside = smoothstep(uR + .012, uR - .03, d);',
    '  vec2 c = (p + 1.) / uCell, id = floor(c), f = fract(c);',
    '  float rx = step(abs(mod(id.x, 5.) - 2.), .5), rz = step(abs(mod(id.y, 5.) - 2.), .5);',
    '  float road = max(rx, rz);',
    '  col = mix(col, vec3(.03, .027, .026), inside);',
    '  col += inside * road * vec3(1., .48, .15) * .13;',
    '  float lamp = smoothstep(.34, 0., length(f - .5));',
    '  col += inside * road * lamp * vec3(1., .66, .3) * .5;',
    '  col += inside * (1. - road) * vec3(1., .45, .12) * .035;',
    '  float e = (d - uR) / .013;',
    '  col += vec3(1., .5, .15) * exp(-e * e) * .6;',                             // the edge of what has been taken back
    '  col += vec3(1., .38, .08) * exp(-d / (uR * .7 + .04)) * .05;',
    '  o = vec4(mix(col, ' + BG + ', fogOf(vW)), 1.);',
    '}'].join('\n');

  var V_POINT = [
    'layout(location=0) in vec4 a; layout(location=1) in vec2 b;',
    'uniform mat4 uVP; uniform vec3 uEye; uniform float uR, uT, uH, uFog;',
    'out vec3 vC;',
    'void main() {',
    '  vec3 p, col; float al, sz, seed = b.y;',
    '  if (a.w < .5) {',                                                          // beacon on a wall tower
    '    p = a.xyz + vec3(0., .005, 0.);',
    '    al = smoothstep(0., .06, uR - b.x) * (.55 + .45 * sin(uT * 2.2 + seed * 40.));',
    '    col = vec3(1., .62, .22); sz = .021;',
    '  } else if (a.w < 1.5) {',                                                  // a vehicle on a road
    '    float dir = seed < .5 ? 1. : -1.;',
    '    float s = fract(seed * 7.3 + uT * dir * (.012 + seed * .014)) * 2. - 1.;',
    '    p = a.z < .5 ? vec3(s, .004, a.x) : vec3(a.x, .004, s);',
    '    al = smoothstep(0., .08, uR - .05 - length(p.xz)) * .9;',
    '    col = dir > 0. ? vec3(1., .9, .7) : vec3(1., .3, .12); sz = .011;',
    '  } else {',                                                                 // the dead, drifting in toward the wall
    '    float u = fract(a.y - uT * .006 * (.4 + seed));',
    '    float ang = a.x + sin(uT * .11 + seed * 31.) * .03;',
    '    float rad = uR + .03 + u * u * .75;',
    '    p = vec3(cos(ang) * rad, .003, sin(ang) * rad);',
    '    al = (1. - u) * .55 * (.6 + .4 * sin(uT * 1.3 + seed * 50.));',
    '    col = vec3(.6, .78, .66); sz = .008;',
    '  }',
    '  gl_Position = uVP * vec4(p, 1.);',
    '  vec3 dv = p - uEye;',
    '  al *= exp(-dot(dv, dv) * uFog);',
    '  gl_PointSize = max(1.5, uH * sz / gl_Position.w);',
    '  vC = col * al;',
    '}'].join('\n');
  var F_POINT = [
    'in vec3 vC; out vec4 o;',
    'void main() { float f = max(0., 1. - length(gl_PointCoord - .5) * 2.); o = vec4(vC * f * f, 1.); }'].join('\n');

  function cubeMesh() {
    var v = [], faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]];   // no bottom: nobody sees it
    faces.forEach(function (n) {
      var u = [n[1], n[2], n[0]], w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]].forEach(function (k) {
        v.push((n[0] + u[0] * k[0] + w[0] * k[1]) * .5, (n[1] + u[1] * k[0] + w[1] * k[1]) * .5 + .5, (n[2] + u[2] * k[0] + w[2] * k[1]) * .5, n[0], n[1], n[2]);
      });
    });
    return v;
  }

  function cityData() {
    var r = rng(11), boxes = [], points = [], i, j;
    for (i = 0; i < CITY_N; i++) for (j = 0; j < CITY_N; j++) {
      var x = -1 + (i + .5) * CELL, z = -1 + (j + .5) * CELL, d0 = Math.sqrt(x * x + z * z);
      var a = r(), b = r(), c = r(), e = r(), f = r(), g = r();
      if (d0 > .97 || i % 5 === 2 || j % 5 === 2) continue;
      if (RINGS.some(function (q) { return Math.abs(d0 - q) < CELL * .85; })) continue;   // the walls need the room
      if (b < d0 * .36) continue;                                                        // the edges are built more thinly
      var mid = Math.pow(1 - d0, 2.2);
      var h = CELL * (.5 + b * 1.1 + mid * (1.2 + c * 5.5));
      boxes.push(x, z, (e - .5) * .14, Math.max(0, d0 + (a - .5) * .08), CELL * (.6 + f * .27), h, CELL * (.6 + g * .27), 0, c);
    }
    RINGS.forEach(function (q) {
      var n = Math.round(14 + q * 46), wallH = .016 + q * .03, k;
      for (k = 0; k < n; k++) {
        var a0 = k / n * 6.28318, a1 = (k + 1) / n * 6.28318, am = (a0 + a1) / 2;
        var x0 = Math.cos(a0) * q, z0 = Math.sin(a0) * q, x1 = Math.cos(a1) * q, z1 = Math.sin(a1) * q;
        var seed = r();
        boxes.push(x0, z0, 0, q, .02, wallH * 1.9, .02, 2, seed);
        points.push(x0, wallH * 1.9, z0, 0, q, seed);
        // the two main roads leave through a gate in every wall
        var gate = Math.min(Math.abs(Math.sin(am)), Math.abs(Math.cos(am))) < Math.sin(3.14159 / n) * .9;
        if (!gate) boxes.push((x0 + x1) / 2, (z0 + z1) / 2, Math.atan2(z1 - z0, x1 - x0), q, Math.sqrt((x1 - x0) * (x1 - x0) + (z1 - z0) * (z1 - z0)), wallH, .011, 1, seed);
      }
    });
    for (i = 0; i < 170; i++) {
      var line = Math.floor(r() * 9) * 5 + 2;
      points.push(-1 + (line + .5) * CELL, 0, r() < .5 ? 0 : 1, 1, 0, r());
    }
    for (i = 0; i < 760; i++) points.push(r() * 6.28318, r(), 0, 2, 0, r());
    return { boxes: boxes, points: points };
  }

  function initCity(canvas, onLost) {
    var gl = context(canvas);
    if (!gl) return null;
    try {
      var data = cityData(), nBox = data.boxes.length / 9, nPoint = data.points.length / 6;
      var pBox = program(gl, V_BOX, F_BOX), pGround = program(gl, V_GROUND, F_GROUND), pPoint = program(gl, V_POINT, F_POINT);

      var vaoBox = gl.createVertexArray();
      gl.bindVertexArray(vaoBox);
      buffer(gl, cubeMesh()); attr(gl, 0, 3, 6, 0); attr(gl, 1, 3, 6, 3);
      buffer(gl, data.boxes); attr(gl, 2, 4, 9, 0, true); attr(gl, 3, 4, 9, 4, true); attr(gl, 4, 1, 9, 8, true);

      var vaoGround = gl.createVertexArray();
      gl.bindVertexArray(vaoGround);
      buffer(gl, [-9, -9, 9, -9, 9, 9, -9, -9, 9, 9, -9, 9]); attr(gl, 0, 2, 2, 0);

      var vaoPoint = gl.createVertexArray();
      gl.bindVertexArray(vaoPoint);
      buffer(gl, data.points); attr(gl, 0, 4, 6, 0); attr(gl, 1, 2, 6, 4);
      gl.bindVertexArray(null);
    } catch (err) {
      if (win.console) console.warn('city scene:', err.message);
      return null;
    }

    var dead = false, quality = governor(), scale = 1;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); dead = true; if (onLost) onLost(); });

    function common(pr, vp, eye, R, t, fog) {
      gl.useProgram(pr.p);
      gl.uniformMatrix4fv(pr.u.uVP, false, vp);
      if (pr.u.uEye) gl.uniform3fv(pr.u.uEye, eye);
      if (pr.u.uR) gl.uniform1f(pr.u.uR, R);
      if (pr.u.uT) gl.uniform1f(pr.u.uT, t);
      if (pr.u.uFog) gl.uniform1f(pr.u.uFog, fog);
    }
    // p: growth 0..1. t: seconds, for the lights, the traffic and the slow turn of the camera. live: called every frame.
    function draw(p, t, live) {
      if (dead) return;
      if (live) scale = quality();
      fit(canvas, 1.75, scale);
      var w = canvas.width, h = canvas.height, aspect = w / h;
      var R = .1 + p * .9;
      var az = .55 + p * 1.9 + t * .02, el = .8 - p * .45, dist = .46 + 2.25 * Math.pow(R, .9);
      // tall screens get a wider lens so the whole city still fits across
      var fov = Math.max(.66, 2 * Math.atan(Math.tan(.37) / aspect));
      // and a higher camera, so the round city fills more of the height
      if (aspect < 1) { dist *= 1.12; el += .5 * (1 - aspect); }
      var target = [0, .02 + p * .05, 0];
      var eye = [target[0] + dist * Math.cos(el) * Math.sin(az), target[1] + dist * Math.sin(el), target[2] + dist * Math.cos(el) * Math.cos(az)];
      // the lens is shifted so the city sits in the gap the words leave: lower on a wide screen, higher on a tall one
      var proj = perspective(fov, aspect, .02, 30, aspect < 1 ? -.1 : .07);
      var vp = multiply(proj, lookAt(eye, target)), fog = .2 / (dist * dist);

      gl.viewport(0, 0, w, h);
      gl.clearColor(.0157, .0157, .0196, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);

      common(pGround, vp, eye, R, t, fog);
      gl.uniform1f(pGround.u.uCell, CELL);
      gl.bindVertexArray(vaoGround); gl.drawArrays(gl.TRIANGLES, 0, 6);

      common(pBox, vp, eye, R, t, fog);
      gl.bindVertexArray(vaoBox); gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, nBox);

      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      common(pPoint, vp, eye, R, t, fog);
      gl.uniform1f(pPoint.u.uH, h * proj[5] * .5);
      gl.bindVertexArray(vaoPoint); gl.drawArrays(gl.POINTS, 0, nPoint);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    }
    return { draw: draw };
  }

  /* =====================================================================
     Depth in the hero picture: a rough depth map shifts near and far parts by different amounts.
     ===================================================================== */
  var V_FLAT = [
    'layout(location=0) in vec2 aP;',
    'out vec2 v;',
    'void main() { v = vec2(aP.x * .5 + .5, .5 - aP.y * .5); gl_Position = vec4(aP, 0., 1.); }'].join('\n');
  var F_DEPTH = [
    'in vec2 v; out vec4 o;',
    'uniform sampler2D uImg, uDep; uniform vec4 uCov; uniform vec2 uOff; uniform float uT;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }',
    'void main() {',
    '  vec2 uv = v * uCov.xy + uCov.zw;',
    '  float d = texture(uDep, uv).r;',
    '  d = texture(uDep, uv + uOff * (d - .42)).r;',                              // a second look, so edges tear less
    '  vec2 at = uv + uOff * (d - .42);',
    '  vec3 c = texture(uImg, at).rgb;',
    '  float away = 1. - d;',
    '  float m = noise(at * vec2(3., 5.) + vec2(uT * .02, 0.)) * .6 + noise(at * vec2(7., 11.) - vec2(uT * .034, uT * .01)) * .4;',
    '  float haze = smoothstep(.38, .9, m) * away * away * .3 * smoothstep(1., .35, at.y);',
    '  c = mix(c, vec3(.8, .71, .62), haze);',                                    // dust drifting between us and the far ruins
    '  o = vec4(c, 1.);',
    '}'].join('\n');

  function texture(gl, unit, img) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  // img: the hero <img> already on the page (it stays underneath as the fallback). depthUrl: the depth map.
  function initDepth(canvas, img, depthUrl, onReady, onLost) {
    var gl = context(canvas);
    if (!gl) return null;
    var pr, vao;
    try {
      pr = program(gl, V_FLAT, F_DEPTH);
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      buffer(gl, [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]); attr(gl, 0, 2, 2, 0);
      gl.bindVertexArray(null);
    } catch (err) {
      if (win.console) console.warn('hero scene:', err.message);
      return null;
    }
    var api = { ready: false, draw: draw }, dead = false, quality = governor(), scale = 1, cover = [1, 1, 0, 0], sized = '';
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); dead = true; api.ready = false; if (onLost) onLost(); });

    var depth = new Image(), left = 2;
    function loaded() {
      if (--left || dead) return;
      try {
        texture(gl, 0, img); texture(gl, 1, depth);
        api.ready = true;
        if (onReady) onReady();
      } catch (err) { if (win.console) console.warn('hero scene:', err.message); }
    }
    depth.onload = loaded;
    depth.src = depthUrl;
    // decode() waits for the responsive picture the browser really chose
    if (img.decode) img.decode().then(loaded, function () {}); else if (img.complete) loaded(); else img.addEventListener('load', loaded);

    // The same crop as object-fit: cover with the picture's own object-position.
    function crop() {
      var key = canvas.width + 'x' + canvas.height;
      if (key === sized) return;
      sized = key;
      var pos = (getComputedStyle(img).objectPosition || '50% 50%').split(' ');
      var ox = parseFloat(pos[0]) / 100, oy = parseFloat(pos[1]) / 100;
      if (isNaN(ox)) ox = .5; if (isNaN(oy)) oy = .5;
      var ca = canvas.width / canvas.height, ia = img.naturalWidth / img.naturalHeight;
      if (ca > ia) cover = [1, ia / ca, 0, (1 - ia / ca) * oy];
      else cover = [ca / ia, 1, (1 - ca / ia) * ox, 0];
    }
    // mx, my: the pointer, -1..1. sy: how far the hero has been scrolled, 0..1. t: seconds.
    function draw(mx, my, sy, t) {
      if (dead || !api.ready) return;
      scale = quality();
      fit(canvas, 1.5, scale);
      crop();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(pr.p);
      gl.uniform1i(pr.u.uImg, 0); gl.uniform1i(pr.u.uDep, 1);
      gl.uniform4fv(pr.u.uCov, cover);
      // a slow sway keeps it alive on phones, where there is no pointer
      gl.uniform2f(pr.u.uOff, (mx * .017 + Math.sin(t * .31) * .0045) * cover[0], (my * .011 + Math.cos(t * .23) * .003 - sy * .03) * cover[1]);
      gl.uniform1f(pr.u.uT, t);
      gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }
    return api;
  }

  win.OEGL = { city: initCity, depth: initDepth };
})();
