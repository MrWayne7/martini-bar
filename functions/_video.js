// Configuración y helpers para videos.
// Cambia estos dos números si quieres otro límite (ver instrucciones en el chat).
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;        // 60 MB por archivo subido
export const CAP_TOTAL_BYTES  = 2 * 1024 * 1024 * 1024;  // 2 GB tope total para Martini

// Extrae el ID de un video de YouTube desde cualquier forma de link.
export function parseYouTube(input) {
  const s = String(input || '').trim();
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?[^ ]*v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  // ¿pegó solo el ID?
  if (/^[A-Za-z0-9_-]{8,15}$/.test(s)) return s;
  return null;
}

// Extrae el shortcode de un reel/post de Instagram.
export function parseInstagram(input) {
  const s = String(input || '').trim();
  const m = s.match(/instagram\.com\/(?:[^/]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  if (m) return { kind: m[1] === 'reels' ? 'reel' : m[1], code: m[2] };
  return null;
}

// Construye la URL de incrustar a partir del tipo y el link pegado.
// Devuelve { url } o { error }.
export function buildEmbed(tipo, link) {
  if (tipo === 'youtube') {
    const id = parseYouTube(link);
    if (!id) return { error: 'No reconocí ese link de YouTube. Pega la URL del video o del Short.' };
    return { url: `https://www.youtube.com/embed/${id}` };
  }
  if (tipo === 'instagram') {
    const ig = parseInstagram(link);
    if (!ig) return { error: 'No reconocí ese link de Instagram. Pega la URL del reel o la publicación.' };
    return { url: `https://www.instagram.com/${ig.kind}/${ig.code}/embed` };
  }
  return { error: 'Tipo no válido' };
}
