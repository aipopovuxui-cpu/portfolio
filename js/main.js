/* Запуск. Режимы: ?static – без анимаций, всё видно (для скриншотов); &to=<id> – показать секцию (headless не рисует прокрутку,
   поэтому страница сдвигается отрицательным margin); prefers-reduced-motion – как static, но Lenis тоже выключен.
   Движение – js/motion.js (описание приёмов в docs/motion.md), 3D – js/scene.js лениво (docs/scene.md). */
import { initMotion, initStatCount, initIntroTyping, initRecommendations } from './motion.js?v=13';
import { initDotCursor } from './cursor.js';

const params = new URLSearchParams(location.search);
const isStatic = params.has('static');
if (isStatic) document.documentElement.classList.add('is-static');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof SplitText !== 'undefined';
const motionOn = !isStatic && !reduce;
if (motionOn) initDotCursor();
const menu = document.querySelector('#site-menu');
const menuToggle = document.querySelector('[aria-controls="site-menu"]');
const siteHeader = document.querySelector('.site-header');
const patentCard = document.querySelector('.hero__stat--outlined');
const patentPopup = document.querySelector('#patent-popup');
const projectsCard = document.querySelector('.hero__stat--projects');
const projectsPopup = document.querySelector('#projects-popup');
const showPatent = () => {
  const card = patentCard.getBoundingClientRect();
  const screen = patentPopup.getBoundingClientRect();
  patentPopup.style.setProperty('--patent-card-x', `${card.left - screen.left}px`);
  patentPopup.style.setProperty('--patent-card-y', `${card.top - screen.top}px`);
  patentPopup.classList.add('is-visible');
};
const hidePatent = () => patentPopup.classList.remove('is-visible');
patentCard.addEventListener('pointerenter', () => { if (!cardHoverLocked) showPatent(); });
patentCard.addEventListener('pointerleave', hidePatent);
patentCard.addEventListener('focus', showPatent);
patentCard.addEventListener('blur', hidePatent);
const openPatent = () => window.open('assets/img/hero/patent-document.png', '_blank', 'noopener');
patentCard.addEventListener('click', openPatent);
patentCard.addEventListener('keydown', event => { if (event.key === 'Enter') openPatent(); });
const showProjects = () => {
  const card = projectsCard.getBoundingClientRect();
  const screen = projectsPopup.getBoundingClientRect();
  projectsPopup.style.setProperty('--patent-card-x', `${card.left - screen.left}px`);
  projectsPopup.style.setProperty('--patent-card-y', `${card.top - screen.top}px`);
  projectsPopup.classList.add('is-visible');
};
const hideProjects = () => projectsPopup.classList.remove('is-visible');
projectsCard.addEventListener('pointerenter', () => { if (!cardHoverLocked) showProjects(); });
projectsCard.addEventListener('pointerleave', hideProjects);
projectsCard.addEventListener('focusin', showProjects);
projectsCard.addEventListener('focusout', hideProjects);
projectsCard.addEventListener('click', hideProjects);
let cardHoverLocked = false;
let scrollActive = false;
let scrollIdleTimer;
let pointerX = NaN;
let pointerY = NaN;
const lockCardHover = () => {
  scrollActive = true;
  cardHoverLocked = true;
  document.documentElement.classList.add('is-scroll-hover-locked');
  hidePatent();
  hideProjects();
  clearTimeout(scrollIdleTimer);
  scrollIdleTimer = setTimeout(() => { scrollActive = false; }, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-hover-scroll-idle')));
};
window.addEventListener('wheel', lockCardHover, { passive: true, capture: true });
window.addEventListener('touchmove', lockCardHover, { passive: true });
window.addEventListener('scroll', lockCardHover, { passive: true });
document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  const pointerMoved = Math.abs(event.clientX - pointerX) + Math.abs(event.clientY - pointerY) > 1;
  pointerX = event.clientX;
  pointerY = event.clientY;
  if (!cardHoverLocked || scrollActive || !pointerMoved) return;
  cardHoverLocked = false;
  document.documentElement.classList.remove('is-scroll-hover-locked');
  if (patentCard.contains(event.target)) showPatent();
  else if (projectsCard.contains(event.target)) showProjects();
}, { passive: true });
const expertiseSection = document.querySelector('#expertise');
const contactsSection = document.querySelector('#section-5');
const scrollProgress = document.querySelector('.scroll-progress');
const updateScrollProgress = () => {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const current = Math.min(maxScroll, Math.max(0, window.scrollY));
  const progress = maxScroll ? current / maxScroll : 0;
  scrollProgress.style.setProperty('--scroll-progress-value', progress);
  scrollProgress.setAttribute('aria-valuenow', Math.round(progress * 100));
  scrollProgress.classList.toggle('is-visible', current > 0);
};
window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress, { passive: true });
updateScrollProgress();
const updateHeaderTheme = () => {
  const headerBottom = siteHeader.offsetHeight;
  const onLight = [expertiseSection, contactsSection].some(section => {
    const bounds = section.getBoundingClientRect();
    return bounds.top <= headerBottom && bounds.bottom > headerBottom;
  });
  if (siteHeader.classList.contains('on-light') === onLight) return;
  siteHeader.classList.toggle('on-light', onLight);
};
window.addEventListener('scroll', updateHeaderTheme, { passive: true });
let menuOpening = false;
const closeMenu = () => {
  if (!menu.open || menu.classList.contains('is-closing')) return;
  menu.classList.add('is-closing');
  menu.classList.remove('is-visible');
  menuToggle.classList.remove('is-open');
  const panel = menu.querySelector('.site-menu__panel');
  let fallback;
  const finish = () => {
    if (!menu.open) return;
    clearTimeout(fallback);
    menu.close();
    siteHeader.append(menuToggle);
    menu.classList.remove('is-closing');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Открыть меню');
    menuToggle.focus();
  };
  if (isStatic || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
  const onTransitionEnd = event => {
    if (event.target !== panel || event.propertyName !== 'transform') return;
    panel.removeEventListener('transitionend', onTransitionEnd);
    finish();
  };
  panel.addEventListener('transitionend', onTransitionEnd);
  fallback = setTimeout(finish, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-slide-duration')) + 100);
};
menuToggle.addEventListener('click', () => {
  if (menu.open) { closeMenu(); return; }
  if (menuOpening) return;
  menuOpening = true;
  menuToggle.classList.add('is-open');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Закрыть меню');
  const delay = isStatic || reduce ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-icon-duration'));
  setTimeout(() => {
    menu.prepend(menuToggle);
    menu.showModal();
    menu.querySelector('.site-menu__panel').getBoundingClientRect();
    menu.classList.add('is-visible');
    menuOpening = false;
  }, delay);
});
menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
menu.addEventListener('click', event => {
  if (event.target !== menu) return;
  closeMenu();
});
menu.addEventListener('close', () => menuToggle.setAttribute('aria-expanded', 'false'));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
  if (link.hash === '#projects-intro') {
    event.preventDefault();
    menu.addEventListener('close', () => {
      document.getElementById('projects-intro').scrollIntoView({ block: 'start' });
    }, { once: true });
  }
  closeMenu();
}));
document.querySelectorAll('[data-project-open]').forEach(button => {
  const dialog = document.getElementById(button.dataset.projectOpen);
  if (!dialog) return;
  button.addEventListener('click', () => dialog.showModal());
});
document.querySelectorAll('.project-dialog').forEach(dialog => {
  dialog.querySelector('.project-dialog__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
});
if (motionOn && !window.matchMedia('(max-width: 768px)').matches) {
  initStatCount();
  initIntroTyping();
}

/* Ленивое видео: в разметке data-src + preload="none"; src подставляется, когда секция в полутора экранах */
const lazyVideo = () => {
  const vids = document.querySelectorAll('video[data-src]');
  if (!vids.length) return;
  const load = v => { v.src = v.dataset.src; v.removeAttribute('data-src'); v.load(); if (v.autoplay) v.play().catch(() => {}); };
  if (isStatic || !('IntersectionObserver' in window)) { vids.forEach(load); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), { rootMargin: '50% 0px' });
  vids.forEach(v => io.observe(v));
};

