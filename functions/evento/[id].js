// /evento/:id-slug — página propia de cada evento, generada desde lo que Talal sube en el admin.
// Lleva los datos de evento que Google usa para mostrarlo en "eventos cerca".
import { SITIO, esc, slug, fechaISO, fechaLarga, hoyVE, urlEvento } from '../_sitio.js';

const html = (body, status = 200) => new Response(body, {
  status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
});

export async function onRequestGet({ env, params, request }) {
  const id = parseInt(params.id);
  if (!id || !env.DB) return html(noEncontrado(), 404);
  const ev = await env.DB.prepare('SELECT id, titulo, fecha, descripcion, flyer_key, estado, link, creado FROM eventos WHERE id = ?').bind(id).first();
  if (!ev) return html(noEncontrado(), 404);

  // si el slug no coincide, redirige a la URL buena (una sola dirección por evento)
  const buena = urlEvento(ev);
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  if (path !== buena) return Response.redirect(SITIO.url + buena, 301);

  const iso = fechaISO(ev.fecha, ev.creado);
  const pasado = ev.estado === 'pasado' || (iso && iso < hoyVE());
  const img = ev.flyer_key ? `${SITIO.url}/api/flyer/${encodeURIComponent(ev.flyer_key)}` : `${SITIO.url}/assets/og.jpg`;
  const cuando = iso ? fechaLarga(iso) : (ev.fecha || 'este sábado');
  const desc = (ev.descripcion ? ev.descripcion + ' ' : '') +
    `${ev.titulo} en Martini Bar, El Vigía (Mérida): ${cuando} desde las 10pm. DJ en vivo, entrada gratis hasta la 1am y mesas VIP desde $100.`;

  // próximo evento (para las páginas de eventos pasados)
  let prox = null;
  if (pasado) prox = await env.DB.prepare(`SELECT id, titulo, fecha FROM eventos WHERE estado = 'proximo' ORDER BY orden DESC, id DESC LIMIT 1`).first();
  const pagina = ev.link && /^\/(?!vip|lista)[a-z0-9]/i.test(ev.link) ? ev.link : '';   // página especial del evento (ej. /redroom2)

  const ld = iso ? {
    '@context': 'https://schema.org', '@type': 'Event',
    name: ev.titulo, description: desc, image: [img],
    startDate: `${iso}T22:00:00-04:00`,
    endDate: new Date(new Date(`${iso}T22:00:00-04:00`).getTime() + 6 * 3600e3).toISOString().replace('.000Z', 'Z'),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'NightClub', name: 'Martini Bar', url: SITIO.url + '/',
      address: { '@type': 'PostalAddress', addressLocality: SITIO.ciudad, addressRegion: SITIO.estado, addressCountry: SITIO.pais } },
    organizer: { '@type': 'Organization', name: 'Martini Bar', url: SITIO.url + '/' },
    offers: [
      { '@type': 'Offer', name: 'Entrada general (gratis hasta la 1am)', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: SITIO.url + '/lista' },
      { '@type': 'Offer', name: 'Mesa VIP', price: '100', priceCurrency: 'USD', availability: 'https://schema.org/LimitedAvailability', url: SITIO.url + '/vip/' },
    ],
  } : null;

  const titulo = `${ev.titulo}${ev.fecha ? ' · ' + ev.fecha : ''} — Martini Bar El Vigía`;
  const canon = SITIO.url + buena;
  const waTxt = encodeURIComponent(`Hola! Quiero reservar para ${ev.titulo}${ev.fecha ? ' (' + ev.fecha + ')' : ''} en Martini Bar 🍸`);

  return html(`<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc.slice(0, 300))}">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc.slice(0, 200))}"><meta property="og:image" content="${img}"><meta property="og:url" content="${canon}">
<meta name="twitter:card" content="summary_large_image">
${pasado ? '<meta name="robots" content="index, follow">' : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23000'/%3E%3Cpath d='M4 5h16l-8 8-8-8Z M12 13v6 M8 21h8' stroke='%23c9ffe8' stroke-width='1.3' fill='none'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
<style>${CSS}</style>
<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","z6d09cydt7");</script>
</head><body>
<header class="top"><a href="/" aria-label="Martini Bar, inicio"><img src="/assets/logo-blanco.png" alt="Martini Bar"></a><a class="pill" href="/#eventos">Todas las noches</a></header>
<main>
  <figure class="fly"><img src="${img}" onerror="this.onerror=null;this.src='/assets/og.jpg'" alt="Flyer de ${esc(ev.titulo)} en Martini Bar, El Vigía" width="720" height="900"></figure>
  <section class="info">
    <p class="k">${pasado ? 'Esta noche ya pasó' : 'Martini Bar · El Vigía, Mérida'}</p>
    <h1>${esc(ev.titulo)}</h1>
    <p class="when">${esc(cuando.charAt(0).toUpperCase() + cuando.slice(1))} · desde las 10pm</p>
    ${ev.descripcion ? `<p class="d">${esc(ev.descripcion)}</p>` : ''}
    ${pasado ? `
    <p class="d">Gracias a todos los que vinieron. ${prox ? `La próxima noche es <b>${esc(prox.titulo)}${prox.fecha ? ' · ' + esc(prox.fecha) : ''}</b>.` : 'Mira lo que viene en nuestras redes.'}</p>
    <div class="go">${prox ? `<a class="b1" href="${urlEvento(prox)}" data-ev="evento_proximo">Ver la próxima noche →</a>` : ''}<a class="b2" href="/vip/" data-ev="evento_vip">Reservar mesa VIP</a></div>
    ${pagina ? `<p class="more"><a href="${esc(pagina)}">Ver la página de ${esc(ev.titulo)} →</a></p>` : ''}` : `
    <ul class="facts">
      <li><b>Gratis</b><span>entrada hasta la 1am · después $3 hombres y $2 mujeres</span></li>
      <li><b>DJ en vivo</b><span>hasta la madrugada</span></li>
      <li><b>Mesas VIP</b><span>desde $100 con botella, balde y entradas</span></li>
    </ul>
    <div class="go">
      <a class="b1" href="/lista" data-ev="evento_lista">Ponte en la lista</a>
      <a class="b2" href="/vip/" data-ev="evento_vip">Reservar mesa VIP</a>
      <a class="b3" href="https://wa.me/${SITIO.wa}?text=${waTxt}" target="_blank" rel="noopener" data-ev="evento_whatsapp">WhatsApp</a>
    </div>
    ${pagina ? `<p class="more"><a href="${esc(pagina)}">Ver todos los detalles de ${esc(ev.titulo)} →</a></p>` : ''}
    <button class="share" id="share" type="button" data-ev="evento_compartir">Invitar a mis panas</button>`}
  </section>
</main>
<section class="where">
  <h2>Cómo llegar</h2>
  <p>Martini Bar está en El Vigía, Mérida, con estacionamiento propio. Abrimos los sábados desde las 10pm hasta la madrugada.</p>
  <a href="${SITIO.mapa}" target="_blank" rel="noopener">Abrir en Google Maps →</a>
</section>
<footer><a href="/">martinibar.live</a> · <a href="${SITIO.ig}" target="_blank" rel="noopener">Instagram</a> · <a href="/discoteca-el-vigia">Discoteca en El Vigía</a></footer>
<script>
document.addEventListener('click',function(e){var a=e.target.closest('[data-ev]');if(a&&window.clarity)window.clarity('event',a.dataset.ev);});
var s=document.getElementById('share');if(s)s.onclick=function(){var u=location.href,t=${JSON.stringify(ev.titulo + ' en Martini Bar' + (ev.fecha ? ' · ' + ev.fecha : ''))};
if(navigator.share)navigator.share({title:t,text:t+' 🍸',url:u}).catch(function(){});else window.open('https://wa.me/?text='+encodeURIComponent(t+' 🍸 '+u),'_blank');};
</script>
</body></html>`);
}

