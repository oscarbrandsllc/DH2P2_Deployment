(function(){
  const RUNTIME_MS = 14000;
  let raf = null;
  function tick(start, ring){
    const t = performance.now();
    const elapsed = (t - start) % RUNTIME_MS;
    const angle = (elapsed / RUNTIME_MS) * 360;
    ring.style.setProperty('--angle', angle + 'deg');
    raf = requestAnimationFrame(() => tick(start, ring));
  }
  function startRing(el){
    if (!el) return;
    if (raf) cancelAnimationFrame(raf);
    tick(performance.now(), el);
  }
  function observeLoading(){
    const loading = document.getElementById('loading');
    if (!loading) return;
    const ring = loading.querySelector('.loading-ring');
    if (!ring) return;
    const run = () => {
      const hidden = loading.classList.contains('hidden');
      if (hidden){
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      } else {
        if (!raf) startRing(ring);
      }
    };
    run();
    const obs = new MutationObserver(run);
    obs.observe(loading, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('visibilitychange', run);
    window.addEventListener('pageshow', run);
    window.addEventListener('pagehide', () => { if (raf) { cancelAnimationFrame(raf); raf = null; } });
    window.addEventListener('resize', run);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeLoading);
  } else {
    observeLoading();
  }
})();