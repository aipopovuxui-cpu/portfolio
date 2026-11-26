import { initContactMarks } from './contacts-marks.js';

/* Реестр приёмов data-reveal. Каждый приём описан в docs/motion.md до того, как появился здесь.
   Порядок в элементе: подготовить начальное состояние → пометить is-ready (снять visibility: hidden) → твин по ScrollTrigger.
   Переопределения из разметки: data-reveal-delay="0.2", data-reveal-stagger="0.05". */
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const num = (el, key, fallback) => (el.dataset[key] !== undefined ? parseFloat(el.dataset[key]) : fallback);
const ready = el => el.classList.add('is-ready');
const trigger = (el, once = true) => ({ trigger: el, start: 'top 85%', once });
const yPx = () => parseFloat(css('--reveal-y')) || 24;

const brandHover = el => {
  ready(el);
  el.addEventListener('pointerenter', () => el.classList.add('is-hovered'));
  el.addEventListener('pointerleave', () => el.classList.remove('is-hovered'));
  el.addEventListener('focus', () => el.classList.add('is-hovered'));
  el.addEventListener('blur', () => el.classList.remove('is-hovered'));
};

const brandScroll = el => {
  brandHover(el);
  const mark = el.querySelector('.brand-lockup__mark');
  const distance = parseFloat(css('--header-mark-scroll-distance'));
  if (!mark || !distance) return;
  let frame = 0;
  const update = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      mark.style.rotate = `${window.scrollY / distance}turn`;
      frame = 0;
    });
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
};

const expertiseTyping = el => {
  if (!window.CSS?.highlights || !window.Highlight) return () => {};
  const name = 'expertise-untyped';
  let highlight = CSS.highlights.get(name);
  if (!highlight) {
    highlight = new Highlight();
    CSS.highlights.set(name, highlight);
  }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.length) nodes.push(walker.currentNode);
  const total = nodes.reduce((sum, node) => sum + node.length, 0);
  if (!total) return () => {};
  const range = new Range();
  range.selectNodeContents(el);
  highlight.add(range);
  let progress = 0;
  let frame = 0;
  const render = value => {
    progress = Math.max(0, Math.min(1, value));
    el.style.setProperty('--typing-progress', progress);
    el.classList.toggle('is-typing', progress < 1);
    if (progress >= 1) {
      const last = nodes[nodes.length - 1];
      range.setStart(last, last.length);
    } else {
      let visible = Math.ceil(total * progress);
      for (const node of nodes) {
        if (visible <= node.length) {
          range.setStart(node, visible);
          break;
        }
        visible -= node.length;
      }
    }
  };
  render(0);
  return target => {
    cancelAnimationFrame(frame);
    if (progress === target) return;
    const from = progress;
    const started = performance.now();
    const duration = (parseFloat(css('--skills-type-duration')) || 1000) * Math.abs(target - from);
    const draw = now => {
      const portion = Math.min(1, (now - started) / duration);
      render(from + (target - from) * portion);
      if (portion < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  };
};

const watchExpertiseThreshold = (el, change) => {
  let active = false;
  let pending = false;
  const update = () => {
    pending = false;
    const next = el.getBoundingClientRect().top <= window.innerHeight * parseFloat(css('--skills-trigger-viewport'));
    if (next === active) return;
    active = next;
    change(active);
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
};

const expertiseType = el => {
  const animate = expertiseTyping(el);
  ready(el);
  watchExpertiseThreshold(el, active => animate(active ? 1 : 0));
};

const expertiseCards = el => {
  const cards = Array.from(el.children, card => ({
    card,
    animate: Array.from(card.querySelectorAll('h3, p'), expertiseTyping),
  }));
  ready(el);
  let timers = [];
  watchExpertiseThreshold(el, active => {
    timers.forEach(clearTimeout);
    timers = [];
    const stagger = parseFloat(css('--skills-card-stagger'));
    const order = active ? cards : [...cards].reverse();
    order.forEach(({ card, animate }, index) => {
      timers.push(setTimeout(() => {
        card.classList.toggle('is-visible', active);
        animate.forEach(run => run(active ? 1 : 0));
      }, stagger * index));
    });
  });
};

export const initRecommendations = autoplay => {
  const panel = document.querySelector('.proof__panel');
  const indicators = [...panel.querySelectorAll('.proof__indicator')];
  const progress = panel.querySelector('.proof__progress');
  const visiblePortion = .35;
  let current = 0;
  let previous = 0;
  let frame = 0;
  let elapsed = 0;
  let inView = false;

  const select = index => {
    indicators[current].setAttribute('aria-pressed', 'false');
    indicators[index].setAttribute('aria-pressed', 'true');
    current = index;
    progress.value = elapsed = 0;
    previous = 0;
  };
  indicators.forEach((button, index) => button.addEventListener('click', () => select(index)));
  if (!autoplay) return;

  const tick = now => {
    if (previous) elapsed += now - previous;
    previous = now;
    if (elapsed >= progress.max) {
      select((current + 1) % indicators.length);
      previous = now;
    } else {
      progress.value = elapsed;
    }
    frame = requestAnimationFrame(tick);
  };
  const update = () => {
    if (inView && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    }
  };
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.intersectionRatio >= visiblePortion;
    update();
  }, { threshold: visiblePortion });
  observer.observe(panel);
  document.addEventListener('visibilitychange', update);
};

