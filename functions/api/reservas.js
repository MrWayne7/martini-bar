// /api/reservas — crear (POST, público) y listar (GET, admin)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

function checkPin(request, env) {
  const pin = request.headers.get('x-admin-pin') || '';
  if (!env.ADMIN_PIN) return { ok: false, msg: 'Falta configurar el PIN. Corre: npx wrangler pages secret put ADMIN_PIN' };
  if (pin !== env.ADMIN_PIN) return { ok: false, msg: 'PIN incorrecto.' };
  return { ok: true };
}

// POST público: cualquiera puede crear una reserva desde la web
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); }
  catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const nombre   = (b.nombre   || '').toString().trim().slice(0, 80);
  const telefono = (b.telefono || '').toString().trim().slice(0, 30);
  const zona     = (b.zona     || 'General').toString().trim().slice(0, 20);
  const personas = Math.max(1, Math.min(99, parseInt(b.personas) || 1));
  const fecha    = (b.fecha    || '').toString().slice(0, 10);
  const hora     = (b.hora     || '').toString().slice(0, 5);
  const notas    = (b.notas    || '').toString().trim().slice(0, 200);

  if (!nombre || telefono.replace(/\D/g, '').length < 7)
    return json({ ok: false, error: 'Nombre y teléfono son obligatorios' }, 422);

  // Si aún no configuraste la base de datos, no rompemos: WhatsApp igual funciona.
  if (!env.DB) return json({ ok: true, saved: false, note: 'DB no configurada — no se guardó, pero WhatsApp sigue funcionando.' });

  try {
    const r = await env.DB
      .prepare(`INSERT INTO reservas (nombre,telefono,zona,personas,fecha,hora,notas) VALUES (?,?,?,?,?,?,?)`)
      .bind(nombre, telefono, zona, personas, fecha, hora, notas)
      .run();
    return json({ ok: true, saved: true, id: r.meta.last_row_id });
  } catch (e) {
    return json({ ok: false, error: 'No se pudo guardar', detail: String(e) }, 500);
  }
}

// GET admin: lista reservas. Filtros opcionales: ?estado= &fecha= &q=
export async function onRequestGet({ request, env }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);

  const url = new URL(request.url);
  const estado = url.searchParams.get('estado');
  const fecha  = url.searchParams.get('fecha');
  const q      = url.searchParams.get('q');

  let sql = 'SELECT * FROM reservas WHERE 1=1';
  const args = [];
  if (estado && estado !== 'todas') { sql += ' AND estado = ?'; args.push(estado); }
  if (fecha)                        { sql += ' AND fecha = ?';  args.push(fecha); }
  if (q)                            { sql += ' AND (nombre LIKE ? OR telefono LIKE ?)'; args.push('%' + q + '%', '%' + q + '%'); }
  sql += ' ORDER BY id DESC LIMIT 1000';

  try {
    const { results } = await env.DB.prepare(sql).bind(...args).all();
    return json({ ok: true, reservas: results });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
