(function(){
  const el   = document.getElementById('loader');
  const fill = document.getElementById('loader-fill');
  const pct  = document.getElementById('loader-pct');
  if (!el) return;

  let p = 0;
  const t = setInterval(() => {
    p += Math.random() * 14 + 3;
    if (p >= 100) {
      p = 100;
      clearInterval(t);
      fill.style.width = '100%';
      pct.textContent = '100%';
      setTimeout(() => {
        el.classList.add('out');
        document.querySelector('.hero')?.classList.add('hero-ready');
      }, 260);
    } else {
      fill.style.width = p + '%';
      pct.textContent = Math.floor(p) + '%';
    }
  }, 55);
})();
