#!/bin/zsh
cd "$(dirname "$0")"
exec > >(tee publicar.log) 2>&1
echo "== 1/5 Tabla de la lista"
npx wrangler@latest d1 execute martini-bar-db --remote --yes --file=schema-lista.sql || echo "FALLO tabla lista"
echo "== 2/5 Evento sabado 21 y Red Room pasados"
bash evento-sabado21.sh || echo "FALLO evento"
echo "== 3/5 Git"
git add -A
git commit -m "Lista de invitados con QR, evento sabado 21, SEO y links de eventos corregidos" || true
echo "== 4/5 GitHub"
git push origin HEAD || echo "FALLO push"
echo "== 5/5 Publicar en Cloudflare"
npx wrangler@latest pages deploy . --project-name=martini-bar --commit-dirty=true || echo "FALLO deploy"
echo "== LISTO"
