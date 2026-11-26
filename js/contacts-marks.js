export const initContactMarks = layer => {
  const clients = document.getElementById('client-recommendations');
  const page = document.scrollingElement;
  const bodies = Array.from(layer.children, (el, index) => ({
    el, index, x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, radius: 0, clarity: 0,
  }));
  let width = 0;
  let height = 0;
  let frame = 0;
  let last = 0;
  let activeSeconds = 0;
  let grab;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const paint = body => {
    body.el.style.transform = `translate3d(${body.x - body.radius}px, ${body.y - body.radius}px, 0) rotate(${body.angle}deg)`;
  };
  const constrain = body => {
    const { radius } = body;
    if (body.x < radius || body.x > width - radius) {
      body.x = clamp(body.x, radius, width - radius);
      body.vx *= -.52;
    }
    if (body.y > height - radius) {
      body.y = height - radius;
      body.vy = body.vy > 45 ? -body.vy * .55 : 0;
      body.vx *= .89;
      body.spin *= .89;
    }
  };
  const collide = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    const overlap = (a.radius + b.radius) * .92 - distance;
    if (overlap <= 0) return;
    const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
    const wa = Number(grab?.body !== a), wb = Number(grab?.body !== b);
    const correction = overlap / (wa + wb);
    a.x -= nx * correction * wa;
    a.y -= ny * correction * wa;
    b.x += nx * correction * wb;
    b.y += ny * correction * wb;
    const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (approach <= 0) return;
    const impulse = approach * 1.42 / (wa + wb);
    a.vx -= impulse * nx * wa;
    a.vy -= impulse * ny * wa;
    b.vx += impulse * nx * wb;
    b.vy += impulse * ny * wb;
    a.spin -= impulse * ny * wa * .6;
    b.spin += impulse * ny * wb * .6;
  };
  const tick = now => {
    frame = 0;
    const elapsed = Math.min((now - last) / 1000, .032);
    const step = elapsed / 3;
    activeSeconds -= elapsed;
    last = now;
    for (let pass = 0; pass < 3; pass++) {
      for (const body of bodies) {
        if (grab?.body === body) continue;
        body.vy += 1700 * step;
        body.vx *= .996;
        body.spin *= .993;
        body.x += body.vx * step;
        body.y += body.vy * step;
        body.angle += body.spin * step;
        constrain(body);
      }
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j]);
      }
    }
    const top = layer.getBoundingClientRect().top;
    for (const body of bodies) {
      if (grab?.body !== body) constrain(body);
      if (body.clarity < 1) {
        const entry = clamp((body.y + top) / 180, 0, 1);
        const clarity = body.y >= height - body.radius ? 1 : Math.max(body.clarity, entry);
        body.clarity = clarity;
        body.el.style.setProperty('--mark-clarity', clarity);
      }
      paint(body);
    }
    if (grab || activeSeconds > 0) frame = requestAnimationFrame(tick);
    else for (const body of bodies) body.vx = body.vy = body.spin = 0;
  };
  const wake = () => {
    activeSeconds = 4.2;
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };
  const measure = (restart = false) => {
    const oldWidth = restart ? 0 : width;
    width = layer.clientWidth;
    height = layer.clientHeight;
    const top = layer.getBoundingClientRect().top;
    const launchLine = Math.min(-top, height - 180);
    for (const body of bodies) {
      body.radius = body.el.offsetWidth / 2;
      if (oldWidth) {
        body.x *= width / oldWidth;
        constrain(body);
      } else {
        const slot = (body.index * 5 % bodies.length + .5) / bodies.length;
        body.x = clamp((.08 + slot * .84) * width, body.radius, width - body.radius);
        body.y = launchLine + body.radius * .45 - body.index * 8;
        body.vx = (body.index % 5 - 2) * 25;
        body.vy = 680;
        body.angle = 0;
        body.spin = (body.index % 4 - 1.5) * 80;
        body.clarity = clamp((body.y + top) / 180, 0, 1);
        body.el.style.setProperty('--mark-clarity', body.clarity);
      }
      paint(body);
    }
    wake();
  };
  const release = event => {
    if (grab?.id !== event.pointerId) return;
    const { body, at, vx, vy } = grab;
    const fling = event.type === 'pointerup' && performance.now() - at < 100;
    body.vx = fling ? vx : 0;
    body.vy = fling ? vy : 0;
    body.spin = body.vx * .4;
    body.el.classList.remove('is-grabbed');
    grab = undefined;
    wake();
  };
  for (const body of bodies) {
    body.el.addEventListener('pointermove', event => {
      if (grab) {
        if (grab.body !== body || grab.id !== event.pointerId) return;
        const bounds = layer.getBoundingClientRect();
        const x = clamp(event.clientX - bounds.left + grab.dx, body.radius, width - body.radius);
        const y = clamp(event.clientY - bounds.top + grab.dy, body.radius, height - body.radius);
        const now = performance.now();
        const dt = Math.max((now - grab.at) / 1000, .012);
        grab.vx = clamp((x - body.x) / dt, -1200, 1200);
        grab.vy = clamp((y - body.y) / dt, -1200, 1200);
        grab.at = now;
        body.x = x;
        body.y = y;
        body.vx = grab.vx;
        body.vy = grab.vy;
        paint(body);
        return;
      }
      if (event.pointerType !== 'mouse' || Math.hypot(event.movementX, event.movementY) < 4) return;
      body.vx += clamp(event.movementX * 12, -280, 280);
      body.vy = Math.min(body.vy, -160 - Math.abs(event.movementY) * 5);
      wake();
    });
    body.el.addEventListener('pointerdown', event => {
      if (grab || event.button !== 0) return;
      const bounds = layer.getBoundingClientRect();
      grab = { body, id: event.pointerId, at: performance.now(), vx: 0, vy: 0,
        dx: body.x - event.clientX + bounds.left, dy: body.y - event.clientY + bounds.top };
      body.vx = body.vy = body.spin = 0;
      body.el.setPointerCapture(event.pointerId);
      body.el.classList.add('is-grabbed');
      wake();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      body.el.addEventListener(type, release);
    }
  }

  let active = false;
  const resize = new ResizeObserver(() => { if (active) measure(); });
  const update = () => {
    const scroll = page.scrollTop;
    const maxScroll = page.scrollHeight - page.clientHeight;
    const atBottom = maxScroll > 0 && maxScroll - scroll <= 1;
    if (!active && !atBottom) return;
    const next = atBottom || (active && clients.getBoundingClientRect().top < -1);
    if (active === next) return;
    active = next;
    layer.classList.toggle('is-running', active);
    if (active) {
      measure(true);
    } else {
      if (grab) {
        const { body, id } = grab;
        grab = undefined;
        body.el.classList.remove('is-grabbed');
        if (body.el.hasPointerCapture(id)) body.el.releasePointerCapture(id);
      }
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  layer.classList.add('is-physical');
  resize.observe(layer);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
};
