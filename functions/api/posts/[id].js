// /api/posts/:id — editar (PATCH) o borrar (DELETE), solo admin
import { sanitizeHtml, stripTags } from '../../_sanitize.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

function checkPin(request, env) {
  const pin = request.headers.get('x-admin-pin') || '';
  if (!env.ADMIN_PIN) return { ok: false, msg: 'Falta configurar el PIN.' };
  if (pin !== env.ADMIN_PIN) return { ok: false, msg: 'PIN incorrecto.' };
  return { ok: true };
}

export async function onRequestPatch({ request, env, params }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);

  const id = parseInt(params.id);
  let b;
  try { b = await request.json(); }
  catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const sets = [];
  const args = [];
  if (b.titulo !== undefined)  { sets.push('titulo = ?');  args.push(b.titulo.toString().slice(0, 120)); }
  if (b.estado !== undefined) {
    if (b.estado !== 'publicado' && b.estado !== 'borrador')
      return json({ ok: false, error: 'Estado inválido' }, 422);
    sets.push('estado = ?'); args.push(b.estado);
  }
  if (b.cuerpo !== undefined) {
    const c = sanitizeHtml(b.cuerpo);
    sets.push('cuerpo = ?'); args.push(c);
    if (b.resumen === undefined) { sets.push('resumen = ?'); args.push(stripTags(c).slice(0, 200)); }
  }
  if (b.resumen !== undefined) { sets.push('resumen = ?'); args.push(b.resumen.toString().slice(0, 200)); }

  if (!sets.length) return json({ ok: false, error: 'Nada que actualizar' }, 400);
  sets.push(`actualizado = datetime('now')`);
  args.push(id);

  try {
    await env.DB.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`).bind(...args).run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);

  const id = parseInt(params.id);
  try {
    const row = await env.DB.prepare('SELECT portada_key FROM posts WHERE id = ?').bind(id).first();
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    if (row && row.portada_key && env.FLYERS) { try { await env.FLYERS.delete(row.portada_key); } catch {} }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
