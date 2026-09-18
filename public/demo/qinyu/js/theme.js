(function(){
  const btn   = document.getElementById('theme-btn');
  const flash = document.getElementById('flash');
  const html  = document.documentElement;

  if (localStorage.getItem('theme') !== 'dark') html.classList.add('light');

  btn && btn.addEventListener('click', () => {
    flash.classList.add('on');
    setTimeout(() => {
      html.classList.toggle('light');
      localStorage.setItem('theme', html.classList.contains('light') ? 'light' : 'dark');
    }, 75);
    setTimeout(() => flash.classList.remove('on'), 280);
  });
})();

(function(){
  const html = document.documentElement;
  const btns = document.querySelectorAll('.fs-btn');

  function apply(size) {
    html.classList.remove('fs-small', 'fs-medium', 'fs-large');
    if (size !== 'small') html.classList.add('fs-' + size);
    btns.forEach(b => b.classList.toggle('active', b.dataset.size === size));
    localStorage.setItem('font-size', size);
  }

  apply(localStorage.getItem('font-size') || 'small');
  btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.size)));
})();
