(function(){
'use strict';

/* ============================================================
   CONFIG — contacto real de Martini Bar
   ============================================================ */
var CONFIG = {
  whatsapp: '584247819621',
  evento: 'Reserva VIP · web'
};

var TEX = __TEXMAP__;
var LIBS = __LIBS__;

/* ---------- las librerías se cargan sin frenar la página ---------- */
function loadScript(src){
  return new Promise(function(ok, fail){
    var s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
}
var threeReady = loadScript(LIBS.three);
var gsapReady = loadScript(LIBS.gsap).then(function(){ return loadScript(LIBS.st); }).catch(function(){});

var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var clamp = function(x, a, b){ a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, x)); };
var sstep = function(a, b, x){ var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
var lerp = function(a, b, t){ return a + (b - a) * t; };

var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
var mqMobile = matchMedia('(max-width: 899px)');
var SNAP = /[?&]snap/.test(location.search);   // solo para pruebas

var S = { p: 0, u: 0, mx: 0, my: 0, pt: -9999, burst: 0 };
var lenis = null;

/* ---------- calidad: se ajusta sola al equipo ---------- */
var Q = (function(){
  var m = /[?&]q=(high|mid|low)/.exec(location.search);
  var coarse = matchMedia('(pointer:coarse)').matches;
  var mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  var tier = coarse ? 1 : 2;                       // 2 alta, 1 media, 0 baja
  if (mem <= 4 || cores <= 4) tier = Math.max(0, tier - 1);
  if (m) tier = { high: 2, mid: 1, low: 0 }[m[1]];
  return { tier: tier, forced: !!m, coarse: coarse };
})();

var tickers = [];
var hero = $('#top');
var heroMax = 1;

/* ---------- menú móvil ---------- */
(function(){
  var burger = $('#burger'), menu = $('#menu');
  if (!burger || !menu) return;
  function set(open){
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.documentElement.classList.toggle('lock', open);
    if (lenis){ if (open) lenis.stop(); else lenis.start(); }
  }
  burger.addEventListener('click', function(){ set(!menu.classList.contains('open')); });
  $$('a', menu).forEach(function(a){ a.addEventListener('click', function(){ set(false); }); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') set(false); });
  mqMobile.addEventListener && mqMobile.addEventListener('change', function(){ set(false); });
})();

/* ---------- puntero ---------- */
function setPointer(x, y){
  S.mx = x / window.innerWidth - 0.5; S.my = y / window.innerHeight - 0.5;
  S.cx = x; S.cy = y; S.moved = true; S.pt = performance.now();
}
window.addEventListener('pointermove', function(e){ setPointer(e.clientX, e.clientY); }, { passive: true });
['touchstart', 'touchmove'].forEach(function(ev){
  window.addEventListener(ev, function(e){ var t = e.touches && e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
});

/* ---------- giroscopio: inclinar el teléfono mueve la mirada ---------- */
(function(){
  if (!Q.coarse || reduce || !window.DeviceOrientationEvent) return;
  var base = null, btn = $('#gyro');
  function onOri(e){
    if (e.gamma == null || e.beta == null) return;
    var land = Math.abs(window.orientation || 0) === 90;
    var gx = land ? e.beta : e.gamma, gy = land ? e.gamma : e.beta;
    if (!base) base = { x: gx, y: gy };
    S.gx = clamp((gx - base.x) / 28, -1, 1) * 0.5; S.gy = clamp((gy - base.y) / 28, -1, 1) * 0.5; S.gyro = true;
  }
  function start(){ window.addEventListener('deviceorientation', onOri, { passive: true }); }
  window.addEventListener('orientationchange', function(){ base = null; });
  if (typeof DeviceOrientationEvent.requestPermission === 'function'){
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener('click', function(){
      DeviceOrientationEvent.requestPermission().then(function(r){ if (r === 'granted') start(); btn.hidden = true; }).catch(function(){ btn.hidden = true; });
    });
  } else { start(); }
})();

/* ---------- progreso del viaje ---------- */
function measure(){ heroMax = Math.max(1, hero.offsetHeight - window.innerHeight); }
/* el scroll no avanza parejo: frena al abrir el cordón, frente a la barra y en la copa */
var RM = [[0, 0], [0.1, 0.045], [0.2, 0.19], [0.42, 0.47], [0.64, 0.73], [0.8, 0.86], [0.92, 0.94], [1, 1]];
function remap(p){
  for (var i = 0; i < RM.length - 1; i++){ if (p <= RM[i + 1][0]){ return RM[i][1] + (RM[i + 1][1] - RM[i][1]) * (p - RM[i][0]) / (RM[i + 1][0] - RM[i][0]); } }
  return 1;
}
function unmap(u){
  for (var i = 0; i < RM.length - 1; i++){ if (u <= RM[i + 1][1]){ return RM[i][0] + (RM[i + 1][0] - RM[i][0]) * (u - RM[i][1]) / (RM[i + 1][1] - RM[i][1]); } }
  return 1;
}
function onScroll(){ S.p = clamp(window.scrollY / heroMax); S.u = remap(S.p); }
measure(); onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', function(){ measure(); onScroll(); });

/* ---------- loader: espera las fuentes; el 3D entra después con un fundido ---------- */
var loaderEl = $('#loader'), loadN = $('#load-n');
var loadShown = 0, loadTarget = 0.35, loaderDone = false;
function finishLoader(){
  if (loaderDone) return; loaderDone = true; loadTarget = 1;
  setTimeout(function(){
    if (loaderEl) loaderEl.classList.add('done');
    document.documentElement.classList.add('ready');
    intro();
  }, 300);
}
tickers.push(function(){
  if (!loadN || loadShown > 0.999) return;
  loadShown += (loadTarget - loadShown) * 0.16;
  if (loadTarget === 1 && loadShown > 0.985) loadShown = 1;
  loadN.textContent = ('00' + Math.round(loadShown * 100)).slice(-3);
});
setTimeout(finishLoader, 3200);

var fontsReady = (document.fonts && document.fonts.load)
  ? Promise.race([
      Promise.all([document.fonts.load('800 80px "Bricolage Grotesque"'), document.fonts.load('400 80px "Instrument Serif"'), document.fonts.load('italic 400 40px "Instrument Serif"')]),
      new Promise(function(r){ setTimeout(r, 2600); })
    ]).catch(function(){})
  : Promise.resolve();

/* ---------- scroll con inercia (solo ratón/trackpad) ---------- */
if (!reduce && !Q.coarse && !SNAP) loadScript(LIBS.lenis).then(function(){
  if (!window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  tickers.push(function(now){ lenis.raf(now); });
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var el = document.querySelector(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); lenis.scrollTo(el, { duration: 1.5 });
  });
}).catch(function(){});
