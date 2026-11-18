(() => {
  const $ = (selector) => document.querySelector(selector);
  const sky = $('#sky');
  const stars = $('#stars');
  const canvas = $('#dust');
  const ctx = canvas.getContext('2d');
  const query = $('#query');
  const matches = $('#matches');
  const reader = $('#reader');
  const compose = $('#compose');
  const collection = $('#collection');
  const form = $('#star-form');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const world = { x: 2400, y: 1600 };
  const camera = { x: 1200, y: 800 };
  const storageKey = 'luvy-dovey-stars';
  const nodes = new Map();
  let personal = Object.create(null);
  try { personal = Object.assign(personal, JSON.parse(localStorage.getItem(storageKey) || '{}')); } catch {}
  let publicStars = [];
  let selected;
  let draft;
  let saving = false;
  let traveling = false;
  let current;
  let drag;
  let cameraFrame;
  let drawing = false;
  let birth;
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
        const glyph = document.createElement('span');
        glyph.textContent = '✦';
        button.append(glyph);
        button.type = 'button';
        button.className = 'star';
        button.style.setProperty('--delay', -(star.x % 5) + 's');
        button.addEventListener('click', () => {
          if (!draft && !suppressClick) pullStar(nodes.get(id)?.star);
        });
        stars.append(button);
        entry = { button, star };
        nodes.set(id, entry);
      }
      entry.star = star;
      entry.button.dataset.color = star.color;
      entry.button.title = star.title;
      entry.button.setAttribute('aria-label', star.title);
      entry.button.classList.toggle('selected', selected?.id === id);
      entry.button.classList.toggle('born', birth === id);
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

  const specks = Array.from({ length: 330 }, (_, index) => ({
    x: Math.random(), y: Math.random(), size: .35 + Math.random() ** 4 * 1.55,
    alpha: .16 + Math.random() * .62, phase: Math.random() * 7, depth: .05 + index % 3 * .09
  }));
  const wrap = (value, max) => ((value % max) + max) % max;
  let scale = 1;
  let lastPaint = -Infinity;

  function queuePaint() {
    if (!drawing && !document.hidden) {
      drawing = true;
      requestAnimationFrame(paint);
    }
  }

  function paint(time) {
    drawing = false;
    if (time - lastPaint >= 32 || reduced.matches) {
      lastPaint = time;
      const w = width(), h = height();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#e8dcff';
      for (const point of specks) {
        const x = wrap(point.x * w - camera.x * point.depth, w);
        const y = wrap(point.y * h - camera.y * point.depth, h);
        ctx.globalAlpha = point.alpha * (reduced.matches ? 1 : .8 + Math.sin(time / 1200 + point.phase) * .2);
        ctx.fillRect(x, y, point.size, point.size);
      }
      const progress = (time % 14500 - 4000) / 900;
      if (!reduced.matches && progress > 0 && progress < 1) {
        const x = w * (.88 - progress * .47), y = h * (.16 + progress * .3);
        const trail = ctx.createLinearGradient(x, y, x + 85, y - 35);
        trail.addColorStop(0, '#eee1ff');
        trail.addColorStop(1, '#eee1ff00');
        ctx.globalAlpha = Math.sin(progress * Math.PI);
        ctx.strokeStyle = trail;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 85, y - 35);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (!reduced.matches) queuePaint();
  }

  new ResizeObserver(() => {
    scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width() * scale);
    canvas.height = Math.round(height() * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    positionStars();
    queuePaint();
  }).observe(sky);
  reduced.addEventListener('change', queuePaint);
  document.addEventListener('visibilitychange', queuePaint);

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
    saving = true;
    $('#center').disabled = $('#cancel').disabled = true;
    try {
      const star = await api('', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, ...point })
      });
      personal[star.id] = star;
      const saved = remember();
      if (star.visibility === 'public') {
        listVersion++;
        publicStars = [star, ...publicStars];
      }
      birth = star.id;
      resetPlacement();
      form.reset();
      renderStars();
      setTimeout(() => { if (birth === star.id) { birth = undefined; renderStars(); } }, 1000);
      tell(saved ? 'Your star is in the sky.' : 'Your star is placed, but this browser couldn’t save your access.');
      if (star.visibility === 'private') await pullStar(star);
    } catch (error) { tell(error.message); }
    finally { saving = false; $('#center').disabled = $('#cancel').disabled = false; }
  }

  function credentials(star) {
    const entry = personal[star.id];
    return { ...(entry?.owner ? { 'x-star-owner': entry.owner } : {}),
      ...(star.access || entry?.access ? { 'x-star-access': star.access || entry.access } : {}) };
  }

  async function fly(star, reverse = false) {
    if (reduced.matches) return;
    const glyph = document.createElement('div');
    const point = screen(star);
    glyph.dataset.color = star.color;
    glyph.className = 'traveler';
    glyph.textContent = '✦';
    glyph.setAttribute('aria-hidden', 'true');
    const from = { left: clamp(point.x, width()) + 'px', top: clamp(point.y, height()) + 'px',
      transform: 'translate(-50%,-50%) scale(1)', opacity: .8 };
    const to = { left: width() / 2 + 'px', top: height() / 2 + 'px',
      transform: 'translate(-50%,-50%) scale(2.7)', opacity: .3 };
    document.body.append(glyph);
    try { await glyph.animate(reverse ? [to, from] : [from, to], { duration: 430, easing: 'ease-in-out' }).finished; }
    finally { glyph.remove(); }
  }

  async function pullStar(star) {
    if (!star || traveling || reader.open || draft) return;
    traveling = true;
    try {
      const message = await api('/' + star.id, { headers: credentials(star) });
      if (compose.open || collection.open) return;
      current = { ...message, access: star.access || personal[star.id]?.access };
      await fly(current);
      if (compose.open || collection.open || draft) { current = undefined; return; }
      reader.dataset.color = current.color;
      $('#read-title').textContent = current.title;
      $('#read-note').textContent = current.note;
      $('#read-author').textContent = current.author ? 'Left by ' + current.author : '';
      $('#read-date').dateTime = current.created;
      $('#read-date').textContent = new Date(current.created).toLocaleDateString(undefined, { dateStyle: 'long' });
      $('#copy').hidden = !current.access;
      $('#copy').textContent = 'Copy private link';
      $('#delete').hidden = !current.canDelete;
      $('#delete').textContent = 'Delete star';
      reader.showModal();
    } catch (error) { tell(error.message); }
    finally { traveling = false; }
  }

  reader.addEventListener('close', () => {
    const returning = current;
    current = undefined;
    if (returning) void fly(returning, true);
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
      delete personal[star.id];
      remember();
      listVersion++;
      publicStars = publicStars.filter((entry) => entry.id !== star.id);
      current = undefined;
      if (selected?.id === star.id) clearSelection();
      reader.close();
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
  for (const id of ['#make', '#add']) $(id).addEventListener('click', () => compose.showModal());
  for (const dialog of [compose, reader, collection]) {
    dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    for (const field of ['title', 'note']) {
      if (!values[field].trim()) { form.elements[field].focus(); return; }
    }
    draft = values;
    compose.close();
    clearSelection();
    explore();
    sky.classList.add('placing');
    $('#placement').hidden = false;
    $('#center').focus();
  });
  $('#center').addEventListener('click', () => place({ ...camera }));
  $('#cancel').addEventListener('click', resetPlacement);
  $('#pull').addEventListener('click', () => pullStar(selected));
  $('#dismiss').addEventListener('click', clearSelection);

  const fragment = new URLSearchParams(location.hash.slice(1));
  if (fragment.has('star') && fragment.has('key')) {
    history.replaceState(null, '', location.pathname + location.search);
    explore();
    const linkedStar = { id: encodeURIComponent(fragment.get('star')), access: fragment.get('key') };
    void pullStar(linkedStar);
  }
  renderStars();
  refresh().catch((error) => tell(error.message));
  setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 7000);
})();
