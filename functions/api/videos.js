// /api/videos — listar (GET, público) y crear (POST, admin)
import { MAX_VIDEO_BYTES, CAP_TOTAL_BYTES, buildEmbed } from '../_video.js';

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

// Suma el tamaño de todo lo que hay en el bucket (para el control de espacio).
async function usedBytes(env) {
  let total = 0, cursor;
  do {
    const list = await env.FLYERS.list({ cursor, limit: 1000 });
    for (const o of list.objects) total += o.size || 0;
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  return total;
}

// GET público: lista de videos publicados. ?admin=1 (con PIN) incluye ocultos.
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: true, videos: [] });
  const url = new URL(request.url);
  const isAdmin = url.searchParams.get('admin') === '1' && checkPin(request, env).ok;
  const where = isAdmin ? '' : `WHERE estado = 'publicado'`;
  try {
    const { results } = await env.DB
      .prepare(`SELECT id, tipo, titulo, video_key, url, tamano, estado, orden, creado
                FROM videos ${where} ORDER BY orden DESC, id DESC LIMIT 300`)
      .all();
    return json({ ok: true, videos: results || [] });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

// POST admin: crea un video. multipart/form-data.
//  - tipo=r2        -> campo 'video' (archivo)
//  - tipo=youtube   -> campo 'url' (link)
//  - tipo=instagram -> campo 'url' (link)
export async function onRequestPost({ request, env }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'Formato inválido' }, 400); }

  const tipo = (form.get('tipo') || '').toString();
  const titulo = (form.get('titulo') || '').toString().trim().slice(0, 100);

  // ---- enlaces (youtube / instagram) ----
  if (tipo === 'youtube' || tipo === 'instagram') {
    const link = (form.get('url') || '').toString().trim();
    if (!link) return json({ ok: false, error: 'Pega el link del video' }, 422);
    const emb = buildEmbed(tipo, link);
    if (emb.error) return json({ ok: false, error: emb.error }, 422);
    try {
      const r = await env.DB
        .prepare(`INSERT INTO videos (tipo, titulo, url, orden)
                  VALUES (?,?,?, (SELECT COALESCE(MAX(orden),0)+1 FROM videos))`)
        .bind(tipo, titulo, emb.url).run();
      return json({ ok: true, id: r.meta.last_row_id });
    } catch (e) {
      return json({ ok: false, error: 'No se pudo guardar', detail: String(e) }, 500);
    }
  }

  // ---- archivo a R2 ----
  if (tipo === 'r2') {
    if (!env.FLYERS) return json({ ok: false, error: 'Almacenamiento no configurado' }, 503);
    const file = form.get('video');
    if (!file || typeof file.arrayBuffer !== 'function')
      return json({ ok: false, error: 'Falta el archivo de video' }, 422);

    const okTypes = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
    const ext = okTypes[file.type];
    if (!ext) return json({ ok: false, error: 'El video debe ser MP4, MOV o WEBM' }, 422);

    const size = file.size || 0;
    if (size > MAX_VIDEO_BYTES)
      return json({ ok: false, error: `Ese video pesa demasiado. El máximo por video es ${Math.round(MAX_VIDEO_BYTES/1024/1024)} MB.` }, 413);

    // control de espacio total
    const usado = await usedBytes(env);
    if (usado + size > CAP_TOTAL_BYTES) {
      const libreMB = Math.max(0, Math.round((CAP_TOTAL_BYTES - usado) / 1024 / 1024));
      return json({ ok: false, error: `No hay espacio suficiente. Te quedan ${libreMB} MB. Borra algún video viejo para liberar.` }, 507);
    }

    const key = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try {
      const bytes = await file.arrayBuffer();
      await env.FLYERS.put(key, bytes, { httpMetadata: { contentType: file.type } });
    } catch (e) {
      return json({ ok: false, error: 'No se pudo subir el video', detail: String(e) }, 500);
    }

    try {
      const r = await env.DB
        .prepare(`INSERT INTO videos (tipo, titulo, video_key, tamano, orden)
                  VALUES ('r2',?,?,?, (SELECT COALESCE(MAX(orden),0)+1 FROM videos))`)
        .bind(titulo, key, size).run();
      return json({ ok: true, id: r.meta.last_row_id });
    } catch (e) {
      try { await env.FLYERS.delete(key); } catch {}
      return json({ ok: false, error: 'No se pudo guardar', detail: String(e) }, 500);
    }
  }

  return json({ ok: false, error: 'Tipo no válido' }, 422);
}
