/* Редакторские правки применяются до запуска анимаций сайта. */
(() => {
  const script = document.currentScript;
  const pages = ['index.html', 'eis-sob.html', 'case-2.html', 'case-3.html', 'case-4.html', 'case-5.html'];
  const allowedStyles = new Set([
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
    'color', 'background-color', 'border-color', 'border-width', 'border-style', 'border-radius',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap', 'width', 'max-width',
    'min-width', 'min-height', 'max-height', 'height', 'aspect-ratio', 'object-fit', 'object-position', 'opacity', 'translate',
  ]);
  const skip = 'script, style, link, svg, canvas, noscript, template';
  const inlineLink = '[data-portfolio-inline-link]';
  const children = element => [...element.children].flatMap(child => child.matches(inlineLink) ? children(child) : [child])
    .filter(child => !child.matches(skip + ', .portfolio-added'));
  const textSlots = element => [...(element.querySelector(':scope > ' + inlineLink) || element).childNodes]
    .filter(node => node.nodeType === 3 && node.data.trim());
  const canLink = node => node.matches('a, button[type="button"]') ||
    (node.matches('p, span, small, strong, em, li, dt, dd, h1, h2, h3, h4, h5, h6, blockquote') &&
      !node.closest('a, button, [role="link"]') && !node.querySelector('a, button, input, [role="link"]'));
  const create = (doc, tag, className, text) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  function address(element) {
    if (element.matches(inlineLink)) element = element.parentElement;
    const path = [];
    while (!element.id && element !== element.ownerDocument.body) {
      const owner = element.parentElement;
      const parent = owner?.matches(inlineLink) ? owner.parentElement : owner;
      if (!parent || element.matches(skip)) return '';
      path.unshift(children(parent).indexOf(element));
      element = parent;
    }
    return JSON.stringify([element.id, ...path]);
  }

  function resolve(doc, key) {
    try {
      const [id, ...path] = JSON.parse(key);
      return path.reduce((element, index) => element && children(element)[index], id ? doc.getElementById(id) : doc.body);
    } catch {
      return null;
    }
  }

  function url(value, link = false) {
    if (typeof value !== 'string' || !value.trim() || /[\\\u0000-\u0020]/.test(value.trim())) return '';
    const source = value.trim();
    if (/^https?:\/\/[^/]/i.test(source) || (link && /^(mailto:|tel:)/i.test(source))) {
      try { return new URL(source).href; } catch { return ''; }
    }
    return /^(?:#|\.\/|assets\/|[\w-]+\.html(?:[?#]|$))/i.test(source) ? source : '';
  }

  function validStyle(property, value) {
    return (allowedStyles.has(property) || /^--[a-z][a-z0-9-]*$/.test(property)) &&
      typeof value === 'string' && !/[;{}<>]|\burl\s*\(/i.test(value);
  }

  function style(element, property, value) {
    if (validStyle(property, value)) element.style.setProperty(property, value.trim());
  }

  const background = source => `url("${source.replaceAll('"', '%22')}")`;

  function media(doc, type, value, alt = '') {
    const source = url(value);
    if (!source) return null;
    const element = create(doc, type);
    element.src = source;
    if (type === 'img') {
      element.alt = alt;
      element.loading = 'lazy';
    } else {
      element.controls = true;
      element.playsInline = true;
      element.preload = 'none';
    }
    return element;
  }

  function createBlock(doc, block) {
    const { type, id, title, text, tag, src, alt, href, button, metrics = [] } = block;
    const mediaType = block.video ? 'video' : 'img';
    let element;
    switch (type) {
      case 'project': {
        element = create(doc, 'article', 'showcase__card');
        const copy = create(doc, 'div', 'showcase__copy');
        if (tag) copy.append(create(doc, 'p', 'showcase__tag', tag));
        copy.append(create(doc, 'h3', 'showcase__case-title', title));
        if (text) copy.append(create(doc, 'p', 'showcase__description', text));
        if (metrics.length) {
          const list = create(doc, 'dl', 'showcase__metrics');
          for (const metric of metrics) {
            const item = create(doc, 'div');
            item.append(create(doc, 'dt', '', metric.label), create(doc, 'dd', '', metric.value));
            list.append(item);
          }
          copy.append(list);
        }
        if (url(href, true)) {
          const link = create(doc, 'a', 'showcase__button', button || 'Детали проекта');
          link.href = url(href, true);
          copy.append(link);
        }
        const asset = media(doc, mediaType, src, alt);
        element.append(copy);
        if (asset) {
          const figure = create(doc, 'figure', 'showcase__media');
          figure.append(asset);
          element.append(figure);
        }
        break;
      }
      case 'img':
      case 'video':
        element = media(doc, type, src, alt);
        break;
      case 'heading':
        element = create(doc, 'h3', '', text);
        break;
      case 'text':
        element = create(doc, 'p', '', text);
        break;
      case 'card':
        element = create(doc, 'article', 'portfolio-added-card');
        if (title) element.append(create(doc, 'h3', '', title));
        if (text) element.append(create(doc, 'p', '', text));
        break;
      case 'link':
        if (!url(href, true)) return null;
        element = create(doc, 'a', '', text);
        element.href = url(href, true);
        break;
    }
    if (!element || !/^portfolio-[a-z0-9-]+$/.test(id)) return null;
    element.id = id;
    element.classList.add('portfolio-added');
    return element;
  }

  function applyEdit(element, edit) {
    const slots = textSlots(element);
    for (const [index, value] of Object.entries(edit.text || {})) {
      const node = slots[index];
      if (node && typeof value === 'string') {
        const start = node.data.match(/^\s*/)[0];
        const end = node.data.match(/\s*$/)[0];
        node.data = start + value + end;
      }
    }
    for (const [property, value] of Object.entries(edit.style || {})) style(element, property, value);
    const attrs = edit.attrs || {};
    for (const name of ['alt', 'aria-label', 'title']) {
      if (typeof attrs[name] === 'string') element.setAttribute(name, attrs[name]);
    }
    if (element.matches('img, video, source') && url(attrs.src)) {
      element.setAttribute(element.hasAttribute('data-src') ? 'data-src' : 'src', url(attrs.src));
      element.removeAttribute('srcset');
      if (element.matches('.hero__frame')) element.dataset.portfolioStill = '';
    }
    if (element.matches('video') && url(attrs.poster)) element.poster = url(attrs.poster);
    if (url(attrs.background)) element.style.backgroundImage = background(url(attrs.background));
    if (edit.removed) {
      element.hidden = true;
      element.dataset.portfolioRemoved = '';
      element.style.setProperty('display', 'none', 'important');
    }
    const destination = url(attrs.href, true);
    if (!destination || !canLink(element)) return;
    if (element.matches('a')) element.setAttribute('href', destination);
    else if (element.matches('button')) {
      element.removeAttribute('data-project-open');
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        element.ownerDocument.defaultView?.location.assign(destination);
      }, true);
    } else {
      const anchor = create(element.ownerDocument, 'a');
      anchor.setAttribute('data-portfolio-inline-link', '');
      anchor.href = destination;
      anchor.append(...element.childNodes);
      element.append(anchor);
    }
  }

  function bindMedia(element, profiles, preview) {
    const pictureSource = element.matches('picture > source');
    const video = element.closest('video');
    const originalLazy = element.getAttribute('data-src');
    const originalSource = element.getAttribute('src');
    const originalSet = element.getAttribute('srcset');
    const originalPoster = element.getAttribute('poster');
    const hero = element.matches('.hero__frame');
    const originalStill = element.hasAttribute('data-portfolio-still');
    const hasSource = Object.values(profiles).some(edit => url(edit?.attrs?.src));
    const hasPoster = video === element && Object.values(profiles).some(edit => url(edit?.attrs?.poster));
    const update = (name, value) => {
      if (element.getAttribute(name) === value) return false;
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
      return true;
    };
    if (hero && hasSource && !originalStill && !preview) element.dataset.portfolioFrameSource = element.src;
    return device => {
      const attrs = profiles[device]?.attrs || {};
      if (hasPoster) update('poster', url(attrs.poster) || originalPoster);
      if (!hasSource) return;
      const source = url(attrs.src);
      const lazy = originalLazy && !preview && element.hasAttribute('data-src');
      let changed;
      if (pictureSource) {
        changed = update('srcset', source || originalSet);
      } else if (lazy) {
        changed = update('data-src', source || originalLazy);
      } else {
        changed = update('src', source || originalSource || originalLazy);
        if (element.matches('img')) update('srcset', source ? null : originalSet);
      }
      if (hero) element.toggleAttribute('data-portfolio-still', Boolean(source) || originalStill);
      if (changed && video && !lazy && !preview) {
        video.load();
        if (video.autoplay) video.play().catch(() => {});
      }
    };
  }

  function bindVariants(doc, page, variants, preview) {
    if (!variants) return;
    const targets = new Map();
    for (const device of ['desktop', 'mobile']) {
      const profile = variants[device];
      if (!profile) continue;
      const register = (element, edit) => {
        if (!element) return;
        if (!targets.has(element)) targets.set(element, {});
        targets.get(element)[device] = edit;
      };
      register(doc.documentElement, { style: profile.tokens });
      for (const [key, edit] of Object.entries(profile.edits?.[page] || {})) register(resolve(doc, key), edit);
    }
    const bindings = [...targets].map(([element, profiles]) => {
      const rules = {};
      const baseline = new Map();
      for (const [device, edit] of Object.entries(profiles)) {
        const values = new Map(Object.entries(edit?.style || {}).filter(([key, value]) => validStyle(key, value)));
        const image = url(edit?.attrs?.background);
        if (image) values.set('background-image', background(image));
        rules[device] = values;
        for (const key of values.keys()) {
          if (!baseline.has(key)) baseline.set(key, [element.style.getPropertyValue(key), element.style.getPropertyPriority(key)]);
        }
      }
      const media = element.matches('img, video, source') ? bindMedia(element, profiles, preview) : null;
      return device => {
        for (const [key, [original, priority]] of baseline) {
          const value = rules[device]?.get(key);
          if (value !== undefined) element.style.setProperty(key, value);
          else if (original) element.style.setProperty(key, original, priority);
          else element.style.removeProperty(key);
        }
        media?.(device);
      };
    });
    const paint = device => bindings.forEach(binding => binding(device));
    if (preview) paint(preview);
    else if (doc.defaultView) {
      const mobile = doc.defaultView.matchMedia('(max-width: 768px)');
      const refresh = () => paint(mobile.matches ? 'mobile' : 'desktop');
      refresh();
      mobile.addEventListener('change', refresh);
    }
  }

  function apply(doc, page, content, previewDevice) {
    for (const [property, value] of Object.entries(content.tokens || {})) style(doc.documentElement, property, value);
    const edits = Object.entries(content.edits?.[page] || {});
    const originalElements = edits.map(([key, edit]) => [resolve(doc, key), edit]);
    const blocks = (content.blocks || []).filter(block => block.page === page);
    const anchors = blocks.map(block => resolve(doc, block.anchor));
    const startTail = new Map();
    const afterTail = new Map();
    blocks.forEach((block, index) => {
      const anchor = anchors[index] || resolve(doc, block.anchor);
      if (!anchor) return;
      const element = createBlock(doc, block);
      if (!element) return;
      if (block.position === 'before') {
        anchor.before(element);
      } else if (block.position === 'after') {
        (afterTail.get(anchor) || anchor).after(element);
        afterTail.set(anchor, element);
      } else if (block.position === 'start') {
        if (startTail.has(anchor)) startTail.get(anchor).after(element);
        else anchor.prepend(element);
        startTail.set(anchor, element);
      } else {
        anchor.append(element);
      }
    });
    edits.forEach(([key, edit], index) => {
      const element = originalElements[index][0] || resolve(doc, key);
      if (element) applyEdit(element, edit);
    });
    bindVariants(doc, page, content.variants, previewDevice);
  }

  window.PortfolioEditor = { address, apply, canLink, children, pages, resolve, textSlots, url };
  if (script?.hasAttribute('data-apply') && window.PORTFOLIO_CONTENT) {
    const name = location.pathname.split('/').at(-1);
    const page = pages.includes(name) || Object.hasOwn(window.PORTFOLIO_CONTENT.cases || {}, name) ? name : pages[0];
    apply(document, page, window.PORTFOLIO_CONTENT);
  }
})();
