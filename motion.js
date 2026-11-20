/* 모션 — "움직임은 사람이 뭔가 할 때만"(스크롤·마우스·클릭·화면에 보일 때).
   혼자 계속 도는 건 없고, 움직임 줄이기 설정이면 전부 끈다(구는 정지 그림으로만). */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── 첫 화면 입자 구 ── */
  const cv = $('.orb')[0];
  if (cv) {
    const ctx = cv.getContext('2d');
    const hero = cv.parentElement;
    const N = innerWidth < 720 ? 2200 : 3400;
    const P = [];
    // 피보나치 구: 점이 고르게 퍼진다
    for (let i = 0; i < N; i++) {
      const y = 1 - (i + 0.5) * 2 / N, r = Math.sqrt(1 - y * y), a = i * 2.399963;
      const ang = Math.random() * 6.283;
      P.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, px: 0, py: 0, vx: 0, vy: 0,
               rx: Math.cos(ang), ry: Math.sin(ang), s: 0.6 + Math.random() * 0.8, acc: Math.random() < 0.13 });
    }
    let W = 0, dpr = 1, R = 0, ink = '#16130f', acc = '#b5401e';
    let mx = -9999, my = -9999, running = false, idle = 0, lastSd = -1, lastRot = -1;
    const readColors = () => {
      const cs = getComputedStyle(root);
      ink = cs.getPropertyValue('--ink').trim() || ink;
      acc = cs.getPropertyValue('--accent').trim() || acc;
    };
    const place = (scatter) => {
      const cx = W / 2, cy = W / 2;
      for (const p of P) {
        if (scatter) { p.px = cx + (Math.random() - 0.5) * W * 1.8; p.py = cy + (Math.random() - 0.5) * W * 1.8; p.vx = p.vy = 0; }
      }
    };
    const size = () => {
      const b = cv.getBoundingClientRect();
      W = b.width; dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr);
      R = W * 0.4; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const frame = () => {
      const sd = clamp(scrollY / (hero.offsetHeight * 0.85), 0, 1);       // 스크롤하면 풀어진다
      const rot = 0.5 + scrollY * 0.004;                                   // 스크롤에 따라서만 돈다
      const cs = Math.cos(rot), sn = Math.sin(rot), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
      const cx = W / 2, cy = W / 2, rad = Math.max(70, W * 0.16);
      const still = reduce;
      let energy = 0;
      ctx.clearRect(0, 0, W, W);
      const fade = (1 - sd * 0.75) * (W < 500 ? 0.65 : 1);   // 폰에선 글자가 먼저 읽히게 옅게
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? acc : ink;
        for (const p of P) {
          if (p.acc !== !!pass) continue;
          const x1 = p.x * cs + p.z * sn, z1 = -p.x * sn + p.z * cs;
          const y2 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
          const tx = cx + x1 * R + p.rx * sd * R * 1.1;
          const ty = cy + y2 * R + p.ry * sd * R * 0.9 + sd * sd * R * 0.7;
          if (still) { p.px = tx; p.py = ty; }
          else {
            p.vx += (tx - p.px) * 0.055; p.vy += (ty - p.py) * 0.055;
            const dx = p.px - mx, dy = p.py - my, d = Math.hypot(dx, dy);
            if (d < rad && d > 0.01) { const f = (1 - d / rad); const k = f * f * 5.5; p.vx += dx / d * k; p.vy += dy / d * k; }
            p.vx *= 0.86; p.vy *= 0.86; p.px += p.vx; p.py += p.vy;
            energy += Math.abs(p.vx) + Math.abs(p.vy);
          }
          const depth = (z2 + 1) / 2;
          ctx.globalAlpha = (0.16 + 0.5 * depth) * fade;
          const s = (0.9 + 1.2 * depth) * p.s;
          ctx.fillRect(p.px - s / 2, p.py - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
      lastSd = sd; lastRot = rot;
      return energy / N;
    };
    const loop = () => {
      const e = frame();
      idle = e < 0.01 ? idle + 1 : 0;
      if (idle > 20) { running = false; return; }   // 가만히 있으면 멈춘다
      requestAnimationFrame(loop);
    };
    const kick = () => { idle = 0; if (!running && !reduce) { running = true; requestAnimationFrame(loop); } };

    size(); readColors(); place(!reduce);
    if (reduce) frame(); else kick();
    addEventListener('resize', () => { size(); place(false); reduce ? frame() : kick(); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { setTimeout(() => { readColors(); reduce ? frame() : kick(); }, 30); });
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

  /* ── 2. 서비스 이름: 글자마다 보이지 않는 줄 안에서 아래→위, 글자 간격 0.06초 ── */
  const h1 = $('.hero h1')[0];
  if (h1) {
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    let n = 0;
    const split = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.append(' '); return; }
            const word = document.createElement('span'); word.className = 'w'; word.setAttribute('aria-hidden', 'true');
            [...w].forEach((ch) => {
              const o = document.createElement('span'); o.className = 'ch';
              const i = document.createElement('span'); i.textContent = ch; i.style.setProperty('--i', n++);
              o.append(i); word.append(o);
            });
            frag.append(word);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') { split(c); }
      });
    };
    split(h1);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => h1.classList.add('go')));
  }

  /* ── 3. 메뉴 밑줄: 메뉴 사이를 미끄러지듯 ── */
  const nav = $('.mast nav')[0];
  if (nav) {
    const bar = document.createElement('i'); bar.className = 'nav-ink'; nav.append(bar);
    const to = (a) => { bar.style.opacity = 1; bar.style.width = a.offsetWidth + 'px'; bar.style.transform = `translateX(${a.offsetLeft}px)`; };
    $('a', nav).forEach((a) => { a.addEventListener('pointerenter', () => to(a)); a.addEventListener('focus', () => to(a)); });
    nav.addEventListener('pointerleave', () => { bar.style.opacity = 0; });
    nav.addEventListener('focusout', () => { bar.style.opacity = 0; });
  }

  /* ── 4. 버튼: 가까이 오면 끌려오고, 누르면 0.96배(CSS) ── */
  if (fine) {
    const btns = $('.btn');
    addEventListener('pointermove', (e) => {
      btns.forEach((b) => {
        const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const near = Math.abs(dx) < r.width / 2 + 70 && Math.abs(dy) < r.height / 2 + 70;
        b.style.setProperty('--mx', near ? clamp(dx * 0.28, -14, 14) + 'px' : '0px');
        b.style.setProperty('--my', near ? clamp(dy * 0.4, -10, 10) + 'px' : '0px');
      });
    }, { passive: true });
  }

  /* ── 5. 숫자: 화면에 보이면 자리마다 슬롯처럼 굴러가서 멈춘다 ── */
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

  /* ── 보일 때 한 번 재생(제품 화면 덮개 0.8초 · 숫자) ── */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.22 });
  $('.plate, .stats').forEach((el) => io.observe(el));

  /* ── 7. 기능 카드가 겹겹이 쌓임 ── */
  const cards = $('#work .story');
  const sizeCards = () => {
    cards.forEach((c) => { c.style.setProperty('--stick', Math.min(16, innerHeight - c.offsetHeight - 16) + 'px'); });
  };
  const stack = () => {
    cards.forEach((c, i) => {
      const n = cards[i + 1]; if (!n) return;
      const stuck = parseFloat(c.style.getPropertyValue('--stick')) || 16;
      const p = clamp(1 - (n.getBoundingClientRect().top - stuck) / Math.max(1, c.offsetHeight), 0, 1);
      c.style.setProperty('--sc', (1 - 0.06 * p).toFixed(4));
      c.style.setProperty('--dim', (0.45 * p).toFixed(3));
      c.style.setProperty('--op', (1 - p * p).toFixed(3));
    });
  };
  sizeCards(); stack();
  addEventListener('resize', () => { sizeCards(); stack(); });
  addEventListener('load', () => { sizeCards(); stack(); });
  $('#work img').forEach((im) => im.addEventListener('load', () => { sizeCards(); stack(); }));

  /* ── 9. 헤더: 내리면 숨고, 올리면 나타난다 ── */
  const mast = $('.mast')[0]; let ly = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY, d = y - ly;
    if (mast && Math.abs(d) > 6) { mast.classList.toggle('hide', d > 0 && y > 90); ly = y; }
    stack();
  }, { passive: true });

  /* ── 8. 기능 이름에 마우스를 올리면 커서 옆에 작은 미리보기 ── */
  if (fine) {
    const peek = document.createElement('div'); peek.className = 'peek'; peek.setAttribute('aria-hidden', 'true'); document.body.append(peek);
    let tx = 0, ty = 0, x = 0, y = 0, on = false, raf = 0;
    const step = () => {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      peek.style.transform = `translate(${x + 22}px, ${y + 22}px)`;
      if (on || Math.abs(tx - x) > 0.5) raf = requestAnimationFrame(step); else raf = 0;
    };
    $('.story h3').forEach((h) => {
      const st = h.closest('.story'), img = st.querySelector('.plate img'), pre = st.querySelector('.plate pre');
      h.classList.add('peekable');
      h.addEventListener('pointerenter', (e) => {
        peek.replaceChildren();
        if (img) { const c = new Image(); c.src = img.currentSrc || img.src; peek.append(c); peek.classList.remove('txt'); }
        else if (pre) { const c = document.createElement('pre'); c.textContent = pre.textContent; peek.append(c); peek.classList.add('txt'); }
        tx = x = e.clientX; ty = y = e.clientY; on = true; peek.classList.add('on'); if (!raf) raf = requestAnimationFrame(step);
      });
      h.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(step); });
      h.addEventListener('pointerleave', () => { on = false; peek.classList.remove('on'); });
    });
  }
})();
