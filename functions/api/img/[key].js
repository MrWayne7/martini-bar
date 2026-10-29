// /api/img/:key — sirve cualquier imagen desde R2 (público). Portadas y fotos del blog.

export async function onRequestGet({ env, params }) {
  if (!env.FLYERS) return new Response('Almacenamiento no configurado', { status: 503 });
  const key = params.key;
  if (!key) return new Response('No encontrado', { status: 404 });

  const obj = await env.FLYERS.get(key);
  if (!obj) return new Response('No encontrado', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
}
