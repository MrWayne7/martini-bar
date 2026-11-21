// /api/lista/:codigo — ver el pase (GET, público) · marcar entrada o deshacer (PATCH, admin) · borrar (DELETE, admin)
import { json, checkPin } from '../../_lista.js';

const COD = c => (c || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

export async function onRequestGet({ env, params }) {
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);
  const r = await env.DB.prepare('SELECT codigo, nombre, personas, fecha, estado FROM lista WHERE codigo = ?').bind(COD(params.codigo)).first();
  if (!r) return json({ ok: false, error: 'Pase no encontrado' }, 404);
  r.nombre = r.nombre.split(' ')[0];   // en público solo el primer nombre
  return json({ ok: true, pase: r });
}

export async function onRequestPatch({ request, env, params }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  let b = {}; try { b = await request.json(); } catch {}
  const codigo = COD(params.codigo);
  const r = await env.DB.prepare('SELECT id, codigo, nombre, telefono, personas, fecha, estado, entro_en FROM lista WHERE codigo = ?').bind(codigo).first();
  if (!r) return json({ ok: false, error: 'Ese QR no está en la lista.' }, 404);
  if (b.estado === 'inscrito') {
    await env.DB.prepare(`UPDATE lista SET estado = 'inscrito', entro_en = NULL WHERE codigo = ?`).bind(codigo).run();
    return json({ ok: true, pase: { ...r, estado: 'inscrito', entro_en: null } });
  }
  if (r.estado === 'entro') return json({ ok: true, yaEntro: true, pase: r });
  await env.DB.prepare(`UPDATE lista SET estado = 'entro', entro_en = datetime('now') WHERE codigo = ?`).bind(codigo).run();
  return json({ ok: true, pase: { ...r, estado: 'entro' } });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  await env.DB.prepare('DELETE FROM lista WHERE codigo = ?').bind(COD(params.codigo)).run();
  return json({ ok: true });
}
