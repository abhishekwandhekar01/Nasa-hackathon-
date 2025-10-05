document.addEventListener('DOMContentLoaded', () => {
  // Keep references to overlay elements (fallback) but we'll use a clone-based overlay animation
  const overlay = document.getElementById('mission-overlay');
  const detail = document.getElementById('mission-detail');
  const title = document.getElementById('mission-title');
  const meta = document.getElementById('mission-meta');
  const img = document.getElementById('mission-image');
  const summary = document.getElementById('mission-summary');
  const achievements = document.getElementById('mission-achievements');
  const closeBtn = document.getElementById('mission-close');

  // current open clone and original card for reverse animation
  let currentClone = null;
  let originalCard = null;

  function openMissionCard(card) {
    const rect = card.getBoundingClientRect();
    const clone = card.cloneNode(true);
    originalCard = card;
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.margin = 0;
    clone.style.zIndex = 10000;
    clone.classList.add('anim-clone');
    // set a solid background immediately to avoid transparency during morph
    clone.style.background = 'linear-gradient(180deg, #071826 0%, #021018 100%)';
    // ensure text is visible while morphing
    clone.style.color = '#e9f7ff';
    document.body.appendChild(clone);

    // compute target (center)
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const targetW = Math.min(920, vw - 80);
    const targetH = Math.min(700, vh - 120);
    const targetLeft = Math.round((vw - targetW) / 2);
    const targetTop = Math.round((vh - targetH) / 2);

    // animate clone to center
    clone.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease';
    const scaleX = targetW / rect.width;
    const scaleY = targetH / rect.height;
    const translateX = targetLeft - rect.left + (targetW - rect.width)/2;
    const translateY = targetTop - rect.top + (targetH - rect.height)/2;
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
      clone.style.boxShadow = '0 20px 60px rgba(2,6,23,0.6)';
    });

    // after animation, turn the clone into the expanded detail card
    const targetRect = { left: targetLeft, top: targetTop, width: targetW, height: targetH };
    setTimeout(() => {
      populateCloneWithDetail(clone, card, targetRect);
      currentClone = clone;
    }, 440);
  }

  function populateOverlayFromCard(card) {
    const id = card.dataset.id;
    const name = card.dataset.name;
    const agency = card.dataset.agency;
    const launch = card.dataset.launch;
    const image = card.dataset.image;
    let summaryHtml = '';
    const hiddenSummaryNode = card.querySelector('.mission-full-data .summary');
    if (hiddenSummaryNode && (hiddenSummaryNode.innerHTML || hiddenSummaryNode.textContent.trim())) {
      summaryHtml = hiddenSummaryNode.innerHTML || hiddenSummaryNode.textContent;
    } else if (card.dataset.summary && card.dataset.summary.trim()) {
      summaryHtml = card.dataset.summary;
    } else {
      // try to find any descriptive nodes
      const desc = card.querySelector('.feature-description');
      if (desc && desc.innerHTML) summaryHtml = desc.innerHTML;
    }
    const hiddenAchNode = card.querySelector('.mission-full-data .achievements');
    const achievementsHtml = (hiddenAchNode && (hiddenAchNode.innerHTML && hiddenAchNode.innerHTML.trim())) ? hiddenAchNode.innerHTML : '';
    if (!summaryHtml || !summaryHtml.trim()) console.warn('Mission summary not found for card', card.dataset.id || card.dataset.name);

    title.textContent = name;
    meta.textContent = `${agency} • ${launch}`;
    img.src = image;
    summary.innerHTML = summaryHtml || '<em>No summary available.</em>';
    achievements.innerHTML = achievementsHtml ? `<h4>Achievements</h4>${achievementsHtml}` : '';
  }

  function populateCloneWithDetail(clone, card, targetRect) {
    // build detail HTML inside the clone so the morph appears seamless
    const name = card.dataset.name || '';
    const agency = card.dataset.agency || '';
    const launch = card.dataset.launch || '';
    const image = card.dataset.image || '';

    // obtain summary & achievements via the same robust logic
    let summaryHtml = '';
    const hiddenSummaryNode = card.querySelector('.mission-full-data .summary');
    if (hiddenSummaryNode && (hiddenSummaryNode.innerHTML || hiddenSummaryNode.textContent.trim())) {
      summaryHtml = hiddenSummaryNode.innerHTML || hiddenSummaryNode.textContent;
    } else if (card.dataset.summary && card.dataset.summary.trim()) {
      summaryHtml = card.dataset.summary;
    } else {
      const desc = card.querySelector('.feature-description');
      if (desc && desc.innerHTML) summaryHtml = desc.innerHTML;
    }
    const hiddenAchNode = card.querySelector('.mission-full-data .achievements');
    const achievementsHtml = (hiddenAchNode && (hiddenAchNode.innerHTML && hiddenAchNode.innerHTML.trim())) ? hiddenAchNode.innerHTML : '';

    // set clone to final pixel rect (avoid percentage or transforms) to prevent jumps
    try {
      clone.style.transition = 'none';
      clone.style.transform = 'none';
      if (targetRect) {
        clone.style.left = targetRect.left + 'px';
        clone.style.top = targetRect.top + 'px';
        clone.style.width = targetRect.width + 'px';
        clone.style.height = targetRect.height + 'px';
      }
    } catch (e) { /* ignore */ }

    // replace clone content with detailed layout
    clone.classList.add('clone-overlay');
    clone.innerHTML = `
      <div class="mission-large-thumb"><img src="${image}" alt="${name}"/></div>
      <div class="header-bar">
        <h2>${name}</h2>
        <button class="clone-close btn btn-sm btn-outline-light" title="Close">✕</button>
      </div>
      <div class="clone-inner">
        <div class="content-panel">
          <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;">
            <div>
              <p class="mission-meta">${agency} • ${launch}</p>
            </div>
            <div><span class="badge badge-pill" style="background:linear-gradient(90deg,#6a11cb,#2575fc);color:#fff;padding:6px 12px;border-radius:20px;font-weight:700">${agency}</span></div>
          </div>
          <div class="mission-summary">${summaryHtml || '<em>No summary available.</em>'}</div>
          ${achievementsHtml ? `<div class="mission-achievements"><h4>Achievements</h4>${achievementsHtml}</div>` : ''}
          <div><button class="take-test-cta">Take Test</button></div>
        </div>
      </div>
    `;

    // hook up close handler for the clone
    clone.querySelector('.clone-close').addEventListener('click', () => closeCloneOverlay(clone));
    // hook up take-test CTA to scroll to original card and highlight inline quiz
    const cta = clone.querySelector('.take-test-cta');
    if (cta) {
      cta.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // find original card and its inline quiz
        const orig = originalCard || card;
        if (!orig) return;
        const quiz = orig.querySelector('.mission-quiz-inline');
        if (quiz) {
          // close clone overlay and smooth-scroll to the original card
          closeCloneOverlay(clone);
          setTimeout(() => {
            orig.scrollIntoView({ behavior: 'smooth', block: 'center' });
            quiz.classList.add('highlight-flash');
            setTimeout(() => quiz.classList.remove('highlight-flash'), 1600);
          }, 320);
        }
      });
    }
    // populate the fun fact if present (into the clone overlay summary area)
    try {
      const funfact = card.dataset.funfact || (card.querySelector('.mission-full-data .funfact') ? card.querySelector('.mission-full-data .funfact').textContent : '');
      const funFactEl = clone.querySelector('.mission-funfact') || clone.querySelector('.clone-inner');
      if (funFactEl && funfact) {
        // append a small funfact paragraph
        const pf = document.createElement('p');
        pf.className = 'mission-funfact text-muted small';
        pf.textContent = funfact;
        const contentPanel = clone.querySelector('.content-panel') || clone.querySelector('.clone-inner');
        if (contentPanel) contentPanel.appendChild(pf);
      }
    } catch (e) { console.warn('populate funfact failed', e); }


  function buildQuizForCard(card) {
    const name = card.dataset.name || '';
    const agency = card.dataset.agency || '';
    const launch = card.dataset.launch || '';
    const hiddenAchNode = card.querySelector('.mission-full-data .achievements');
    const options = hiddenAchNode ? Array.from(hiddenAchNode.querySelectorAll('li')).map(li=>li.textContent) : ['Collected samples','First to land','Mapped rings'];
    const q1 = { id: 'q1', prompt: `What agency ran the ${name} mission?`, type: 'text' };
    const q2 = { id: 'q2', prompt: `When was ${name} launched? (year)`, type: 'text' };
    const q3 = { id: 'q3', prompt: `Which of these was an achievement of ${name}?`, type: 'radio', options };
    const questions = [q1,q2,q3];
    let html = `<form class="mission-quiz-modal-form">`;
    questions.forEach(q=>{
      if (q.type === 'text') html += `<div class="mb-2"><label>${q.prompt}</label><input class="form-control" name="${q.id}" /></div>`;
      else if (q.type === 'radio') {
        html += `<div class="mb-2"><label>${q.prompt}</label>`;
        q.options.forEach((opt, idx) => html += `<div class="form-check"><input class="form-check-input" type="radio" name="${q.id}" id="${q.id}-${idx}" value="${opt}"><label class="form-check-label" for="${q.id}-${idx}">${opt}</label></div>`);
        html += `</div>`;
      }
    });
    html += `</form>`;
    return { html, questions };
  }
    // fade in the inner content for a smooth morph effect
    const inner = clone.querySelector('.clone-inner');
    if (inner) {
      inner.style.opacity = '0';
      inner.style.transition = 'opacity 260ms ease, transform 260ms cubic-bezier(.2,.9,.2,1)';
      // slight scale-up for the inner to feel lively
      inner.style.transform = 'scale(0.98)';
      requestAnimationFrame(() => {
        inner.style.opacity = '1';
        inner.style.transform = 'scale(1)';
      });
    }
  // style tweak for the clone overlay background (final content state)
  clone.style.background = 'linear-gradient(180deg, #071826 0%, #021018 100%)';
  }

  function closeCloneOverlay(clone) {
    // animate back to original card if available
    if (!originalCard) { clone.remove(); currentClone = null; return; }
    const origRect = originalCard.getBoundingClientRect();
    const curRect = clone.getBoundingClientRect();

    // compute reverse transform
    const scaleX = origRect.width / curRect.width;
    const scaleY = origRect.height / curRect.height;
    const translateX = origRect.left - curRect.left + (origRect.width - curRect.width)/2;
    const translateY = origRect.top - curRect.top + (origRect.height - curRect.height)/2;

    // set fixed positioning for clone to animate
    clone.style.position = 'fixed';
    clone.style.left = curRect.left + 'px';
    clone.style.top = curRect.top + 'px';
    clone.style.width = curRect.width + 'px';
    clone.style.height = curRect.height + 'px';
    clone.style.margin = 0;
    requestAnimationFrame(() => {
      clone.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease';
      clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
      clone.style.opacity = '0.95';
    });
    setTimeout(() => { clone.remove(); currentClone = null; }, 460);
  }

  document.querySelectorAll('.mission-card .open-mission').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.mission-card');
      if (!card) return;
      // if a clone is already open, remove it (or close it) first
      if (currentClone) { currentClone.remove(); currentClone = null; }
      openMissionCard(card);
    });
  });

  // Instead of modal: inject an inline quiz at the bottom of each mission card
  document.querySelectorAll('.mission-card').forEach(card => {
    try {
      const quizContainer = card.querySelector('.mission-quiz-inline');
      if (!quizContainer) return;
      const qb = buildQuizForCard(card);
      // build inline form HTML with a submit button and a result area
      const form = document.createElement('form');
      form.className = 'mission-quiz-inline-form';
      form.innerHTML = qb.html + `<div class="d-flex align-items-center gap-2 mt-2"><button class="btn btn-success btn-sm" type="submit">Submit</button><div class="quiz-result text-light small" style="margin-left:8px"></div></div>`;
      quizContainer.appendChild(form);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(form);
        const payload = { missionId: card.dataset.id, answers: {} };
        for (const e of form.elements) {
          if (!e.name) continue;
          payload.answers[e.name] = fd.get(e.name) || '';
        }
        const resultEl = form.querySelector('.quiz-result');
        try {
          const resp = await fetch('/submit-mission-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const j = await resp.json();
          if (resp.ok) {
            resultEl.innerHTML = `Score: <strong>${j.score}/${j.total}</strong> — ${j.message || 'Recorded'}`;
          } else {
            resultEl.innerText = `Error: ${j.error || 'Failed'}`;
          }
        } catch (e) {
          resultEl.innerText = 'Network error';
        }
      });
    } catch (e) { console.warn('inline quiz injection failed', e); }
  });

  closeBtn.addEventListener('click', () => {
    // if overlay was used as fallback, hide it
    if (overlay) { overlay.classList.remove('visible'); overlay.setAttribute('aria-hidden','true'); }
    if (currentClone) { currentClone.remove(); currentClone = null; }
  });

  // also close when clicking outside detail
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      if (overlay) { overlay.classList.remove('visible'); overlay.setAttribute('aria-hidden','true'); }
      if (currentClone) { currentClone.remove(); currentClone = null; }
    }
  });

  // MutationObserver fallback: if any other code inserts a clone-overlay without the inline background
  // ensure the node has a solid background immediately to avoid flicker/transparent artifact.
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.classList && node.classList.contains('clone-overlay')) {
          // force the same opaque gradient as our CSS to prevent underlying content showing through
          node.style.background = 'linear-gradient(180deg, #071826 0%, #021018 100%)';
          node.style.color = '#e9f7ff';
        }
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
});
