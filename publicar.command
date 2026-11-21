#!/bin/zsh
cd "$(dirname "$0")"
exec > >(tee publicar.log) 2>&1
export FILTER_BRANCH_SQUELCH_WARNING=1
echo "== 1/3 Guardar cambios"
git rm -q --cached --ignore-unmatch "FLYER SABADO 21.jpg"
git add -A
git commit -q -m "Ajustes de publicacion" || true
echo "== 2/3 Sacar videos pesados del historial de git (los archivos siguen en la carpeta)"
git filter-branch -f --index-filter 'git rm -r -q --cached --ignore-unmatch "ONLY NEW VIDEOS" "EXPORTED" "NEW PHOTOS AND VIDEOS" "CONTENIDO MARTINI" "SONG" "videos-noche" "FLYER SABADO 21.jpg"' -- origin/main..main || { echo "FALLO limpieza"; exit 1; }
echo "Archivos de mas de 50MB que quedan por subir:"
git rev-list --objects origin/main..main | git cat-file --batch-check='%(objectsize) %(rest)' | awk '$1>50000000'
echo "== 3/3 GitHub"
git push origin main || echo "FALLO push"
echo "== LISTO"
