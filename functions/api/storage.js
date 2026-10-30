// /api/storage — estadística de almacenamiento (admin). Suma lo guardado en R2.
import { CAP_TOTAL_BYTES } from '../_video.js';

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

export async function onRequestGet({ request, env }) {
  const auth = checkPin(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.msg }, 401);
  if (!env.FLYERS) return json({ ok: false, error: 'Almacenamiento no configurado' }, 503);

  try {
    let total = 0, objetos = 0, videos = 0, videoBytes = 0, cursor;
    do {
      const list = await env.FLYERS.list({ cursor, limit: 1000 });
      for (const o of list.objects) {
        total += o.size || 0; objetos++;
        if ((o.key || '').startsWith('video-')) { videos++; videoBytes += o.size || 0; }
      }
      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);

    return json({
      ok: true,
      usado: total,
      limite: CAP_TOTAL_BYTES,
      objetos,
      videos,
      videoBytes,
      porcentaje: Math.min(100, Math.round((total / CAP_TOTAL_BYTES) * 100)),
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
