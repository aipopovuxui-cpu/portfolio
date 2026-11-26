export const initDotCursor = () => {
  if (!matchMedia('(pointer: fine)').matches) return;
  const cursor = document.createElement('div');
  cursor.className = 'dot-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="dot-cursor__point"></span><span class="dot-cursor__ring"></span>';
  document.body.append(cursor);
  document.documentElement.classList.add('has-dot-cursor');
  const menu = document.querySelector('.site-menu');
  new MutationObserver(() => (menu.open ? menu : document.body).append(cursor)).observe(menu, { attributes: true, attributeFilter: ['open'] });

  const point = cursor.firstElementChild;
  const ring = cursor.lastElementChild;
  const follow = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cursor-follow'));
  let x = -100, y = -100, ringX = x, ringY = y, frame = 0;
  const draw = () => {
    ringX += (x - ringX) * follow;
    ringY += (y - ringY) * follow;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    if (Math.abs(x - ringX) + Math.abs(y - ringY) > .1) frame = requestAnimationFrame(draw);
    else frame = 0;
  };
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX;
    y = event.clientY;
    point.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    cursor.classList.add('is-visible');
    cursor.classList.toggle('is-hovered', Boolean(event.target.closest('a, button, [role="link"], input, textarea, select')));
    const onCard = event.target.closest('.hero__stat--outlined:hover, .hero__stat--projects:hover');
    const onPink = event.target.closest('.hero__stat--featured, .expertise-chip--ai, .skills-card--ai') || (onCard && !document.documentElement.classList.contains('is-scroll-hover-locked'));
    cursor.classList.toggle('is-on-pink', Boolean(onPink));
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  window.addEventListener('blur', () => cursor.classList.remove('is-visible'));
};
