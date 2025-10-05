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
        </div>
      </div>
    `;

    // hook up close handler for the clone
    clone.querySelector('.clone-close').addEventListener('click', () => closeCloneOverlay(clone));

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
