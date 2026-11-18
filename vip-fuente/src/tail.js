Promise.all([fontsReady, Promise.race([gsapReady, new Promise(function(r){ setTimeout(r, 1400); })])]).then(finishLoader);
if (SNAP) window.__sky = function(){ return SKY; };   // solo para pruebas

/* ============================================================
   UI del viaje: capítulos, barra, nav
   ============================================================ */
(function(){
  var CH = [
    [0,     'La puerta', 'Esta noche estás en la lista.'],
    [0.2,   'La pista',  'DJ en vivo, luces y la gente de siempre.'],
    [0.47,  'La barra',  'Buchanan\'s, tequila, ron. Servido como debe ser.'],
    [0.735, 'El VIP',    'Pasa la cortina. Tu mesa te está esperando.']
  ];
  var TOT = ('0' + CH.length).slice(-2);
  var nav = $('#nav'), ui = $('#hero-ui'), title = $('#hero-title'), meta = $('#hero-meta'), hint = $('#hint');
  var cap = $('#cap'), capN = $('#cap-n'), capT = $('#cap-t'), capS = $('#cap-s'), idx = $('#bar-idx'), fill = $('#bar-fill');
  var cur = -1, swapping = false, tm = 0, lastP = -1, lastSolid = null;
  var gyRow = $('.gyro-row');
  var line = $('.bar-line');
  if (line){
    CH.forEach(function(c, i){
      if (!i) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'bar-tick'; b.style.left = (unmap(c[0]) * 100).toFixed(2) + '%';
      b.setAttribute('aria-label', 'Ir a ' + c[1]);
      b.addEventListener('click', function(){
        var y = (unmap(c[0]) + 0.025) * heroMax;
        if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      });
      line.appendChild(b);
    });
  }
  document.addEventListener('keydown', function(e){
    if (window.scrollY > heroMax || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    var k = clamp(cur + (e.key === 'ArrowRight' ? 1 : -1), 0, CH.length - 1), y = k ? (unmap(CH[k][0]) + 0.025) * heroMax : 0;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });
  tickers.push(function(){
    var p = S.p, u = S.u, y = window.scrollY;
    var solid = u > 0.97 || y > heroMax + 4;
    if (solid !== lastSolid){ nav.classList.toggle('solid', solid); lastSolid = solid; }
    if (y > heroMax + window.innerHeight) return;
    if (Math.abs(p - lastP) < 0.00005 && cur !== -1) return;
    lastP = p;
    var tOut = sstep(0.012, 0.04, u);
    title.style.opacity = (1 - tOut).toFixed(3);
    title.style.transform = 'translate3d(0,' + (-p * 500).toFixed(1) + 'px,0) scale(' + (1 + p * 6).toFixed(3) + ')';
    title.style.visibility = tOut > 0.999 ? 'hidden' : 'visible';
    meta.style.opacity = (1 - sstep(0.008, 0.03, u)).toFixed(3);
    if (gyRow){ var go = 1 - sstep(0.008, 0.03, u); gyRow.style.opacity = go.toFixed(3); gyRow.style.pointerEvents = go < 0.1 ? 'none' : ''; }
    hint.style.opacity = (1 - sstep(0.004, 0.03, p)).toFixed(3);
    ui.style.opacity = (1 - sstep(0.93, 0.97, u)).toFixed(3);
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var a = 0; for (var i = 0; i < CH.length; i++){ if (u >= CH[i][0]) a = i; }
    var want = u > 0.03 && u < 0.93;
    if (a !== cur){
      if (cur !== -1) S.burst = performance.now();
      cur = a; swapping = true; cap.classList.remove('on'); clearTimeout(tm);
      tm = setTimeout(function(){
        capN.textContent = ('0' + (cur + 1)).slice(-2); capT.textContent = CH[cur][1]; capS.textContent = CH[cur][2];
        idx.textContent = ('0' + (cur + 1)).slice(-2) + ' / ' + TOT;
        swapping = false; lastP = -1;
      }, 230);
    }
    if (!swapping) cap.classList.toggle('on', want);
  });
})();

/* ============================================================
   Reserva: mesa, fecha, personas → panel de Talal + WhatsApp
   ============================================================ */
(function(){
  var form = $('#form'); if (!form) return;
  var chips = $$('.chip', form), sumT = $('#sum-txt'), sumP = $('#sum-price'), msg = $('#form-msg');
  var CAP = { 'VIP': 5, 'VIP Deluxe': 6, 'VIP Diamante': 7, 'VIP DJ': 5 };
  var zona = 'VIP Diamante', price = 200, pp = 4;
  var ppVal = $('#pp-val');
  function setZona(z){
    chips.forEach(function(c){ var on = c.getAttribute('data-zona') === z; c.classList.toggle('on', on); c.setAttribute('aria-checked', on ? 'true' : 'false'); if (on) price = +c.getAttribute('data-price'); });
    zona = z;
    $$('.mesa').forEach(function(m){ m.classList.toggle('sel', m.getAttribute('data-zona') === z); });
    pp = Math.min(pp, CAP[z] || 7); ppVal.textContent = pp;
    sumT.textContent = z + ' · hasta ' + (CAP[z] || 7) + ' personas'; sumP.textContent = '$' + price;
  }
  chips.forEach(function(c){ c.addEventListener('click', function(){ setZona(c.getAttribute('data-zona')); }); });
  $$('.mesa').forEach(function(m){
    var z = m.getAttribute('data-zona');
    m.addEventListener('click', function(){ setZona(z); });
  });
  $('#pp-minus').addEventListener('click', function(){ pp = Math.max(1, pp - 1); ppVal.textContent = pp; });
  $('#pp-plus').addEventListener('click', function(){ pp = Math.min(CAP[zona] || 7, pp + 1); ppVal.textContent = pp; });

  // fecha por defecto: el próximo sábado (si hoy es sábado, hoy)
  var d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  var iso = function(x){ return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); };
  var fd = $('#f-date'); fd.value = iso(d); fd.min = iso(new Date());
  setZona(zona);

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var nombre = $('#f-name').value.trim(), tel = $('#f-tel').value.trim();
    if (!nombre){ msg.textContent = 'Escribe tu nombre.'; $('#f-name').focus(); return; }
    if (tel.replace(/\D/g, '').length < 7){ msg.textContent = 'Escribe un WhatsApp válido.'; $('#f-tel').focus(); return; }
    msg.textContent = '';
    var fecha = fd.value, hora = $('#f-hora').value, nota = $('#f-note').value.trim();
    var fechaTxt = fecha;
    try { fechaTxt = new Date(fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (x){}
    var L = ['🍸 Reserva VIP — Martini Bar', 'Mesa: ' + zona + ' ($' + price + ')', 'Nombre: ' + nombre, 'Teléfono: ' + tel, 'Fecha: ' + fechaTxt, 'Llegada: ' + (hora || '—'), 'Personas: ' + pp];
    if (nota) L.push('Notas: ' + nota);
    var url = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(L.join('\n'));
    var btn = $('#send'); btn.setAttribute('disabled', '');
    // la reserva queda en la lista de la puerta (panel de Talal); WhatsApp se abre igual aunque falle
    var w = window.open('', '_blank');
    fetch('/api/reservas', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre, telefono: tel, zona: zona, personas: pp, fecha: fecha, hora: hora, notas: nota, evento: CONFIG.evento }) })
      .catch(function(){})
      .then(function(){
        if (w) w.location.href = url; else location.href = url;
        $('#done-wa').href = url;
        $('#done-txt').textContent = zona + ' · ' + fechaTxt + ' · ' + pp + (pp === 1 ? ' persona' : ' personas') + '. Te confirmamos por WhatsApp.';
        $('#form-in').style.display = 'none'; $('#done').classList.add('show');
        btn.removeAttribute('disabled');
      });
  });
})();