const frameExpertise = el => {
  const screen = el.closest('.hero__screen');
  const text = Array.from(el.querySelectorAll('.expertise-lead, .expertise-copy p'), expertiseTyping);
  const chips = Array.from(el.querySelectorAll('.expertise-chip'), chip => ({ chip, type: expertiseTyping(chip) }));
  let active = false;
  let timers = [];
  const update = () => {
    const next = screen.classList.contains('has-expertise');
    if (next === active) return;
    active = next;
    timers.forEach(clearTimeout);
    timers = [];
    text.forEach(type => type(next ? 1 : 0));
    const order = next ? chips : [...chips].reverse();
    const stagger = parseFloat(css('--hero-expertise-chip-stagger'));
    order.forEach(({ chip, type }, index) => {
      timers.push(setTimeout(() => {
        chip.classList.toggle('is-visible', next);
        type(next ? 1 : 0);
      }, stagger * index));
    });
  };
  ready(el);
  screen.addEventListener('frame-expertise-change', update);
  update();
};

const frameSequence = (screen) => {
  const section = screen.closest('section');
  const image = screen.querySelector('.hero__frame');
  const total = Number(screen.dataset.frameCount);
  const expertiseFrame = Number(screen.dataset.expertiseFrame);
  const distance = parseFloat(css('--hero-scroll-distance'));
  const fadeDistance = parseFloat(css('--hero-fade-distance'));
  const sideBlocks = screen.querySelectorAll('.hero__intro, .hero__stats');
  const stats = screen.querySelector('.hero__stats');
  const chat = screen.querySelector('.hero__chat');
  const title = screen.querySelector('.hero__title');
  const loaded = new Set([1]);
  const queue = new Set(image.hasAttribute('data-portfolio-still') ? [] : Array.from({ length: total - 1 }, (_, i) => i + 2));
  let target = 1;
  let rendered = 1;
  let inFlight = 0;
  let updatePending = false;

  const frameURL = number => new URL(`${number}.jpg`, image.src).href;
  const draw = () => {
    if (target === rendered || !loaded.has(target)) return;
    image.src = frameURL(target);
    rendered = target;
  };

  const loadFrames = () => {
    while (inFlight < 4 && queue.size) {
      const number = queue.has(target) ? target : queue.values().next().value;
      queue.delete(number);
      inFlight += 1;
      const frame = new Image();
      frame.onload = () => {
        loaded.add(number);
        draw();
        finish();
      };
      frame.onerror = () => finish();
      const finish = () => {
        inFlight -= 1;
        loadFrames();
      };
      frame.src = frameURL(number);
    }
  };

  const update = () => {
    updatePending = false;
    const offset = Math.max(0, -section.getBoundingClientRect().top);
    screen.classList.toggle('has-scrolled', offset > 0);
    screen.style.setProperty('--hero-opacity', Math.max(0, 1 - offset / fadeDistance));
    screen.style.setProperty('--hero-side-progress', Math.min(1, offset / window.innerHeight));
    const progress = Math.min(1, offset / distance);
    target = 1 + Math.round(progress * (total - 1));
    const expertiseActive = target >= expertiseFrame;
    if (screen.classList.contains('has-expertise') !== expertiseActive) {
      screen.classList.toggle('has-expertise', expertiseActive);
      screen.dispatchEvent(new Event('frame-expertise-change'));
    }
    draw();
    loadFrames();
  };

  section.classList.add('is-sequenced');
  const measureBlocks = () => {
    for (const block of sideBlocks) {
      const center = block.offsetTop + block.offsetHeight / 2;
      block.style.setProperty('--hero-side-shift', `${-center}px`);
    }
    if (stats && chat) {
      const right = screen.getBoundingClientRect().right - stats.getBoundingClientRect().right;
      chat.style.setProperty('--hero-chat-width', `${stats.offsetWidth}px`);
      chat.style.setProperty('--hero-chat-right', `${Math.max(0, right)}px`);
      if (window.matchMedia('(max-width: 768px)').matches) {
        const gap = parseFloat(css('--space-16')) || 0;
        chat.style.setProperty('--hero-chat-top', `${title.offsetTop + title.offsetHeight + gap}px`);
      } else {
        const gap = parseFloat(css('--hero-chat-stats-gap')) || 0;
        chat.style.setProperty('--hero-chat-top', `${Math.max(0, stats.offsetTop - chat.offsetHeight - gap)}px`);
      }
    }
    update();
  };
  const observer = new ResizeObserver(measureBlocks);
  observer.observe(screen);
  sideBlocks.forEach(block => observer.observe(block));
  window.addEventListener('resize', measureBlocks);
  ready(screen);
  window.addEventListener('scroll', () => {
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(update);
  }, { passive: true });
  measureBlocks();
};

