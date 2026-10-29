// /api/eventos — listar (GET, público) y crear (POST, admin, con flyer a R2)

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

const TIPOS_OK = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// GET público: devuelve los eventos para el home.
// Próximos primero (por orden, luego por fecha de creación), después los pasados.
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: true, eventos: [] });
  try {
    const { results } = await env.DB
      .prepare(
        `SELECT id, titulo, fecha, descripcion, flyer_key, estado, link, orden
         FROM eventos
         ORDER BY
           CASE estado WHEN 'proximo' THEN 0 ELSE 1 END,
           orden DESC,
           id DESC`
      )
      .all();
    return json({ ok: true, eventos: results || [] });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

// POST admin: crea un evento. Recibe multipart/form-data con el flyer.
export async function onRequestPost({ request, env }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);
  if (!env.FLYERS) return json({ ok: false, error: 'Almacenamiento de flyers no configurado' }, 503);

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'Formato inválido (se esperaba un formulario)' }, 400); }

  const titulo      = (form.get('titulo')      || '').toString().trim().slice(0, 80);
  const fecha       = (form.get('fecha')       || '').toString().trim().slice(0, 40);
  const descripcion = (form.get('descripcion') || '').toString().trim().slice(0, 300);
  const estado      = (form.get('estado')      || 'proximo').toString().trim();
  const link        = (form.get('link')        || '').toString().trim().slice(0, 200);
  const file        = form.get('flyer');

  if (!titulo) return json({ ok: false, error: 'El título es obligatorio' }, 422);
  if (estado !== 'proximo' && estado !== 'pasado')
    return json({ ok: false, error: 'Estado inválido' }, 422);
  if (!file || typeof file.arrayBuffer !== 'function')
    return json({ ok: false, error: 'Falta el flyer' }, 422);

  const ext = TIPOS_OK[file.type];
  if (!ext) return json({ ok: false, error: 'El flyer debe ser JPG, PNG, WEBP o GIF' }, 422);

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 8 * 1024 * 1024)
    return json({ ok: false, error: 'El flyer no puede pesar más de 8 MB' }, 413);

  const key = `flyer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    await env.FLYERS.put(key, bytes, { httpMetadata: { contentType: file.type } });
  } catch (e) {
    return json({ ok: false, error: 'No se pudo subir el flyer', detail: String(e) }, 500);
  }

  try {
    const r = await env.DB
      .prepare(
        `INSERT INTO eventos (titulo, fecha, descripcion, flyer_key, estado, link, orden)
         VALUES (?,?,?,?,?,?, (SELECT COALESCE(MAX(orden),0)+1 FROM eventos))`
      )
      .bind(titulo, fecha, descripcion, key, estado, link)
      .run();
    return json({ ok: true, id: r.meta.last_row_id, flyer_key: key });
  } catch (e) {
    // si falla la DB, limpiamos el flyer para no dejar basura
    try { await env.FLYERS.delete(key); } catch {}
    return json({ ok: false, error: 'No se pudo guardar el evento', detail: String(e) }, 500);
  }
}
