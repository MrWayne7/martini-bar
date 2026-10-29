// /api/upload — sube una imagen a R2 y devuelve su URL pública (admin).
// Se usa para insertar fotos dentro del cuerpo de un post.

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

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export async function onRequestPost({ request, env }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.FLYERS) return json({ ok: false, error: 'Almacenamiento no configurado' }, 503);

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'Formato inválido' }, 400); }

  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function')
    return json({ ok: false, error: 'Falta la imagen' }, 422);

  const ext = EXT[file.type];
  if (!ext) return json({ ok: false, error: 'Debe ser JPG, PNG, WEBP o GIF' }, 422);

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 8 * 1024 * 1024)
    return json({ ok: false, error: 'La imagen no puede pesar más de 8 MB' }, 413);

  const key = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    await env.FLYERS.put(key, bytes, { httpMetadata: { contentType: file.type } });
  } catch (e) {
    return json({ ok: false, error: 'No se pudo subir', detail: String(e) }, 500);
  }

  return json({ ok: true, key, url: '/api/img/' + key });
}
