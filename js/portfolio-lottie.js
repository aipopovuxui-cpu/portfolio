const runtimeUrl = 'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.77.1/+esm';
const wasmUrl = 'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.77.1/dist/dotlottie-player.wasm';
let runtime;

export function playPortfolioLottie(doc = document) {
  const canvases = [...doc.querySelectorAll('canvas[data-lottie-src]')];
  if (!canvases.length) return () => {};
  let disposed = false;
  const players = [];
  (runtime ||= import(runtimeUrl).then(({ DotLottie }) => {
    DotLottie.setWasmUrl(wasmUrl);
    return DotLottie;
  })).then(DotLottie => {
    if (disposed) return;
    for (const canvas of canvases) {
      const autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      const player = new DotLottie({
        canvas, autoplay, loop: true, src: new URL(canvas.dataset.lottieSrc, doc.baseURI).href,
      });
      players.push(player);
      player.addEventListener('load', () => { canvas.dataset.lottieState = 'ready'; });
      player.addEventListener('loadError', () => { canvas.dataset.lottieState = 'error'; });
    }
  }).catch(() => {
    runtime = undefined;
    canvases.forEach(canvas => { canvas.dataset.lottieState = 'error'; });
  });
  return () => {
    disposed = true;
    players.forEach(player => player.destroy());
  };
}