/* ---------- botón flotante de WhatsApp: aparece al salir del viaje ---------- */
(function(){
  var b = $('#wa-f'); if (!b) return; var on = null;
  tickers.push(function(){ var v = window.scrollY > heroMax * 0.98; if (v !== on){ on = v; b.classList.toggle('on', v); } });
})();

/* ============================================================
   Cursor + botones magnéticos (solo puntero fino)
   ============================================================ */
(function(){
  if (!finePointer || reduce) return;
  var c = $('#cur'); if (!c) return;
  var x = 0, y = 0;
  tickers.push(function(){
    if (!S.moved) return;
    c.classList.add('on');
    x += (S.cx - x) * 0.22; y += (S.cy - y) * 0.22;
    c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  });
  document.addEventListener('pointerover', function(e){
    var hit = e.target.closest && e.target.closest('a,button,.mesa,.ph,input,textarea');
    c.classList.toggle('big', !!hit && !(e.target.closest('input,textarea')));
  });
  document.addEventListener('pointerleave', function(){ c.classList.remove('on'); });
  $$('.btn').forEach(function(b){
    b.addEventListener('pointermove', function(e){
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px)';
    });
    b.addEventListener('pointerleave', function(){ b.style.transform = ''; });
  });
})();

/* ============================================================
   GSAP: entrada del título + aparición de mesas y fotos
   ============================================================ */
