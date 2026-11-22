#!/bin/zsh
cd "$(dirname "$0")"
exec > >(tee publicar.log) 2>&1
echo "== 1/3 Publicar en Cloudflare"
npx --yes wrangler@latest pages deploy . --project-name=martini-bar --commit-dirty=true || echo "FALLO deploy"
echo "== 2/3 Git"
git add -A
git commit -q -m "Publicacion" || true
echo "== 3/3 GitHub"
git push origin main || echo "FALLO push"
echo "== LISTO"
