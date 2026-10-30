// /api/videos/:id — editar (PATCH) o borrar (DELETE), solo admin

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

  const sets = [], args = [];
  if (b.titulo !== undefined) { sets.push('titulo = ?'); args.push(b.titulo.toString().slice(0, 100)); }
  if (b.estado !== undefined) {
    if (b.estado !== 'publicado' && b.estado !== 'oculto')
      return json({ ok: false, error: 'Estado inválido' }, 422);
    sets.push('estado = ?'); args.push(b.estado);
  }
  if (b.orden !== undefined) { sets.push('orden = ?'); args.push(parseInt(b.orden) || 0); }

  if (!sets.length) return json({ ok: false, error: 'Nada que actualizar' }, 400);
  args.push(id);
  try {
    await env.DB.prepare(`UPDATE videos SET ${sets.join(', ')} WHERE id = ?`).bind(...args).run();
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
    const row = await env.DB.prepare('SELECT video_key FROM videos WHERE id = ?').bind(id).first();
    await env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
    if (row && row.video_key && env.FLYERS) { try { await env.FLYERS.delete(row.video_key); } catch {} }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