function intro(){
  if (!window.gsap || reduce) return;
  var g = window.gsap;
  g.from('.hero-title h1 span', { yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: 0.06 });
  g.from('.hero-title .pre', { opacity: 0, letterSpacing: '1em', duration: 1.3, ease: 'power3.out', delay: 0.2 });
  g.from('.hero-title .sub', { opacity: 0, y: 20, duration: 1.1, ease: 'power3.out', delay: 0.55 });
  g.from('.hero-meta p', { opacity: 0, y: -14, duration: 0.8, ease: 'power3.out', stagger: 0.12, delay: 0.6 });
}
gsapReady.then(function(){
  if (!window.gsap || !window.ScrollTrigger || reduce) return;
  var g = window.gsap; g.registerPlugin(window.ScrollTrigger);
  g.from('.mesa', { opacity: 0, y: 60, rotateX: -8, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.mesa-grid', start: 'top 82%' } });
  g.from('.mesas-head > *', { opacity: 0, y: 34, duration: 1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.mesas-head', start: 'top 82%' } });
  $$('.ph').forEach(function(ph, i){
    g.from(ph, { opacity: 0, y: 50, scale: 0.96, duration: 1.1, ease: 'power3.out', delay: (i % 3) * 0.08, scrollTrigger: { trigger: ph, start: 'top 88%' } });
    g.to($('img', ph), { yPercent: -6, scale: 1.08, ease: 'none', scrollTrigger: { trigger: ph, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  });
  g.from('.noche-head > *', { opacity: 0, y: 34, duration: 1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.noche-head', start: 'top 82%' } });
  g.from('.facts > div', { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.facts', start: 'top 85%' } });
  g.from('.res-copy > *, .form', { opacity: 0, y: 40, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.reservar', start: 'top 70%' } });
  var mt = $('#marquee-track');
  if (mt){
    var skew = g.quickTo(mt, 'skewX', { duration: 0.5, ease: 'power3.out' });
    window.ScrollTrigger.create({ trigger: '.lugar', start: 'top bottom', end: 'bottom top',
      onUpdate: function(self){ skew(clamp(self.getVelocity() / -220, -14, 14)); } });
  }
  window.addEventListener('load', function(){ window.ScrollTrigger.refresh(); });
  window.ScrollTrigger.refresh();
});

/* ============================================================
   Visor de video a pantalla completa (carteles 3D y sección de videos)
   ============================================================ */
var openModal = (function(){
  var m = document.createElement('div'); m.className = 'vmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Video');
  m.innerHTML = '<div class="vm-stage"></div><button type="button" class="vm-x" aria-label="Cerrar video">&times;</button>';
  document.body.appendChild(m);
  var stage = m.querySelector('.vm-stage'), last = null;
  function close(){
    m.classList.remove('on'); document.documentElement.classList.remove('vm-open');
    setTimeout(function(){ if (!m.classList.contains('on')) stage.innerHTML = ''; }, 350);
    if (lenis) lenis.start();
    if (last) last.focus && last.focus();
  }
  m.addEventListener('click', function(e){ if (e.target === m || e.target.closest('.vm-x')) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && m.classList.contains('on')) close(); });
  return function(kind, src){
    last = document.activeElement;
    stage.className = 'vm-stage ' + (kind === 'clip' ? 'tall' : kind === 'frame' ? 'wide' : 'auto');
    if (kind === 'frame') stage.innerHTML = '<iframe src="' + src + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Video de Martini Bar"></iframe>';
    else stage.innerHTML = '<video src="' + src + '" autoplay loop playsinline ' + (kind === 'clip' ? 'muted' : 'controls') + '></video>';
    var vv = stage.querySelector('video'); if (vv){ vv.muted = kind === 'clip'; var pr = vv.play(); if (pr && pr.catch) pr.catch(function(){}); }
    m.classList.add('on'); document.documentElement.classList.add('vm-open');
    if (lenis) lenis.stop();
    m.querySelector('.vm-x').focus();
  };
})();
window.openClip = function(src){ openModal('clip', src); };

/* ============================================================
   La noche en video: lo que Talal sube en el admin (/api/videos)
   con los links de YouTube de respaldo si la API no responde
   ============================================================ */
(function(){
  var grid = $('#noche-grid'); if (!grid) return;
  var FALLBACK = ['yLpsVgl7pYU', '4SsfRaEgXfc', 'nOycOYXvPXQ', '86T3N278_to', 'CULcavd6KBo', '0Hw2eDndFs0']
    .map(function(id){ return { tipo: 'youtube', url: 'https://www.youtube.com/embed/' + id, titulo: '' }; });
  function ytId(u){ var m = String(u || '').match(/embed\/([A-Za-z0-9_-]{6,})/); return m ? m[1] : null; }
  function esc(s){ return String(s || '').replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var POS = ['v-gente', 'v-neon', 'v-baile', 'v-mascaras', 'v-dj', 'v-redroom', 'v-fach'];
  function card(v, i){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vcard';
    b.style.backgroundImage = 'url(img/t-' + POS[i % POS.length] + '.webp)';
    var id = v.tipo === 'youtube' ? ytId(v.url) : null, thumb = '';
    if (id) thumb = '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" decoding="async" onerror="this.remove()">';
    else if (v.tipo === 'r2') thumb = '<video src="/api/video/' + encodeURIComponent(v.video_key) + '#t=0.5" muted playsinline preload="metadata"></video>';
    b.innerHTML = thumb + '<span class="play" aria-hidden="true"></span>' + (v.titulo ? '<span class="vt">' + esc(v.titulo) + '</span>' : '');
    b.setAttribute('aria-label', 'Ver video' + (v.titulo ? ': ' + v.titulo : ''));
    b.addEventListener('click', function(){
      if (v.tipo === 'r2') openModal('video', '/api/video/' + encodeURIComponent(v.video_key));
      else if (id) openModal('frame', 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1');
      else openModal('frame', v.url);
    });
    return b;
  }
  function paint(list){
    list = list.filter(function(v){ return v.tipo !== 'youtube' || ytId(v.url); }).slice(0, 6);
    if (!list.length) list = FALLBACK;
    grid.innerHTML = ''; list.forEach(function(v, i){ grid.appendChild(card(v, i)); });
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  var done = false;
  fetch('/api/videos').then(function(r){ return r.json(); })
    .then(function(d){ done = true; paint((d && d.videos) || []); })
    .catch(function(){ if (!done) paint([]); });
  setTimeout(function(){ if (!done){ done = true; paint([]); } }, 3500);
})();

/* ---------- bucle único ---------- */
(function loop(now){ for (var i = 0; i < tickers.length; i++){ try { tickers[i](now); } catch (e) { console.error(e); } } requestAnimationFrame(loop); })(performance.now());

})();
