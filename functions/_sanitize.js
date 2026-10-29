// Sanitizador simple de HTML para el cuerpo de los posts del blog.
// Permite solo un conjunto seguro de etiquetas y atributos. No ejecuta scripts.
// No es un DOM completo, pero para contenido generado desde nuestro propio editor
// (negritas, títulos, listas, imágenes de nuestro R2, enlaces) es suficiente y seguro.

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h2', 'h3', 'blockquote', 'ul', 'ol', 'li',
  'a', 'img', 'figure', 'figcaption', 'hr'
]);

const ALLOWED_ATTR = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt'],
};

function escapeAttr(v) {
  return String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Solo permitimos URLs internas (/api/img/...) o https:// para imágenes y enlaces.
function safeUrl(url, { imgOnly = false } = {}) {
  url = String(url).trim();
  if (url.startsWith('/')) return url;                 // rutas internas
  if (/^https:\/\//i.test(url)) return url;            // https externo
  if (!imgOnly && url.startsWith('#')) return url;     // anclas en enlaces
  return '';                                           // cualquier otra cosa se descarta (javascript:, data:, etc.)
}

export function sanitizeHtml(input) {
  if (!input) return '';
  let html = String(input);

  // elimina bloques peligrosos completos
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|svg)[\s\S]*?<\/\s*\1\s*>/gi, '');
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|svg)[^>]*>/gi, '');

  // recorre cada etiqueta
  html = html.replace(/<(\/?)([a-zA-Z0-9]+)((?:\s+[^<>]*?)?)\s*(\/?)>/g, (m, close, tagRaw, attrsRaw, selfClose) => {
    const tag = tagRaw.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (close) return `</${tag}>`;

    const allowed = ALLOWED_ATTR[tag] || [];
    let out = '';
    const attrRe = /([a-zA-Z-]+)\s*=\s*"([^"]*)"|([a-zA-Z-]+)\s*=\s*'([^']*)'/g;
    let a;
    while ((a = attrRe.exec(attrsRaw)) !== null) {
      const name = (a[1] || a[3] || '').toLowerCase();
      let val = a[2] !== undefined ? a[2] : a[4];
      if (!allowed.includes(name)) continue;
      if (name === 'href') { val = safeUrl(val); if (!val) continue; }
      if (name === 'src')  { val = safeUrl(val, { imgOnly: true }); if (!val) continue; }
      if (name === 'target') val = '_blank';
      out += ` ${name}="${escapeAttr(val)}"`;
    }
    // los enlaces externos siempre con rel seguro
    if (tag === 'a' && /target=/.test(out)) out += ' rel="noopener noreferrer"';
    const sc = (tag === 'img' || tag === 'br' || tag === 'hr') ? ' /' : '';
    return `<${tag}${out}${sc}>`;
  });

  return html.trim();
}

// Texto plano para el resumen (quita todas las etiquetas)
export function stripTags(input, max = 160) {
  const t = String(input || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// slug a partir del título
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'post';
}
