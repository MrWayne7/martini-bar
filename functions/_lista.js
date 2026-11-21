// Utilidades compartidas de la lista de invitados

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export function checkPin(request, env) {
  const pin = request.headers.get('x-admin-pin') || '';
  if (!env.ADMIN_PIN) return { ok: false, msg: 'Falta configurar el PIN.' };
  if (pin !== env.ADMIN_PIN) return { ok: false, msg: 'PIN incorrecto.' };
  return { ok: true };
}

// La noche del sábado en hora de Venezuela (UTC-4). Hasta las 8am del domingo
// todavía cuenta como "la noche del sábado".
export function sabadoActual(now = new Date()) {
  const v = new Date(now.getTime() - 4 * 3600 * 1000);   // reloj de Venezuela
  const d = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const dow = d.getUTCDay();                               // 0 dom … 6 sáb
  let add = (6 - dow + 7) % 7;
  if (dow === 0 && v.getUTCHours() < 8) add = -1;          // domingo de madrugada
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function nuevoCodigo(n = 7) {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  let s = ''; for (const x of b) s += ALFA[x % ALFA.length];
  return s;
}

export function limpiarTel(t) {
  let d = (t || '').toString().replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '58' + d.slice(1);
  else if (d.length === 10 && d.startsWith('4')) d = '58' + d;
  return d.slice(0, 15);
}