const frameApproach = (image) => {
  ready(image);
  const start = () => {
    image.classList.add('is-entering');
    image.addEventListener('animationend', () => {
      image.classList.remove('is-entering');
      image.classList.add('has-arrived');
    }, { once: true });
  };
  const loader = document.querySelector('.site-loader');
  if (!loader || loader.classList.contains('is-leaving')) start();
  else document.addEventListener('loader-leaving', start, { once: true });
};

const waveformArrive = (el) => {
  ready(el);
  afterLoader(() => setTimeout(() => {
    el.classList.add('is-entering');
    el.querySelector('.hero__waveform-media').addEventListener('animationend', () => {
      el.classList.remove('is-entering');
      el.classList.add('has-arrived');
    }, { once: true });
  }, parseFloat(css('--hero-wave-delay'))));
};

const chatLoop = (chat) => {
  const rows = Array.from(chat.querySelectorAll('li'), row => {
    const text = row.querySelector('p');
    const content = text.textContent;
    row.classList.add('is-pending');
    text.textContent = '';
    return { row, text, content };
  });
  const lineDelay = parseFloat(css('--hero-chat-line-delay'));
  const revealDuration = parseFloat(css('--hero-chat-reveal-duration'));
  const scrollSpeed = parseFloat(css('--hero-chat-scroll-speed'));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitAtTop = async () => {
    while (window.scrollY > 0) await wait(200);
  };

  const lift = () => {
    if (!chat.isConnected) return;
    if (window.scrollY > 0) {
      setTimeout(() => requestAnimationFrame(lift), 200);
      return;
    }
    const target = Math.max(0, chat.scrollHeight - chat.clientHeight);
    if (target - chat.scrollTop > 1) chat.scrollTop += (target - chat.scrollTop) * scrollSpeed;
    else chat.scrollTop = target;
    requestAnimationFrame(lift);
  };

  const play = async () => {
    requestAnimationFrame(lift);
    while (chat.isConnected) {
      for (const { row, text, content } of rows) {
        await waitAtTop();
        row.classList.remove('is-pending');
        row.classList.add('is-entering');
        text.textContent = content;
        await wait(revealDuration);
        row.classList.remove('is-entering');
        await wait(lineDelay);
      }
      await waitAtTop();
      chat.classList.add('is-resetting');
      await wait(revealDuration);
      for (const { row, text } of rows) {
        row.classList.add('is-pending');
        text.textContent = '';
      }
      chat.scrollTop = 0;
      chat.classList.remove('is-resetting');
    }
  };
  ready(chat);
  afterLoader(play);
};

