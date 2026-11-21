#!/bin/bash
set -e
WR="npx wrangler@latest"
$WR r2 object put "martini-flyers/sabado21.webp" --file="assets/flyer-sabado21.webp" --content-type="image/webp" --remote
cat > /tmp/evento-sabado21.sql << 'SQL'
UPDATE eventos SET estado = 'pasado' WHERE estado = 'proximo';
UPDATE eventos SET link = '/redroom2' WHERE titulo LIKE '%2.0%';
UPDATE eventos SET link = '/theredroom' WHERE titulo LIKE '%Red Room%' AND titulo NOT LIKE '%2.0%';
INSERT INTO eventos (titulo, fecha, descripcion, flyer_key, estado, link, orden)
VALUES ('Sábado de siempre', 'Sáb 21 Nov', 'Menos gente, mejor mesa. La misma noche.', 'sabado21.webp', 'proximo', '/vip/', 200);
SQL
$WR d1 execute martini-bar-db --remote --yes --file=/tmp/evento-sabado21.sql
$WR d1 execute martini-bar-db --remote --command="SELECT id, titulo, fecha, estado, link FROM eventos ORDER BY estado DESC, orden DESC"
