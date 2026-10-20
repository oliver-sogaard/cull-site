// The home page's hero: the app's grid on the shoot, culled by scroll. Data: the JSON scripts #seq, #sets, #bursts.
(() => {
  const sheet = document.getElementById('sheet'), stage = document.getElementById('stage'), section = document.getElementById('cull');
  const photo = document.getElementById('photo'), invite = document.getElementById('invite');
  const posEl = document.getElementById('pos'), posW = document.getElementById('posw'), keepsEl = document.getElementById('keeps'), kc = document.getElementById('kc'), favsEl = document.getElementById('favs'), fc = document.getElementById('fc');
  const seq = JSON.parse(document.getElementById('seq').textContent);
  const sets = JSON.parse(document.getElementById('sets').textContent);
  const bursts = JSON.parse(document.getElementById('bursts').textContent);
  const HERO = 2365, TOTAL = 5259, HERO_IDX = seq.findIndex((f) => f.n === HERO);
  const SPR_COLS = Number(sheet.dataset.cols), SPR_ROWS = Number(sheet.dataset.rows);
  // the app's grid at a 168 px cell: 9 px corridor, 16 px lane, 18 px dot 6 px in, 3 px outline, the rail 6 px into the lane, the burst box 2 px inside the cell with a 4 px lift for its count
  const APP = { cell: 168, pad: 9, lane: 16, dot: 18, dotoff: 6, outline: 3, rail: 6, box: 2, lift: 4, radius: 4 };
  const GLYPH = { k: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>', r: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>', f: '<svg viewBox="0 0 24 24"><path d="M11.5 2.6a.56.56 0 0 1 1 0l2.6 5.5 6 .8a.56.56 0 0 1 .3.95l-4.4 4.2 1.1 6a.56.56 0 0 1-.8.6L12 17.8l-5.4 2.9a.56.56 0 0 1-.8-.6l1.1-6L2.5 9.9a.56.56 0 0 1 .3-.95l6-.8z"/></svg>' };
  const phone = () => matchMedia('(max-width: 760px)').matches;
  const fmt = (n) => n.toLocaleString('en-US');

  let cells = [], first = 0, geom = null, heroCell = null, stars = [];
  let decided = 0, keeps = 0, favs = 0, cur = -1, want = 0;

  // the grid at this stage size: small cells edge to edge, as many of the app's rows as cover the screen, the favorite among them
  function build() {
    const p = phone();
    const W = stage.clientWidth, H = stage.clientHeight;
    let cellW = p ? Math.max(40, Math.floor(W / 8)) : Math.min(80, Math.max(56, Math.round(W / 24)));
    let s, pad, lane, rowH, cols, rows;
    const measure = () => {
      s = cellW / APP.cell; pad = Math.max(2, Math.round(APP.pad * s)); lane = Math.max(p ? 6 : 15, Math.round(APP.lane * s)); rowH = cellW + lane;
      cols = Math.ceil(W / cellW); rows = Math.ceil(H / rowH) + 1;
    };
    measure();
    while (cols * rows > seq.length && cellW < 400) { cellW += 4; measure(); }
    const dot = Math.max(7, Math.round(APP.dot * s)), dotoff = Math.max(1, Math.round(APP.dotoff * s)), ol = Math.max(1.5, Math.round(APP.outline * s * 2) / 2), rail = Math.max(2, Math.round(APP.rail * s));
    const box = Math.max(1, Math.round(APP.box * s)), lift = Math.max(2, Math.round(APP.lift * s)), bw = 2, br = Math.max(2, Math.round(APP.radius * s));
    const totalRows = Math.ceil(seq.length / cols), heroRow = Math.floor(HERO_IDX / cols);
    const r0 = Math.min(Math.max(0, heroRow - Math.floor(rows * 0.42)), Math.max(0, totalRows - rows));
    first = r0 * cols;
    const count = Math.min(seq.length - first, rows * cols);
    geom = { cols, cellW, pad, lane, rowH, rail, count };
    const left = Math.round((W - cols * cellW) / 2), top = Math.round((H - Math.ceil(count / cols) * rowH) / 2);
    sheet.style.cssText = `--cellw:${cellW}px;--pad:${pad}px;--dot:${dot}px;--dotoff:${dotoff}px;--ol:${ol}px;--bw:${bw}px;--br:${br}px;--bl:${Math.max(2, Math.round(4 * s))}px;--sprite:${SPR_COLS * 100}% ${SPR_ROWS * 100}%;left:${left}px;width:${cols * cellW}px;top:${top}px;height:${Math.ceil(count / cols) * rowH}px`;
    sheet.innerHTML = '';
    cells = [];
    for (let i = 0; i < count; i++) {
      const idx = first + i, f = seq[idx];
      const c = document.createElement('div');
      c.className = 'cell' + (idx === HERO_IDX ? ' hero-src' : '');
      c.dataset.v = f.v; c.dataset.p = f.p;
      c.style.left = (i % cols) * cellW + 'px'; c.style.top = Math.floor(i / cols) * rowH + 'px';
      c.innerHTML = `<div class="frame" style="background-position:${(idx % SPR_COLS) * 100 / (SPR_COLS - 1)}% ${Math.floor(idx / SPR_COLS) * 100 / (SPR_ROWS - 1)}%"></div><span class="dot">${GLYPH[f.v]}</span>`;
      sheet.append(c); cells.push(c);
    }
    heroCell = cells[HERO_IDX - first];
    // the keeps that stay as stars, each with its drip order: top rows first, a little chance in it
    stars = cells.filter((c, i) => c !== heroCell && c.dataset.v !== 'r').map((c) => ({ c, at: (Math.floor(cells.indexOf(c) / cols) / Math.max(1, Math.ceil(count / cols) - 1)) * 0.6 + ((Number(c.dataset.p) * 2654435761 >>> 0) % 1000) / 1000 * 0.4 }));
    // one segment per row a group spans, the way gridGroupSegments lays them: rails in the lane, boxes in the corridor
    const segments = (group, draw) => {
      const a = Math.max(group.start, first), b = Math.min(group.start + group.len - 1, first + count - 1);
      if (b < a) return;
      const ra = Math.floor((a - first) / cols), rb = Math.floor((b - first) / cols);
      for (let r = ra; r <= rb; r++) {
        const c0 = r === ra ? (a - first) % cols : 0, c1 = r === rb ? (b - first) % cols : cols - 1;
        draw(r, c0, c1, r !== ra, r !== rb, r === ra);
      }
    };
    for (const set of sets) segments(set, (r, c0, c1, openL, openR, head) => {
      const el = document.createElement('div'); el.className = 'rail';
      el.style.left = c0 * cellW + (openL ? 0 : pad) + 'px';
      el.style.width = (c1 - c0 + 1) * cellW - (openL ? 0 : pad) - (openR ? 0 : pad) + 'px';
      el.style.top = r * rowH + cellW + rail + 'px';
      if (head) el.innerHTML = `<span class="lab">Similar ×${set.len}</span>`;
      sheet.append(el);
    });
    for (const run of bursts) segments(run, (r, c0, c1, openL, openR, head) => {
      const el = document.createElement('div'); el.className = 'burst';
      const up = 0;
      el.style.left = c0 * cellW + (openL ? 0 : box) + 'px';
      el.style.width = (c1 - c0 + 1) * cellW - (openL ? 0 : box) - (openR ? 0 : box) + 'px';
      el.style.top = r * rowH + box - up + 'px';
      el.style.height = cellW - 2 * box - 1 + up + 'px';
      if (head) el.innerHTML = `<span class="lab">Burst ×${run.len}</span>`;
      sheet.append(el);
    });
    decided = 0; keeps = 0; favs = 0; cur = -1;
    decideTo(want, cur < 0 && !scrolled);
    place();
  }

  function decideTo(n, waiting) {
    want = n;
    n = Math.max(0, Math.min(cells.length, n));
    while (decided < n) { const c = cells[decided]; c.classList.add('d', c.dataset.v); if (c.dataset.v === 'f') favs++; if (c.dataset.v === 'k') keeps++; decided++; }
    while (decided > n) { decided--; const c = cells[decided]; c.classList.remove('d', c.dataset.v); if (c.dataset.v === 'f') favs--; if (c.dataset.v === 'k') keeps--; }
    // the cursor sits on the next undecided frame; done = the last frame
    const nc = Math.min(decided, cells.length - 1);
    if (nc !== cur) { if (cur >= 0) cells[cur].classList.remove('cur', 'wait'); cells[nc].classList.add('cur'); cur = nc; }
    cells[cur].classList.toggle('wait', !!waiting);
    if (decided === 0) { posEl.textContent = fmt(TOTAL); posW.textContent = ' frames'; kc.hidden = true; fc.hidden = true; }
    else {
      // the grid is a slice of the shoot; the counter walks the whole shoot in step with it
      posEl.textContent = fmt(decided >= cells.length ? TOTAL : Math.max(1, Math.round(TOTAL * decided / cells.length))) + ' / ' + fmt(TOTAL); posW.textContent = '';
      kc.hidden = keeps === 0; keepsEl.textContent = fmt(keeps); fc.hidden = favs === 0; favsEl.textContent = fmt(favs);
    }
  }

  let from = null, to = null;
  function place() {
    const s = stage.getBoundingClientRect();
    const g = geom;
    from = { x: sheet.offsetLeft + heroCell.offsetLeft + g.pad, y: sheet.offsetTop + heroCell.offsetTop + g.pad, w: g.cellW - 2 * g.pad, h: g.cellW - 2 * g.pad };
    if (phone()) to = { x: 0, y: 0, w: s.width, h: s.height };
    else { const top = 112, bottom = 40; let H = s.height - top - bottom, W = H * 3 / 2; const maxW = Math.min(1200, s.width - 48); if (W > maxW) { W = maxW; H = W * 2 / 3; } to = { x: (s.width - W) / 2, y: top, w: W, h: H }; }
    render(lastP);
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let lastP = 0, scrolled = false;
  function render(p) {
    lastP = p;
    const sweep = Math.min(1, Math.max(0, (p - 0.04) / 0.52));
    const clear = Math.min(1, Math.max(0, (p - 0.56) / 0.07));
    const grow = Math.min(1, Math.max(0, (p - 0.60) / 0.27));
    decideTo(Math.round(sweep * cells.length), !scrolled && sweep === 0);
    invite.classList.toggle('off', p > 0.02);
    sheet.classList.toggle('clear', clear > 0);
    sheet.classList.toggle('gone', grow > 0.06);
    stage.classList.toggle('done', p > 0.84);
    const drip = Math.min(1, Math.max(0, (p - 0.87) / 0.13));
    for (const s of stars) s.c.classList.toggle('drip', s.at <= drip);
    if (from && to) {
      const t = ease(grow);
      // the cell is square; the photograph is 3:2, so it grows from the cell's own 3:2 crop. The box itself
      // is resized (not scaled) so a phone's full-bleed portrait target never reads as a squeezed sliver.
      const fw = from.w, fh = from.w * 2 / 3, fy = from.y + (from.h - fh) / 2;
      const x = lerp(from.x, to.x, t), y = lerp(fy, to.y, t);
      photo.style.width = lerp(fw, to.w, t) + 'px'; photo.style.height = lerp(fh, to.h, t) + 'px';
      photo.style.transform = `translate(${x}px, ${y}px)`; photo.style.opacity = grow > 0 ? 1 : 0;
    }
  }
  // the scroll position is the target; what is drawn follows it with a 90 ms time constant, so a wheel's steps become motion
  let target = 0, animating = false, lastT = 0;
  function onScroll() { const r = section.getBoundingClientRect(); target = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); if (target > 0.005) scrolled = true; if (!animating) { animating = true; lastT = performance.now(); requestAnimationFrame(tick); } }
  function tick(now) { const dt = Math.min(64, now - lastT); lastT = now; const d = target - lastP; if (Math.abs(d) < 0.0003) { render(target); animating = false; return; } render(lastP + d * (1 - Math.exp(-dt / 90))); requestAnimationFrame(tick); }
  let lastW = innerWidth, lastH = innerHeight, rt = 0;
  addEventListener('resize', () => { if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 80) return; lastW = innerWidth; lastH = innerHeight; clearTimeout(rt); rt = setTimeout(build, 120); });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { section.style.height = '100vh'; invite.classList.add('off'); scrolled = true; build(); render(1); }
  else {
    addEventListener('scroll', onScroll, { passive: true });
    build();
    onScroll();
  }
})();