const clientsMarquee = (track) => {
  const duplicate = track.firstElementChild.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.querySelectorAll('img').forEach(image => image.alt = '');
  track.appendChild(duplicate);
  ready(track);
  if (!('IntersectionObserver' in window)) {
    track.classList.add('is-playing');
    return;
  }
  const observer = new IntersectionObserver(entries => {
    track.classList.toggle('is-playing', entries.some(entry => entry.isIntersecting));
  });
  observer.observe(track);
};

const experienceHover = (list) => {
  ready(list);
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const image = list.closest('.experience').querySelector('.experience__preview');
  const rows = list.querySelectorAll('.experience__row[data-preview-src]');
  const size = parseFloat(css('--experience-preview-size'));
  const edge = parseFloat(css('--experience-preview-edge'));
  const offset = parseFloat(css('--experience-preview-offset'));
  const follow = parseFloat(css('--experience-preview-follow'));
  const delay = parseFloat(css('--experience-preview-delay'));
  let active = null;
  let frame = 0;
  let revealTimer = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let pointerX = 0;
  let pointerY = 0;

  rows.forEach(row => { new Image().src = row.dataset.previewSrc; });

  const aim = event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    targetX = Math.max(edge, Math.min(event.clientX - size / 2, window.innerWidth - size - edge));
    targetY = Math.max(edge, Math.min(event.clientY - size - offset, window.innerHeight - size - edge));
  };
  const followCursor = () => {
    x += (targetX - x) * follow;
    y += (targetY - y) * follow;
    image.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (active) frame = requestAnimationFrame(followCursor);
    else frame = 0;
  };
  const hide = () => {
    active = null;
    clearTimeout(revealTimer);
    image.classList.remove('is-visible');
  };

  rows.forEach(row => {
    row.addEventListener('pointerenter', event => {
      active = row;
      aim(event);
      if (!frame) {
        x = targetX;
        y = targetY;
        image.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        frame = requestAnimationFrame(followCursor);
      }
      image.classList.remove('is-visible');
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => {
        if (active !== row) return;
        image.src = row.dataset.previewSrc;
        image.classList.add('is-visible');
      }, delay);
    });
    row.addEventListener('pointermove', aim);
    row.addEventListener('pointerleave', () => { if (active === row) hide(); });
  });
  window.addEventListener('scroll', () => {
    if (active && !active.contains(document.elementFromPoint(pointerX, pointerY))) hide();
  }, { passive: true });
};

