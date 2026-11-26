const menu = document.getElementById('site-menu');
const menuToggle = document.querySelector('[aria-controls="site-menu"]');
const progress = document.querySelector('.scroll-progress');
const mark = document.querySelector('.case-mark');
const rotationDistance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-mark-scroll-distance'));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

menuToggle.addEventListener('click', () => {
  menu.showModal();
  menu.classList.add('is-visible');
  menuToggle.setAttribute('aria-expanded', 'true');
});
menu.querySelector('button').addEventListener('click', () => menu.close());
menu.addEventListener('click', event => {
  if (event.target === menu) menu.close();
});
menu.addEventListener('close', () => {
  menu.classList.remove('is-visible');
  menuToggle.setAttribute('aria-expanded', 'false');
});

const updateProgress = () => {
  const page = document.scrollingElement;
  const range = page.scrollHeight - page.clientHeight;
  const value = range ? Math.max(0, Math.min(1, page.scrollTop / range)) : 0;
  progress.style.setProperty('--scroll-progress-value', value);
  progress.setAttribute('aria-valuenow', Math.round(value * 100));
  progress.classList.toggle('is-visible', value > 0);
  mark.style.setProperty('--case-mark-rotation', `${reducedMotion.matches ? 0 : page.scrollTop / rotationDistance}turn`);
};
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress, { passive: true });
reducedMotion.addEventListener('change', updateProgress);
updateProgress();
