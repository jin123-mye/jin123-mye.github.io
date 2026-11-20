/* 모션 — "움직임은 사람이 뭔가 할 때만"(스크롤·마우스·클릭·화면에 보일 때).
   혼자 계속 도는 건 없고, 움직임 줄이기 설정이면 전부 끈다(구는 정지 그림으로만). */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── 서버 탭(움직임과 무관한 기능) ── */
  const tabs = $('.tabs [role=tab]');
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const pick = (i, focus) => {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; panels[k].classList.toggle('on', k === i); });
    if (focus) tabs[i].focus();
  };
  if (tabs.length) {
    pick(0);
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(i));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); pick((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); pick((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
  }

  /* ── 대표 작업 칩: 지금 보는 작업 표시 ── */
  const chips = $('.chips a');
  const projs = chips.map((a) => document.querySelector(a.getAttribute('href')));
  let lastCur = -2;
  const markChipOnce = () => {
    let cur = -1;
    projs.forEach((p, i) => { if (p && p.getBoundingClientRect().top < innerHeight * 0.45) cur = i; });
    const last = projs[projs.length - 1];
    if (last && last.getBoundingClientRect().bottom < innerHeight * 0.3) cur = -1;
    if (cur === lastCur) return; lastCur = cur;
    chips.forEach((a, i) => a.classList.toggle('on', i === cur));
    const on = chips[cur]; if (on) { const box = on.parentElement; box.scrollTo({ left: on.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth' }); }
  };
  addEventListener('scroll', markChipOnce, { passive: true }); markChipOnce();

  /* ── 첫 화면 입자 구 (자비스 오브처럼: 중심 광채 + 둥근 입자 + 가산 합성) ── */
  const cv = $('.orb')[0];
  if (cv) {
    const ctx = cv.getContext('2d');
    const hero = cv.parentElement;
    const N = innerWidth < 720 ? 900 : 1500;
    const P = [];
    for (let i = 0; i < N; i++) {   // 피보나치 구
      const y = 1 - (i + 0.5) * 2 / N, r = Math.sqrt(1 - y * y), a = i * 2.399963, ang = Math.random() * 6.283;
      P.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, px: 0, py: 0, vx: 0, vy: 0, rx: Math.cos(ang), ry: Math.sin(ang),
               hj: (Math.random() - 0.5) * 34, seed: Math.random() * 6.283 });
    }
    let W = 0, dpr = 1, R = 0, mx = -9999, my = -9999, running = false, idle = 0, glow = 0.25, tm = 0;
    const HUE = 205;
    const size = () => { const b = cv.getBoundingClientRect(); W = b.width; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); R = W * 0.3; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const scatter = () => { for (const p of P) { p.px = W / 2 + (Math.random() - 0.5) * W * 1.8; p.py = W / 2 + (Math.random() - 0.5) * W * 1.8; p.vx = p.vy = 0; } };
    const frame = () => {
      const sd = clamp(scrollY / (hero.offsetHeight * 0.8), 0, 1);       // 스크롤하면 풀어진다
      const rot = 0.5 + scrollY * 0.004;                                   // 스크롤에 따라서만 돈다
      const cs = Math.cos(rot), sn = Math.sin(rot), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
      const cx = W / 2, cy = W / 2, rad = Math.max(70, W * 0.16), F = 2.4;
      const near = Math.hypot(mx - cx, my - cy) < W * 0.5 ? 1 : 0;
      glow += ((0.25 + near * 0.35) - glow) * 0.08;                        // 마우스가 오면 빛이 밝아진다
      let energy = 0;
      ctx.clearRect(0, 0, W, W);
      const fade = (1 - sd * 0.85);
      // 중심 광채
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.75);
      g.addColorStop(0, `hsla(${HUE},100%,72%,${(0.34 + glow * 0.4) * fade})`);
      g.addColorStop(0.5, `hsla(${HUE},95%,60%,${0.13 * fade})`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        const pr = 1 + (reduce ? 0 : 0.04 * Math.sin(tm + p.seed));
        const x1 = p.x * pr * cs + p.z * pr * sn, z1 = -p.x * pr * sn + p.z * pr * cs;
        const y2 = p.y * pr * ct - z1 * st, z2 = p.y * pr * st + z1 * ct;
        const sc = F / (F - z2), depth = (z2 + 1) / 2;
        const tx = cx + x1 * R * sc + p.rx * sd * R * 1.1;
        const ty = cy + y2 * R * sc + p.ry * sd * R * 0.9 + sd * sd * R * 0.7;
        if (reduce) { p.px = tx; p.py = ty; }
        else {
          p.vx += (tx - p.px) * 0.055; p.vy += (ty - p.py) * 0.055;
          const dx = p.px - mx, dy = p.py - my, d = Math.hypot(dx, dy);
          if (d < rad && d > 0.01) { const f = (1 - d / rad); const k = f * f * 5.5; p.vx += dx / d * k; p.vy += dy / d * k; }
          p.vx *= 0.86; p.vy *= 0.86; p.px += p.vx; p.py += p.vy;
          energy += Math.abs(p.vx) + Math.abs(p.vy);
        }
        const r = Math.max(0.4, (0.7 + depth * 1.9) * sc * (0.85 + glow * 0.3) * clamp(W / 640, 0.65, 1));
        ctx.beginPath(); ctx.arc(p.px, p.py, r, 0, 7);
        ctx.fillStyle = `hsla(${HUE + p.hj},95%,${58 + depth * 30}%,${(0.18 + depth * 0.7) * fade})`; ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      return energy / N;
    };
    // 빛은 마우스가 오가는 동안만 변하고, 가만히 있으면 멈춘다
    const loop = () => { const e = frame(); idle = e < 0.01 ? idle + 1 : 0; if (idle > 20) { running = false; return; } requestAnimationFrame(loop); };
    const kick = () => { idle = 0; if (!running && !reduce) { running = true; requestAnimationFrame(loop); } };
    size(); if (!reduce) scatter();
    if (reduce) frame(); else kick();
    addEventListener('resize', () => { size(); reduce ? frame() : kick(); });
    if (!reduce) {
      addEventListener('scroll', () => { if (scrollY < hero.offsetHeight * 1.2) kick(); }, { passive: true });
      const move = (e) => { const b = cv.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top; tm = e.clientX * 0.01; kick(); };
      addEventListener('pointermove', move, { passive: true });
      addEventListener('pointerdown', move, { passive: true });
      document.addEventListener('pointerleave', () => { mx = my = -9999; kick(); });
      addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') { mx = my = -9999; kick(); } });
    }
  }

  if (reduce) return;   // 아래는 전부 움직임 → 줄이기 설정이면 건너뜀
  root.classList.add('motion');

  /* ── 큰 제목: 줄마다 보이지 않는 줄 안에서 아래→위 ── */
  const h1 = $('.hero h1')[0];
  if (h1) {
    $('.ln > span', h1).forEach((s, i) => s.style.setProperty('--i', i));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => h1.classList.add('go')));
  }

  /* ── 숫자: 화면에 보이면 자리마다 슬롯처럼 굴러가서 멈춘다 ── */
  $('.stats b').forEach((b) => {
    const txt = b.textContent; b.setAttribute('aria-label', txt); b.textContent = '';
    let k = 0;
    [...txt].forEach((ch) => {
      if (/\d/.test(ch)) {
        const box = document.createElement('x-r'); box.className = 'roll'; box.setAttribute('aria-hidden', 'true');
        const st = document.createElement('x-s'); st.className = 'strip';
        st.style.setProperty('--d', +ch + 10); st.style.setProperty('--k', k++);
        st.innerHTML = Array.from({ length: 20 }, (_, i) => `<x-d>${i % 10}</x-d>`).join('');
        box.append(st); b.append(box);
      } else { const s = document.createElement('x-c'); s.setAttribute('aria-hidden', 'true'); s.textContent = ch; b.append(s); }
    });
  });

  /* ── 스크롤하면 아래에서 떠오른다 ── */
  const rvSel = '.block > .eyebrow, .block > .mega, .block > .sub, .head-block > *, .proj-head > *, .tile, .card, .meta, .tabs, .panels, .index li, .quotes blockquote, .stats, .lead, .links, .hero .eyebrow';
  const rv = $(rvSel);
  rv.forEach((el) => {
    el.classList.add('rv');
    const sib = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('rv')) : [];
    el.style.setProperty('--d', Math.min(sib.indexOf(el), 5) * 0.08 + 's');
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  rv.forEach((el) => io.observe(el));
  $('.stats').forEach((el) => io.observe(el));

  /* ── 기기 화면: 스크롤하면 .9배 → 1배로 커진다 ── */
  const devs = $('.device');
  const grow = () => {
    devs.forEach((d) => {
      const r = d.getBoundingClientRect();
      const p = clamp(1 - (r.top - innerHeight * 0.25) / (innerHeight * 0.6), 0, 1);
      d.style.setProperty('--p', p.toFixed(3));
    });
  };
  grow();

  /* ── 헤더: 내리면 숨고, 올리면 나타난다 ── */
  const nav = $('.gnav')[0]; let ly = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY, d = y - ly;
    if (nav && Math.abs(d) > 6) { const h = d > 0 && y > 90; nav.classList.toggle('hide', h); document.body.classList.toggle('nav-hide', h); ly = y; }
    grow();
  }, { passive: true });
  addEventListener('resize', grow);

  /* ── 버튼: 가까이 오면 살짝 끌려오고, 누르면 0.96배(CSS) ── */
  if (fine) {
    const btns = $('.btn');
    addEventListener('pointermove', (e) => {
      btns.forEach((b) => {
        const r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const near = Math.abs(dx) < r.width / 2 + 70 && Math.abs(dy) < r.height / 2 + 70;
        b.style.setProperty('--mx', near ? clamp(dx * 0.28, -14, 14) + 'px' : '0px');
        b.style.setProperty('--my', near ? clamp(dy * 0.4, -10, 10) + 'px' : '0px');
      });
    }, { passive: true });
  }
})();
