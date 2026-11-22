// Datos del negocio y utilidades para las páginas que se generan desde la base de datos

export const SITIO = {
  url: 'https://martinibar.live',
  nombre: 'Martini Bar',
  ciudad: 'El Vigía',
  estado: 'Mérida',
  pais: 'VE',
  tel: '+58 424-7819621',
  wa: '584247819621',
  ig: 'https://www.instagram.com/martinibar.live/',
  mapa: 'https://maps.app.goo.gl/ZvqTJggMUy6rADjA9',
};

export const esc = s => (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function slug(s) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };

// "Sáb 21 Nov", "21 nov", "7 de noviembre", "21/11" → "2026-11-21" (el año se deduce de cuándo se creó el evento)
export function fechaISO(fecha, creado) {
  const t = (fecha || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let d, m;
  let r = t.match(/(\d{1,2})\s*(?:de\s+)?([a-z]{3})/);
  if (r && MESES[r[2]]) { d = +r[1]; m = MESES[r[2]]; }
  else if ((r = t.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/))) { d = +r[1]; m = +r[2]; }
  if (!d || !m || d > 31 || m > 12) return null;
  const base = creado ? new Date(creado.replace(' ', 'T') + 'Z') : new Date();
  let y = base.getUTCFullYear();
  if (m < base.getUTCMonth() + 1 - 6) y += 1;   // creado en diciembre para enero, etc.
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function fechaLarga(iso) {
  if (!iso) return '';
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d = new Date(iso + 'T12:00:00Z');
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()} de ${meses[d.getUTCMonth()]}`;
}

// Hoy en Venezuela (UTC-4)
export function hoyVE() { return new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10); }

export function urlEvento(ev) { return `/evento/${ev.id}-${slug(ev.titulo)}`; }
