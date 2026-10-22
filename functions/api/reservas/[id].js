// /api/reservas/:id — cambiar estado (PATCH) o borrar (DELETE), solo admin

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

const ESTADOS = ['pendiente', 'confirmada', 'cancelada', 'llego'];

export async function onRequestPatch({ request, env, params }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);

  const id = parseInt(params.id);
  let b;
  try { b = await request.json(); }
  catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const estado = (b.estado || '').toString();
  if (!ESTADOS.includes(estado)) return json({ ok: false, error: 'Estado inválido' }, 422);

  try {
    await env.DB.prepare('UPDATE reservas SET estado = ? WHERE id = ?').bind(estado, id).run();
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
    await env.DB.prepare('DELETE FROM reservas WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
