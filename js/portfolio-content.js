/* Редакторские правки применяются до запуска анимаций сайта. */
(() => {
  const script = document.currentScript;
  const pages = ['index.html', 'eis-sob.html'];
  const allowedStyles = new Set([
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
    'color', 'background-color', 'border-color', 'border-width', 'border-style', 'border-radius',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap', 'width', 'max-width',
    'min-height', 'height', 'object-fit', 'opacity',
  ]);
  const skip = 'script, style, link, svg, canvas, noscript, template';
  const children = element => [...element.children].filter(child => !child.matches(skip + ', .portfolio-added'));
  const textSlots = element => [...element.childNodes].filter(node => node.nodeType === 3 && node.data.trim());
  const create = (doc, tag, className, text) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  function address(element) {
    const path = [];
    while (!element.id && element !== element.ownerDocument.body) {
      const parent = element.parentElement;
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

  function style(element, property, value) {
    if (!allowedStyles.has(property) && !/^--[a-z][a-z0-9-]*$/.test(property)) return;
    if (typeof value !== 'string' || /[;{}<>]|\burl\s*\(/i.test(value)) return;
    element.style.setProperty(property, value.trim());
  }

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
    if (element.matches('a') && url(attrs.href, true)) element.setAttribute('href', url(attrs.href, true));
    if (element.matches('img, video, source') && url(attrs.src)) {
      element.setAttribute(element.hasAttribute('data-src') ? 'data-src' : 'src', url(attrs.src));
      element.removeAttribute('srcset');
      if (element.matches('.hero__frame')) element.dataset.portfolioStill = '';
    }
    if (element.matches('video') && url(attrs.poster)) element.poster = url(attrs.poster);
    if (url(attrs.background)) element.style.backgroundImage = `url("${url(attrs.background).replaceAll('"', '%22')}")`;
  }

  function apply(doc, page, content) {
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
  }

  window.PortfolioEditor = { address, apply, children, pages, resolve, textSlots, url };
  if (script?.hasAttribute('data-apply') && window.PORTFOLIO_CONTENT) {
    const page = pages.find(name => location.pathname.endsWith('/' + name)) || pages[0];
    apply(document, page, window.PORTFOLIO_CONTENT);
  }
})();
