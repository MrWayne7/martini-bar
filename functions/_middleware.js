// Todo lo que entre por la dirección vieja (martini-bar.pages.dev) pasa al dominio oficial,
// así Google junta todas las visitas y enlaces en martinibar.live.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'martini-bar.pages.dev' && (request.method === 'GET' || request.method === 'HEAD') && !url.pathname.startsWith('/api/')) {
    return Response.redirect('https://martinibar.live' + url.pathname + url.search, 301);
  }
  return next();
}
