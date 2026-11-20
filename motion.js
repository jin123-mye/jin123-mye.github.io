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

  /* ── 첫 화면 입자 구 ── */
  const cv = $('.orb')[0];
  if (cv) {
    const ctx = cv.getContext('2d');
    const hero = cv.parentElement;
    const N = innerWidth < 720 ? 2400 : 3600;
    const P = [];
    for (let i = 0; i < N; i++) {   // 피보나치 구
      const y = 1 - (i + 0.5) * 2 / N, r = Math.sqrt(1 - y * y), a = i * 2.399963, ang = Math.random() * 6.283;
      P.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, px: 0, py: 0, vx: 0, vy: 0, rx: Math.cos(ang), ry: Math.sin(ang), s: 0.6 + Math.random() * 0.8, acc: Math.random() < 0.18 });
    }
    let W = 0, dpr = 1, R = 0, mx = -9999, my = -9999, running = false, idle = 0;
    const ink = '#f5f5f7', acc = '#7fb2ff';
    const size = () => { const b = cv.getBoundingClientRect(); W = b.width; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); R = W * 0.38; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const scatter = () => { for (const p of P) { p.px = W / 2 + (Math.random() - 0.5) * W * 1.8; p.py = W / 2 + (Math.random() - 0.5) * W * 1.8; p.vx = p.vy = 0; } };
    const frame = () => {
      const sd = clamp(scrollY / (hero.offsetHeight * 0.8), 0, 1);       // 스크롤하면 풀어진다
      const rot = 0.5 + scrollY * 0.004;                                   // 스크롤에 따라서만 돈다
      const cs = Math.cos(rot), sn = Math.sin(rot), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
      const cx = W / 2, cy = W / 2, rad = Math.max(70, W * 0.16);
      let energy = 0;
      ctx.clearRect(0, 0, W, W);
      ctx.globalCompositeOperation = 'lighter';
      const fade = (1 - sd * 0.8) * (W < 500 ? 0.8 : 1);
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? acc : ink;
        for (const p of P) {
          if (p.acc !== !!pass) continue;
          const x1 = p.x * cs + p.z * sn, z1 = -p.x * sn + p.z * cs;
          const y2 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
          const tx = cx + x1 * R + p.rx * sd * R * 1.1;
          const ty = cy + y2 * R + p.ry * sd * R * 0.9 + sd * sd * R * 0.7;
          if (reduce) { p.px = tx; p.py = ty; }
          else {
            p.vx += (tx - p.px) * 0.055; p.vy += (ty - p.py) * 0.055;
            const dx = p.px - mx, dy = p.py - my, d = Math.hypot(dx, dy);
            if (d < rad && d > 0.01) { const f = (1 - d / rad); const k = f * f * 5.5; p.vx += dx / d * k; p.vy += dy / d * k; }
            p.vx *= 0.86; p.vy *= 0.86; p.px += p.vx; p.py += p.vy;
            energy += Math.abs(p.vx) + Math.abs(p.vy);
          }
          const depth = (z2 + 1) / 2;
          ctx.globalAlpha = (0.1 + 0.55 * depth) * fade;
          const s = (0.9 + 1.3 * depth) * p.s;
          ctx.fillRect(p.px - s / 2, p.py - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      return energy / N;
    };
    const loop = () => { const e = frame(); idle = e < 0.01 ? idle + 1 : 0; if (idle > 20) { running = false; return; } requestAnimationFrame(loop); };
    const kick = () => { idle = 0; if (!running && !reduce) { running = true; requestAnimationFrame(loop); } };
    size(); if (!reduce) scatter();
    if (reduce) frame(); else kick();
    addEventListener('resize', () => { size(); reduce ? frame() : kick(); });
    if (!reduce) {
      addEventListener('scroll', () => { if (scrollY < hero.offsetHeight * 1.2) kick(); }, { passive: true });
      const move = (e) => { const b = cv.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top; kick(); };
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
