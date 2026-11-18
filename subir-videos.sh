#!/bin/bash
set -e
cd "$(dirname "$0")"
for n in 1 2 3 4; do
  echo "Subiendo noche-$n.mp4 a R2..."
  npx wrangler@latest r2 object put "martini-flyers/noche-sube-$n.mp4" --file="videos-noche/noche-$n.mp4" --content-type="video/mp4" --remote
done
echo "Registrando videos en la base..."
npx wrangler@latest d1 execute martini-bar-db --remote --file=seed-videos-noche.sql
echo ""
echo "Comprobando /api/videos:"
curl -s https://martinibar.live/api/videos | head -c 500
echo ""
echo "Listo. Abre https://martinibar.live/verlanoche"
