// /sitemap.xml — se arma solo: páginas fijas + cada evento que Talal publica
import { SITIO, urlEvento, fechaISO } from './_sitio.js';

const FIJAS = [
  ['/', '1.0', 'daily'], ['/vip/', '0.9', 'weekly'], ['/mesas', '0.9', 'weekly'], ['/lista', '0.8', 'weekly'],
  ['/discoteca-el-vigia', '0.9', 'weekly'], ['/que-hacer-en-el-vigia', '0.8', 'weekly'],
  ['/cumpleanos-el-vigia', '0.8', 'monthly'], ['/blog', '0.7', 'weekly'], ['/verlanoche', '0.6', 'weekly'],
  ['/redroom2', '0.5', 'monthly'], ['/theredroom', '0.5', 'monthly'],
];

export async function onRequestGet({ env }) {
  const hoy = new Date().toISOString().slice(0, 10);
  let urls = FIJAS.map(([p, pr, cf]) => `<url><loc>${SITIO.url}${p}</loc><lastmod>${hoy}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`);
  try {
    const { results } = await env.DB.prepare('SELECT id, titulo, fecha, estado, creado FROM eventos ORDER BY id DESC LIMIT 200').all();
    for (const ev of results || []) {
      const lm = (fechaISO(ev.fecha, ev.creado) || (ev.creado || hoy).slice(0, 10));
      urls.push(`<url><loc>${SITIO.url}${urlEvento(ev)}</loc><lastmod>${lm}</lastmod><priority>${ev.estado === 'proximo' ? '0.9' : '0.4'}</priority></url>`);
    }
  } catch (e) {}
  try {
    const { results } = await env.DB.prepare(`SELECT slug, creado FROM posts WHERE estado = 'publicado' ORDER BY id DESC LIMIT 200`).all();
    for (const p of results || []) if (p.slug) urls.push(`<url><loc>${SITIO.url}/blog/${encodeURIComponent(p.slug)}</loc><lastmod>${(p.creado || hoy).slice(0, 10)}</lastmod><priority>0.5</priority></url>`);
  } catch (e) {}
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
