// script.js - Improved interactions: audio-reactive logo, better visualizer, persistent settings
document.addEventListener('DOMContentLoaded', ()=>{
  // Preloader animated logo
  const preloader = document.getElementById('preloader');
  const prelogo = document.getElementById('prelogo');
  const preCtx = prelogo && prelogo.getContext('2d');
  let preAnim = 0;
  function drawPrelogo(t){
    if(!preCtx) return;
    preCtx.clearRect(0,0,prelogo.width,prelogo.height);
    preCtx.save();
    preCtx.translate(prelogo.width/2, prelogo.height/2);
    preCtx.rotate(preAnim * 0.02);
    preCtx.fillStyle = 'rgba(255,255,255,0.06)';
    for(let i=0;i<6;i++){
      preCtx.beginPath();
      preCtx.rotate(Math.PI/3);
      preCtx.rect(24, -6, 36, 12);
      preCtx.fill();
    }
    preCtx.restore();
    preAnim++;
    requestAnimationFrame(drawPrelogo);
  }
  drawPrelogo();

  setTimeout(()=>{
    if(preloader) preloader.remove();
  }, 900);

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('toggle-sidebar');
  if(toggle) toggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));

  // Audio elements and settings
  const audio = document.getElementById('audio');
  const compactPlay = document.getElementById('compact-play');
  const compactVolume = document.getElementById('compact-volume');
  const compactTitle = document.getElementById('compact-title');
  const trackSelect = document.getElementById('track-select');
  const trackName = document.getElementById('track-name');
  const openPlayerBtns = document.querySelectorAll('#open-player, #open-player-2');
  const visualizerPane = document.getElementById('visualizer-pane');
  const closePlayer = document.getElementById('close-player');
  const heroLogo = document.getElementById('hero-logo');
  const sideLogo = document.getElementById('side-logo');
  const compactLogo = document.getElementById('compact-logo');
  const playerLogo = document.getElementById('player-logo');
  const bigTitle = document.getElementById('big-title');

  // persistent settings
  const savedVol = localStorage.getItem('ventaroot_volume');
  const savedTrack = localStorage.getItem('ventaroot_track');
  if(savedVol !== null){ audio.volume = parseFloat(savedVol); if(compactVolume) compactVolume.value = audio.volume; if(document.getElementById('volume')) document.getElementById('volume').value = audio.volume; }
  if(savedTrack){ audio.src = savedTrack; for(let opt of trackSelect.options){ if(opt.value === savedTrack) opt.selected = true; } }

  // compact controls
  compactPlay && compactPlay.addEventListener('click', ()=>{
    if(audio.paused){ audio.play(); compactPlay.textContent = '⏸'; }
    else { audio.pause(); compactPlay.textContent = '▶'; }
  });
  compactVolume && compactVolume.addEventListener('input', e=>{ audio.volume = e.target.value; localStorage.setItem('ventaroot_volume', audio.volume); });

  // Open/close full player
  openPlayerBtns.forEach(b=>b.addEventListener('click', ()=> visualizerPane.classList.add('show')));
  if(closePlayer) closePlayer.addEventListener('click', ()=> visualizerPane.classList.remove('show'));

  // Play/pause/next/prev/track selection
  document.getElementById('play').addEventListener('click', ()=> audio.play());
  document.getElementById('pause').addEventListener('click', ()=> audio.pause());
  document.getElementById('prev').addEventListener('click', ()=> changeTrack(-1));
  document.getElementById('next').addEventListener('click', ()=> changeTrack(1));
  document.getElementById('volume').addEventListener('input', e=>{ audio.volume = e.target.value; compactVolume.value = e.target.value; localStorage.setItem('ventaroot_volume', audio.volume); });
  trackSelect.addEventListener('change', e=>{ audio.src = e.target.value; audio.play(); localStorage.setItem('ventaroot_track', e.target.value); updateTrackMeta(); });

  function changeTrack(dir){
    const opts = Array.from(trackSelect.options);
    let idx = opts.findIndex(o=>o.value===audio.src || o.value===audio.currentSrc.replace(location.origin+'/', ''));
    if(idx===-1) idx=0;
    idx = (idx + dir + opts.length) % opts.length;
    trackSelect.selectedIndex = idx;
    audio.src = opts[idx].value;
    localStorage.setItem('ventaroot_track', opts[idx].value);
    audio.play();
    updateTrackMeta();
  }

  function updateTrackMeta(){
    const selected = trackSelect.options[trackSelect.selectedIndex];
    trackName.textContent = selected.text;
    compactTitle.textContent = selected.text;
  }
  updateTrackMeta();

  // WebAudio - visualizer & logo-reactive
  const canvas = document.getElementById('visualizer');
  const ctx = canvas && canvas.getContext('2d');
  if(canvas && ctx){
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // sample logo color to use as accent
    const logoImg = new Image();
    logoImg.src = document.getElementById('side-logo').src;
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = ()=>{
      const c = document.createElement('canvas');
      c.width = logoImg.width; c.height = logoImg.height; const cx = c.getContext('2d');
      cx.drawImage(logoImg,0,0);
      try{
        const d = cx.getImageData(0,0,c.width,c.height).data;
        let r=0,g=0,b=0,count=0;
        for(let i=0;i<d.length;i+=4*10){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; count++; }
        r=Math.floor(r/count); g=Math.floor(g/count); b=Math.floor(b/count);
        document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
      }catch(e){ /* maybe CORS, ignore */ }
    };

    // draw visualizer
    function draw(){
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      // clear
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0,0,canvas.width,canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barCount = 80;
      const slice = Math.floor(dataArray.length/barCount);
      const barWidth = (width / barCount) * 0.9;
      let x=0;
      let sum = 0;
      for(let i=0;i<barCount;i++){
        const v = dataArray[i*slice] / 255;
        sum += v;
        const barH = v * height;
        const hue = 200 + (i/barCount)*160;
        // rounded bar
        const gx = ctx.createLinearGradient(0, height-barH, 0, height);
        gx.addColorStop(0, `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb')},0.95)`);
        gx.addColorStop(1, `rgba(0,0,0,0.2)`);
        ctx.fillStyle = gx;
        roundRect(ctx, x, height - barH, barWidth, barH, 6, true, false);
        x += barWidth + 4;
      }
      // compute rms for logo reaction
      const rms = Math.sqrt(sum / barCount);
      const scale = 1 + rms * 0.28;
      const glow = Math.min(1, rms * 2.5);
      document.documentElement.style.setProperty('--logo-scale', scale);
      document.documentElement.style.setProperty('--logo-glow', glow);
    }

    // handle canvas sizing and DPR
    function resizeCanvas(){
      const ratio = devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.imageSmoothingQuality = 'high';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(draw);
  }

  // utility - rounded rect
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof stroke == 'undefined') stroke = true;
    if (typeof r === 'undefined') r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // small UX touches
  audio.addEventListener('play', ()=>{ compactPlay.textContent = '⏸'; });
  audio.addEventListener('pause', ()=>{ compactPlay.textContent = '▶'; });
  audio.addEventListener('ended', ()=>{ compactPlay.textContent = '▶'; });

  // Click tracker for discord links
  document.querySelectorAll('a[href^="https://discord.gg"]').forEach(a=> a.addEventListener('click', ()=> console.log('Discord link clicked')));
});
