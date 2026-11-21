// /api/lista — inscribirse (POST, público) y ver la lista (GET, admin)
import { json, checkPin, sabadoActual, nuevoCodigo, limpiarTel } from '../_lista.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const nombre = (b.nombre || '').toString().replace(/\s+/g, ' ').trim().slice(0, 80);
  const telefono = limpiarTel(b.telefono);
  const personas = Math.max(1, Math.min(6, parseInt(b.personas) || 1));
  const origen = (b.origen || '').toString().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30) || null;
  if (nombre.length < 2) return json({ ok: false, error: 'Escribe tu nombre.' }, 422);
  if (telefono.length < 10) return json({ ok: false, error: 'Revisa tu número de WhatsApp.' }, 422);

  const fecha = sabadoActual();
  try {
    // si ya estaba en la lista de esa noche, le devolvemos su mismo QR
    const ya = await env.DB.prepare('SELECT codigo, nombre, personas, fecha, estado FROM lista WHERE telefono = ? AND fecha = ?')
      .bind(telefono, fecha).first();
    if (ya) {
      if (ya.estado !== 'entro' && personas !== ya.personas) {
        await env.DB.prepare('UPDATE lista SET personas = ?, nombre = ? WHERE codigo = ?').bind(personas, nombre, ya.codigo).run();
        ya.personas = personas; ya.nombre = nombre;
      }
      return json({ ok: true, repetido: true, pase: ya });
    }
    let codigo = nuevoCodigo();
    for (let i = 0; i < 3; i++) {
      try {
        await env.DB.prepare('INSERT INTO lista (codigo, nombre, telefono, personas, fecha, origen) VALUES (?,?,?,?,?,?)')
          .bind(codigo, nombre, telefono, personas, fecha, origen).run();
        return json({ ok: true, pase: { codigo, nombre, personas, fecha, estado: 'inscrito' } });
      } catch (e) {
        if (!/UNIQUE/i.test(String(e))) throw e;
        codigo = nuevoCodigo();
      }
    }
    return json({ ok: false, error: 'Intenta de nuevo.' }, 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

// GET admin: ?fecha=YYYY-MM-DD (por defecto el sábado actual) · ?todo=1 para exportar contactos
export async function onRequestGet({ request, env }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);
  const url = new URL(request.url);
  try {
    if (url.searchParams.get('todo') === '1') {
      const { results } = await env.DB.prepare(
        `SELECT telefono, MAX(nombre) AS nombre, COUNT(*) AS noches, SUM(estado = 'entro') AS vino,
                MIN(fecha) AS primera, MAX(fecha) AS ultima, MAX(origen) AS origen
         FROM lista GROUP BY telefono ORDER BY ultima DESC, noches DESC`).all();
      return json({ ok: true, contactos: results || [] });
    }
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('fecha') || '') ? url.searchParams.get('fecha') : sabadoActual();
    const { results } = await env.DB.prepare(
      `SELECT id, codigo, nombre, telefono, personas, fecha, origen, estado, entro_en, creado_en
       FROM lista WHERE fecha = ? ORDER BY (estado = 'entro'), nombre COLLATE NOCASE`).bind(fecha).all();
    const fechas = await env.DB.prepare(
      `SELECT fecha, COUNT(*) AS n, SUM(personas) AS p, SUM(CASE WHEN estado='entro' THEN personas ELSE 0 END) AS e
       FROM lista GROUP BY fecha ORDER BY fecha DESC LIMIT 12`).all();
    return json({ ok: true, fecha, sabado: sabadoActual(), lista: results || [], noches: fechas.results || [] });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