/* 3D: модуль грузится, только если сцена есть на странице, WebGL доступен и движение включено; иначе остаётся запасной кадр */
const lazyScene = () => {
  const host = document.querySelector('[data-scene]');
  if (!host) return;
  const canvas = document.createElement('canvas');
  const webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  if (!webgl || isStatic || reduce) return;
  const start = () => import('./scene.js').then(m => m.mount(host)).catch(err => console.warn('scene: не запустилась', err));
  if (!('IntersectionObserver' in window)) { start(); return; }
  const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '100% 0px' });
  io.observe(host);
};

/* Плавный скролл: Lenis на тикере GSAP, якоря – через lenis.scrollTo */
const smoothScroll = () => {
  if (!motionOn || typeof Lenis === 'undefined') return null;
  const lenis = new Lenis({ lerp: 0.1, autoRaf: !hasGsap });
  if (hasGsap) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    if (e.defaultPrevented) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.2 });
  }));
  return lenis;
};

const showSection = () => {
  const id = params.get('to');
  const el = id && document.getElementById(id);
  if (el) document.body.style.marginTop = `-${el.offsetTop}px`;
};

const placePage = (top, lenis) => {
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: 'instant' });
};

const landOnProjectsIntro = async lenis => {
  const intro = document.getElementById('projects-intro');
  if (!motionOn) intro.closest('.showcase').classList.add('is-intro-landing');
  const position = () => placePage(Math.ceil(intro.getBoundingClientRect().top + window.scrollY), lenis);
  position();
  await new Promise(resolve => requestAnimationFrame(resolve));
  position();
  history.replaceState(history.state, '', '#projects-intro');
};

const root = document.documentElement;
root.dataset.siteBoot = 'preparing';
document.fonts.ready.then(async () => {
  let lenis;
  if (motionOn) {
    document.documentElement.classList.add('has-motion');
    if (hasGsap) gsap.registerPlugin(ScrollTrigger, SplitText);
    lenis = smoothScroll();
    initMotion(hasGsap, lenis);
  } else {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-ready'));
  }
  initRecommendations(motionOn);
  lazyVideo();
  lazyScene();
  if (isStatic) showSection();
  if (root.dataset.siteLanding === 'projects') await landOnProjectsIntro(lenis);
  else if (root.dataset.siteLanding === 'top') placePage(0, lenis);
  updateHeaderTheme();
  updateScrollProgress();
}).finally(() => { delete root.dataset.siteBoot; });
