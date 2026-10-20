// The home page: reveals, hold-Space, the sidecar typewriter.
(() => {
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));
  } else document.querySelectorAll('.rv').forEach((el) => el.classList.add('in'));

  // hold Space (or press and hold the button) → the real loupe at 100 %. Space never scrolls the page while the shot is on screen.
  const hold = document.getElementById('zoom'), shot = document.getElementById('holdshot'), btn = document.getElementById('holdbtn'), cap = document.getElementById('holdcap');
  const set = (on) => { hold.classList.toggle('is-held', on); btn.setAttribute('aria-pressed', String(on)); cap.textContent = on ? 'Space held · 100 %' : 'at rest'; };
  const onScreen = () => { const r = shot.getBoundingClientRect(); const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); return vis > Math.min(r.height, innerHeight) * 0.5; };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); set(true); });
  btn.addEventListener('pointerup', () => set(false)); btn.addEventListener('pointercancel', () => set(false)); btn.addEventListener('lostpointercapture', () => set(false));
  btn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); set(true); } });
  btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); set(false); } });
  addEventListener('keydown', (e) => {
    if (e.key !== ' ' || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if (!onScreen()) return;
    e.preventDefault();
    if (!e.repeat) set(true);
  });
  addEventListener('keyup', (e) => { if (e.key === ' ' && hold.classList.contains('is-held')) { e.preventDefault(); set(false); } });
  addEventListener('scroll', () => { if (hold.classList.contains('is-held') && !onScreen()) set(false); }, { passive: true });

  // the sidecar, exactly as CULL writes it, typed as the verdict lands
  const lines = [
    '&lt;?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?&gt;',
    '&lt;x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk=<b>"CULL"</b>&gt;',
    ' &lt;rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"&gt;',
    '  &lt;rdf:Description rdf:about=""',
    '    xmlns:xmp="http://ns.adobe.com/xap/1.0/"',
    '    xmlns:xmpDM="http://ns.adobe.com/xmp/1.0/DynamicMedia/"',
    '   xmp:CreatorTool=<b>"CULL"</b>',
    '   xmp:ModifyDate=<b>"2026-05-17T21:14:02.4125633-07:00"</b>',
    '   xmpDM:pick=<b>"1"</b>',
    '   xmpDM:good=<b>"true"</b>',
    '   xmp:Label=<b class="acc">"Purple"</b>&gt;',
    '  &lt;/rdf:Description&gt;',
    ' &lt;/rdf:RDF&gt;',
    '&lt;/x:xmpmeta&gt;',
    '&lt;?xpacket end="w"?&gt;',
  ];
  const pre = document.getElementById('xmptext');
  if (reduce || !('IntersectionObserver' in window)) { pre.innerHTML = lines.join('\n'); return; }
  let started = false;
  const io2 = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && !started) { started = true; io2.disconnect(); type(); } }, { threshold: 0.4 });
  io2.observe(pre);
  function type() { let i = 0; const step = () => { i++; pre.innerHTML = lines.slice(0, i).join('\n') + (i < lines.length ? '<span class="caret"></span>' : ''); if (i < lines.length) setTimeout(step, i >= 6 && i <= 10 ? 260 : 90); }; step(); }
})();
