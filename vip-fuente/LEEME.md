# Fuente de /vip — Martini Bar

Código fuente de la página `/vip` (motor de viaje 3D adaptado a Martini).
Esta carpeta NO se publica (está en `.assetsignore`). Lo que se publica es `../vip/`.

## Cambiar algo y volver a compilar

1. Edita `template.html` (textos, precios de mesas), `styles.css` (colores) o `src/*.js` (3D).
2. Las fotos salen de `../assets/fotos/` y `../assets/hero-poster.jpg`.
3. Compila y copia el resultado a `../vip/`:

```
cd vip-fuente
FOTOS=../assets/fotos python3 build.py
```

(`build.py` busca `logo-blanco.png` y `hero-poster.jpg` en la carpeta de FOTOS: cópialos ahí si hace falta.)

## Dónde está cada cosa

- Precios y textos de las mesas: `template.html`, sección `#mesas` y los botones `.chip` del formulario.
- Capítulos del viaje: `CH` en `src/tail.js`.
- Ritmo del scroll (dónde frena): `RM` en `src/head.js`.
- Ruta de cámara: `KEYS` en `src/sky.js`.
- WhatsApp de reservas: `CONFIG` en `src/head.js`.
