// /api/posts — listar (GET, público) y crear (POST, admin)
import { sanitizeHtml, stripTags, slugify } from '../_sanitize.js';

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

// GET público: lista posts publicados (metadatos, sin el cuerpo completo).
// ?full=1 + ?slug= para traer un post completo. ?admin=1 (con PIN) trae también borradores.
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: true, posts: [] });
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  try {
    // Un post completo por slug
    if (slug) {
      const p = await env.DB
        .prepare(`SELECT id, slug, titulo, resumen, cuerpo, portada_key, estado, creado
                  FROM posts WHERE slug = ?`)
        .bind(slug).first();
      if (!p || (p.estado !== 'publicado' && !checkPin(request, env).ok))
        return json({ ok: false, error: 'No encontrado' }, 404);
      return json({ ok: true, post: p });
    }

    // Lista. Admin ve todo; público solo publicados.
    const isAdmin = url.searchParams.get('admin') === '1' && checkPin(request, env).ok;
    const where = isAdmin ? '' : `WHERE estado = 'publicado'`;
    const { results } = await env.DB
      .prepare(`SELECT id, slug, titulo, resumen, portada_key, estado, creado
                FROM posts ${where} ORDER BY creado DESC, id DESC LIMIT 200`)
      .all();
    return json({ ok: true, posts: results || [] });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

// POST admin: crea un post. multipart/form-data con portada opcional.
export async function onRequestPost({ request, env }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.DB) return json({ ok: false, error: 'DB no configurada' }, 503);

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'Formato inválido' }, 400); }

  const titulo = (form.get('titulo') || '').toString().trim().slice(0, 120);
  const cuerpoRaw = (form.get('cuerpo') || '').toString();
  const resumenRaw = (form.get('resumen') || '').toString().trim();
  const estado = (form.get('estado') || 'publicado').toString();
  const portada = form.get('portada');

  if (!titulo) return json({ ok: false, error: 'El título es obligatorio' }, 422);
  if (estado !== 'publicado' && estado !== 'borrador')
    return json({ ok: false, error: 'Estado inválido' }, 422);

  const cuerpo = sanitizeHtml(cuerpoRaw);
  if (!cuerpo) return json({ ok: false, error: 'El post no puede estar vacío' }, 422);
  const resumen = (resumenRaw ? resumenRaw : stripTags(cuerpo)).slice(0, 200);

  // slug único
  let base = slugify(titulo);
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const ex = await env.DB.prepare('SELECT 1 FROM posts WHERE slug = ?').bind(slug).first();
    if (!ex) break;
    slug = `${base}-${i}`;
  }

  // portada opcional
  let portada_key = null;
  if (portada && typeof portada.arrayBuffer === 'function' && portada.size > 0) {
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[portada.type];
    if (!ext) return json({ ok: false, error: 'La portada debe ser JPG, PNG, WEBP o GIF' }, 422);
    const bytes = await portada.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) return json({ ok: false, error: 'La portada no puede pesar más de 8 MB' }, 413);
    portada_key = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try { await env.FLYERS.put(portada_key, bytes, { httpMetadata: { contentType: portada.type } }); }
    catch (e) { return json({ ok: false, error: 'No se pudo subir la portada', detail: String(e) }, 500); }
  }

  try {
    const r = await env.DB
      .prepare(`INSERT INTO posts (slug, titulo, resumen, cuerpo, portada_key, estado)
                VALUES (?,?,?,?,?,?)`)
      .bind(slug, titulo, resumen, cuerpo, portada_key, estado)
      .run();
    return json({ ok: true, id: r.meta.last_row_id, slug });
  } catch (e) {
    if (portada_key) { try { await env.FLYERS.delete(portada_key); } catch {} }
    return json({ ok: false, error: 'No se pudo guardar el post', detail: String(e) }, 500);
  }
}
