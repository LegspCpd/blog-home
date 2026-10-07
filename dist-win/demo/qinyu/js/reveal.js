(function(){
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el    = e.target;
      const delay = parseInt(el.dataset.d || 0);
      // skip hero items (handled by CSS animation after loader)
      if (el.closest('.hero')) return;
      setTimeout(() => el.classList.add('vis'), delay);
      obs.unobserve(el);
    });
  }, { threshold: .1, rootMargin: '0px 0px -36px 0px' });

  document.querySelectorAll('.ru,.rl,.rr').forEach(el => {
    if (!el.closest('.hero') && !el.classList.contains('tl__item')) obs.observe(el);
  });

  // timeline items: separate observer, trigger just before entering viewport
  const tlObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el    = e.target;
      const delay = parseInt(el.dataset.d || 0);
      setTimeout(() => el.classList.add('vis'), delay);
      tlObs.unobserve(el);
    });
  }, { threshold: 0, rootMargin: '0px 0px 30px 0px' });

  document.querySelectorAll('.tl__item.ru').forEach(el => tlObs.observe(el));

  // timeline track draw
  const trackObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('drawn');
        trackObs.unobserve(e.target);
      }
    });
  }, { threshold: .05 });
  document.querySelectorAll('.tl__track').forEach(t => trackObs.observe(t));
})();
