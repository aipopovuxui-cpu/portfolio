(() => {
  if (new URLSearchParams(location.search).has('static') ||
      location.hash === '#eis-project' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const loader = document.querySelector('#loader-layout').content.firstElementChild.cloneNode(true);
  document.body.append(loader);

  const finish = () => {
    if (!loader.isConnected) return;
    loader.remove();
    document.dispatchEvent(new Event('loader-finished'));
  };

  setTimeout(() => {
    loader.classList.add('is-leaving');
    document.dispatchEvent(new Event('loader-leaving'));
    loader.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 1200);
  }, 3000);
})();
