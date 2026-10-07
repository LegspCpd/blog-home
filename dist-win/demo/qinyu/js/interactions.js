(function(){
  // scroll progress
  const prog = document.getElementById('progress');
  window.addEventListener('scroll', () => {
    if (prog) {
      const s = document.body.scrollHeight - window.innerHeight;
      prog.style.width = (window.scrollY / s * 100) + '%';
    }
  }, { passive: true });

  // nav stuck state + active links
  const nav      = document.querySelector('.nav');
  const navLinks = document.querySelectorAll('.nav__links a');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    nav?.classList.toggle('stuck', window.scrollY > 50);
    let cur = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 130) cur = s.id; });
    navLinks.forEach(a => {
      a.classList.toggle('on', a.getAttribute('href') === '#' + cur);
    });
  }, { passive: true });

  // 3D tilt
  document.querySelectorAll('.char,.ev,.law,.ed,.vd').forEach(card => {
    if (card.classList.contains('ed--wide')) return;
    card.addEventListener('mousemove', e => {
      const r   = card.getBoundingClientRect();
      const dx  = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy  = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      card.style.transform = `perspective(700px) rotateX(${-dy*5}deg) rotateY(${dx*5}deg) scale(1.01)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  // sim trigger removed
})();

