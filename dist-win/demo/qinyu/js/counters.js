(function(){
  function countUp(el){
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur    = 1300;
    const start  = performance.now();
    function step(now){
      const p    = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else {
        el.textContent = target + suffix;
        el.classList.add('flash-num');
        setTimeout(() => el.classList.remove('flash-num'), 380);
      }
    }
    requestAnimationFrame(step);
  }


  // observe stat numbers
  const sObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      sObs.unobserve(e.target);
    });
  }, { threshold: .4 });
  document.querySelectorAll('.hero__stats').forEach(el => sObs.observe(el));


})();
