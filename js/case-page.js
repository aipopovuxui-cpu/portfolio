import { expertiseTyping } from './motion.js?v=18';
import { initDotCursor } from './cursor.js';
import { playPortfolioLottie } from './portfolio-lottie.js';

const menu = document.getElementById('site-menu');
const menuToggle = document.querySelector('[aria-controls="site-menu"]');
const progress = document.querySelector('.scroll-progress');
const mark = document.querySelector('.case-mark');
const rotationDistance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-mark-scroll-distance'));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionOn = !reducedMotion.matches && !new URLSearchParams(location.search).has('static');
if (motionOn) initDotCursor();
playPortfolioLottie();

const caseTitle = document.getElementById('case-title');
if (caseTitle) {
  const content = window.PORTFOLIO_CONTENT;
  const projects = [
    ['eis-sob.html', 'ЕИС СОБ'],
    ['case-2.html', 'АВТОТЕХНОЛОГ'],
    ['case-3.html', 'FINANCE'],
    ['case-4.html', 'CARGO PLUS'],
    ['case-5.html', 'RADAR'],
  ];
  for (const [file, project] of Object.entries(content?.cases || {})) {
    if (/^case-[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(file)) projects.push([file, project.title]);
  }
  const current = location.pathname.split('/').pop();
  const picker = document.createElement('div');
  picker.className = 'case-picker';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'case-picker__toggle';
  const titleLabel = document.createElement('span');
  titleLabel.textContent = caseTitle.textContent.trim();
  button.append(titleLabel);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'case-picker-list');
  const list = document.createElement('nav');
  list.id = 'case-picker-list';
  list.className = 'case-picker__list';
  list.setAttribute('aria-label', 'Выбрать проект');
  list.hidden = true;
  for (const [file, name] of projects) {
    const link = document.createElement('a');
    link.href = file;
    link.textContent = file === current ? button.textContent : content?.edits?.[file]?.['["case-title"]']?.text?.[0]?.trim() || name;
    if (file === current) link.setAttribute('aria-current', 'page');
    list.append(link);
  }
  caseTitle.before(picker);
  caseTitle.replaceChildren(button);
  picker.append(caseTitle, list);

  const setOpen = open => {
    list.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(list.hidden));
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      setOpen(false);
      button.focus();
    } else if (event.key === 'ArrowDown' && event.target === button) {
      event.preventDefault();
      setOpen(true);
      (list.querySelector('[aria-current]') || list.firstElementChild)?.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!picker.contains(event.target)) setOpen(false);
  });
  picker.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) setOpen(false);
  });
}

if (motionOn) {
  const elements = document.querySelectorAll('.case-layout :is(h2, h3, h4, p, dt, dd, figcaption, .case-back)');
  const text = Array.from(elements, element => expertiseTyping(element));
  text.forEach(type => type(1));
}

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
