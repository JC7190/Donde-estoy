# Dónde estoy

App web (PWA) de emergencias para iPhone: coordenadas, dirección, brújula y mapa sin conexión.
Se publica con GitHub Pages desde `main`. Archivos principales: `index.html` (toda la app) y `sw.js` (copia sin conexión).

## Cómo trabajar

- **Responder siempre en español**, también los mensajes de commit y las peticiones de cambios (pull requests).
- **Revisar exhaustivamente.** No basta con leer el código y ver que el cálculo es correcto: hay que pensar y probar
  qué pasa en los casos límite y cómo se ve en pantalla. Por ejemplo:
  - Ángulos que pasan por el norte (359° → 0°), sobre todo si hay animaciones o transiciones CSS.
  - Cambiar de pestaña a mitad de algo (descarga, brújula, mapa) y volver.
  - Sin internet, sin GPS, GPS quieto (el iPhone casi no da lecturas nuevas), lecturas antiguas.
  - Salir de la app y volver, cerrar y abrir, primera vez y siguientes.
  - Permisos denegados (ubicación, brújula) y funciones no disponibles (compartir, portapapeles).
- Probar cada cambio en el navegador (Playwright) simulando esos casos antes de darlo por bueno.
  Decir con claridad lo que no se puede probar aquí (GPS real, brújula real, iPhone).
- Es una app de emergencias: un dato antiguo o falso (posición, dirección) es peor que no mostrar nada.

## Versión

Cada vez que se publiquen cambios hay que subir **a la vez** `APP_VER` en `index.html` y `CACHE` en `sw.js`
(mismo número). La versión se ve abajo a la derecha de la app.
