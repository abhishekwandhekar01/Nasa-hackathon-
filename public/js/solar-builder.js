// public/js/solar-builder.js

(function(){
  const palette = document.getElementById('palette');
  const canvas = document.getElementById('system-canvas');
  const orbits = document.getElementById('orbits');
  const saveBtn = document.getElementById('save-system');
  const playBtn = document.getElementById('play-toggle');
  const randomizeBtn = document.getElementById('randomize');
  const clearBtn = document.getElementById('clear-system');

  let dragging = null;
  let items = [];
  let animating = false;
  let lastTime = null;

  function getCenter() {
    // center relative to canvas (coordinates used for placing planets)
    // use clientWidth/Height to avoid issues with borders/padding
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return { x: w/2, y: h/2, left: canvas.offsetLeft, top: canvas.offsetTop, width: w, height: h };
  }

  function renderOrbits(){
    orbits.innerHTML = '';
    const center = getCenter();

    items.forEach((it, idx) => {
      // orbit radius: prefer explicitly assigned _radius (from drop logic or saved system)
      // otherwise space them by index
      const base = 80; // fallback inner-most orbit
      const gap = 70; // gap between orbits
      let radius = (typeof it._radius === 'number') ? it._radius : (base + idx * gap + (it.offset||0));
      // ensure radius is at least the minimum safe orbit
      try {
        const sunR = getSunRadius();
        const minOrbit = sunR + 28 + Math.round((it.size||56)/2);
        if (radius < minOrbit) radius = minOrbit;
      } catch(e) { /* ignore */ }

      // create the orbit ring
      const orbit = document.createElement('div');
      orbit.className = 'orbit-ring';
      orbit.style.width = (radius*2) + 'px';
      orbit.style.height = (radius*2) + 'px';
  orbit.style.left = Math.round(center.x - radius) + 'px';
  orbit.style.top = Math.round(center.y - radius) + 'px';

      // planet element
      const rawDiameter = it.meta && it.meta.diameter ? it.meta.diameter : null;
      const sizePx = it.size || (rawDiameter ? Math.min(120, Math.max(36, Math.round(parseInt(String(rawDiameter).replace(/[^0-9]/g,''))/2000))) : 56);
      const p = document.createElement('div');
      p.className = 'planet-on-orbit';
      p.style.width = sizePx + 'px'; p.style.height = sizePx + 'px';
      p.innerHTML = `<img src="${it.img}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" title="${it.name}"/>`;
      p.dataset.meta = JSON.stringify(it.meta || {});
      p.dataset.angle = it.angle !== undefined ? it.angle : (Math.random()*360);
      p.dataset.orbitRadius = radius;

      // position initial
      const rad = (parseFloat(p.dataset.angle) || 0) * Math.PI/180;
      const x = center.x + Math.cos(rad) * radius - sizePx/2;
      const y = center.y + Math.sin(rad) * radius - sizePx/2;
      // because orbits container is positioned inside canvas, set relative left/top
  p.style.position = 'absolute';
  p.style.left = Math.round(x) + 'px';
  p.style.top = Math.round(y) + 'px';

      orbits.appendChild(orbit);
      orbits.appendChild(p);

      // interactions
      p.addEventListener('click', (ev) => { showPlanetInfo(it, ev.clientX, ev.clientY); });
  p.addEventListener('dblclick', () => { items = items.filter(x => x !== it); distributeOrbits(); renderOrbits(); });
    });
  }

  function tick(t){
    if (!animating) return;
    if (!lastTime) lastTime = t;
    const dt = (t - lastTime) / 1000; lastTime = t;

    const baseSpeed = 40; // degrees/sec for inner baseline
    const center = getCenter();

    Array.from(orbits.querySelectorAll('.planet-on-orbit')).forEach((el, idx) => {
      const radius = parseFloat(el.dataset.orbitRadius) || 120;
      // make outer planets orbit slower (approx inverse sqrt law for feeling)
      const speed = baseSpeed * (80 / Math.max(80, radius)) ;
      const angle = (parseFloat(el.dataset.angle) + speed * dt * (1 + idx*0.02)) % 360;
      el.dataset.angle = angle;
      const rad = angle * Math.PI/180;

      const size = el.offsetWidth;
      const x = center.x + Math.cos(rad) * radius - size/2;
      const y = center.y + Math.sin(rad) * radius - size/2;
      el.style.left = Math.round(x) + 'px';
      el.style.top = Math.round(y) + 'px';
    });

    requestAnimationFrame(tick);
  }

  function getSunRadius() {
    const sunEl = canvas.querySelector('.sun');
    if (!sunEl) return 60; // fallback to CSS default (diameter 120)
    // width/height may be affected by CSS; use clientWidth / 2 for radius
    return Math.max(10, Math.round(sunEl.clientWidth / 2));
  }

  function computeOrbitForNewItem(desiredSizePx) {
    const center = getCenter();
    const sunR = getSunRadius();
    const padding = 28; // gap between sun and first planet's edge
    const minOrbit = sunR + padding + Math.round(desiredSizePx/2);

    // Determine existing occupied radii
    const occupied = items.map(it => (typeof it._radius === 'number') ? it._radius : null).filter(Boolean).sort((a,b)=>a-b);

    if (occupied.length === 0) return minOrbit;

    // try to place at the first slot that doesn't overlap with existing
    const gap = 70;
    // build candidate radii starting from minOrbit, spaced by gap
    for (let i=0;i<100;i++){
      const candidate = minOrbit + i * gap;
      // ensure it's at least 'size' / 2 away from any occupied
      const ok = occupied.every(r => Math.abs(r - candidate) > (desiredSizePx/2 + 12));
      if (ok) return candidate;
    }
    // fallback: return a large radius
    return minOrbit + occupied.length * gap;
  }

  // Distribute radii for all items so they fit inside the canvas.
  // This will evenly space the planets between the minimum safe orbit and the available outer radius.
  function distributeOrbits() {
    if (!items || items.length === 0) return;
    const center = getCenter();
    const sunR = getSunRadius();
    const padding = 28; // gap between sun and first planet's edge
    const edgePadding = 24; // padding to canvas edge

    const maxAvailable = Math.max(100, Math.floor(Math.min(center.x, center.y) - edgePadding));

    const N = items.length;

    // compute radii required by each planet based on its visual size
    const radiiReq = items.map(it => Math.round((it.size || 56) / 2)); // half-sizes

    // minimum first orbit should accommodate biggest planet half-size
    const minOrbit = sunR + padding + Math.max(...radiiReq);

    // iterative placement: ensure center-to-center distance between consecutive planets
    // is at least (prevHalf + currHalf + minGap)
    const minGap = 20; // minimum center-to-center extra gap
    const rawRadii = [];
    rawRadii[0] = minOrbit;
    for (let i = 1; i < N; i++) {
      const prevHalf = radiiReq[i - 1];
      const curHalf = radiiReq[i];
      const needed = rawRadii[i - 1] + prevHalf + curHalf + minGap;
      rawRadii[i] = Math.round(needed);
    }

    const lastRadius = rawRadii[rawRadii.length - 1];
    const availableSpan = maxAvailable - minOrbit;

    if (lastRadius <= maxAvailable) {
      // fits as-is
      for (let i = 0; i < N; i++) items[i]._radius = rawRadii[i];
      return;
    }

    // Need to compress: compute required span and scale factors
    const requiredSpan = lastRadius - minOrbit;
    const scale = availableSpan > 0 ? (availableSpan / requiredSpan) : 0.5;

    for (let i = 0; i < N; i++) {
      const scaled = Math.round(minOrbit + (rawRadii[i] - minOrbit) * scale);
      items[i]._radius = Math.max(minOrbit, scaled);
    }
  }

  // setup drag source
  palette.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragging = { name: item.dataset.name, img: item.dataset.img, diameter: item.dataset.diameter, distance: item.dataset.distance, moons: item.dataset.moons };
      e.dataTransfer.setData('text/plain', JSON.stringify(dragging));
    });
  });

  // canvas drop handling
  canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drag-over'); });
  canvas.addEventListener('dragleave', (e) => { canvas.classList.remove('drag-over'); });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault(); canvas.classList.remove('drag-over');
    let data = null;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(e) { data = dragging; }
    if (!data) return;

    const rawDiameter = data.diameter || data.diam || null;
    const sizePx = rawDiameter ? Math.min(120, Math.max(36, Math.round(parseInt(String(rawDiameter).replace(/[^0-9]/g,''))/2000))) : 56;
    const item = { name: data.name, img: data.img, angle: Math.random()*360, offset: Math.round(Math.random()*20 - 10), size: sizePx, meta: { diameter: data.diameter, distance: data.distance || data['distancefromsun'] || data['distanceFromSun'], moons: data.moons } };
    items.push(item);
    // redistribute radii to fit current canvas for all planets
    distributeOrbits();
    renderOrbits();
  });

  saveBtn.addEventListener('click', async () => {
    try {
      const resp = await fetch('/solar-builder/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: items }) });
      const json = await resp.json();
      if (json.ok) alert('System saved to session!'); else alert('Save failed.');
    } catch (e) { alert('Error saving system.'); }
  });

  playBtn.addEventListener('click', (e) => {
    animating = !animating;
    playBtn.textContent = animating ? 'Pause' : 'Play';
    if (animating) { lastTime = null; requestAnimationFrame(tick); }
  });

  randomizeBtn.addEventListener('click', () => {
    items = [];
    const paletteItems = Array.from(palette.querySelectorAll('.palette-item'));
    const pick = () => paletteItems[Math.floor(Math.random()*paletteItems.length)];
    const count = 4 + Math.floor(Math.random()*4);
    for (let i=0;i<count;i++){ 
      const p = pick();
      const size = 56;
      items.push({ name: p.dataset.name, img: p.dataset.img, angle: Math.random()*360, offset: Math.round(Math.random()*20-10), size: size, meta: { diameter: p.dataset.diameter, distance: p.dataset.distance } });
    }
    distributeOrbits();
    renderOrbits();
  });

  clearBtn.addEventListener('click', () => { items = []; renderOrbits(); });
  

  // reposition and redistribute planets on resize to keep things centered and spaced
  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      distributeOrbits();
      renderOrbits();
    }, 150);
  });

  // initial render
  distributeOrbits();
  renderOrbits();

  // planet info popover
  function showPlanetInfo(it, x, y){
    let box = document.getElementById('planet-info-box');
    if (!box){ box = document.createElement('div'); box.id = 'planet-info-box'; box.className = 'planet-info-box'; document.body.appendChild(box); }
    box.innerHTML = `<strong>${it.name}</strong><div class="text-muted">Diameter: ${it.meta.diameter || 'n/a'}</div><div class="text-muted">Moons: ${it.meta.moons || 'n/a'}</div>`;
    box.style.left = (x + 12) + 'px'; box.style.top = (y + 12) + 'px'; box.style.display = 'block';
    setTimeout(()=> box.style.opacity = '1', 10);
    setTimeout(()=> { if (box) box.style.opacity = '0'; setTimeout(()=> box.style.display='none',300); }, 4000);
  }
})();
