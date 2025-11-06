// script.js - Ventaroot interactions: player, visualizer, sidebar, loader
document.addEventListener('DOMContentLoaded', ()=>{
  const preloader = document.getElementById('preloader');
  setTimeout(()=>{
    preloader.style.opacity = 0;
    preloader.style.pointerEvents = 'none';
    setTimeout(()=> preloader.remove(), 600);
  }, 900);

  // Sidebar toggle for mobile
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('toggle-sidebar');
  if(toggle) toggle.addEventListener('click', ()=>{
    sidebar.classList.toggle('open');
  });

  // Compact player controls
  const audio = document.getElementById('audio');
  const compactPlay = document.getElementById('compact-play');
  const compactVolume = document.getElementById('compact-volume');
  const compactTitle = document.getElementById('compact-title');
  compactPlay && compactPlay.addEventListener('click', ()=>{
    if(audio.paused){ audio.play(); compactPlay.textContent = '⏸'; }
    else { audio.pause(); compactPlay.textContent = '▶'; }
  });
  compactVolume && compactVolume.addEventListener('input', e=> audio.volume = e.target.value);

  // Full player open/close
  const openPlayer = document.getElementById('open-player');
  const visualizerPane = document.getElementById('visualizer-pane');
  const closePlayer = document.getElementById('close-player');
  if(openPlayer) openPlayer.addEventListener('click', ()=>{
    visualizerPane.classList.add('show');
  });
  if(closePlayer) closePlayer.addEventListener('click', ()=> visualizerPane.classList.remove('show'));

  // Play/Pause/Volume/Track select
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const volume = document.getElementById('volume');
  const trackSelect = document.getElementById('track-select');
  const trackName = document.getElementById('track-name');

  if(playBtn) playBtn.addEventListener('click', ()=> audio.play());
  if(pauseBtn) pauseBtn.addEventListener('click', ()=> audio.pause());
  if(volume) volume.addEventListener('input', e=> audio.volume = e.target.value);
  if(trackSelect) trackSelect.addEventListener('change', e=>{
    const val = e.target.value;
    audio.src = val;
    trackName.textContent = e.target.options[e.target.selectedIndex].text;
    audio.play();
  });

  // Update compact title
  audio.addEventListener('play', ()=>{
    compactPlay.textContent = '⏸';
    compactTitle.textContent = trackName.textContent || 'Track';
  });
  audio.addEventListener('pause', ()=> compactPlay.textContent = '▶');

  // WebAudio visualizer
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

    function draw(){
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0,0,canvas.width,canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for(let i=0;i<bufferLength;i+=8){
        const v = dataArray[i] / 255;
        const y = canvas.height - (v * canvas.height);
        const hue = i / bufferLength * 360;
        ctx.fillStyle = 'rgba(' + (Math.floor(200 + v*55)) + ',' + (Math.floor(120 + v*80)) + ',' + (Math.floor(200 + v*20)) + ',0.9)';
        ctx.fillRect(x, y, barWidth, canvas.height - y);
        x += barWidth + 1;
      }
    }
    // Resize canvas to displayed size
    function resizeCanvas(){ canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); }
    resizeCanvas();
    window.addEventListener('resize', ()=>{ ctx.setTransform(1,0,0,1,0,0); resizeCanvas(); });
    draw();
  }

  // Small UX touches
  document.querySelectorAll('a[href^="https://discord.gg"]').forEach(a=>{
    a.addEventListener('click', ()=>{
      // Bonus: track clicks in console
      console.log('Discord link clicked');
    });
  });
});
