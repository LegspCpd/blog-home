(function(){
  const cv  = document.getElementById('bgc');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H;

  function resize(){
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // particles
  const N = 55;
  const pts = Array.from({length: N}, () => mkPt(true));

  function mkPt(init){
    return {
      x: Math.random() * (W || 1000),
      y: init ? Math.random() * (H || 800) : (H || 800) + 5,
      vx: (Math.random() - .5) * .28,
      vy: -(Math.random() * .38 + .08),
      r: Math.random() * 1.4 + .3,
      a: Math.random() * .35 + .04,
      life: 1,
      decay: Math.random() * .0025 + .001,
      red: Math.random() > .65,
    };
  }


  function draw(){
    ctx.clearRect(0, 0, W, H);

    // bg glow
    const g = ctx.createRadialGradient(W*.5, H*.3, 0, W*.5, H*.3, W*.5);
    g.addColorStop(0, 'rgba(224,48,48,.022)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // connections
    for (let i = 0; i < N; i++)
      for (let j = i+1; j < N; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 90) {
          ctx.save();
          ctx.strokeStyle = `rgba(224,48,48,${(1-d/90)*.05})`;
          ctx.lineWidth = .5;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }

    // draw + update particles
    pts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life * p.a);
      ctx.fillStyle   = p.red ? 'rgba(224,48,48,1)' : 'rgba(232,160,32,1)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
    });

    // reset dead float particles
    for (let i = 0; i < N; i++)
      if (pts[i].life <= 0 || pts[i].y < -5) Object.assign(pts[i], mkPt(false));

    requestAnimationFrame(draw);
  }
  draw();
})();
