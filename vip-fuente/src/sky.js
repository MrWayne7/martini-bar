/* ============================================================
   THREE.JS — "Pasa al VIP": puerta → pista → barra → la copa
   ============================================================ */
var SKY = null;
function skyOff(){ document.documentElement.classList.add('gl-off'); }
function initSky(){
  if (!window.THREE){ skyOff(); return; }
  var THREE = window.THREE;
  var canvas = $('#sky-gl'), renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { skyOff(); return; }
  var gl2 = renderer.capabilities.isWebGL2;

  /* si el navegador pierde el contexto gráfico: se muestra el fondo fijo y al volver se reconstruye */
  var lost = false, shown = false;
  canvas.addEventListener('webglcontextlost', function(){ lost = true; document.documentElement.classList.add('gl-lost'); });
  canvas.addEventListener('webglcontextrestored', function(){ lost = false; document.documentElement.classList.remove('gl-lost'); post.forget(); resize(); });

  var TRAVEL = 170, FZ = 400;
  var fin = $('#reservar');
  var tier = Q.tier;
  var small = window.innerWidth < 900;
  var FLOOR = -1.2;

  /* ---- color del aire por acto: nunca es un cielo, es el interior del club ---- */
  var COL = {
    door: new THREE.Color(0x0e0306), club: new THREE.Color(0x07051a), bar: new THREE.Color(0x0d0805),
    vip: new THREE.Color(0x130309), end: new THREE.Color(0x020102)
  };
  var CURT = [0.19, 0.735];        // aquí se cierra y se abre el telón de terciopelo
  var STOPS = [[0, COL.door], [0.19, COL.door], [0.215, COL.club], [0.455, COL.club], [0.49, COL.bar], [0.725, COL.bar],
               [0.75, COL.vip], [0.95, COL.vip], [1, COL.end]];
  function zoneColor(p, out){
    for (var i = 0; i < STOPS.length - 1; i++){
      if (p <= STOPS[i + 1][0]){
        var f = (p - STOPS[i][0]) / Math.max(1e-5, STOPS[i + 1][0] - STOPS[i][0]);
        return out.copy(STOPS[i][1]).lerp(STOPS[i + 1][1], clamp(f));
      }
    }
    return out.copy(COL.end);
  }

  var scene = new THREE.Scene();
  var bg = new THREE.Color().copy(COL.door);
  scene.background = bg;
  scene.fog = new THREE.Fog(0x0e0306, 8, 40);
  var U = { time: { value: 0 }, beat: { value: 0 }, fogColor: { value: scene.fog.color }, fogNear: { value: 8 }, fogFar: { value: 40 } };
  var camera = new THREE.PerspectiveCamera(54, 1, 0.05, 140);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0x8f95ff, 0x1a0209, 0.42));
  var key = new THREE.DirectionalLight(0xffffff, 0.25); key.position.set(-3, 6, 4); scene.add(key);
  var Ldoor = new THREE.PointLight(0xff2a44, 3.2, 22, 2); Ldoor.position.set(0, 2.6, -20); scene.add(Ldoor);
  var Lclub = new THREE.PointLight(0xa58bff, 3.4, 26, 2); Lclub.position.set(0, 4.2, -50); scene.add(Lclub);
  var Lbar = new THREE.PointLight(0xffa04a, 3.0, 24, 2); Lbar.position.set(-2.2, 2.4, -96); scene.add(Lbar);
  var Lvip = new THREE.PointLight(0xeafff4, 3.2, 18, 2); Lvip.position.set(0, 6, -150); scene.add(Lvip);
  var Lvip2 = new THREE.PointLight(0xff2050, 2.6, 18, 2); Lvip2.position.set(-5, 0.5, -138); scene.add(Lvip2);

  var tl = new THREE.TextureLoader();
  function noMip(t){ t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }
  /* las fotos se cargan al acercarte a su acto y se liberan al dejarlo atrás */
  function ensureTex(g){
    var u = g.userData; if (u.st) return;
    u.st = 1;
    tl.load(TEX[u.key].u, function(t){
      noMip(t);
      if (u.st !== 1){ t.dispose(); return; }
      u.tex = t; if (u.vs !== 2) u.mat.uniforms.map.value = t; u.st = 2;
    }, undefined, function(){ u.st = 0; });
  }
  function dropTex(g){
    var u = g.userData;
    if (u.st === 2){ if (u.vs !== 2) u.mat.uniforms.map.value = blackTex; u.tex.dispose(); u.tex = null; }
    u.st = 0;
  }
  /* videos de la noche: arrancan en bucle al acercarte y se apagan al dejarlos atrás (cuida batería y memoria) */
  var vidBox = document.createElement('div');
  vidBox.setAttribute('aria-hidden', 'true');
  vidBox.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1;';
  document.body.appendChild(vidBox);
  function kickVids(){   // iPhone: si el autoplay se bloqueó, el primer toque los arranca
    frames.forEach(function(g){ var u = g.userData; if (u.video && u.vs !== 2){ var pr = u.video.play(); if (pr && pr.catch) pr.catch(function(){}); } });
  }
  ['touchstart', 'pointerdown', 'keydown', 'wheel'].forEach(function(ev){ window.addEventListener(ev, kickVids, { passive: true }); });
  function ensureVid(g){
    var u = g.userData; if (u.vs || !VID[u.key]) return;
    u.vs = 1;
    var v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.addEventListener('playing', function(){
      if (u.vs !== 1) return;
      var vt = new THREE.VideoTexture(v); vt.minFilter = THREE.LinearFilter; vt.magFilter = THREE.LinearFilter; vt.generateMipmaps = false;
      u.vt = vt; u.mat.uniforms.map.value = vt; u.vs = 2;
    });
    v.src = VID[u.key].u; u.video = v; vidBox.appendChild(v);
    var pr = v.play(); if (pr && pr.catch) pr.catch(function(){});   // sin autoplay: portada hasta el primer toque
  }
  function dropVid(g){
    var u = g.userData; if (!u.vs) return;
    if (u.video){ u.video.pause(); u.video.removeAttribute('src'); u.video.load(); if (u.video.parentNode) u.video.parentNode.removeChild(u.video); u.video = null; }
    if (u.vt){ u.vt.dispose(); u.vt = null; }
    if (u.vs === 2) u.mat.uniforms.map.value = u.tex || blackTex;
    u.vs = 0;
  }
  function canvasTex(c){ return noMip(new THREE.CanvasTexture(c)); }
  var blackTex = noMip(new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat)); blackTex.needsUpdate = true;

  /* ---- responsive del mundo 3D ---- */
  var aspect = 1, kR = 1, spread = 1, sizeK = 1, AMP = 2.4, baseFov = 54;
  var placed = [];
  function place(o, bx, s){ o.userData.bx = bx; o.userData.bs = s || 0; placed.push(o); return o; }
  function applySpread(){
    placed.forEach(function(o){
      o.position.x = o.userData.bx * spread;
      if (o.userData.bs) o.scale.setScalar(o.userData.bs * sizeK);
    });
  }

  /* ---- sprites generados ---- */
  function radialTex(stops){
    var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return canvasTex(c);
  }
  var glowT = radialTex([[0, 'rgba(255,255,255,1)'], [0.22, 'rgba(255,255,255,0.75)'], [0.55, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
  var sparkT = (function(){
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.85)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(4, 32); x.lineTo(60, 32); x.moveTo(32, 4); x.lineTo(32, 60); x.stroke();
    return canvasTex(c);
  })();

  var journey = new THREE.Group(); scene.add(journey);
  var fx = new THREE.Group(); journey.add(fx);          // lo que no entra en el pase de profundidad
  var finale = new THREE.Group(); finale.position.z = FZ; scene.add(finale);
  var fxF = new THREE.Group(); finale.add(fxF);

  var VS_W = 'varying vec2 vUv; varying vec3 vWp; varying float vF; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vWp=wp.xyz; vec4 mv=viewMatrix*wp; vF=-mv.z; gl_Position=projectionMatrix*mv; }';
  var GLSL_H = 'float h1(float n){ return fract(sin(n*91.345)*47453.5453); } float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }';

  /* ============ EL PISO: alfombra roja, pista que late, madera de barra, rejilla dorada ============ */
  (function(){
    var m = new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uBeat: U.beat, fogColor: U.fogColor, fogNear: U.fogNear, fogFar: U.fogFar },
      vertexShader: VS_W,
      fragmentShader: [
        'uniform float uTime,uBeat,fogNear,fogFar; uniform vec3 fogColor; varying vec2 vUv; varying vec3 vWp; varying float vF;', GLSL_H,
        'void main(){',
        '  vec3 col=vec3(0.018,0.015,0.02);',
        '  vec2 g=vWp.xz/1.6; vec2 fr=abs(fract(g)-0.5); float edge=smoothstep(0.46,0.5,max(fr.x,fr.y));',
        '  float zDoor=smoothstep(-29.0,-23.0,vWp.z);',
        '  float zPista=smoothstep(-23.0,-29.0,vWp.z)*smoothstep(-77.0,-71.0,vWp.z);',
        '  float zBar=smoothstep(-71.0,-77.0,vWp.z)*smoothstep(-121.0,-115.0,vWp.z);',
        '  float zVip=smoothstep(-115.0,-121.0,vWp.z);',
        /* pista: baldosas que se encienden en ondas al ritmo */
        '  vec2 id=floor(g); float h=h2(id);',
        '  float wave=0.5+0.5*sin(uTime*2.4-length(id-vec2(0.0,-31.0))*0.62+h*2.0);',
        '  float lit=pow(wave,4.0)*step(0.32,h)*(0.55+0.45*uBeat);',
        '  vec3 holo=0.5+0.5*cos(6.2831*(h*0.7+uTime*0.04+vec3(0.0,0.33,0.67))); holo=mix(holo,vec3(1.0),0.4);',
        '  col+=zPista*(lit*holo*1.35+edge*0.12*holo+0.015);',
        /* puerta: alfombra roja con borde dorado */
        '  float ax=abs(vWp.x); float n=h2(floor(vWp.xz*24.0));',
        '  float carpet=(1.0-smoothstep(0.86,0.9,ax))*zDoor;',
        '  col=mix(col,vec3(0.30,0.018,0.05)*(0.8+0.25*n),carpet);',
        '  col+=zDoor*smoothstep(0.84,0.87,ax)*(1.0-smoothstep(0.9,0.93,ax))*vec3(0.85,0.62,0.28)*0.9;',
        '  col+=zDoor*edge*0.025;',
        /* barra: tablones oscuros */
        '  vec2 pk=vec2(floor(vWp.x*1.1),floor(vWp.z*0.28+floor(vWp.x*1.1)*0.37));',
        '  vec3 wood=vec3(0.07,0.04,0.022)*(0.7+0.5*h2(pk))*(0.85+0.15*n);',
        '  col=mix(col,wood,zBar*0.92); col+=zBar*smoothstep(0.93,1.0,fract(vWp.x*1.1))*0.012;',
        /* VIP: alfombra de terciopelo y rejilla dorada fina */
        '  float vcarp=(1.0-smoothstep(1.7,1.76,ax))*zVip;',
        '  col=mix(col,vec3(0.20,0.012,0.04)*(0.8+0.25*n),vcarp);',
        '  col+=zVip*edge*vec3(0.85,0.62,0.28)*0.22*(1.0-vcarp);',
        /* brillo del suelo bajo la cámara: parece pulido */
        '  col+=vec3(0.03,0.02,0.035)*smoothstep(10.0,2.0,vF);',
        '  float f=smoothstep(fogNear,fogFar,vF);',
        '  gl_FragColor=vec4(mix(col,fogColor,f),1.0);',
        '}'].join('\n')
    });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 210), m);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, -82);
    journey.add(floor);
  })();

  /* ============ COLUMNAS DE NEÓN a los lados: dan la sensación de avanzar ============ */
  var neons = [];
  (function(){
    var geo = new THREE.BoxGeometry(0.05, 3.4, 0.05);
    for (var z = -8, k = 0; z > -162; z -= 7, k++){
      for (var s = -1; s <= 1; s += 2){
        var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }));
        m.position.set(0, FLOOR + 1.7, z + (s > 0 ? 3.5 : 0));
        m.userData.k = k + (s > 0 ? 0.5 : 0); m.userData.z = m.position.z;
        place(m, s * 5.6, 0);
        journey.add(m); neons.push(m);
      }
    }
  })();
  var tmpC = new THREE.Color();
  function neonColor(z, k, t, beat, out){
    if (z > -26) return out.setHex(0xff2340).multiplyScalar(0.75 + 0.25 * Math.sin(t * 1.3 + k));
    if (z > -74){ out.setHSL((t * 0.06 + k * 0.11) % 1, 0.75, 0.62); return out.multiplyScalar(0.45 + 0.55 * beat); }
    if (z > -118) return out.setHex(0xffa850).multiplyScalar(0.8);
    return out.setHex(k % 2 ? 0xe8c27a : 0xff2a55).multiplyScalar(0.8 + 0.2 * Math.sin(t * 0.9 + k));
  }

  /* ============ ACTO 1: el cordón de terciopelo y la puerta ============ */
  var brass = new THREE.MeshStandardMaterial({ color: 0xd8b46a, metalness: 0.85, roughness: 0.28, emissive: 0x2c1c06 });
  var velvet = new THREE.MeshStandardMaterial({ color: 0x8c0d24, roughness: 0.92, metalness: 0, emissive: 0x2a0208 });
  var G = {
    base: new THREE.CylinderGeometry(0.26, 0.3, 0.07, 24), pole: new THREE.CylinderGeometry(0.035, 0.04, 1.0, 12),
    ball: new THREE.SphereGeometry(0.075, 16, 12)
  };
  function stanchion(){
    var g = new THREE.Group();
    var b = new THREE.Mesh(G.base, brass); b.position.y = FLOOR + 0.035; g.add(b);
    var p = new THREE.Mesh(G.pole, brass); p.position.y = FLOOR + 0.55; g.add(p);
    var t = new THREE.Mesh(G.ball, brass); t.position.y = FLOOR + 1.1; g.add(t);
    return g;
  }
  function ropeGeo(len, sag){
    var pts = []; for (var i = 0; i <= 8; i++){ var f = i / 8; pts.push(new THREE.Vector3(f * len, -Math.sin(f * Math.PI) * sag, 0)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.034, 8, false);
  }
  var RZ = -3, ropeGate;
  (function(){
    var pl = stanchion(), pr = stanchion();
    pl.position.set(-1.25, 0, RZ); pr.position.set(1.25, 0, RZ);
    journey.add(pl); journey.add(pr);
    ropeGate = new THREE.Group(); ropeGate.position.set(-1.25, FLOOR + 1.06, RZ);
    var rope = new THREE.Mesh(ropeGeo(2.5, 0.42), velvet); ropeGate.add(rope);
    var hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 14), brass); hook.position.set(2.5, 0, 0); ropeGate.add(hook);
    journey.add(ropeGate);
  })();

  /* la puerta: un marco de luz, el resplandor que sale de adentro y el letrero de neón */
  var DZ = -24, doorGlow, doorSpill, sign = null, doorFrame = [];
  (function(){
    var W = 3.2, H = 4.3;
    var fm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    [[-W / 2, H / 2, 0.12, H], [W / 2, H / 2, 0.12, H], [0, H, W + 0.12, 0.12]].forEach(function(b){
      var m = new THREE.Mesh(new THREE.BoxGeometry(b[2], b[3], 0.12), fm);
      m.position.set(b[0], FLOOR + b[1], DZ); journey.add(m); doorFrame.push(m);
    });
    doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: glowT, color: 0xffe3ec, transparent: true, opacity: 0.5, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    doorGlow.position.set(0, FLOOR + H / 2, DZ - 0.1); fx.add(doorGlow);
    doorSpill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowT, color: 0xffd6e2, transparent: true, opacity: 0.55, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    doorSpill.scale.set(14, 11, 1); doorSpill.position.set(0, FLOOR + 2.0, DZ - 0.3); fx.add(doorSpill);
    // las paredes de la entrada: dos planos oscuros que enmarcan la puerta
    var wm = new THREE.MeshStandardMaterial({ color: 0x0c0507, roughness: 0.9 });
    [-1, 1].forEach(function(s){
      var w = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), wm);
      w.position.set(s * (W / 2 + 6.06), FLOOR + 3.5, DZ); journey.add(w);
    });
    var top = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.2, 3), wm); top.position.set(0, FLOOR + H + 1.56, DZ); journey.add(top);
    if (TEX.logo){
      var a = TEX.logo.a, sw = 2.3, sh = sw / a;
      sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.ShaderMaterial({
        uniforms: { map: { value: blackTex }, uOn: { value: 0 }, uTime: U.time },
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: 'uniform sampler2D map; uniform float uOn,uTime; varying vec2 vUv; ' + GLSL_H +
          ' void main(){ vec3 c=texture2D(map,vUv).rgb; float fl=step(0.12,h1(floor(uTime*13.0)))*0.12+0.88; vec3 tint=mix(vec3(1.0,0.86,0.9),vec3(0.86,1.0,0.95),vUv.x); gl_FragColor=vec4(c*tint*uOn*fl*1.35,1.0); }',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      sign.position.set(0, FLOOR + H + 1.25, DZ + 0.06);
      sign.userData = { key: 'logo', st: 0, mat: sign.material };
      fx.add(sign); ensureTex(sign);
    }
  })();

  /* ============ TELÓN DE TERCIOPELO: se cierra desde los lados y se abre (no cruza la pantalla) ============ */
  var curtain = new THREE.Group(); curtain.visible = false; camera.add(curtain);
  var CUR_D = 4.6, curHalfW = 1, curView = 1, curL = new THREE.Group(), curR = new THREE.Group();
  curtain.add(curL); curtain.add(curR);
  var panelGeo = new THREE.PlaneGeometry(4.4, 6.6, 16, 24);
  var velvetCurt = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time },
    vertexShader: 'uniform float uTime; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; float hang=(3.3-p.y)/6.6; p.z+=sin(p.x*1.9+uTime*1.6)*0.16*hang+cos(p.y*0.8+uTime*1.1)*0.08*hang; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader: [
      'varying vec2 vUv;',
      'void main(){',
      '  float fold=0.5+0.5*sin(vUv.x*6.2831*5.0+sin(vUv.y*4.0)*0.5);',
      '  vec3 c=vec3(0.36,0.025,0.07)*(0.28+0.9*pow(fold,1.5));',
      '  c+=vec3(0.95,0.32,0.42)*pow(fold,14.0)*0.3;',
      '  c*=0.75+0.25*vUv.y;',
      '  if(vUv.y<0.03){ c=vec3(0.86,0.64,0.3)*(0.55+0.45*step(0.5,fract(vUv.x*70.0))); }',
      '  else if(vUv.y<0.038){ c=vec3(0.25,0.16,0.05); }',
      '  gl_FragColor=vec4(c,1.0);',
      '}'].join('\n'),
    side: THREE.DoubleSide, depthTest: false, depthWrite: false, transparent: true
  });
  for (var ci0 = 0; ci0 < 3; ci0++){
    var cpl = new THREE.Mesh(panelGeo, velvetCurt); cpl.renderOrder = 10; curL.add(cpl);
    var cpr = new THREE.Mesh(panelGeo, velvetCurt); cpr.renderOrder = 10; curR.add(cpr);
  }
  function layoutCurtain(){
    var vh = 2 * Math.tan(baseFov * Math.PI / 360) * CUR_D, vw = vh * aspect;
    var ph = vh * 1.5, sc = ph / 6.6, pw = 4.4 * sc * 0.96;
    var n = clamp(Math.ceil(vw * 0.56 / pw), 1, 3);
    [curL, curR].forEach(function(half, hi){
      var dir = hi ? 1 : -1;
      half.children.forEach(function(m, k){
        m.visible = k < n; m.scale.setScalar(sc);
        m.position.x = dir * (k + 0.5) * pw - dir * n * pw / 2; m.position.y = -vh * 0.08;
      });
    });
    curHalfW = n * pw; curView = vw;
  }

  /* ---- foto como letrero de neón: se enciende parpadeando al acercarte ---- */
  var PHOTO_FS = [
    'uniform sampler2D map; uniform float uOn,uTime,fogNear,fogFar; uniform vec3 fogColor; varying vec2 vUv; varying float vF;', GLSL_H,
    'void main(){',
    '  float g=1.0-uOn; vec2 uv=vUv; uv.x+=(h1(floor(vUv.y*36.0)+floor(uTime*22.0))-0.5)*g*0.09;',
    '  float o=g*0.012; vec3 c=vec3(texture2D(map,uv+vec2(o,0.0)).r,texture2D(map,uv).g,texture2D(map,uv-vec2(o,0.0)).b);',
    '  float fl=1.0-step(0.55,h1(floor(uTime*26.0)+3.0))*g*0.85;',
    '  float a=clamp(uOn*1.15,0.0,1.0)*fl; if(a<0.02) discard;',
    '  c*=(0.965+0.035*sin(vUv.y*480.0))*1.12;',
    '  vec2 q=abs(vUv-0.5)*2.0; float rr=0.06; vec2 k=max(q-(1.0-rr),0.0); a*=1.0-smoothstep(rr*0.7,rr,length(k));',
    '  gl_FragColor=vec4(mix(c,fogColor,smoothstep(fogNear,fogFar,vF)*0.45),a);',
    '}'].join('\n');
  var EDGE_FS = [
    'uniform float uOn,uTime,uW,uH; uniform vec3 uCol; varying vec2 vUv;',
    'void main(){',
    '  float d=min(min(vUv.x,1.0-vUv.x)*uW,min(vUv.y,1.0-vUv.y)*uH);',
    '  float line=smoothstep(0.075,0.03,d)+smoothstep(0.32,0.0,d)*0.22;',
    '  vec3 holo=0.55+0.45*cos(6.2831*(vUv.x*0.6+vUv.y*0.4+uTime*0.08+vec3(0.0,0.33,0.67)));',
    '  vec3 c=mix(uCol,holo,0.5)*line*uOn;',
    '  if(line*uOn<0.01) discard;',
    '  gl_FragColor=vec4(c,line*uOn);',
    '}'].join('\n');
  var VS_V = 'varying vec2 vUv; varying float vF; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vF=-mv.z; gl_Position=projectionMatrix*mv; }';
  function photoMat(tex){
    return new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, uOn: { value: 0 }, uTime: U.time, fogColor: U.fogColor, fogNear: U.fogNear, fogFar: U.fogFar },
      vertexShader: VS_V, fragmentShader: PHOTO_FS, transparent: true, depthWrite: false });
  }
  var frames = [];
  function photoFrame(key, h, x, y, z, ry, col, near){
    if (!TEX[key]) return null;
    var a = TEX[key].a, w = h * a;
    var g = new THREE.Group();
    var edge = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.5, h + 0.5), new THREE.ShaderMaterial({
      uniforms: { uOn: { value: 0 }, uTime: U.time, uW: { value: w + 0.5 }, uH: { value: h + 0.5 }, uCol: { value: new THREE.Color(col) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: EDGE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    edge.position.z = -0.02; g.add(edge);
    var ph = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat(blackTex)); g.add(ph);
    g.position.set(0, y, z); g.rotation.y = ry;
    g.userData = { key: key, st: 0, tex: null, mat: ph.material, edge: edge.material, w: w, h: h, by: y, near: near || 14 };
    place(g, x, 1);
    journey.add(g); frames.push(g);
    return g;
  }
  photoFrame('v-fach', 3.3, -3.6, FLOOR + 2.15, -13, 0.48, 0xff3a55, 13);    // la fachada con el letrero
  photoFrame('v-neon', 3.7, -3.6, FLOOR + 2.4, -44, 0.42, 0x9a7cff);          // la pista y las copas de neón
  photoFrame('v-gente', 3.7, 3.6, FLOOR + 2.4, -59, -0.42, 0x5fe0ff);         // la gente
  photoFrame('v-mascaras', 3.6, -3.6, FLOOR + 2.4, -76, 0.42, 0xff5fa8);      // los disfraces
  photoFrame('v-baile', 3.6, 3.7, FLOOR + 2.35, -90, -0.45, 0xffb060);        // bailando junto a la barra
  photoFrame('v-dj', 2.5, 3.8, FLOOR + 2.5, -107, -0.45, 0xffd08a);           // el DJ en la cabina
  photoFrame('v-redroom', 3.4, -4.6, FLOOR + 2.3, -123, 0.42, 0xff2a55);      // la noche del Red Room

  /* tocar un cartel lo abre en grande */
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hitFrame(x, y){
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var ms = []; frames.forEach(function(g){ if (g.userData.mat.uniforms.uOn.value > 0.5) ms.push(g.children[1]); });
    var h = ms.length ? ray.intersectObjects(ms, false) : [];
    return h.length ? h[0].object.parent.userData.key : null;
  }
  document.addEventListener('click', function(e){
    if (e.target.closest && e.target.closest('a,button,input,textarea,label,select,.vmodal,.mesas,.lugar,.noche,.reservar,footer')) return;
    var k = hitFrame(e.clientX, e.clientY);
    if (k && VID[k] && window.openClip) window.openClip(VID[k].u);
  });
  if (finePointer) document.addEventListener('pointermove', function(e){
    if (e.target.closest && e.target.closest('a,button,.mesas,.lugar,.noche,.reservar,footer')) return;
    document.documentElement.classList.toggle('over-clip', !!hitFrame(e.clientX, e.clientY));
  }, { passive: true });

  /* ============ ACTO 2: la pista ============ */
  /* bola de espejos: caras planas de brillo distinto y reflejos que giran con ella */
  var disco, discoDots;
  (function(){
    var geo = new THREE.IcosahedronGeometry(1.05, 3);
    var n = geo.attributes.position.count, colA = new Float32Array(n * 3);
    for (var i = 0; i < n; i += 3){
      var v = 0.22 + Math.pow(Math.random(), 2.2) * 0.95, tint = Math.random();
      var r = v, gg = v, b = v;
      if (tint > 0.9){ r *= 1.1; b *= 0.8; } else if (tint > 0.8){ b *= 1.15; r *= 0.85; }
      for (var k = 0; k < 3; k++){ colA[(i + k) * 3] = r; colA[(i + k) * 3 + 1] = gg; colA[(i + k) * 3 + 2] = b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colA, 3));
    disco = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
    disco.position.set(0, 3.5, -52); journey.add(disco);
    var str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 4, 4), new THREE.MeshBasicMaterial({ color: 0x555555 }));
    str.position.set(0, 6.5, -52); journey.add(str);
    var N = small ? 220 : 420, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (i = 0; i < N; i++){
      var th = Math.random() * Math.PI * 2, ph = Math.acos(lerp(-0.95, 0.35, Math.random())), R = 8 + Math.random() * 7;
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * R; pos[i * 3 + 1] = Math.cos(ph) * R; pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * R;
      tmpC.setHSL(Math.random(), 0.5, 0.82); col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
    }
    var g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g2.setAttribute('color', new THREE.BufferAttribute(col, 3));
    discoDots = new THREE.Points(g2, new THREE.PointsMaterial({ map: sparkT, size: 0.22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
    discoDots.position.copy(disco.position); discoDots.frustumCulled = false; fx.add(discoDots);
  })();

  /* haces de luz: conos que barren la pista desde el techo */
  var beams = [];
  (function(){
    var BEAM_FS = 'uniform vec3 uCol; uniform float uOp; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float a=pow(vUv.y,1.6)*(0.25+0.75*f)*uOp; gl_FragColor=vec4(uCol*a,a); }';
    var BEAM_VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalMatrix*normal; vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }';
    var geo = new THREE.ConeGeometry(1.25, 10, 28, 1, true); geo.translate(0, -5, 0);
    var cols = [0xff5fa8, 0x6f8bff, 0x7dffd4, 0xc59bff, 0xff5fa8, 0x6f8bff];
    for (var i = 0; i < (small ? 4 : 6); i++){
      var piv = new THREE.Group();
      var m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(cols[i]) }, uOp: { value: 0.5 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      piv.add(m);
      var side = i % 2 ? 1 : -1;
      piv.position.set(0, 7.2, -34 - i * 6.5);
      piv.userData = { ph: i * 1.7, sp: 0.5 + (i % 3) * 0.17, side: side, m: m };
      place(piv, side * (2.4 + (i % 3) * 0.8), 0);
      fx.add(piv); beams.push(piv);
    }
  })();

  /* chispas: la multitud del acto, giran en remolino y se empujan con el ritmo */
  var sparks;
  var NS_TIER = [180, 380, small ? 460 : 820];
  (function(){
    var N = NS_TIER[2], pos = new Float32Array(N * 3), col = new Float32Array(N * 3), dat = new Float32Array(N * 4);
    for (var i = 0; i < N; i++){
      dat[i * 4] = (Math.random() - 0.5) * 15; dat[i * 4 + 1] = FLOOR + 0.3 + Math.random() * 6; dat[i * 4 + 2] = -27 - Math.random() * 48; dat[i * 4 + 3] = Math.random() * 6.28;
      tmpC.setHSL(0.55 + Math.random() * 0.45, 0.6, 0.72); col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sparks = new THREE.Points(g, new THREE.PointsMaterial({ map: sparkT, size: 0.13, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sparks.userData.dat = dat; sparks.frustumCulled = false; sparks.geometry.setDrawRange(0, NS_TIER[tier]);
    fx.add(sparks);
  })();
  function updateSparks(t, beat, vel){
    var a = sparks.geometry.attributes.position, d = sparks.userData.dat, n = sparks.geometry.drawRange.count;
    var push = clamp(vel * 2.2, -1.5, 1.5);
    for (var i = 0; i < n; i++){
      var bx = d[i * 4], by = d[i * 4 + 1], bz = d[i * 4 + 2], ph = d[i * 4 + 3];
      var r = 0.35 + (i % 7) * 0.06, w = t * (0.35 + (i % 5) * 0.07) + ph;
      a.setXYZ(i, bx * spread + Math.cos(w) * r, by + Math.sin(w * 1.3) * r * 0.7 + beat * 0.06, bz + Math.sin(w) * r + push * (0.4 + (i % 3) * 0.3));
    }
    a.needsUpdate = true;
  }

  /* ---- texto en canvas (con las letras de Martini) ---- */
  function textTex(lines, o){
    o = o || {};
    var fs = o.size || 120, font = (o.italic ? 'italic ' : '') + (o.weight || 800) + ' ' + fs + 'px ' + (o.family || '"Bricolage Grotesque", "Arial Black", sans-serif');
    var mc = document.createElement('canvas').getContext('2d'); mc.font = font;
    var w = 0; lines.forEach(function(l){ w = Math.max(w, mc.measureText(l).width); });
    w = Math.ceil(w + fs * 0.6); var lh = fs * 1.1, h = Math.ceil(lh * lines.length + fs * 0.4);
    var k = Math.min(1, 2048 / w);
    var c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
    var x = c.getContext('2d'); x.scale(k, k); x.font = font; x.textBaseline = 'middle'; x.textAlign = 'center';
    lines.forEach(function(l, i){
      var ty = fs * 0.22 + lh * (i + 0.5);
      x.shadowColor = o.glow || 'rgba(255,120,180,0.6)'; x.shadowBlur = fs * 0.1;
      x.fillStyle = o.color || '#fff'; x.fillText(l, w / 2, ty);
      x.shadowBlur = 0; x.fillText(l, w / 2, ty);
    });
    return { tex: canvasTex(c), a: w / h };
  }
  function textPlane(lines, height, o){
    var t = textTex(lines, o);
    if (o && o.maxW) height = Math.min(height, o.maxW / t.a);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(height * t.a, height), photoMat(t.tex));
    m.material.blending = THREE.AdditiveBlending;
    m.userData.w = height * t.a;
    return m;
  }
  var words = [];
  var WORDS = [['DJ EN VIVO', 0, 'rgba(120,150,255,0.6)'], ['todos los sábados', 1, 'rgba(255,110,190,0.6)'], ['HASTA LA MADRUGADA', 0, 'rgba(110,255,210,0.55)']];
  var WZ = [-33, -52, -65];
  function buildText(){
    WORDS.forEach(function(wd, n){
      var it = !!wd[1];
      var m = textPlane([wd[0]], it ? 1.25 : 1.0, { size: 150, italic: it, weight: it ? 400 : 800, family: it ? '"Instrument Serif", Georgia, serif' : undefined, glow: wd[2], maxW: 6.2 });
      var side = (n % 2 ? 1 : -1);
      m.position.set(0, (n % 2 ? 3.2 : 2.5), WZ[n]);
      m.userData.by = m.position.y; m.userData.ph = n * 1.7;
      place(m, side * (1.4 + (n % 3) * 0.5), 1);
      journey.add(m); words.push(m);
    });
    applySpread();
  }
  fontsReady.then(buildText);

  /* ============ ACTO 3: la barra ============ */
  var bottles = [];
  (function(){
    var top = new THREE.MeshStandardMaterial({ color: 0x2a160a, metalness: 0.55, roughness: 0.22, emissive: 0x120804 });
    var body = new THREE.MeshStandardMaterial({ color: 0x100907, roughness: 0.55, metalness: 0.15 });
    var bar = new THREE.Group();
    var b1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.15, 36), body); b1.position.set(0, FLOOR + 0.575, 0); bar.add(b1);
    var b2 = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 36.2), top); b2.position.set(0, FLOOR + 1.18, 0); bar.add(b2);
    var led = new THREE.MeshBasicMaterial({ color: 0xffb35c });
    var l1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 36), led); l1.position.set(0.66, FLOOR + 1.05, 0); bar.add(l1);
    var l2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 36), led); l2.position.set(0.66, FLOOR + 0.05, 0); bar.add(l2);
    // repisa iluminada detrás: botellas en silueta contra luz ámbar
    var c = document.createElement('canvas'); c.width = 2048; c.height = 256; var x = c.getContext('2d');
    var gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2a1204'); gr.addColorStop(0.5, '#ff9a3c'); gr.addColorStop(1, '#3a1804');
    x.fillStyle = gr; x.fillRect(0, 0, 2048, 256);
    x.fillStyle = 'rgba(20,8,2,0.95)';
    for (var s = 0; s < 2; s++){
      var y0 = 30 + s * 118; x.fillRect(0, y0 + 98, 2048, 8);
      for (var bx = 8; bx < 2040; bx += 22 + (bx * 7 % 17)){
        var bh = 52 + (bx * 13 % 40), bw = 12 + (bx % 9);
        x.fillRect(bx, y0 + 98 - bh, bw, bh); x.fillRect(bx + bw / 2 - 2.5, y0 + 98 - bh - 18, 5, 20);
      }
    }
    var shelf = new THREE.Mesh(new THREE.PlaneGeometry(36, 3.2), new THREE.MeshBasicMaterial({ map: canvasTex(c), fog: true }));
    shelf.rotation.y = Math.PI / 2; shelf.position.set(-1.45, FLOOR + 2.4, 0); bar.add(shelf);
    bar.position.set(0, 0, -96);
    place(bar, -3.5, 0);
    journey.add(bar);

    // botellas de la carta, flotando y girando sobre la barra
    function labelTex(name, base, ink){
      var c2 = document.createElement('canvas'); c2.width = 512; c2.height = 256; var y = c2.getContext('2d');
      y.fillStyle = base; y.fillRect(0, 0, 512, 256);
      y.strokeStyle = ink; y.lineWidth = 6; y.strokeRect(14, 14, 484, 228);
      y.fillStyle = ink; y.textAlign = 'center'; y.textBaseline = 'middle';
      y.font = 'italic 400 72px "Instrument Serif", Georgia, serif'; y.fillText(name[0], 256, 104);
      y.font = '700 30px "Bricolage Grotesque", Arial, sans-serif'; y.fillText(name[1], 256, 178);
      return canvasTex(c2);
    }
    var prof = [[0, 0], [0.3, 0], [0.33, 0.04], [0.34, 0.12], [0.34, 0.92], [0.3, 1.06], [0.16, 1.2], [0.12, 1.32], [0.11, 1.56], [0.13, 1.6], [0.13, 1.66], [0, 1.67]];
    var outer = new THREE.LatheGeometry(prof.map(function(p){ return new THREE.Vector2(p[0], p[1]); }), 32);
    var liq = new THREE.LatheGeometry([[0, 0.05], [0.3, 0.05], [0.31, 0.12], [0.31, 0.78], [0, 0.78]].map(function(p){ return new THREE.Vector2(p[0], p[1]); }), 24);
    var band = new THREE.CylinderGeometry(0.345, 0.345, 0.42, 32, 1, true);
    var LIST = [
      [['Buchanan\'s', '12 AÑOS'], 0xc77624, '#e9dcc4', '#3a2410'],
      [['Black & White', 'SCOTCH WHISKY'], 0xb8681a, '#111', '#e9e6dc'],
      [['Tequila', 'BLANCO'], 0xd9efe6, '#f3efe4', '#1d4a3a'],
      [['Linaje', 'RON AÑEJO'], 0x6a2a0c, '#2a0d06', '#d8b46a'],
      [['Smirnoff', 'VODKA'], 0xdfe8ff, '#b0122e', '#fff']
    ];
    LIST.forEach(function(it, n){
      var g = new THREE.Group();
      var gm = new THREE.MeshStandardMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.32, roughness: 0.06, metalness: 0.4, emissive: 0x1c1a22, side: THREE.DoubleSide, depthWrite: false });
      var o = new THREE.Mesh(outer, gm); o.renderOrder = 2;
      var lm = new THREE.MeshStandardMaterial({ color: it[1], emissive: it[1], emissiveIntensity: 0.38, roughness: 0.3, transparent: true, opacity: 0.88 });
      var l = new THREE.Mesh(liq, lm);
      var lab = new THREE.Mesh(band, new THREE.MeshStandardMaterial({ map: labelTex(it[0], it[2], it[3]), roughness: 0.6, emissive: 0x222222, emissiveIntensity: 0.6, emissiveMap: null }));
      lab.position.y = 0.5;
      g.add(l); g.add(lab); g.add(o);
      g.position.set(0, FLOOR + 1.6 + (n % 2) * 0.35, -82 - n * 7);
      g.userData = { by: g.position.y, ph: n * 1.9, ry: n * 0.8 };
      g.rotation.z = (n % 2 ? 0.12 : -0.1);
      place(g, -1.75, 1.15);
      journey.add(g); bottles.push(g);
    });
  })();

  /* ============ ACTO 4: el VIP y la copa ============ */
  var vipTables = [];
  // pasillo VIP: postes de bronce con cordón a los dos lados
  (function(){
    var span = 4;
    for (var s = -1; s <= 1; s += 2){
      for (var k = 0; k < 6; k++){
        var z = -121 - k * span;
        var st = stanchion(); st.position.z = z; place(st, s * 2.2, 0); journey.add(st);
        if (k < 5){
          var r = new THREE.Mesh(ropeGeo(span, 0.32), velvet); r.rotation.y = Math.PI / 2;
          r.position.set(0, FLOOR + 1.06, z); place(r, s * 2.2, 0); journey.add(r);
        }
      }
    }
    // mesas bajas con aro dorado encendido a los lados
    var tm = new THREE.MeshStandardMaterial({ color: 0x0d0a0b, roughness: 0.3, metalness: 0.5 });
    var ring = new THREE.MeshBasicMaterial({ color: 0xe8c27a });
    [[-4.8, -127], [4.8, -131], [-4.8, -137], [4.8, -141]].forEach(function(p){
      var g = new THREE.Group();
      var top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 32), tm); top.position.y = FLOOR + 0.62; g.add(top);
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.6, 12), tm); leg.position.y = FLOOR + 0.3; g.add(leg);
      var rg = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.012, 6, 48), ring); rg.rotation.x = Math.PI / 2; rg.position.y = FLOOR + 0.655; g.add(rg);
      var cnd = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: glowT, color: 0xffb070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
      cnd.position.y = FLOOR + 0.85; g.add(cnd); g.userData.cnd = cnd;
      g.position.z = p[1]; place(g, p[0], 0); journey.add(g); vipTables.push(g);
    });
  })();

  /* la copa de martini: cristal con borde de luz, el trago verde menta y la aceituna en su palillo */
  var GZ = -152, GS = 1.15;
  var glassMat = new THREE.MeshStandardMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.26, roughness: 0.04, metalness: 0.45, emissive: 0x0e1218, side: THREE.DoubleSide, depthWrite: false });
  glassMat.onBeforeCompile = function(sh){
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\nfloat frs=pow(1.0-abs(dot(normal,normalize(vViewPosition))),2.6);\ntotalEmissiveRadiance+=vec3(0.78,0.9,1.0)*frs*1.35;\ndiffuseColor.a=min(1.0,diffuseColor.a+frs*0.6);');
  };
  var liqMat = new THREE.MeshStandardMaterial({ color: 0x5fd9a8, emissive: 0x2fbf8a, emissiveIntensity: 0.6, roughness: 0.15, transparent: true, opacity: 0.82, depthWrite: false });
  var surfMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uDive: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: [
      'uniform float uTime,uDive; varying vec2 vUv;',
      'void main(){ vec2 q=vUv-0.5; float r=length(q)*2.0; float a=atan(q.y,q.x);',
      '  float sw=0.5+0.5*sin(r*18.0-uTime*2.2+sin(a*3.0+uTime*0.7)*1.4);',
      '  vec3 holo=0.6+0.4*cos(6.2831*(r*0.5+a*0.08+uTime*0.05+vec3(0.0,0.33,0.67)));',
      '  vec3 c=mix(vec3(0.32,0.78,0.6),holo,0.3)*(0.45+0.55*sw);',
      '  c+=vec3(0.9,1.0,0.95)*pow(sw,12.0)*0.3; c*=0.7+0.3*smoothstep(1.0,0.2,r);',
      '  gl_FragColor=vec4(c*(0.75+uDive*0.15),1.0); }'].join('\n'),
    side: THREE.DoubleSide
  });
  function buildGlass(withSurf){
    var g = new THREE.Group(), V = function(p){ return new THREE.Vector2(p[0], p[1]); };
    var base = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.74, 0], [0.78, 0.025], [0.72, 0.06], [0.16, 0.1], [0.07, 0.15]].map(V), 48), glassMat);
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 1.42, 16), glassMat); stem.position.y = 0.84;
    var bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.05, 1.5], [0.12, 1.56], [1.26, 2.86], [1.29, 2.9]].map(V), 64), glassMat);
    var liq = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 1.58], [0.11, 1.6], [1.02, 2.62], [0, 2.62]].map(V), 48), liqMat);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(1.29, 0.014, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffffff })); rim.rotation.x = Math.PI / 2; rim.position.y = 2.9;
    [liq, base, stem, bowl].forEach(function(m){ m.renderOrder = 3; g.add(m); }); g.add(rim);
    var surf = null;
    if (withSurf){ surf = new THREE.Mesh(new THREE.CircleGeometry(1.02, 64), surfMat); surf.rotation.x = -Math.PI / 2; surf.position.y = 2.621; g.add(surf); }
    var olive = new THREE.Group();
    var ol = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ color: 0x5f7d22, roughness: 0.35, emissive: 0x142006 })); ol.scale.set(1, 1.2, 1); olive.add(ol);
    var pim = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: 0xd61f2c, emissive: 0x3a0306 })); pim.position.set(0.05, 0.16, 0.1); olive.add(pim);
    var pick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 6), new THREE.MeshStandardMaterial({ color: 0xd8b46a, metalness: 0.7, roughness: 0.3, emissive: 0x2a1c06 }));
    pick.position.set(0.32, 0.62, 0); pick.rotation.z = -0.62; olive.add(pick);
    olive.position.set(0.36, 2.45, 0.1); g.add(olive);
    g.userData.surf = surf;
    return g;
  }
  var glass = buildGlass(true);
  glass.position.set(0, FLOOR, GZ); glass.scale.setScalar(GS); journey.add(glass);
  var glassHalo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowT, color: 0xff3a66, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.0, fog: false }));
  glassHalo.scale.set(11, 11, 1); glassHalo.position.set(0, FLOOR + 2.2, GZ - 3); fx.add(glassHalo);
  var LIQ_Y = FLOOR + 2.62 * GS, FS = 1.05, FORM_Y = FLOOR + 3.55 * GS;

  /* burbujas: suben del trago, dibujan la copa del logo en el aire y salen disparadas en el brindis */
  var NB_TIER = [70, 120, small ? 130 : 180], NB = NB_TIER[2];
  var bub, BP = new Float32Array(NB * 3), BV = new Float32Array(NB * 3), BS = new Float32Array(NB), formPts = new Float32Array(NB * 3);
  (function(){
    var mat = new THREE.MeshBasicMaterial({ color: 0x9ff2d2, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    bub = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 10, 8), mat, NB); bub.frustumCulled = false; bub.count = NB_TIER[tier];
    journey.add(bub);
    for (var i = 0; i < NB; i++){ respawn(i, true); BS[i] = 0.55 + Math.random() * 0.9; }
    /* el trazo de la copa del logo: bordes del cuenco, borde, tallo, pie, palillo y aceituna */
    var seg = [[-1.29, 2.9, -0.05, 1.5], [1.29, 2.9, 0.05, 1.5], [-1.29, 2.9, 1.29, 2.9], [0, 1.5, 0, 0.12], [-0.75, 0.03, 0.75, 0.03], [0.36, 2.45, 1.32, 3.6]];
    var lens = seg.map(function(s){ return Math.hypot(s[2] - s[0], s[3] - s[1]); }), oliveL = 2 * Math.PI * 0.2;
    var total = lens.reduce(function(a, b){ return a + b; }, 0) + oliveL;
    var idx = 0;
    seg.forEach(function(s, k){
      var n = Math.round(NB * lens[k] / total);
      for (var j = 0; j < n && idx < NB; j++, idx++){ var f = (j + 0.5) / n; formPts[idx * 3] = lerp(s[0], s[2], f); formPts[idx * 3 + 1] = lerp(s[1], s[3], f); }
    });
    for (var r = 0; idx < NB; idx++, r++){ var aa = r / Math.max(1, NB - idx + r) * Math.PI * 2; formPts[idx * 3] = 0.36 + Math.cos(aa) * 0.2; formPts[idx * 3 + 1] = 2.45 + Math.sin(aa) * 0.24; }
    for (i = 0; i < NB; i++){ formPts[i * 3] = formPts[i * 3] * FS; formPts[i * 3 + 1] = FORM_Y + formPts[i * 3 + 1] * FS; formPts[i * 3 + 2] = GZ - 1.5 + Math.sin(i * 1.7) * 0.05; }
  })();
  function respawn(i, init){
    var a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.85 * GS;
    BP[i * 3] = Math.cos(a) * r; BP[i * 3 + 1] = LIQ_Y + (init ? Math.random() * 5 : 0); BP[i * 3 + 2] = GZ + Math.sin(a) * r;
    BV[i * 3] = (Math.random() - 0.5) * 0.2; BV[i * 3 + 1] = 0.5 + Math.random() * 0.6; BV[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
  }
  var dummy = new THREE.Object3D(), formK = 0, lastForm = 0, toastT = 0;
  function updateBubbles(dt, u, t){
    var on = sstep(0.69, 0.74, u);
    bub.visible = on > 0.01;
    if (!bub.visible) return;
    formK = reduce ? 0 : sstep(0.81, 0.855, u) * (1 - sstep(0.905, 0.925, u));
    var toast = lastForm > 0.5 && formK <= 0.5 && u > 0.89; lastForm = formK;
    if (toast) toastT = 1.6; toastT = Math.max(0, toastT - dt);
    var n = bub.count, free = 1 - formK, stepF = NB / n;
    for (var i = 0; i < n; i++){
      var ix = i * 3, fx3 = Math.floor(i * stepF) * 3, x = BP[ix], y = BP[ix + 1], z = BP[ix + 2], vx = BV[ix], vy = BV[ix + 1], vz = BV[ix + 2];
      var ax = Math.sin(t * 2.1 + i) * 0.5, ay = 0.5, az = Math.cos(t * 1.7 + i * 1.3) * 0.5;
      if (toast){ var k = 3 + Math.random() * 4; vx += (x / (Math.abs(x) + 0.5)) * k * 0.5; vy += k; vz += (Math.random() - 0.3) * k * 0.6; }
      if (formK > 0){
        ax = ax * free + ((formPts[fx3] - x) * 9 - vx * 4) * formK;
        ay = ay * free + ((formPts[fx3 + 1] - y) * 9 - vy * 4) * formK;
        az = az * free + ((formPts[fx3 + 2] - z) * 9 - vz * 4) * formK;
      }
      vx += ax * dt; vy += ay * dt; vz += az * dt;
      var dmp = 1 - 0.9 * dt; vx *= dmp; vz *= dmp; if (free > 0.5 && toastT <= 0) vy = Math.min(vy, 2.6);
      x += vx * dt; y += vy * dt; z += vz * dt;
      if (formK < 0.02 && (y > LIQ_Y + 7.5 || Math.abs(x) > 9)){ respawn(i, false); x = BP[ix]; y = BP[ix + 1]; z = BP[ix + 2]; vx = BV[ix]; vy = BV[ix + 1]; vz = BV[ix + 2]; }
      BP[ix] = x; BP[ix + 1] = y; BP[ix + 2] = z; BV[ix] = vx; BV[ix + 1] = vy; BV[ix + 2] = vz;
      var sc = BS[i] * lerp(1, 1.5, formK) * on * (y < LIQ_Y + 0.05 ? 0.3 : 1);
      dummy.position.set(x, y, z); dummy.scale.setScalar(sc); dummy.updateMatrix(); bub.setMatrixAt(i, dummy.matrix);
    }
    bub.instanceMatrix.needsUpdate = true;
  }

  /* ---- ráfaga dorada al cambiar de capítulo ---- */
  var burst = (function(){
    var n = 70, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n);
    for (var j = 0; j < n; j++) pos[j * 3 + 1] = -999;
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(g, new THREE.PointsMaterial({ map: sparkT, size: 0.16, color: 0xffd38a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; fx.add(pts);
    return { pts: pts, pos: pos, vel: vel, life: life, n: n };
  })();
  function fireBurst(at){
    for (var j = 0; j < burst.n; j++){
      var a = Math.random() * 6.28, b = (Math.random() - 0.3) * 2.4, sp = 1 + Math.random() * 3;
      burst.pos[j * 3] = at.x; burst.pos[j * 3 + 1] = at.y; burst.pos[j * 3 + 2] = at.z;
      burst.vel[j * 3] = Math.cos(a) * Math.cos(b) * sp; burst.vel[j * 3 + 1] = Math.sin(b) * sp + 1; burst.vel[j * 3 + 2] = Math.sin(a) * Math.cos(b) * sp * 0.5 + 2;
      burst.life[j] = 1.2 + Math.random() * 1.4;
    }
  }
  function updateBurst(dt){
    var P = burst.pos, V = burst.vel, L = burst.life;
    for (var j = 0; j < burst.n; j++){
      if (L[j] <= 0) continue;
      L[j] -= dt;
      if (L[j] <= 0){ P[j * 3 + 1] = -999; continue; }
      V[j * 3 + 1] -= 2.2 * dt; V[j * 3] *= (1 - 0.8 * dt); V[j * 3 + 2] *= (1 - 0.8 * dt);
      P[j * 3] += V[j * 3] * dt; P[j * 3 + 1] += V[j * 3 + 1] * dt; P[j * 3 + 2] += V[j * 3 + 2] * dt;
    }
    burst.pts.geometry.attributes.position.needsUpdate = true;
  }

  /* ============ CIERRE: la copa girando detrás del formulario de reserva ============ */
  var glassF = buildGlass(true); glassF.scale.setScalar(1.25); finale.add(glassF);
  var haloF = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowT, color: 0x8c0d24, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  haloF.scale.set(16, 16, 1); haloF.position.z = -4; fxF.add(haloF);
  var bubF = (function(){
    var N = small ? 70 : 140, pos = new Float32Array(N * 3), sp = new Float32Array(N);
    for (var j = 0; j < N; j++){ pos[j * 3] = (Math.random() - 0.5) * 2.2; pos[j * 3 + 1] = Math.random() * 9 - 3; pos[j * 3 + 2] = (Math.random() - 0.5) * 2.2; sp[j] = 0.4 + Math.random() * 0.9; }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(g, new THREE.PointsMaterial({ map: sparkT, size: 0.14, color: 0xc9ffe8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
    pts.userData.sp = sp; pts.frustumCulled = false; fxF.add(pts); return pts;
  })();

  /* ---- recorrido de cámara ---- */
  /* a la altura de los ojos de alguien que entra: quieta en la fila, se mece en la pista, se arrima a la barra, sube a la copa */
  var KEYS = [[14, 0, 0.3], [8, 0, 0.3], [0, 0, 0.26], [-6, 0, 0.24],
              [-14, -0.35, 0.36], [-22, 0, 0.5], [-27, 0, 0.5],
              [-34, 0.9, 0.42], [-42, -0.9, 0.22], [-50, 0.7, 0.12], [-58, -0.8, 0.32], [-66, 0.6, 0.42], [-72, 0, 0.45],
              [-80, 1.05, 0.5], [-90, 1.3, 0.5], [-100, 1.2, 0.48], [-110, 1.0, 0.5], [-117, 0, 0.45],
              [-123, 0, 0.42], [-130, 0, 0.5], [-137, 0, 0.62], [-144, 0, 0.9], [-150, 0, 1.4], [-158, 0, 1.8], [-166, 0, 2.0], [-176, 0, 2.0]];
  function spl(z, c){
    var n = KEYS.length, i = 1;
    while (i < n - 3 && KEYS[i + 1][0] > z) i++;
    var a = KEYS[i - 1][c], b = KEYS[i][c], d = KEYS[i + 1][c], e = KEYS[i + 2][c];
    var f = clamp((KEYS[i][0] - z) / (KEYS[i][0] - KEYS[i + 1][0]));
    return 0.5 * ((2 * b) + (-a + d) * f + (2 * a - 5 * b + 4 * d - e) * f * f + (-a + 3 * b - 3 * d + e) * f * f * f);
  }
  function pathZ(p){ return 8 - p * TRAVEL; }
  function pathX(p){ return spl(pathZ(p), 1) * (AMP / 2.4); }
  function pathY(p){ return spl(pathZ(p), 2); }

  /* ============ POSTPROCESADO: resplandor del neón, foco, grano y cierre a negro ============ */
  var post = (function(){
    var tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    tri.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    var VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
    var blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb*0.227; c+=(texture2D(t,vUv+d*1.385).rgb+texture2D(t,vUv-d*1.385).rgb)*0.316; c+=(texture2D(t,vUv+d*3.231).rgb+texture2D(t,vUv-d*3.231).rgb)*0.0703; gl_FragColor=vec4(c,1.0); }' });
    var comp = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, tB: { value: null }, tD: { value: null }, uBloom: { value: 0.6 }, uCA: { value: 0.001 }, uGrain: { value: 0.045 },
                  uTime: U.time, uVig: { value: 0.55 }, uDof: { value: 0 }, uNear: { value: 0.05 }, uFar: { value: 140 }, uRes: { value: new THREE.Vector2(1, 1) }, uFade: { value: 0 } },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: [
        'uniform sampler2D tS,tB,tD; uniform float uBloom,uCA,uGrain,uTime,uVig,uDof,uNear,uFar,uFade; uniform vec2 uRes; varying vec2 vUv;',
        'float unp(vec4 v){ return dot(v, (255.0/256.0)/vec4(16777216.0,65536.0,256.0,1.0)); }',
        'float hs(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }',
        'void main(){',
        '  vec2 c=vUv-0.5; float r2=dot(c,c); vec2 o=c*uCA*(0.35+r2*2.6);',
        '  vec3 col=vec3(texture2D(tS,vUv+o).r, texture2D(tS,vUv).g, texture2D(tS,vUv-o).b);',
        '  vec3 bl=texture2D(tB,vUv).rgb;',
        '  if(uDof>0.5){ float d=unp(texture2D(tD,vUv)); float dist=(uNear*uFar)/(uFar-(uFar-uNear)*d);',
        '    float coc=smoothstep(3.6,1.1,dist); col=mix(col,bl,coc*0.85); }',
        '  float lum=dot(bl,vec3(0.3,0.59,0.11)); col+=bl*smoothstep(0.32,0.95,lum)*uBloom; col+=bl*0.08*uBloom;',
        '  col*=1.0-uVig*r2*1.8;',
        '  col+=(hs(vUv*uRes+fract(uTime)*61.0)-0.5)*uGrain;',
        '  col*=1.0-uFade;',
        '  gl_FragColor=vec4(col,1.0);',
        '}'].join('\n') });
    var qs = new THREE.Scene(), qc = new THREE.Camera(), qm = new THREE.Mesh(tri, blur); qm.frustumCulled = false; qs.add(qm);
    var depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    var rtS = null, rtA = null, rtB = null, rtD = null, W = 1, H = 1;
    function pass(mat, target){ qm.material = mat; renderer.setRenderTarget(target); renderer.render(qs, qc); }
    return {
      comp: comp,
      forget: function(){ rtS = rtA = rtB = rtD = null; },
      size: function(w, h, pr){
        W = Math.max(2, Math.floor(w * pr)); H = Math.max(2, Math.floor(h * pr));
        [rtS, rtA, rtB, rtD].forEach(function(r){ if (r) r.dispose(); });
        if (gl2 && THREE.WebGLMultisampleRenderTarget){ rtS = new THREE.WebGLMultisampleRenderTarget(W, H); rtS.samples = 4; }
        else rtS = new THREE.WebGLRenderTarget(W, H);
        rtS.texture.minFilter = rtS.texture.magFilter = THREE.LinearFilter;
        var w4 = Math.max(2, W >> 2), h4 = Math.max(2, H >> 2);
        rtA = new THREE.WebGLRenderTarget(w4, h4, { depthBuffer: false }); rtB = new THREE.WebGLRenderTarget(w4, h4, { depthBuffer: false });
        rtD = new THREE.WebGLRenderTarget(Math.max(2, W >> 1), Math.max(2, H >> 1), { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
        comp.uniforms.uRes.value.set(W, H);
      },
      render: function(sc, cam, dof){
        renderer.setRenderTarget(rtS); renderer.render(sc, cam);
        var w4 = rtA.width, h4 = rtA.height;
        blur.uniforms.t.value = rtS.texture; blur.uniforms.d.value.set(1 / w4, 0); pass(blur, rtA);
        blur.uniforms.t.value = rtA.texture; blur.uniforms.d.value.set(0, 1 / h4); pass(blur, rtB);
        blur.uniforms.t.value = rtB.texture; blur.uniforms.d.value.set(2 / w4, 0); pass(blur, rtA);
        blur.uniforms.t.value = rtA.texture; blur.uniforms.d.value.set(0, 2 / h4); pass(blur, rtB);
        if (dof){
          var b0 = sc.background; sc.background = null; sc.overrideMaterial = depthMat; fx.visible = false; fxF.visible = false; curtain.visible = false;
          renderer.setClearColor(0xffffff, 1); renderer.setRenderTarget(rtD); renderer.render(sc, cam);
          sc.overrideMaterial = null; sc.background = b0; fx.visible = true; fxF.visible = true; renderer.setClearColor(0x000000, 1);
          comp.uniforms.tD.value = rtD.texture; comp.uniforms.uNear.value = cam.near; comp.uniforms.uFar.value = cam.far;
        }
        comp.uniforms.uDof.value = dof ? 1 : 0;
        comp.uniforms.tS.value = rtS.texture; comp.uniforms.tB.value = rtB.texture;
        pass(comp, null);
      }
    };
  })();

  /* ---- calidad adaptativa ---- */
  var PR_TIER = [1, 1.5, 2];
  function applyTier(){
    bub.count = NB_TIER[tier];
    sparks.geometry.setDrawRange(0, NS_TIER[tier]);
    resize();
  }
  var acc = 0, accN = 0, warm = 0, skipFrame = false;
  document.addEventListener('visibilitychange', function(){ skipFrame = true; });
  function watchFps(dt){
    if (Q.forced || tier === 0) return;
    if (skipFrame){ skipFrame = false; return; }
    warm += dt; if (warm < 1.5) return;
    acc += dt; accN++;
    if (acc >= 2.5){
      if (acc / accN > 0.03){ tier--; warm = 0; applyTier(); }
      acc = 0; accN = 0;
    }
  }

  function resize(){
    var w = window.innerWidth, h = window.innerHeight;
    var pr = Math.min(window.devicePixelRatio || 1, PR_TIER[tier], w < 900 ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    if (tier > 0) post.size(w, h, pr);
    aspect = w / h; camera.aspect = aspect;
    kR = clamp((aspect - 0.46) / (1.6 - 0.46));
    spread = lerp(0.5, 1, kR); sizeK = lerp(0.66, 1, kR); AMP = lerp(0.6, 2.4, kR); baseFov = lerp(70, 54, kR);
    camera.fov = baseFov; camera.updateProjectionMatrix();
    applySpread();
    layoutCurtain();
  }
  resize(); window.addEventListener('resize', resize);

  SKY = { tier: function(){ return tier; }, frames: function(){ return frames.map(function(g){ var u = g.userData; return u.key + ':' + (u.st||0) + '/' + (u.vs||0) + (u.video ? '@' + u.video.currentTime.toFixed(1) : ''); }).join(' '); } };

  var lazy = frames.slice();
  var texTick = 0;
  var pS = 0, pPrev = 0, vel = 0, tx = 0, ty = 0, t = 0, last = performance.now(), kick = 0, lastBurst = 0;
  var tmp = new THREE.Vector3(), tgt = new THREE.Vector3(), cam0 = new THREE.Vector3(), above = new THREE.Vector3(), into = new THREE.Vector3(), lookG = new THREE.Vector3();

  function frame(now){
    var rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now;
    var hr = hero.getBoundingClientRect();
    var showJ = hr.bottom > 0, showF = false;
    if (!showJ && fin){ var fr = fin.getBoundingClientRect(); showF = fr.top < window.innerHeight && fr.bottom > 0; }
    if (lost) return;
    if (!showJ && !showF) return;
    if (!shown){ shown = true; document.documentElement.classList.add('sky-on'); }
    if (!reduce) t += dt;
    U.time.value = t;
    var beat = reduce ? 0.5 : Math.pow(0.5 + 0.5 * Math.cos(t * Math.PI * 2 * 2.05), 6);   // ~123 bpm
    U.beat.value = beat;

    var gmx = S.gyro ? S.gx : S.mx, gmy = S.gyro ? S.gy : S.my;
    tx += (gmx - tx) * 0.05; ty += (gmy - ty) * 0.05;
    var ptx = reduce ? 0 : tx, pty = reduce ? 0 : ty;
    journey.visible = showJ; finale.visible = showF && !showJ;
    var fade = 0, bloom = 0.6;

    if (showJ){
      pS += (S.p - pS) * ((reduce || SNAP) ? 1 : 0.075);
      vel += (((pS - pPrev) / Math.max(dt, 0.001)) - vel) * 0.1; pPrev = pS; if (SNAP) vel = 0;
      var p = remap(pS);
      zoneColor(p, bg); scene.fog.color.copy(bg);
      var dive = sstep(0.9, 0.995, p);
      scene.fog.near = lerp(8, 3, dive); scene.fog.far = lerp(40, 22, dive);

      var cz = pathZ(p), cx = pathX(p), cy = pathY(p);
      camera.position.set(cx + ptx * 0.5, cy - pty * 0.25, cz);
      var pa = p + 0.035;
      tgt.set(pathX(pa) * 0.9 + ptx * 1.4, pathY(pa) + 0.12 - pty * 0.8, cz - 6);

      // la mirada busca las botellas y las fotos al pasar
      var lookX = 0, lookY = 0, lw, ld;
      for (var bi = 0; bi < bottles.length; bi++){
        ld = cz - bottles[bi].position.z;
        if (ld > 1 && ld < 12){ lw = sstep(12, 6, ld) * sstep(1, 3.5, ld); lookX += (bottles[bi].position.x - cx) * 0.32 * lw; lookY += 0.3 * lw; }
      }
      for (var fi = 0; fi < frames.length; fi++){
        ld = cz - frames[fi].position.z;
        if (ld > 2 && ld < 14){ lw = sstep(14, 8, ld) * sstep(2, 5, ld); lookX += (frames[fi].position.x - cx) * 0.22 * lw; }
      }
      // la puerta: la mirada sube al letrero al acercarse
      ld = cz - DZ; if (ld > 1 && ld < 16) lookY += sstep(16, 7, ld) * sstep(1, 4, ld) * 1.3;
      // la bola de espejos: mirar arriba al pasar debajo
      ld = cz - disco.position.z; if (ld > 0 && ld < 16) lookY += sstep(16, 8, ld) * sstep(0, 4, ld) * 1.4;
      tgt.x += clamp(lookX, -3, 3); tgt.y += lookY;
      // la copa: la mirada se clava en ella
      var gK = sstep(0.74, 0.84, p);
      lookG.set(0, FLOOR + 2.0 * GS, GZ);
      tgt.lerp(lookG, gK * 0.65 * (1 - dive));
      tmp.set(0, FORM_Y + 1.6 * FS, GZ - 1.5); tgt.lerp(tmp, formK * 0.55 * (1 - dive));

      // el final: subir sobre la copa y meterse en el trago
      if (dive > 0){
        cam0.copy(camera.position);
        above.set(0, LIQ_Y + 2.3, GZ + 1.2); into.set(0, LIQ_Y + 0.08, GZ + 0.05);
        if (dive < 0.62) tmp.lerpVectors(cam0, above, sstep(0, 0.62, dive));
        else tmp.lerpVectors(above, into, sstep(0.62, 1, dive));
        camera.position.copy(tmp);
        tmp.set(0, LIQ_Y, GZ); tgt.lerp(tmp, sstep(0, 0.45, dive));
      }
      camera.lookAt(tgt);
      if (!reduce && dive < 0.01) camera.rotateZ(clamp(-(pathX(p + 0.006) - pathX(p - 0.006)) * 1.0, -0.14, 0.14));

      // telón: se cierra desde los lados y se vuelve a abrir
      var ck = -1;
      for (var ci = 0; ci < CURT.length; ci++){ var cq = (p - (CURT[ci] - 0.017)) / 0.034; if (cq > 0 && cq < 1) ck = cq; }
      curtain.visible = ck >= 0 && !reduce;
      if (curtain.visible){
        var close = Math.sin(ck * Math.PI); close = close * close * (3 - 2 * close);
        var openX = curView / 2 + curHalfW / 2 + 0.3, shutX = curHalfW / 2 - 0.05;
        curL.position.x = -lerp(openX, shutX, close); curR.position.x = lerp(openX, shutX, close);
        curtain.position.set(0, 0, -CUR_D);
      }

      kick += ((reduce ? 0 : Math.min(Math.abs(vel) * 55, 13)) - kick) * 0.08;
      camera.fov = baseFov + kick * (1 - dive) + dive * 8; camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      /* ---- acto 1 ---- */
      ropeGate.rotation.y = -sstep(0.012, 0.042, p) * 1.8;
      var dd = cz - DZ;
      var doorK = sstep(30, 6, dd) * (1 - sstep(0, -6, dd)), nearK = sstep(1.2, 7, dd);
      doorGlow.material.opacity = (0.25 + 0.55 * doorK) * nearK;
      doorSpill.material.opacity = (0.3 + 0.35 * doorK) * nearK;
      doorSpill.quaternion.copy(camera.quaternion);
      doorFrame[0].material.color.setRGB(1, 0.9, 0.95).multiplyScalar(0.85 + 0.15 * beat + 0.4 * doorK);
      if (sign) sign.material.uniforms.uOn.value = sign.userData.st === 2 ? 1 : 0;
      Ldoor.intensity = 3.2 * (0.85 + 0.15 * Math.sin(t * 1.7));

      /* ---- acto 2 ---- */
      disco.rotation.y = t * 0.35; discoDots.rotation.y = t * 0.35;
      discoDots.material.opacity = 0.35 + 0.5 * beat;
      for (var b = 0; b < beams.length; b++){
        var bu = beams[b].userData;
        beams[b].rotation.z = Math.sin(t * bu.sp + bu.ph) * 0.48 * bu.side;
        beams[b].rotation.x = Math.cos(t * bu.sp * 0.8 + bu.ph) * 0.3;
        bu.m.material.uniforms.uOp.value = (0.5 + 0.45 * beat) * sstep(0.15, 0.22, p) * (1 - sstep(0.46, 0.5, p));
      }
      Lclub.color.setHSL((t * 0.06) % 1, 0.7, 0.62); Lclub.intensity = 2.2 + 2.4 * beat;
      if (p > 0.12 && p < 0.55) updateSparks(t, beat, vel);
      sparks.visible = p > 0.12 && p < 0.55;

      /* ---- acto 3 ---- */
      for (var bo = 0; bo < bottles.length; bo++){
        var bg2 = bottles[bo], bud = bg2.userData;
        bg2.rotation.y = bud.ry + t * 0.45;
        bg2.position.y = bud.by + Math.sin(t * 0.8 + bud.ph) * 0.12;
      }

      /* ---- acto 4 ---- */
      glass.rotation.y = t * 0.22;
      glassHalo.material.opacity = sstep(0.74, 0.85, p) * (0.32 + 0.12 * beat) * (1 - dive);
      glassHalo.quaternion.copy(camera.quaternion);
      surfMat.uniforms.uDive.value = sstep(0.95, 1, p);
      Lvip.intensity = 3.2 + 1.2 * sstep(0.8, 0.9, p);
      for (var vt = 0; vt < vipTables.length; vt++) vipTables[vt].userData.cnd.quaternion.copy(camera.quaternion);
      updateBubbles(reduce ? 0 : dt, p, t);

      // neones laterales
      for (var ni = 0; ni < neons.length; ni++){
        var nm = neons[ni]; var nd = cz - nm.userData.z;
        nm.visible = nd > -6 && nd < 45;
        if (nm.visible) neonColor(nm.userData.z, nm.userData.k, t, beat, nm.material.color);
      }

      // texturas por acto
      if ((texTick++ % 10) === 0){
        for (var ti = 0; ti < lazy.length; ti++){
          var lg = lazy[ti], lz = cz - lg.position.z;
          if (lz < 40 && lz > -14) ensureTex(lg); else if (lz > 70 || lz < -30) dropTex(lg);
          if (lz < 30 && lz > -5) ensureVid(lg); else if (lz > 38 || lz < -9) dropVid(lg);
        }
      }
      // fotos y palabras: se encienden como neón al acercarte y se apagan al pasar
      for (var n = 0; n < frames.length; n++){
        var g = frames[n], gu = g.userData, dz = cz - g.position.z;
        var on = ((gu.st === 2 || gu.vs === 2) ? 1 : 0) * sstep(gu.near + 8, gu.near, dz) * sstep(-1.5, 2, dz);
        gu.mat.uniforms.uOn.value = on; gu.edge.uniforms.uOn.value = on;
        g.position.y = gu.by + Math.sin(t * 0.6 + n * 1.3) * 0.05;
      }
      for (n = 0; n < words.length; n++){
        var wm = words[n], wz = cz - wm.position.z;
        wm.position.y = wm.userData.by + Math.sin(t * 0.5 + wm.userData.ph) * 0.12;
        wm.quaternion.copy(camera.quaternion);
        wm.material.uniforms.uOn.value = sstep(16, 9, wz) * sstep(0.8, 3.2, wz);
      }

      if (S.burst && S.burst !== lastBurst){ lastBurst = S.burst; if (!reduce && p > 0.03 && p < 0.8){ tmp.set(0, 0, -3).applyQuaternion(camera.quaternion).add(camera.position); fireBurst(tmp); } }
      updateBurst(dt);
      fade = sstep(0.975, 1, p);
      bloom = 0.6 + dive * 0.5;
      watchFps(rawDt);
    } else {
      bg.set(0x030203); scene.fog.color.copy(bg); scene.fog.near = 8; scene.fog.far = 30;
      camera.fov = baseFov; camera.updateProjectionMatrix();
      var wide = kR > 0.55;
      var fr2 = fin.getBoundingClientRect(), fp = clamp((window.innerHeight - fr2.top) / (fr2.height + window.innerHeight));
      camera.position.set(ptx * 0.8, 1.2 - pty * 0.5, FZ + 9); camera.rotation.set(0, 0, 0); camera.lookAt(ptx * 0.3, 0.6, FZ);
      glassF.position.set(wide ? -6.6 : 0, (wide ? -3.9 : -2.4) - fp * 0.8, wide ? 0 : -3);
      glassF.rotation.y = t * 0.3 + fp * 2;
      haloF.position.set(glassF.position.x, 0.6, -4); haloF.quaternion.copy(camera.quaternion);
      var ba = bubF.geometry.attributes.position, bs = bubF.userData.sp;
      for (var q = 0; q < ba.count; q++){
        var yy = ba.getY(q) + bs[q] * dt; if (yy > 6) yy = -0.6;
        ba.setY(q, yy); ba.setX(q, ba.getX(q) + Math.sin(t * 1.4 + q) * dt * 0.12);
      }
      ba.needsUpdate = true;
      bubF.position.set(glassF.position.x, glassF.position.y + 3.1, glassF.position.z);
    }
    U.fogNear.value = scene.fog.near; U.fogFar.value = scene.fog.far;

    if (tier === 0){ renderer.setRenderTarget(null); renderer.render(scene, camera); }
    else {
      var cu = post.comp.uniforms;
      cu.uBloom.value = bloom; cu.uVig.value = 0.55;
      cu.uCA.value = reduce ? 0 : 0.0012 + Math.min(Math.abs(vel) * 0.04, 0.008);
      cu.uGrain.value = 0.045; cu.uFade.value = fade;
      post.render(scene, camera, tier === 2);
    }
  }
  tickers.push(frame);
}
threeReady.then(function(){ try { initSky(); } catch (e) { console.error(e); skyOff(); } }, skyOff);
