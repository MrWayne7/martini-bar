// /api/video/:key — sirve un video desde R2 con soporte de rangos (streaming / seek).

export async function onRequestGet({ env, request, params }) {
  if (!env.FLYERS) return new Response('Almacenamiento no configurado', { status: 503 });
  const key = params.key;
  if (!key) return new Response('No encontrado', { status: 404 });

  // Pasamos las cabeceras de la petición: R2 lee el header Range si viene.
  const obj = await env.FLYERS.get(key, { range: request.headers });
  if (!obj) return new Response('No encontrado', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=86400');

  // Si hubo un Range válido, R2 devuelve obj.range y respondemos 206 parcial.
  if (obj.range) {
    const offset = obj.range.offset || 0;
    const length = (obj.range.length != null) ? obj.range.length : (obj.size - offset);
    const end = offset + length - 1;
    headers.set('content-range', `bytes ${offset}-${end}/${obj.size}`);
    headers.set('content-length', String(length));
    return new Response(obj.body, { status: 206, headers });
  }

  headers.set('content-length', String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}
