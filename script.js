// ─── SCROLL REVEAL ────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
      const idx = siblings.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('visible'), idx * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

reveals.forEach(el => revealObserver.observe(el));


// ─── PARALLAX ─────────────────────────────────────────────────
const bgPhotos = document.querySelectorAll('.bg-photo');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  bgPhotos.forEach((el, i) => {
    const speed = 0.08 + i * 0.04;
    const dir = i % 2 === 0 ? 1 : -1;
    el.style.transform = `translateY(${y * speed * dir}px)`;
  });
}, { passive: true });


// ─── STRIP LOOP ────────────────────────────────────────────────
const track = document.querySelector('.strip-track');
if (track) {
  const imgs = [...track.querySelectorAll('img')];
  const ready = imgs.map(img => img.complete
    ? Promise.resolve()
    : new Promise(r => { img.onload = r; img.onerror = r; })
  );

  Promise.all(ready).then(() => {
    const setWidth = track.scrollWidth;
    const copies = Math.ceil((window.innerWidth * 3) / setWidth) + 1;
    const original = track.innerHTML;
    for (let i = 0; i < copies; i++) track.innerHTML += original;

    const oneSet = setWidth + (4 * imgs.length);
    let x = 0;
    const speed = 0.25;

    function tick() {
      x -= speed;
      if (Math.abs(x) >= oneSet) x += oneSet;
      track.style.transform = `translateX(${x}px)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}


// ─── NAV SCROLL STYLE ─────────────────────────────────────────
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.style.borderBottom = '1px solid #2a2a2a';
    nav.style.background = 'rgba(14,14,14,0.97)';
  } else {
    nav.style.borderBottom = 'none';
    nav.style.background = 'linear-gradient(to bottom, rgba(14,14,14,0.95) 0%, transparent 100%)';
  }
}, { passive: true });


// ─── CAT PHOTOS + LIGHTBOX ────────────────────────────────────

// How many photos we need total
const GRID_COUNT    = 9;   // Фотографии section
const PROJECT_COUNT = 6;
const PER_PROJECT   = 4;

// photo pools — filled after fetch
let gridPhotos    = [];                  // all 9 gallery photos
const projectPhotos = {};                // { "1": [url,url,...], "2": [...], ... }

// ── fetch from Cat API (no key, limit 10 per request)
async function fetchCatUrls(n) {
  const urls = [];
  while (urls.length < n) {
    const need = Math.min(10, n - urls.length);
    try {
      const res  = await fetch(`https://api.thecatapi.com/v1/images/search?limit=${need}`);
      const data = await res.json();
      data.forEach(d => urls.push(d.url));
    } catch {
      // fallback: cataas with cache-busting
      while (urls.length < n) {
        urls.push(`https://cataas.com/cat?width=900&height=600&i=${urls.length}&_=${Date.now() + urls.length}`);
      }
      break;
    }
  }
  return urls.slice(0, n);
}

// ── inject img into a container
function injectImg(container, url) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  container.appendChild(img);
}

// ── main init
async function initPhotos() {
  const totalNeeded = GRID_COUNT + PROJECT_COUNT * PER_PROJECT;
  const allUrls = await fetchCatUrls(totalNeeded);

  // split
  gridPhotos = allUrls.slice(0, GRID_COUNT);
  for (let p = 1; p <= PROJECT_COUNT; p++) {
    const start = GRID_COUNT + (p - 1) * PER_PROJECT;
    projectPhotos[String(p)] = allUrls.slice(start, start + PER_PROJECT);
  }

  // ── populate photo grid
  document.querySelectorAll('[data-section="photos"]').forEach(card => {
    const idx = parseInt(card.dataset.idx, 10);
    if (gridPhotos[idx]) injectImg(card, gridPhotos[idx]);
  });

  // ── populate project thumbs (first photo of each project)
  document.querySelectorAll('[data-project]').forEach(card => {
    const pid = card.dataset.project;
    const thumb = card.querySelector('.project-thumb');
    if (thumb && projectPhotos[pid]?.[0]) injectImg(thumb, projectPhotos[pid][0]);
  });

  // ── attach click handlers
  attachClickHandlers();
}

initPhotos();


// ─── LIGHTBOX ─────────────────────────────────────────────────
const lb       = document.getElementById('lightbox');
const lbImg    = lb.querySelector('.lb-img');
const lbCur    = lb.querySelector('.lb-cur');
const lbTotal  = lb.querySelector('.lb-total');
const lbPrev   = lb.querySelector('.lb-prev');
const lbNext   = lb.querySelector('.lb-next');
const lbClose  = lb.querySelector('.lb-close');
const lbBg     = lb.querySelector('.lb-backdrop');

let lbPool  = [];   // current photo array
let lbIndex = 0;    // current position

function openLightbox(pool, startIndex) {
  lbPool  = pool;
  lbIndex = startIndex;
  showPhoto(lbIndex, false);
  lb.classList.add('open');
  lb.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function showPhoto(idx, animate = true) {
  lbIndex = ((idx % lbPool.length) + lbPool.length) % lbPool.length; // wrap
  lbCur.textContent   = lbIndex + 1;
  lbTotal.textContent = lbPool.length;

  if (animate) {
    lbImg.classList.add('switching');
    setTimeout(() => {
      lbImg.src = lbPool[lbIndex];
      lbImg.classList.remove('switching');
    }, 200);
  } else {
    lbImg.src = lbPool[lbIndex];
  }
}

lbPrev.addEventListener('click', () => showPhoto(lbIndex - 1));
lbNext.addEventListener('click', () => showPhoto(lbIndex + 1));
lbClose.addEventListener('click', closeLightbox);
lbBg.addEventListener('click', closeLightbox);

// keyboard navigation
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'ArrowLeft')  showPhoto(lbIndex - 1);
  if (e.key === 'ArrowRight') showPhoto(lbIndex + 1);
  if (e.key === 'Escape')     closeLightbox();
});

// touch swipe support
let touchStartX = 0;
lb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) showPhoto(lbIndex + (diff > 0 ? 1 : -1));
});


// ─── ATTACH CLICK HANDLERS (called after photos are loaded) ───
function attachClickHandlers() {
  // photo grid → open with all grid photos
  document.querySelectorAll('[data-section="photos"]').forEach(card => {
    card.addEventListener('click', () => {
      openLightbox(gridPhotos, parseInt(card.dataset.idx, 10));
    });
  });

  // project cards → open with that project's photos
  document.querySelectorAll('[data-project]').forEach(card => {
    card.addEventListener('click', () => {
      const pid = card.dataset.project;
      openLightbox(projectPhotos[pid] || [], 0);
    });
  });
}