function noEncontrado() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Evento no encontrado — Martini Bar</title><style>${CSS}</style></head>
<body><main style="display:block;text-align:center;padding-top:20vh"><h1>Ese evento ya no está.</h1><p class="d" style="margin:1rem auto">Mira lo que viene este sábado.</p><div class="go" style="justify-content:center"><a class="b1" href="/#eventos">Ver las noches</a></div></main></body></html>`;
}

const CSS = `*{box-sizing:border-box;margin:0;padding:0}html{background:#000}
body{background:radial-gradient(90% 60% at 85% 0%,rgba(140,13,36,.4),transparent 60%),#000;color:#f2f3ee;font-family:'Bricolage Grotesque',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.45;min-height:100vh}
a{color:inherit}
.top{display:flex;justify-content:space-between;align-items:center;padding:calc(14px + env(safe-area-inset-top)) clamp(18px,5vw,48px) 10px}
.top img{height:64px;mix-blend-mode:screen;margin:-10px 0}
.pill{font-size:14px;color:#9a9d9f;text-decoration:none;border:1px solid rgba(242,243,238,.15);border-radius:99px;padding:8px 14px}
main{max-width:1120px;margin:0 auto;padding:clamp(10px,3vw,40px) clamp(18px,5vw,48px) 40px;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(24px,5vw,72px);align-items:center}
.fly{border-radius:16px;overflow:hidden;border:1px solid rgba(216,180,106,.35);box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 80px rgba(140,13,36,.35)}
.fly img{display:block;width:100%;height:auto}
.k{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#d8b46a}
h1{font-size:clamp(44px,7vw,96px);line-height:.9;letter-spacing:-.045em;font-weight:800;margin:14px 0 12px}
.when{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:clamp(22px,2.6vw,30px);color:#e9e2d4}
.d{color:#cfd0ca;margin-top:14px;max-width:46ch}
.facts{list-style:none;display:grid;gap:12px;margin-top:22px;max-width:480px}
.facts li{border-top:1px solid rgba(216,180,106,.5);padding-top:10px}.facts b{display:block;font-size:20px}.facts span{color:#9a9d9f;font-size:15px}
.go{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.go a{text-decoration:none;border-radius:99px;padding:15px 22px;font-weight:700;font-size:16px;border:1px solid rgba(242,243,238,.18)}
.go .b1{background:#f2f3ee;color:#000}.go .b2{background:#8c0d24;border-color:#8c0d24;box-shadow:0 0 40px rgba(140,13,36,.6)}.go .b3{color:#25D366;border-color:rgba(37,211,102,.5)}
.more{margin-top:18px}.more a{color:#c9ffe8}
.share{margin-top:18px;background:none;border:none;color:#9a9d9f;font:inherit;text-decoration:underline;cursor:pointer}
.where{max-width:1120px;margin:30px auto 0;padding:28px clamp(18px,5vw,48px);border-top:1px solid rgba(242,243,238,.1)}
.where h2{font-size:24px}.where p{color:#9a9d9f;margin:6px 0 10px;max-width:60ch}.where a{color:#c9ffe8}
footer{text-align:center;color:#66625e;font-size:14px;padding:40px 20px calc(30px + env(safe-area-inset-bottom))}footer a{color:#9a9d9f}
@media(max-width:820px){main{grid-template-columns:1fr}.go a{flex:1;text-align:center}}`;
