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

  function renderOrbits(){
    orbits.innerHTML = '';
    items.forEach((it, idx) => {
      const orbit = document.createElement('div');
      orbit.className = 'orbit-ring';
      const radius = 60 + idx * 60 + (it.offset||0);
      orbit.style.width = (radius*2) + 'px';
      orbit.style.height = (radius*2) + 'px';
      orbit.style.left = `calc(50% - ${radius}px)`;
      orbit.style.top = `calc(50% - ${radius}px)`;

        const rawDiameter = it.meta && it.meta.diameter ? it.meta.diameter : null;
        const sizePx = rawDiameter ? Math.min(120, Math.max(40, Math.round(parseInt(String(rawDiameter).replace(/[^0-9]/g,''))/2000))) : 56;
        const p = document.createElement('div');
        p.className = 'planet-on-orbit';
        p.style.width = sizePx + 'px'; p.style.height = sizePx + 'px';
        p.style.left = `calc(50% + ${radius}px - ${sizePx/2}px)`;
        p.style.top = `calc(50% - ${sizePx/2}px)`;
        p.innerHTML = `<img src="${it.img}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" title="${it.name}"/>`;
        p.dataset.meta = JSON.stringify(it.meta || {});
      p.dataset.angle = it.angle || (Math.random()*360);
      orbit.appendChild(p);
      orbits.appendChild(orbit);
        // click shows info; double-click removes
        p.addEventListener('click', (ev) => { showPlanetInfo(it, ev.clientX, ev.clientY); });
        p.addEventListener('dblclick', () => { items = items.filter(x => x !== it); renderOrbits(); });
    });
  }

  function tick(t){
    if (!animating) return;
    if (!lastTime) lastTime = t;
    const dt = (t - lastTime) / 1000; lastTime = t;
    const speed = 20; // degrees/sec base
    Array.from(orbits.querySelectorAll('.planet-on-orbit')).forEach((el, idx) => {
      const angle = (parseFloat(el.dataset.angle) + speed * dt * (1 + idx*0.05)) % 360;
      el.dataset.angle = angle;
      const rad = angle * Math.PI/180;
      const parent = el.parentElement;
      const radius = (parent.offsetWidth/2);
      const cx = parent.offsetLeft + radius;
      const cy = parent.offsetTop + radius;
      const x = cx + Math.cos(rad) * radius - el.offsetWidth/2;
      const y = cy + Math.sin(rad) * radius - el.offsetHeight/2;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });
    requestAnimationFrame(tick);
  }

  palette.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragging = { name: item.dataset.name, img: item.dataset.img };
      e.dataTransfer.setData('text/plain', JSON.stringify(dragging));
    });
  });

  canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drag-over'); });
  canvas.addEventListener('dragleave', (e) => { canvas.classList.remove('drag-over'); });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault(); canvas.classList.remove('drag-over');
    let data = null;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(e) { data = dragging; }
    if (!data) return;
      const rawDiameter = data.diameter || data.diam || null;
      const sizePx = rawDiameter ? Math.min(120, Math.max(40, Math.round(parseInt(String(rawDiameter).replace(/[^0-9]/g,''))/2000))) : 56;
      const item = { name: data.name, img: data.img, angle: Math.random()*360, offset: Math.round(Math.random()*20 - 10), size: sizePx, meta: { diameter: data.diameter, distance: data.distance, moons: data.moons } };
    items.push(item);
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
    for (let i=0;i<count;i++){ const p = pick(); items.push({ name: p.dataset.name, img: p.dataset.img, angle: Math.random()*360, offset: Math.round(Math.random()*20-10) }); }
    renderOrbits();
  });

  clearBtn.addEventListener('click', () => { items = []; renderOrbits(); });

  // initial render
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
