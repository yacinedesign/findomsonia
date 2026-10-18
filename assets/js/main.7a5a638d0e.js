(() => {
'use strict';
const doc = document.documentElement;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');
const AGE_KEY = 'ms-age-ok';
function track(event, params) {
try {
if (window.zaraz && typeof window.zaraz.track === 'function') window.zaraz.track(event, params);
if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event }, params));
} catch (_) { /* la medición nunca debe romper la navegación */ }
}
document.addEventListener('click', (e) => {
const el = e.target.closest('[data-track]');
if (el) track(el.dataset.track, { placement: el.dataset.placement || '' });
});
const gate = $('#age-gate');
const ageOk = () => doc.classList.contains('age-ok');
if (gate && !ageOk()) {
const enter = $('#age-enter');
const exit = $('.age-exit', gate);
const onKey = (e) => {
if (e.key !== 'Tab') return;
e.preventDefault();
(document.activeElement === enter ? exit : enter).focus();
};
const onFocusIn = (e) => { if (!gate.contains(e.target)) enter.focus(); };
document.addEventListener('keydown', onKey);
document.addEventListener('focusin', onFocusIn);
enter.addEventListener('click', () => {
try { localStorage.setItem(AGE_KEY, String(Date.now())); } catch (_) { /* modo privado: se volverá a preguntar */ }
track('age_gate_confirm', {});
document.removeEventListener('keydown', onKey);
document.removeEventListener('focusin', onFocusIn);
doc.classList.add('age-leaving');
const done = () => {
doc.classList.add('age-ok');
doc.classList.remove('age-leaving');
gate.classList.remove('is-leaving');
enter.blur();
updateMobileCta();
};
if (reduceMotion.matches) done();
else { gate.classList.add('is-leaving'); setTimeout(done, 350); }
});
}
const navbar = $('.navbar');
const toggle = $('.nav-toggle');
const menu = $('#nav-links');
const setMenu = (open) => {
if (!navbar || !toggle) return;
navbar.classList.toggle('nav-open', open);
toggle.setAttribute('aria-expanded', String(open));
toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
document.body.classList.toggle('menu-lock', open);
};
if (toggle && menu) {
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && navbar.classList.contains('nav-open')) { setMenu(false); toggle.focus(); }
});
window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
}
if (navbar) {
let ticking = false;
const onScroll = () => {
if (ticking) return;
ticking = true;
requestAnimationFrame(() => { navbar.classList.toggle('is-scrolled', window.scrollY > 10); ticking = false; });
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
}
const hasIO = 'IntersectionObserver' in window;
const navLinks = $$('.nav-links a[href^="#"]');
if (hasIO && navLinks.length) {
const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
const spy = new IntersectionObserver((entries) => {
entries.forEach((en) => {
if (!en.isIntersecting) return;
navLinks.forEach((a) => a.removeAttribute('aria-current'));
const link = byId.get(en.target.id);
if (link) link.setAttribute('aria-current', 'true');
});
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id], footer[id]').forEach((s) => spy.observe(s));
}
const mobileCta = $('.mobile-cta');
const heroBtns = $('.hero-btns');
const footer = $('#contacto');
let pastHero = false;
let footerVisible = false;
function updateMobileCta() {
if (!mobileCta) return;
const show = pastHero && !footerVisible && ageOk();
mobileCta.classList.toggle('is-visible', show);
mobileCta.inert = !show;
}
if (mobileCta && hasIO && heroBtns && footer) {
new IntersectionObserver(([en]) => {
pastHero = !en.isIntersecting && en.boundingClientRect.top < 0;
updateMobileCta();
}).observe(heroBtns);
new IntersectionObserver(([en]) => { footerVisible = en.isIntersecting; updateMobileCta(); }).observe(footer);
}
updateMobileCta();
const track$ = $('#gallery-track');
const items = track$ ? $$('.gallery-item', track$) : [];
const current$ = $('.gallery-current');
let current = 0;
function goTo(i) {
const li = items[i].parentElement;
const left = li.offsetLeft - (track$.clientWidth - li.offsetWidth) / 2;
track$.scrollTo({ left, behavior: scrollBehavior() });
}
function syncIndex() {
const center = track$.scrollLeft + track$.clientWidth / 2;
let best = 0;
let bestDist = Infinity;
items.forEach((item, i) => {
const li = item.parentElement;
const dist = Math.abs(li.offsetLeft + li.offsetWidth / 2 - center);
if (dist < bestDist) { bestDist = dist; best = i; }
});
if (best !== current) { current = best; if (current$) current$.textContent = String(current + 1); }
}
if (track$ && items.length) {
let raf = 0;
track$.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(syncIndex); }, { passive: true });
$('.gallery-btn.prev').addEventListener('click', () => goTo((current - 1 + items.length) % items.length));
$('.gallery-btn.next').addEventListener('click', () => goTo((current + 1) % items.length));
}
const lb = $('#lightbox');
if (lb && items.length && typeof lb.showModal === 'function') {
const lbSource = $('source', lb);
const lbImg = $('img', lb);
const lbCount = $('.lb-count', lb);
let lbIndex = 0;
let opener = null;
const show = (i) => {
lbIndex = (i + items.length) % items.length;
const pic = $('picture', items[lbIndex]);
const src = $('source[type="image/avif"]', pic);
const img = $('img', pic);
lbSource.srcset = src.srcset;
lbImg.srcset = img.srcset;
lbImg.src = img.currentSrc || img.src;
lbImg.width = img.width;
lbImg.height = img.height;
lbImg.alt = img.alt;
lbImg.loading = 'eager';
lbCount.textContent = (lbIndex + 1) + ' de ' + items.length;
};
items.forEach((item, i) => item.addEventListener('click', () => {
opener = item;
show(i);
lb.showModal();
track('gallery_open', { placement: String(i + 1) });
}));
$('.lb-close', lb).addEventListener('click', () => lb.close());
$('.lb-prev', lb).addEventListener('click', () => show(lbIndex - 1));
$('.lb-next', lb).addEventListener('click', () => show(lbIndex + 1));
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener('keydown', (e) => {
if (e.key === 'ArrowLeft') show(lbIndex - 1);
if (e.key === 'ArrowRight') show(lbIndex + 1);
});
lb.addEventListener('close', () => {
opener = items[lbIndex];
if (track$) goTo(lbIndex);
requestAnimationFrame(() => opener.focus({ preventScroll: true }));
});
}
const toast$ = $('#toast');
let toastTimer = 0;
function toast(msg) {
if (!toast$) return;
toast$.textContent = msg;
toast$.classList.add('is-visible');
clearTimeout(toastTimer);
toastTimer = setTimeout(() => toast$.classList.remove('is-visible'), 2600);
}
async function copyText(text) {
try {
await navigator.clipboard.writeText(text);
return true;
} catch (_) {
const ta = document.createElement('textarea');
ta.value = text;
ta.setAttribute('readonly', '');
ta.className = 'sr-only';
document.body.appendChild(ta);
ta.select();
let ok = false;
try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
ta.remove();
return ok;
}
}
$$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
const ok = await copyText(btn.dataset.copy);
toast(ok ? 'Número copiado: ' + btn.dataset.copyLabel : 'Copia manualmente: ' + btn.dataset.copyLabel);
}));
})();