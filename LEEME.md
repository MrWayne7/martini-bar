# Martini Bar — web + reservas + admin

Sitio estático (`index.html`, `admin.html`) + API en **Cloudflare Pages Functions**
+ base de datos **D1**. Todo por terminal en tu Mac. Nada de dashboards.

Estructura:
```
martini-bar/
├── index.html                 # la web pública (reserva → guarda en DB + abre WhatsApp)
├── admin.html                 # panel de reservas (con PIN)  → /admin.html
├── functions/api/reservas.js  # crear (público) + listar (admin)
├── functions/api/reservas/[id].js  # confirmar/cancelar/llegó/borrar
├── schema.sql                 # tablas de la base de datos
├── wrangler.toml              # config de Cloudflare (binding D1)
└── .assetsignore              # deja config/docs fuera del sitio público
```

WhatsApp del bar ya está puesto: **+58 424 781 9621** (`584247819621`).
Faltan por rellenar cuando quieras: links de Instagram/TikTok y precios de los combos.

---

## 1) Ver la página YA (sin base de datos todavía)

La web y el botón de WhatsApp funcionan sin backend. Para publicarla de una:

```bash
cd martini-bar
bash scripts/deploy.sh martini-bar .     # tu script de siempre
# (si el subdominio está tomado, usa otro: bash scripts/deploy.sh martini-bar-rd .)
```

Queda en `https://martini-bar.pages.dev`. En este punto las reservas abren WhatsApp
pero **aún no se guardan** ni aparecen en el admin. Para eso, sigue al paso 2.

---

## 2) Prender la base de datos + el admin (una sola vez)

```bash
# a. Autenticar Cloudflare (una vez por Mac)
npx wrangler@latest login

# b. Crear la base de datos D1
npx wrangler@latest d1 create martini-bar-db
#    → imprime un "database_id". Cópialo.

# c. Pega ese id en wrangler.toml y DESCOMENTA el bloque [[d1_databases]]
#    (quítale los # a esas 4 líneas y pon el id real).

# d. Cargar las tablas en la base de datos de producción
npx wrangler@latest d1 execute martini-bar-db --remote --file=schema.sql

# e. Poner el PIN del admin (queda cifrado en Cloudflare, NO en el repo)
npx wrangler@latest pages secret put ADMIN_PIN --project-name=martini-bar
#    → te pide el valor: escribe el PIN que quieras (ej. 4 a 6 dígitos)

# f. Redesplegar para que la API vea la base de datos
bash scripts/deploy.sh martini-bar .
```

Listo:
- **Web:** `https://martini-bar.pages.dev`
- **Admin:** `https://martini-bar.pages.dev/admin.html` (entra con el PIN)

---

## 3) Actualizar la página después

Editas lo que sea y corres el mismo comando:
```bash
bash scripts/deploy.sh martini-bar .
```

## Notas
- El PIN del admin **nunca** queda en GitHub (es un secreto de Cloudflare). Cambiarlo:
  vuelve a correr el paso **e**.
- El `database_id` del `wrangler.toml` **no** es una contraseña; puede ir en el repo.
  Aun así, si prefieres repo privado: crea con `gh repo create ... --private`.
- Si el deploy falla diciendo que falta el binding `DB`, es que el bloque
  `[[d1_databases]]` sigue comentado o sin el id → revisa el paso **c**.
- Probar en local antes de subir (usa una copia local de la DB):
  `npx wrangler@latest pages dev . --d1 DB=martini-bar-db`