const careerTimeline = (el, lenis) => {
  const pin = el.querySelector('.career__pin');
  const stage = el.querySelector('.career__stage');
  const track = el.querySelector('.career__track');
  const cards = [...track.children];
  const cardText = cards.map(card => Array.from(card.querySelectorAll('h4, p'), expertiseTyping));
  const lastCard = cards.length - 1;
  const lastStep = cards.length;
  const stride = '(var(--career-card-width) + var(--career-card-gap))';
  let shown = -1;
  let entered = false;

  const render = step => {
    const current = Math.min(step, lastCard);
    if (shown === current) return;
    const previous = shown;
    shown = current;
    const firstOffset = current === 0 ? ' + var(--career-first-offset)' : '';
    track.style.setProperty('--career-shift', `calc(${lastCard - current} * ${stride}${firstOffset})`);
    track.style.setProperty('--career-mobile-shift', `calc(${-current} * ${stride})`);
    cards.forEach((card, index) => {
      const visible = index <= current;
      card.classList.toggle('is-visible', visible);
      if (entered && visible !== (index <= previous)) {
        cardText[index].forEach(animate => animate(visible ? 1 : 0));
      }
    });
  };

  const position = () => {
    const offset = parseFloat(getComputedStyle(pin).top);
    const start = window.scrollY + el.getBoundingClientRect().top - offset;
    const stepSize = (el.offsetHeight - pin.offsetHeight) / lastStep;
    return { start, stepSize, progress: (window.scrollY - start) / stepSize };
  };
  const sync = () => render(Math.min(lastStep, Math.max(0, Math.floor(position().progress + .01))));
  const step = direction => {
    const { start, stepSize, progress } = position();
    if (progress < -.01 || progress > lastStep + .01) return false;
    const next = direction > 0 ? Math.floor(progress + .01) + 1 : Math.ceil(progress - .01) - 1;
    if (next < 0 || next > lastStep) return false;
    const y = start + next * stepSize;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
    render(next);
    return true;
  };

  el.style.setProperty('--career-steps', lastStep);
  render(0);
  el.classList.add('is-interactive');
  sync();
  watchExpertiseThreshold(pin, active => {
    entered = active;
    stage.classList.toggle('is-visible', active);
    cardText.slice(0, shown + 1).forEach(lines => lines.forEach(animate => animate(active ? 1 : 0)));
  });
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });

  const gesturePause = 140;
  let lastWheel = -Infinity;
  let wheelDirection = 0;
  let consumedWheel = false;
  window.addEventListener('wheel', event => {
    if (event.ctrlKey || event.defaultPrevented || !event.cancelable || document.querySelector('dialog[open]')) return;
    const direction = Math.sign(Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY);
    if (!direction) return;
    if (!consumedWheel || direction !== wheelDirection || event.timeStamp - lastWheel > gesturePause) {
      consumedWheel = step(direction);
    }
    lastWheel = event.timeStamp;
    wheelDirection = direction;
    if (consumedWheel) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });

  let touch;
  el.addEventListener('touchstart', event => {
    const finger = event.touches[0];
    touch = event.touches.length === 1 ? { x: finger.clientX, y: finger.clientY, consumed: false } : null;
  }, { passive: true });
  el.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1 || !event.cancelable) return;
    const finger = event.touches[0];
    const dx = touch.x - finger.clientX;
    const dy = touch.y - finger.clientY;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const { progress } = position();
    const canStep = delta > 0 ? progress >= -.01 && progress < lastStep - .01 : progress > .01 && progress <= lastStep + .01;
    if (!touch.consumed && !canStep) return;
    event.preventDefault();
    event.stopPropagation();
    if (!touch.consumed && Math.abs(delta) >= 24) touch.consumed = step(Math.sign(delta));
  }, { passive: false });
  ready(el);
};

