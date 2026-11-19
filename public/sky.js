(() => {
  const $ = (selector) => document.querySelector(selector);
  const sky = $('#sky');
  const universe = $('#universe');
  const skyBackdrop = $('#sky-backdrop');
  const ground = $('#wish-ground');
  const atmosphere = $('#wish-atmosphere');
  const stars = $('#stars');
  const canvas = $('#dust');
  const ctx = canvas.getContext('2d');
  const query = $('#query');
  const matches = $('#matches');
  const reader = $('#reader');
  const compose = $('#compose');
  const wishCard = $('#wish-card');
  const collection = $('#collection');
  const form = $('#star-form');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const world = { x: 2400, y: 1600 };
  const camera = { x: 1200, y: 800 };
  const storageKey = 'luvy-dovey-stars';
  const nodes = new Map();
  const starMessages = new Map();
  let personal = Object.create(null);
  try { personal = Object.assign(personal, JSON.parse(localStorage.getItem(storageKey) || '{}')); } catch {}
  let publicStars = [];
  let selected;
  let draft;
  let saving = false;
  let current;
  let readerFocus;
  let readerRequest;
  let readerAnimation;
  let readerClosing = false;
  let drag;
  let cameraFrame;
  let paintFrame;
  let sceneFlight;
  let temporaryStatus;
  const width = () => sky.clientWidth;
  const height = () => sky.clientHeight;
  const clamp = (value, max) => Math.max(0, Math.min(value, max));
  const screen = (star) => ({ x: star.x - camera.x + width() / 2, y: star.y - camera.y + height() / 2 });
  const toWorld = (x, y) => ({ x: clamp(x + camera.x - width() / 2, world.x), y: clamp(y + camera.y - height() / 2, world.y) });

  function tell(message) {
    $('#status').textContent = message;
    clearTimeout(temporaryStatus);
    temporaryStatus = setTimeout(() => { $('#status').textContent = ''; }, 5500);
  }

  function remember() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(personal));
      return true;
    } catch { return false; }
  }

  async function api(suffix = '', options) {
    const response = await fetch('/api/stars' + suffix, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }

  function explore() {
    $('#opening').hidden = true;
    $('#add').hidden = Boolean(draft);
  }

  function positionStars() {
    for (const { button, star } of nodes.values()) {
      const { x, y } = screen(star);
      button.hidden = x < -22 || y < -22 || x > width() + 22 || y > height() + 22;
      button.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    }
  }

  function renderStars() {
    const visible = new Map(publicStars.map((star) => [star.id, star]));
    for (const star of Object.values(personal)) {
      if (star.visibility === 'private') visible.set(star.id, star);
    }
    if (selected) visible.set(selected.id, selected);
    for (const [id, entry] of nodes) {
      if (!visible.has(id)) { entry.button.remove(); nodes.delete(id); }
    }
    for (const [id, star] of visible) {
      let entry = nodes.get(id);
      if (!entry) {
        const button = document.createElement('button');
        const light = document.createElement('span');
        const glyph = document.createElement('span');
        const pulse = document.createElement('span');
        light.className = 'star-light';
        glyph.className = 'star-glyph';
        pulse.className = 'star-pulse';
        glyph.textContent = '✦';
        light.append(glyph);
        button.append(light, pulse);
        button.type = 'button';
        button.className = 'star';
        button.style.setProperty('--delay', -(star.x % 5) + 's');
        button.addEventListener('click', () => {
          if (!draft && !suppressClick) {
            cancelAnimationFrame(cameraFrame);
            void openStarMessage(nodes.get(id)?.star);
          }
        });
        stars.append(button);
        entry = { button, light, pulse, star };
        nodes.set(id, entry);
      }
      entry.star = star;
      entry.button.dataset.color = star.color;
      entry.button.title = star.title;
      entry.button.setAttribute('aria-label', star.title);
      entry.button.classList.toggle('selected', selected?.id === id);
    }
    positionStars();
  }

  let listVersion = 0;
  async function refresh() {
    const version = ++listVersion;
    const entries = await api();
    if (version === listVersion) {
      publicStars = entries;
      renderStars();
    }
  }

  const specks = Array.from({ length: 470 }, (_, index) => ({
    x: Math.random(), y: Math.random(), size: .35 + Math.random() ** 4 * 1.55,
    alpha: .16 + Math.random() * .62, phase: Math.random() * 7, depth: .05 + index % 3 * .09, glint: index % 43 === 0
  }));
  const wrap = (value, max) => ((value % max) + max) % max;
  let scale = 1;
  let lastPaint = -Infinity;

  function queuePaint() {
    if (paintFrame === undefined && !document.hidden) paintFrame = requestAnimationFrame(paint);
  }

  const activeMeteors = [];
  let nextMeteorAt;
  let companionPending = false;
  const between = (min, max) => min + Math.random() * (max - min);

  // Bright star centers in the 1672 × 941 background image.
  const backgroundStars = [[165, 302], [399, 434], [443, 376], [790, 559], [918, 781], [1104, 646], [1270, 59]];
  let visibleGlints = [];

  function alignGlints(w, h) {
    const size = Math.max(w / 1672, h / 941);
    const [horizontal, vertical] = getComputedStyle(sky).backgroundPosition.split(' ').map(parseFloat);
    const left = (w - 1672 * size) * horizontal / 100;
    const top = (h - 941 * size) * vertical / 100;
    visibleGlints = backgroundStars.map(([x, y]) => [left + x * size, top + y * size])
      .filter(([x, y]) => x > 10 && x < w - 10 && y > 10 && y < h - 10);
    const fallback = [[w * .32, h * .36], [w * .68, h * .66]];
    visibleGlints.push(...fallback.slice(0, Math.max(0, 2 - visibleGlints.length)));
  }

  function paintGlints(time) {
    const interval = 1500;
    const elapsed = time + interval * .125;
    const cycle = Math.floor(elapsed / interval);
    const phase = (elapsed % interval) / interval;
    const envelope = Math.sin(phase * Math.PI);
    const pulse = envelope * (.18 + .82 * Math.sin(phase * Math.PI * 2) ** 2);
    const first = cycle * 2 % visibleGlints.length;
    drawGlint(visibleGlints[first], pulse);
    drawGlint(visibleGlints[(first + 1) % visibleGlints.length], pulse * .76);
  }

  function drawGlint([x, y], pulse) {
    const radius = 9 + pulse * 15;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(.28, '#b6ceff');
    glow.addColorStop(1, '#92aaff00');
    ctx.globalAlpha = pulse * .55;
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.fillStyle = '#e5eaff';
    ctx.globalAlpha = pulse * .55;
    ctx.fillRect(x - radius * .65, y - .5, radius * 1.3, 1);
    ctx.fillRect(x - .5, y - radius * .65, 1, radius * 1.3);
  }

  function createMeteor(time, w, h) {
    const direction = Math.random() < .82 ? 1 : -1;
    const start = between(.04, .36);
    const dx = between(.35, Math.min(.65, .96 - start));
    const drop = Math.min(between(.17, .31), dx * w / h * between(.42, .62));
    return {
      startTime: time,
      duration: between(1200, 2200),
      x: direction > 0 ? start : 1 - start,
      y: between(.09, .25),
      dx: dx * direction,
      drop,
      bend: drop * between(.055, .105),
      tail: between(.17, .27),
      core: Math.random() < .24 ? '#fff3d9' : '#fffaff'
    };
  }

  function meteorPoint(meteor, position, w, h) {
    // Cubic Bézier with evenly spaced controls along the chord and a slight downward offset at the end.
    return {
      x: (meteor.x + meteor.dx * position) * w,
      y: (meteor.y + meteor.drop * position + meteor.bend * position ** 3) * h
    };
  }

  function paintMeteor(meteor, progress, w, h, opacity) {
    const position = .82 * progress + .18 * progress ** 2;
    const alpha = Math.min(1, progress / .10) * Math.min(1, (1 - progress) / .32) * opacity;
    if (alpha <= 0) return;

    const head = meteorPoint(meteor, position, w, h);
    const tailPosition = Math.max(0, position - meteor.tail);
    const tail = meteorPoint(meteor, tailPosition, w, h);
    const tailLength = position - tailPosition;
    const width = Math.max(.55, Math.min(1.1, w / 860));
    const sides = [[], []];
    for (let i = 0; i <= 10; i++) {
      const fraction = i / 10;
      const t = tailPosition + tailLength * fraction;
      const point = meteorPoint(meteor, t, w, h);
      const dx = meteor.dx * w;
      const dy = (meteor.drop + 3 * meteor.bend * t ** 2) * h;
      const thickness = width * fraction ** .85 / Math.hypot(dx, dy);
      sides[0].push([point.x - dy * thickness, point.y + dx * thickness]);
      sides[1].push([point.x + dy * thickness, point.y - dx * thickness]);
    }
    const streak = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    streak.addColorStop(0, '#f9f4ff');
    streak.addColorStop(.28, '#b4c5ffab');
    streak.addColorStop(1, '#b1b7ff00');
    ctx.globalAlpha = alpha * .82;
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    for (const point of sides[0]) ctx.lineTo(...point);
    for (let i = sides[1].length - 1; i >= 0; i--) ctx.lineTo(...sides[1][i]);
    ctx.closePath();
    ctx.fill();

    const radius = width * 6;
    const halo = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, radius);
    halo.addColorStop(0, '#d8dcffb0');
    halo.addColorStop(1, '#a5baff00');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = halo;
    ctx.fillRect(head.x - radius, head.y - radius, radius * 2, radius * 2);
    ctx.fillStyle = meteor.core;
    ctx.beginPath();
    ctx.arc(head.x, head.y, width * 1.25, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintMeteors(time, w, h, opacity, travelling) {
    nextMeteorAt ??= time + between(1500, 4000);
    for (let i = activeMeteors.length - 1; i >= 0; i--) {
      const meteor = activeMeteors[i];
      const progress = (time - meteor.startTime) / meteor.duration;
      if (progress >= 1) activeMeteors.splice(i, 1);
      else paintMeteor(meteor, progress, w, h, opacity);
    }
    if (time < nextMeteorAt || travelling) return;
    activeMeteors.push(createMeteor(time, w, h));
    companionPending = !companionPending && Math.random() < .13;
    nextMeteorAt = time + (companionPending ? between(550, 950) : between(5500, 10000));
  }

  function resetMeteors() {
    activeMeteors.length = 0;
    nextMeteorAt = undefined;
    companionPending = false;
  }

  const descentDust = Array.from({ length: 84 }, (_, i) => ({
    x: (i * .61803398875) % 1,
    y: (i * .41421356237) % 1,
    depth: i % 3,
    drift: (i % 7 - 3) * 4,
    glow: i % 11 === 0
  }));

  function paintDescent(progress, w, h) {
    const distance = progress ** 2 * (3 - 2 * progress);
    const veil = Math.sin(progress * Math.PI) ** 1.6;
    const speed = 4 * progress * (1 - progress);
    for (const particle of descentDust) {
      const depth = particle.depth;
      const x = w * particle.x + particle.drift * distance * (depth + 1);
      const y = wrap(particle.y * h - h * distance * (.28 + depth * .34), h + 80);
      const edge = Math.min(1, y / 36, Math.max(0, h - y) / 36);
      const size = .7 + depth * .62;
      ctx.globalAlpha = veil * edge * (.25 + depth * .12);
      ctx.fillStyle = depth === 0 ? '#c6b9ff' : '#d5e7ff';
      ctx.fillRect(x, y, size, size);

      if (!particle.glow || edge <= 0) continue;
      const length = (5 + depth * 7) * speed;
      const trail = ctx.createLinearGradient(x, y, x - particle.drift * .3, y + length + 1);
      trail.addColorStop(0, '#dfeaff');
      trail.addColorStop(1, '#a6b7ff00');
      ctx.strokeStyle = trail;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - particle.drift * .3, y + length + 1);
      ctx.stroke();
      drawGlint([x, y], veil * edge * (.24 + depth * .13));
    }
  }

  let hillsideFrame;
  const pineArtwork = new Image();
  pineArtwork.src = '/wish-ground.jpg';
  // Each patch covers a painted grove above the grass line.
  const pineCrowns = [
    { x: 1344, y: 432, width: 116, height: 94, sway: 5, phase: .9 },
    { x: 1472, y: 320, width: 200, height: 172, sway: 12, phase: 0 }
  ];
  // Anchors follow the slope in the original 1672 × 941 artwork.
  const grassBlades = Array.from({ length: 125 }, (_, i) => {
    const x = 12 + i * 13.2;
    const spread = (i * .61803398875) % 1;
    return { x, y: 865 - x * .175 + spread * 74, height: 10 + spread * 22 };
  });
  const butterflies = [
    [.14, .77, .1, 1.0], [.23, .66, 2.7, .7],
    [.79, .71, 1.8, .85], [.88, .83, 3.2, 1.12], [.91, .61, 4.6, .66]
  ];

  function alignHillside(w, h) {
    const size = Math.max(w / 1672, h / 941);
    const [horizontal, vertical] = getComputedStyle(ground).backgroundPosition.split(' ').map(parseFloat);
    hillsideFrame = { size, left: (w - 1672 * size) * horizontal / 100, top: (h - 941 * size) * vertical / 100 };
  }

  function paintPines(age, w, { size, left }) {
    if (!pineArtwork.complete || !pineArtwork.naturalWidth) return;
    ctx.globalAlpha = 1;
    for (const { x, y, width, height, sway, phase } of pineCrowns) {
      if (left + (x + width) * size <= 0 || left + x * size >= w) continue;
      // Sample across fixed tile boundaries so the grove blends into the still painting.
      const rows = Math.ceil(height / 5);
      const rowHeight = height / rows;
      const columns = 4;
      const columnWidth = width / columns;
      for (let row = 0; row < rows; row++) {
        const depth = (row + .5) / rows;
        const bend = Math.sin(age * 1.35 + phase - depth * 1.5) * sway
          * Math.min(1, depth * 5) * (1 - depth) ** 1.5;
        const rowY = y + row * rowHeight;
        for (let column = 0; column < columns; column++) {
          const tileX = x + column * columnWidth;
          const leftBend = bend * Math.sin(Math.PI * column / columns);
          const rightBend = bend * Math.sin(Math.PI * (column + 1) / columns);
          ctx.drawImage(pineArtwork, tileX - leftBend, rowY, columnWidth + leftBend - rightBend, rowHeight,
            tileX, rowY, columnWidth, rowHeight);
        }
      }
    }
  }

  function paintBreeze(time, w) {
    if (!hillsideFrame || !hillsideFrame.size) return;
    const { size, left, top } = hillsideFrame;
    const age = time / 1000;
    ctx.save();
    ctx.translate(left, top);
    ctx.scale(size, size);
    paintPines(age, w, hillsideFrame);

    // Two low clouds drift independently across the valley.
    for (const [x, y, radius, phase] of [[288, 625, 280, 0], [920, 542, 230, 2.7]]) {
      ctx.save();
      ctx.translate(x + Math.sin(age * .23 + phase) * 65, y);
      ctx.scale(1, .15);
      ctx.globalAlpha = .7;
      const mist = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      mist.addColorStop(0, '#7eabf438');
      mist.addColorStop(1, '#7eabf400');
      ctx.fillStyle = mist;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }

    for (const { x, y, height } of grassBlades) {
      if (left + x * size < -30 || left + x * size > w + 30) continue;
      const wave = Math.sin(age * 2.05 - x * .012);
      const lean = 4 + wave * 9;
      ctx.globalAlpha = .45 + wave * .12;
      ctx.strokeStyle = height > 23 ? '#4586b5' : '#214c77';
      ctx.lineWidth = height > 23 ? 1.3 : .8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + lean * .15, y - height * .55, x + lean, y - height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintButterflies(time, w, h) {
    for (const [anchorX, anchorY, phase, size] of butterflies) {
      const age = time / 1000 + phase;
      const x = w * anchorX + Math.sin(age * .62) * Math.min(35, w * .06);
      const y = h * anchorY + Math.cos(age * .81) * 19 + Math.sin(age * 1.8) * 4;
      const flutter = (.24 + .76 * Math.abs(Math.sin(age * 9))) * 6 * size;
      ctx.globalAlpha = .54 + .18 * Math.sin(age * 1.5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(age * .62) * .32);
      ctx.fillStyle = '#c4d0ff';
      ctx.shadowColor = '#7d9cff';
      ctx.shadowBlur = 9 * size;
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.quadraticCurveTo(-flutter * 1.22, -6 * size, -flutter, -2 * size);
      ctx.quadraticCurveTo(-flutter * .7, 2 * size, 0, 1);
      ctx.moveTo(0, 1);
      ctx.quadraticCurveTo(flutter * 1.22, -6 * size, flutter, -2 * size);
      ctx.quadraticCurveTo(flutter * .7, 2 * size, 0, 1);
      ctx.fill();
      ctx.restore();
    }
  }

  function paint(time) {
    paintFrame = undefined;
    if (document.hidden) return;
    if (sceneFlight || activeMeteors.length || time - lastPaint >= 32 || reduced.matches) {
      lastPaint = time;
      const w = width(), h = height();
      const flight = sceneFlight?.effect.getComputedTiming().progress ?? 0;
      const landed = universe.classList.contains('wish-ground');
      const descent = sceneFlight ? flight : Number(landed);
      ctx.clearRect(0, 0, w, h);
      if (landed && !sceneFlight && !reduced.matches) paintBreeze(time, w);
      ctx.fillStyle = '#e8dcff';
      for (const point of specks) {
        const x = wrap(point.x * w - camera.x * point.depth, w);
        const y = wrap(point.y * h - camera.y * point.depth - h * descent * point.depth * .6, h);
        ctx.globalAlpha = point.alpha * (1 - descent * .62) * (reduced.matches ? 1 : .8 + Math.sin(time / 1200 + point.phase) * .2);
        ctx.fillRect(x, y, point.size, point.size);
        if (point.glint) {
          ctx.globalAlpha *= .48;
          ctx.fillRect(x - 3, y, 7, 1);
          ctx.fillRect(x, y - 3, 1, 7);
        }
      }
      if (!reduced.matches && w > 0 && h > 0) {
        const meteorOpacity = sceneFlight ? Math.abs(1 - 2 * descent) : landed ? .78 : 1;
        paintMeteors(time, w, h, meteorOpacity, Boolean(sceneFlight));
        if (descent < .1 && visibleGlints.length >= 2) paintGlints(time);
      }
      if (sceneFlight && !reduced.matches && w > 0 && h > 0) paintDescent(flight, w, h);
      if (landed && !sceneFlight && !reduced.matches) paintButterflies(time, w, h);
      ctx.globalAlpha = 1;
    }
    if (!reduced.matches) queuePaint();
  }

  new ResizeObserver(() => {
    scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width() * scale);
    canvas.height = Math.round(height() * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    alignGlints(width(), height());
    alignHillside(width(), height());
    positionStars();
    queuePaint();
  }).observe(sky);
  reduced.addEventListener('change', () => {
    resetMeteors();
    queuePaint();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (paintFrame !== undefined) cancelAnimationFrame(paintFrame);
      paintFrame = undefined;
      resetMeteors();
    } else {
      queuePaint();
    }
  });

  function updateView() {
    positionStars();
    queuePaint();
  }

  function focusStar(star) {
    explore();
    selected = star;
    $('#selected-title').textContent = star.title;
    $('#selection').hidden = false;
    renderStars();
    cancelAnimationFrame(cameraFrame);
    const start = performance.now();
    const origin = { ...camera };
    const move = (now) => {
      const progress = reduced.matches ? 1 : Math.min(1, (now - start) / 650);
      const step = 1 - (1 - progress) ** 3;
      camera.x = origin.x + (star.x - origin.x) * step;
      camera.y = origin.y + (star.y - origin.y) * step;
      updateView();
      if (progress < 1) cameraFrame = requestAnimationFrame(move);
      else nodes.get(star.id)?.button.focus({ preventScroll: true });
    };
    cameraFrame = requestAnimationFrame(move);
  }

  function clearSelection() {
    selected = undefined;
    $('#selection').hidden = true;
    renderStars();
  }

  let suppressClick = false;
  sky.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || saving) return;
    cancelAnimationFrame(cameraFrame);
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: { ...camera }, moved: false };
  });
  sky.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return;
    if (!drag.moved) sky.setPointerCapture(event.pointerId);
    drag.moved = true;
    explore();
    sky.classList.add('dragging');
    camera.x = clamp(drag.start.x - dx, world.x);
    camera.y = clamp(drag.start.y - dy, world.y);
    updateView();
  });
  function finishDrag(event) {
    if (drag?.id !== event.pointerId) return;
    suppressClick = drag.moved;
    drag = undefined;
    sky.classList.remove('dragging');
    if (event.type === 'pointerup' && !suppressClick && draft) {
      const rect = sky.getBoundingClientRect();
      place(toWorld(event.clientX - rect.left, event.clientY - rect.top));
    }
    if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
  }
  sky.addEventListener('pointerup', finishDrag);
  sky.addEventListener('pointercancel', finishDrag);
  sky.addEventListener('lostpointercapture', finishDrag);
  sky.addEventListener('pointerleave', (event) => { if (!drag?.moved) finishDrag(event); });
  sky.addEventListener('keydown', (event) => {
    const direction = { ArrowUp: [0, -90], ArrowDown: [0, 90], ArrowLeft: [-90, 0], ArrowRight: [90, 0] }[event.key];
    if (!direction) return;
    event.preventDefault();
    cancelAnimationFrame(cameraFrame);
    explore();
    camera.x = clamp(camera.x + direction[0], world.x);
    camera.y = clamp(camera.y + direction[1], world.y);
    updateView();
  });

  let searchVersion = 0;
  let debounce;
  function closeSearch() {
    searchVersion++;
    clearTimeout(debounce);
    matches.hidden = true;
  }
  function scheduleSearch() {
    closeSearch();
    const term = query.value.trim();
    const version = searchVersion;
    if (!term) return;
    debounce = setTimeout(async () => {
      try {
        const results = await api('?q=' + encodeURIComponent(term));
        if (version !== searchVersion) return;
        const rows = results.map((star) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = '✦ ' + star.title + (star.author ? ' · ' + star.author : '');
          button.addEventListener('click', () => { closeSearch(); focusStar(star); });
          return button;
        });
        if (!rows.length) {
          const empty = document.createElement('p');
          empty.textContent = 'No matching public stars.';
          rows.push(empty);
        }
        matches.replaceChildren(...rows);
        matches.hidden = false;
      } catch { if (version === searchVersion) tell('Search is temporarily unavailable.'); }
    }, 180);
  }
  query.addEventListener('input', scheduleSearch);
  query.addEventListener('focus', scheduleSearch);
  $('.search-area').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeSearch(); query.focus(); closeSearch(); }
    if (event.key === 'ArrowDown' || (event.key === 'Enter' && event.target === query)) {
      if (!matches.hidden && matches.querySelector('button')) {
        event.preventDefault();
        matches.querySelector('button').focus();
      }
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.search-area')) closeSearch();
  });

  function resetPlacement() {
    draft = undefined;
    $('#placement').hidden = true;
    sky.classList.remove('placing');
    explore();
  }

  async function place(point) {
    if (!draft || saving) return;
    const submitted = draft;
    saving = true;
    $('#center').disabled = $('#cancel').disabled = true;
    try {
      const { owner, access, ...star } = await api('', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...submitted, ...point })
      });
      cacheStarMessage({ ...star, note: submitted.note.trim(), photos: submitted.photos ?? [], canDelete: true });
      personal[star.id] = { ...star, owner, access };
      const saved = remember();
      if (star.visibility === 'public') {
        listVersion++;
        publicStars = [star, ...publicStars];
      }
      resetPlacement();
      form.reset();
      renderStars();
      const placed = nodes.get(star.id);
      if (placed && !reduced.matches) {
        placed.light.animate([
          { opacity: .35, scale: .66 },
          { opacity: 1, scale: 1.12, offset: .56 },
          { opacity: 1, scale: 1 }
        ], { duration: 420, easing: 'ease-out' });
      }
      placed?.button.focus({ preventScroll: true });
      tell(saved ? 'Your star is in the sky.' : 'Your star is placed, but this browser couldn’t save your access.');
      if (star.visibility === 'private') void openStarMessage(star);
    } catch (error) { tell(error.message); }
    finally { saving = false; $('#center').disabled = $('#cancel').disabled = false; }
  }

  function credentials(star) {
    const entry = personal[star.id];
    return { ...(entry?.owner ? { 'x-star-owner': entry.owner } : {}),
      ...(star.access || entry?.access ? { 'x-star-access': star.access || entry.access } : {}) };
  }

  function cacheStarMessage(message) {
    if (starMessages.size >= 8) starMessages.delete(starMessages.keys().next().value);
    starMessages.set(message.id, message);
  }

  function photoImage(data, alt) {
    const image = new Image();
    image.alt = alt;
    image.decoding = 'async';
    image.src = 'data:image/jpeg;base64,' + data;
    return image;
  }

  const readerPhotos = $('#read-photos');
  const readerStatus = $('#read-status');
  const readerMessage = $('#read-message');

  function showStarMessage(message, access) {
    current = { ...message, access };
    reader.dataset.color = current.color;
    $('#read-title').textContent = current.title;
    $('#read-note').textContent = current.note;
    const photos = current.photos ?? [];
    readerPhotos.replaceChildren(...photos.map((photo, index) => photoImage(photo, 'Attached photo ' + (index + 1))));
    readerPhotos.hidden = !photos.length;
    $('#read-author').textContent = current.author ? 'Left by ' + current.author : '';
    $('#read-date').dateTime = current.created;
    $('#read-date').textContent = new Date(current.created).toLocaleDateString(undefined, { dateStyle: 'long' });
    $('#copy').hidden = !current.access;
    $('#copy').textContent = 'Copy private link';
    $('#delete').hidden = !current.canDelete;
    $('#delete').textContent = 'Delete star';
    readerStatus.textContent = '';
    readerMessage.hidden = false;
  }

  function showReader() {
    reader.showModal();
    reader.scrollTop = 0;
    if (!reduced.matches) {
      readerAnimation = reader.animate([
        { opacity: 0, transform: 'translateY(10px) scale(.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 300, easing: 'cubic-bezier(.18,.75,.25,1)' });
    }
  }

  async function openStarMessage(star) {
    if (!star || reader.open || readerClosing || compose.open || collection.open || universe.inert || draft) return;
    const entry = nodes.get(star.id);
    readerFocus = { starId: star.id, fallback: document.activeElement };
    if (entry && !reduced.matches) {
      entry.pulse.animate([
        { opacity: .92, transform: 'scale(.72)' },
        { opacity: 0, transform: 'scale(1.45)' }
      ], { duration: 160, easing: 'ease-out' });
      entry.light.animate([
        { filter: 'brightness(1.3)' }, { filter: 'brightness(var(--star-brightness))' }
      ], { duration: 160, easing: 'ease-out' });
    }

    const access = star.access || personal[star.id]?.access;
    const cached = starMessages.get(star.id);
    if (cached) {
      showStarMessage(cached, access);
      showReader();
      return;
    }

    reader.dataset.color = star.color || '';
    $('#read-title').textContent = star.title || 'Star message';
    readerMessage.hidden = true;
    readerStatus.textContent = 'Opening this star…';
    showReader();
    const request = new AbortController();
    readerRequest = request;
    try {
      const message = await api('/' + star.id, { headers: credentials(star), signal: request.signal });
      if (request.signal.aborted) return;
      cacheStarMessage(message);
      showStarMessage(message, access);
    } catch (error) {
      if (!request.signal.aborted) readerStatus.textContent = error.message || 'This star could not be opened.';
    } finally {
      if (readerRequest === request) readerRequest = undefined;
    }
  }

  async function closeReader() {
    if (!reader.open || readerClosing) return;
    readerClosing = true;
    readerRequest?.abort();
    if (!reduced.matches) {
      const { opacity, transform } = getComputedStyle(reader);
      readerAnimation?.cancel();
      readerAnimation = reader.animate([
        { opacity, transform },
        { opacity: 0, transform: 'translateY(6px) scale(.97)' }
      ], { duration: 175, easing: 'ease-out', fill: 'forwards' });
      await readerAnimation.finished.catch(() => {});
    }
    reader.close();
  }

  reader.querySelector('.close').addEventListener('click', closeReader);
  reader.addEventListener('cancel', (event) => {
    event.preventDefault();
    void closeReader();
  });
  reader.addEventListener('close', () => {
    readerRequest?.abort();
    readerRequest = undefined;
    readerAnimation?.cancel();
    readerAnimation = undefined;
    readerClosing = false;
    const focus = readerFocus;
    readerFocus = undefined;
    current = undefined;
    readerPhotos.replaceChildren();
    readerPhotos.hidden = true;
    readerStatus.textContent = '';
    readerMessage.hidden = true;
    const starButton = nodes.get(focus?.starId)?.button;
    const fallback = focus?.fallback;
    const target = starButton?.isConnected && !starButton.hidden ? starButton
      : fallback?.isConnected && fallback.getClientRects().length && fallback !== document.body ? fallback : sky;
    target.focus({ preventScroll: true });
  });
  $('#copy').addEventListener('click', async () => {
    if (!current?.access) return;
    const link = location.origin + '/#star=' + current.id + '&key=' + current.access;
    try {
      await navigator.clipboard.writeText(link);
      $('#copy').textContent = 'Link copied';
    } catch { window.prompt('Copy this private link', link); }
  });
  $('#delete').addEventListener('click', async () => {
    if (!current?.canDelete || !window.confirm('Delete this star permanently?')) return;
    const star = current;
    $('#delete').disabled = true;
    try {
      await api('/' + star.id, { method: 'DELETE', headers: credentials(star) });
      starMessages.delete(star.id);
      delete personal[star.id];
      remember();
      listVersion++;
      publicStars = publicStars.filter((entry) => entry.id !== star.id);
      if (selected?.id === star.id) clearSelection();
      if (current?.id === star.id) void closeReader();
      renderStars();
      tell('Star deleted.');
    } catch (error) { window.alert(error.message); }
    finally { $('#delete').disabled = false; }
  });

  $('#saved').addEventListener('click', () => {
    const rows = Object.values(personal).reverse().map((star) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '✦ ' + star.title + (star.visibility === 'private' ? ' · Private' : '');
      button.addEventListener('click', () => { collection.close(); focusStar(star); });
      return button;
    });
    $('#saved-list').replaceChildren(...(rows.length ? rows : [document.createTextNode('No stars saved yet.')]));
    collection.showModal();
  });
  $('#explore').addEventListener('click', () => { explore(); sky.focus(); });
  const scenicControls = universe.querySelectorAll('header,#opening,#selection,#add,#status,footer');
  const sceneStages = [
    [skyBackdrop, [
      { offset: 0, transform: 'translateY(0) scale(1)', opacity: 1 },
      { offset: .25, transform: 'translateY(-4%) scale(1.10)', opacity: 1 },
      { offset: .66, transform: 'translateY(-19%) scale(1.42)', opacity: 0 },
      { offset: 1, transform: 'translateY(-19%) scale(1.42)', opacity: 0 }
    ]],
    [ground, [
      { offset: 0, transform: 'translateY(15%) scale(1.35)', opacity: 0 },
      { offset: .50, transform: 'translateY(15%) scale(1.35)', opacity: 0 },
      { offset: .77, transform: 'translateY(3%) scale(1.19)', opacity: .85 },
      { offset: 1, transform: 'translateY(0) scale(1)', opacity: 1 }
    ]],
    [atmosphere, [
      { offset: 0, opacity: 0 }, { offset: .22, opacity: .20 },
      { offset: .48, opacity: 1 }, { offset: .7, opacity: .68 }, { offset: 1, opacity: 0 }
    ]],
    [stars, [
      { offset: 0, transform: 'translateY(0)', opacity: 1 },
      { offset: .27, transform: 'translateY(-14%)', opacity: .28 },
      { offset: .46, transform: 'translateY(-38%)', opacity: 0 }, { offset: 1, opacity: 0 }
    ]],
    ...Array.from(scenicControls, (element) => [element, [
      { offset: 0, opacity: 1 }, { offset: .25, opacity: 0 }, { offset: 1, opacity: 0 }
    ]])
  ];

  async function travelToWish(entering) {
    universe.inert = true;
    if (!reduced.matches) {
      const duration = entering ? 3500 : 3000;
      const animations = sceneStages.map(([element, stages]) => element.animate(
        stages,
        { duration, easing: 'cubic-bezier(.42,0,.27,1)', direction: entering ? 'normal' : 'reverse', fill: 'both' }
      ));
      const skipMotion = () => {
        if (reduced.matches) for (const animation of animations) animation.finish();
      };
      sceneFlight = animations[0];
      reduced.addEventListener('change', skipMotion);
      queuePaint();
      await Promise.allSettled(animations.map(animation => animation.finished));
      reduced.removeEventListener('change', skipMotion);
      universe.classList.toggle('wish-ground', entering);
      for (const animation of animations) animation.cancel();
      sceneFlight = undefined;
    } else {
      universe.classList.toggle('wish-ground', entering);
    }
    universe.inert = false;
    queuePaint();
  }

  let wishTrigger;
  let wishHomeRequested = false;
  const spotifyPanel = $('#site-spotify');
  const spotifyHost = $('#spotify-embed');
  const homeSpotify = $('#home-spotify');
  const wishSpotify = $('#wish-spotify');
  let spotifyApi;
  let spotifyApiFailed = false;
  let spotifyController;
  let spotifyCanRetry = false;
  let spotifyRequest = 0;

  function mountSpotify() {
    if (spotifyPanel.hidden) return;
    if (!spotifyApi) {
      if (!spotifyApiFailed) return;
      const frame = document.createElement('iframe');
      frame.src = spotifyHost.dataset.src;
      frame.title = 'Luvy Dovey soundtrack on Spotify';
      frame.loading = 'lazy';
      frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      spotifyHost.replaceChildren(frame);
      return;
    }
    const mount = document.createElement('div');
    const request = ++spotifyRequest;
    spotifyHost.replaceChildren(mount);
    const trackUrl = spotifyHost.dataset.src.replace('/embed/track/', '/track/');
    spotifyApi.createController(mount, { url: trackUrl, width: 360, height: 152 }, controller => {
      if (request !== spotifyRequest) {
        controller.destroy();
        return;
      }
      spotifyController = controller;
      controller.addListener('playback_started', () => {
        if (request === spotifyRequest) spotifyCanRetry = false;
      });
      controller.addListener('ready', () => {
        if (request !== spotifyRequest || spotifyPanel.hidden) return;
        spotifyCanRetry = true;
        controller.play();
      });
    });
  }

  function unmountSpotify() {
    spotifyRequest++;
    spotifyCanRetry = false;
    spotifyController?.destroy();
    spotifyController = undefined;
    spotifyHost.replaceChildren();
  }

  function syncSpotifyLayout() {
    if (!spotifyPanel) return;
    homeSpotify.hidden = spotifyPanel.hidden || !homeSpotify.contains(spotifyPanel);
    wishSpotify.hidden = spotifyPanel.hidden || !wishSpotify.contains(spotifyPanel);
    compose.classList.toggle('spotify-open', !wishSpotify.hidden);
  }

  function moveSpotify(slot) {
    if (!spotifyPanel || spotifyPanel.parentElement === slot) return;
    if (typeof slot.moveBefore === 'function') slot.moveBefore(spotifyPanel, null);
    else {
      unmountSpotify();
      slot.append(spotifyPanel);
      if (!spotifyPanel.hidden) mountSpotify();
    }
    syncSpotifyLayout();
  }

  if (spotifyPanel) {
    document.addEventListener('click', (event) => {
      if (!spotifyCanRetry || spotifyPanel.hidden || event.target.closest('[data-spotify-toggle]')) return;
      spotifyCanRetry = false;
      spotifyController.play();
    }, true);
    const spotifyButtons = document.querySelectorAll('[data-spotify-toggle]');
    for (const button of spotifyButtons) button.addEventListener('click', () => {
      const open = spotifyPanel.hidden;
      spotifyPanel.hidden = !open;
      for (const toggle of spotifyButtons) {
        toggle.toggleAttribute('data-playing', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close Spotify player' : 'Open Spotify player');
      }
      syncSpotifyLayout();
      if (open) mountSpotify();
      else unmountSpotify();
    });
    window.onSpotifyIframeApiReady = (api) => {
      spotifyApi = api;
      mountSpotify();
    };
    const apiScript = document.createElement('script');
    apiScript.src = 'https://open.spotify.com/embed/iframe-api/v1';
    apiScript.async = true;
    apiScript.addEventListener('error', () => {
      spotifyApiFailed = true;
      mountSpotify();
    }, { once: true });
    document.head.append(apiScript);
  }

  async function openWish(event) {
    if (universe.inert || compose.open || reader.open || readerClosing || collection.open) return;
    wishTrigger = event.currentTarget;
    await travelToWish(true);
    moveSpotify(wishSpotify);
    compose.showModal();
    if (!reduced.matches) {
      wishCard.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 200, easing: 'ease-out' });
    }
  }
  for (const id of ['#make', '#add']) $(id).addEventListener('click', openWish);
  $('#wish-home').addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    wishHomeRequested = true;
    compose.close();
  });
  compose.addEventListener('close', async () => {
    moveSpotify(homeSpotify);
    closePlanetGuide();
    const returnHome = wishHomeRequested;
    wishHomeRequested = false;
    if (returnHome) {
      cancelAnimationFrame(cameraFrame);
      camera.x = world.x / 2;
      camera.y = world.y / 2;
      clearSelection();
      $('#opening').hidden = false;
      $('#add').hidden = true;
    }
    await travelToWish(false);
    if (returnHome) {
      $('header .brand').focus({ preventScroll: true });
    } else if (draft) {
      clearSelection();
      explore();
      sky.classList.add('placing');
      $('#placement').hidden = false;
      $('#center').focus();
    } else {
      wishTrigger?.focus({ preventScroll: true });
    }
  });
  for (const dialog of [compose, collection]) {
    dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  }
  const planetHelp = $('#planet-help');
  const planetHelpButton = $('#planet-help-button');
  const planetGuide = $('#planet-guide');
  let planetGuidePinned = false;

  function showPlanetGuide(open) {
    planetGuide.hidden = !open;
    planetHelpButton.setAttribute('aria-expanded', String(open));
  }

  function closePlanetGuide() {
    planetGuidePinned = false;
    showPlanetGuide(false);
  }

  planetHelp.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') showPlanetGuide(true);
  });
  planetHelp.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !planetGuidePinned) closePlanetGuide();
  });
  planetHelpButton.addEventListener('click', () => {
    planetGuidePinned = !planetGuidePinned;
    showPlanetGuide(planetGuidePinned);
  });
  planetHelp.addEventListener('focusout', (event) => {
    if (!planetHelp.contains(event.relatedTarget)) closePlanetGuide();
  });
  compose.addEventListener('pointerdown', (event) => {
    if (!planetHelp.contains(event.target)) closePlanetGuide();
  });
  compose.addEventListener('cancel', (event) => {
    if (planetGuide.hidden) return;
    event.preventDefault();
    closePlanetGuide();
  });

  const photoMemory = $('#wish-memory');
  const photoCount = $('#wish-memory-count');
  const photoFiles = $('#wish-photos');
  const photoPicker = $('#pick-wish-photos');
  const photoDrop = $('#wish-photo-drop');
  const photoPreviews = $('#wish-photo-previews');
  const photoFeedback = $('#wish-photos-feedback');
  const submitWish = form.querySelector('[type=submit]');
  const maxPhotos = Number(photoFiles.dataset.maxCount);
  const maxPhotoEdge = Number(photoFiles.dataset.maxEdge);
  const maxPhotoLength = Number(photoFiles.dataset.maxLength);
  const wishPhotos = [];
  let preparingPhotos = false;

  function renderWishPhotos() {
    photoPreviews.replaceChildren(...wishPhotos.map((photo, index) => {
      const tile = document.createElement('div');
      tile.className = 'wish-photo-preview';
      const remove = document.createElement('button');
      remove.className = 'wish-photo-remove';
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Remove photo ' + (index + 1));
      remove.addEventListener('click', () => {
        wishPhotos.splice(index, 1);
        renderWishPhotos();
        photoPicker.focus();
      });
      tile.append(photoImage(photo, 'Selected photo ' + (index + 1)), remove);
      return tile;
    }));
    photoPreviews.hidden = !wishPhotos.length;
    photoCount.textContent = wishPhotos.length ? ' · ' + wishPhotos.length + ' added' : '';
    photoPicker.disabled = preparingPhotos || wishPhotos.length >= maxPhotos;
  }

  async function prepareWishPhoto(file) {
    if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo smaller than 25 MB.');
    if ((file.type && !file.type.startsWith('image/')) || file.type === 'image/svg+xml') {
      throw new Error('Choose a photo such as a JPG, PNG, or WebP.');
    }
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      try { await image.decode(); }
      catch { throw new Error('This photo could not be opened. Try a JPG, PNG, or WebP.'); }
      const scale = Math.min(1, maxPhotoEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const resized = document.createElement('canvas');
      resized.width = Math.max(1, Math.round(image.naturalWidth * scale));
      resized.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = resized.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, resized.width, resized.height);
      context.drawImage(image, 0, 0, resized.width, resized.height);
      const prefix = 'data:image/jpeg;base64,';
      for (const quality of [.84, .65, .45, .28]) {
        const data = resized.toDataURL('image/jpeg', quality);
        if (data.startsWith(prefix) && data.length <= prefix.length + maxPhotoLength) return data.slice(prefix.length);
      }
      throw new Error('This photo is too large to attach. Try a smaller one.');
    } finally {
      URL.revokeObjectURL(source);
    }
  }

  async function addWishPhotos(files) {
    if (!files.length || preparingPhotos) return;
    if (files.length + wishPhotos.length > maxPhotos) {
      photoFeedback.textContent = 'You can attach up to ' + maxPhotos + ' photos.';
      return;
    }
    preparingPhotos = photoPicker.disabled = submitWish.disabled = true;
    photoFeedback.textContent = 'Preparing photos…';
    try {
      const prepared = [];
      for (const file of files) prepared.push(await prepareWishPhoto(file));
      wishPhotos.push(...prepared);
      photoFeedback.textContent = '';
    } catch (error) {
      photoFeedback.textContent = error.message;
    } finally {
      preparingPhotos = submitWish.disabled = false;
      renderWishPhotos();
    }
  }

  photoPicker.addEventListener('click', () => photoFiles.click());
  photoFiles.addEventListener('change', () => {
    const files = Array.from(photoFiles.files);
    photoFiles.value = '';
    void addWishPhotos(files);
  });
  function allowPhotoDrop(event) {
    if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    photoDrop.classList.add('is-dragging');
  }
  photoDrop.addEventListener('dragenter', allowPhotoDrop);
  photoDrop.addEventListener('dragover', allowPhotoDrop);
  photoDrop.addEventListener('dragleave', (event) => {
    if (!photoDrop.contains(event.relatedTarget)) photoDrop.classList.remove('is-dragging');
  });
  photoDrop.addEventListener('drop', (event) => {
    photoDrop.classList.remove('is-dragging');
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    void addWishPhotos(Array.from(event.dataTransfer.files));
  });
  form.addEventListener('reset', () => {
    wishPhotos.length = 0;
    photoMemory.open = false;
    photoFeedback.textContent = '';
    renderWishPhotos();
  });

  const requiredWishFields = [
    { input: form.elements.title, message: 'Give your little star a name.' },
    { input: form.elements.note, message: 'Write a few words for your star to carry.' },
    { input: form.elements.planet, message: 'Choose a planet for your star.' }
  ];

  function showWishError(input, message) {
    document.getElementById(input.id + '-error').textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  for (const { input } of requiredWishFields) {
    input.addEventListener('input', () => {
      if (input.value.trim()) showWishError(input, '');
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (preparingPhotos) return;
    let firstInvalid;
    for (const { input, message } of requiredWishFields) {
      const error = input.value.trim() ? '' : message;
      showWishError(input, error);
      if (error) firstInvalid ??= input;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    draft = { ...Object.fromEntries(new FormData(form)), visibility: 'public', photos: [...wishPhotos] };
    compose.close();
  });
  $('#center').addEventListener('click', () => place({ ...camera }));
  $('#cancel').addEventListener('click', resetPlacement);
  $('#pull').addEventListener('click', () => { void openStarMessage(selected); });
  $('#dismiss').addEventListener('click', clearSelection);

  const fragment = new URLSearchParams(location.hash.slice(1));
  if (fragment.has('star') && fragment.has('key')) {
    history.replaceState(null, '', location.pathname + location.search);
    explore();
    const linkedStar = { id: encodeURIComponent(fragment.get('star')), access: fragment.get('key') };
    void openStarMessage(linkedStar);
  }
  const music = $('#site-music');
  if (music) {
    const buttons = document.querySelectorAll('[data-music-toggle]');
    const musicPreference = 'luvy-dovey-music';
    const syncMusic = () => {
      for (const button of buttons) {
        button.toggleAttribute('data-playing', !music.paused);
        button.disabled = Boolean(music.error);
        button.setAttribute('aria-label', music.error ? 'Music unavailable' : music.paused ? 'Play music' : 'Stop music');
      }
    };
    const playMusic = () => { void music.play().catch(syncMusic); };
    for (const event of ['play', 'pause', 'error']) music.addEventListener(event, syncMusic);
    for (const button of buttons) button.addEventListener('click', () => {
      const shouldPlay = music.paused;
      try { localStorage.setItem(musicPreference, shouldPlay ? 'on' : 'off'); } catch {}
      if (shouldPlay) playMusic();
      else {
        music.pause();
        music.currentTime = 0;
      }
    });
    let autoplay = true;
    try { autoplay = localStorage.getItem(musicPreference) !== 'off'; } catch {}
    syncMusic();
    if (autoplay) playMusic();
  }

  renderStars();
  refresh().catch((error) => tell(error.message));
  setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 7000);
})();