const showcaseFlight = el => {
  const runway = el.querySelector('.showcase__runway');
  const cards = [...el.querySelectorAll('.showcase__card')];
  const hold = parseFloat(css('--showcase-scroll-hold'));
  const distance = parseFloat(css('--showcase-scroll-flight'));
  let cardsReady = false;
  let frame;
  let lastProgress;
  const updateCards = cards.map(card => {
    const text = [...card.querySelectorAll('h3, p, dt, dd')].map(expertiseTyping);
    let inView = false;
    let visible = false;
    const sync = () => {
      const next = cardsReady && inView;
      if (next === visible) return;
      visible = next;
      card.classList.toggle('is-visible', visible);
      text.forEach(type => type(visible ? 1 : 0));
    };
    watchExpertiseThreshold(card, active => {
      inView = active;
      sync();
    });
    return sync;
  });

  el.classList.add('is-animated');
  ready(el);
  const update = () => {
    frame = undefined;
    const scroll = -runway.getBoundingClientRect().top / window.innerHeight;
    const progress = Math.max(0, Math.min(1, (scroll - hold) / distance));
    if (progress === lastProgress) return;
    lastProgress = progress;
    el.style.setProperty('--showcase-flight', progress * progress * (3 - 2 * progress));
    const next = progress === 1;
    if (next === cardsReady) return;
    cardsReady = next;
    updateCards.forEach(sync => sync());
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
};

export const PRESETS = {
  'contacts-marks': el => { initContactMarks(el); ready(el); },
  'showcase-flight': showcaseFlight,
  'career-timeline': careerTimeline,
  'brand-hover': brandHover,
  'brand-scroll': brandScroll,
  'expertise-type': expertiseType,
  'expertise-cards': expertiseCards,
  'frame-sequence': frameSequence,
  'frame-approach': frameApproach,
  'waveform-arrive': waveformArrive,
  'frame-expertise': frameExpertise,
  'chat-loop': chatLoop,
  'clients-marquee': clientsMarquee,
  'experience-hover': experienceHover,
  'fade': (el) => {
    gsap.set(el, { autoAlpha: 0, y: yPx() }); ready(el);
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: num(el, 'revealDelay', 0), scrollTrigger: trigger(el) });
  },
  'lines': (el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' }); ready(el);
    gsap.from(split.lines, { yPercent: 110, duration: 0.9, ease: 'power4.out', stagger: num(el, 'revealStagger', 0.08), delay: num(el, 'revealDelay', 0), scrollTrigger: trigger(el), onComplete: () => split.revert() });
  },
  'chars': (el) => {
    const split = SplitText.create(el, { type: 'lines,chars', mask: 'lines', linesClass: 'line' }); ready(el);
    gsap.from(split.chars, { yPercent: 110, duration: 1, ease: 'power4.out', stagger: num(el, 'revealStagger', 0.025), delay: num(el, 'revealDelay', 0), scrollTrigger: trigger(el), onComplete: () => split.revert() });
  },
  'clip': (el) => {
    gsap.set(el, { clipPath: 'inset(100% 0 0 0)' }); ready(el);
    gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1, ease: css('--ease-sharp') || 'power4.inOut', delay: num(el, 'revealDelay', 0), scrollTrigger: trigger(el) });
  },
  'card': (el) => {
    const kids = Array.from(el.children);
    gsap.set(el, { autoAlpha: 0, y: yPx() * 2, scale: 0.98 }); gsap.set(kids, { autoAlpha: 0, y: yPx() * 0.6 }); ready(el);
    const tl = gsap.timeline({ scrollTrigger: trigger(el), delay: num(el, 'revealDelay', 0) });
    tl.to(el, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' })
      .to(kids, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: num(el, 'revealStagger', 0.1) }, '-=0.5');
  },
  'stagger': (el) => {
    const kids = Array.from(el.children);
    gsap.set(kids, { autoAlpha: 0, y: yPx() }); ready(el);
    gsap.to(kids, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: num(el, 'revealStagger', 0.08), delay: num(el, 'revealDelay', 0), scrollTrigger: trigger(el) });
  },
  'scrub': (el) => {
    /* Прогресс прокрутки элемента через экран → CSS-переменная --p (0…1). Что с ней делать, решает правило секции */
    ready(el);
    gsap.fromTo(el, { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  },
};

const afterLoader = start => {
  if (document.querySelector('.site-loader')) {
    document.addEventListener('loader-finished', start, { once: true });
  } else {
    start();
  }
};

export const initIntroTyping = () => {
  afterLoader(() => {
    document.querySelector('.hero__stats').classList.add('rules-entered');
    const portrait = document.querySelector('.hero__portrait');
    portrait.classList.add('is-entering');
    portrait.addEventListener('animationend', () => portrait.classList.remove('is-entering'), { once: true });
    document.querySelectorAll('.hero__stats > div').forEach(element => {
      element.classList.add('is-entering');
      element.addEventListener('animationend', () => {
        element.classList.remove('is-entering');
        element.classList.add('has-arrived');
      }, { once: true });
    });
  });
  afterLoader(async () => {
    await document.fonts.ready;
    const ai = document.querySelector('.hero__title-ai');
    const width = Math.ceil(ai.querySelector('span').getBoundingClientRect().width);
    ai.style.setProperty('--hero-ai-width', `${width}px`);
    const delay = parseFloat(css('--hero-typing-duration')) + parseFloat(css('--hero-ai-delay'));
    setTimeout(() => {
      ai.classList.add('is-flying');
      setTimeout(() => ai.classList.add('is-impact'), parseFloat(css('--hero-ai-flight-duration')));
    }, delay);
  });
  if (!window.CSS?.highlights || !window.Highlight) return;
  const elements = document.querySelectorAll('.hero__title, .hero-greeting, .hero-bio, .hero__stats dt, .hero__stats > div:not(.hero__stat--projects) dd');
  const highlight = new Highlight();
  const groups = Array.from(elements, el => {
    el.classList.add('is-typing');
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim() && !walker.currentNode.parentElement.closest('.hero__title-ai')) nodes.push(walker.currentNode);
    }
    const range = new Range();
    range.selectNodeContents(el);
    highlight.add(range);
    return { el, nodes, range };
  });
  CSS.highlights.set('hero-untyped', highlight);

  afterLoader(() => {
    const start = performance.now();
    const draw = now => {
      const progress = Math.max(0, (now - start) / parseFloat(css('--hero-typing-duration')));
      if (progress >= 1) {
        CSS.highlights.delete('hero-untyped');
        for (const { el } of groups) el.classList.remove('is-typing');
        document.documentElement.style.removeProperty('--typing-progress');
        return;
      }
      document.documentElement.style.setProperty('--typing-progress', progress);
      for (const { el, nodes, range } of groups) {
        // The counters replace their text as their values increase.
        if (el.tagName === 'DD') {
          nodes[0] = el.firstChild;
          range.setEnd(nodes[0], nodes[0].length);
        }
        let visible = Math.ceil(nodes.reduce((sum, node) => sum + node.length, 0) * progress);
        for (const node of nodes) {
          if (visible <= node.length) {
            range.setStart(node, visible);
            break;
          }
          visible -= node.length;
        }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });
};

export const initStatCount = () => {
  const stats = Array.from(document.querySelectorAll('.hero__stats > div:not(.hero__stat--projects) dd'), el => {
    const label = el.textContent.trim();
    const value = parseInt(label, 10);
    const suffix = label.slice(String(value).length);
    el.textContent = '0' + suffix;
    return { el, value, suffix };
  });
  if (!stats.length) return;

  const start = () => {
    const started = performance.now();
    const draw = now => {
      const progress = Math.min(1, Math.max(0, (now - started) / 2000));
      for (const { el, value, suffix } of stats) {
        const text = Math.floor(value * progress) + suffix;
        if (el.textContent !== text) el.textContent = text;
      }
      if (progress < 1) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  };
  afterLoader(start);
};

export const initMotion = (hasGsap, lenis) => {
  if (hasGsap) gsap.config({ nullTargetWarn: false });
  document.querySelectorAll('[data-reveal]').forEach(el => {
    const name = el.dataset.reveal;
    const fn = PRESETS[name];
    if (!fn) { console.warn(`motion: приёма "${name}" нет в реестре (docs/motion.md)`); ready(el); return; }
    if (hasGsap || name === 'contacts-marks' || fn === showcaseFlight || fn === careerTimeline || fn === brandHover || fn === brandScroll || fn === frameSequence || fn === frameApproach || fn === waveformArrive || fn === chatLoop || fn === clientsMarquee || fn === experienceHover || fn === expertiseType || fn === expertiseCards || fn === frameExpertise) fn(el, lenis);
    else ready(el);
  });
  if (hasGsap) ScrollTrigger.refresh();
};
