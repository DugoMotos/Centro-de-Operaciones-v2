# Guía de desarrollo

Cómo trabajar con el código del aplicativo.

---

## Setup local

No se necesita instalación de nada. El proyecto es HTML/CSS/JS plano.

### Opción 1: Abrir directamente

Doble clic en `index.html` y se abre en el navegador. **Esto funciona** porque usamos scripts clásicos (no ES6 modules).

⚠️ **Limitación:** algunas APIs del navegador no funcionan abriendo el archivo local (file://). Si encuentras errores, usa la opción 2.

### Opción 2: Servidor local (recomendado)

Si tienes Python instalado:
```bash
cd Centro-de-Operaciones-v2
python -m http.server 8000
```
Abrir `http://localhost:8000` en el navegador.

Si tienes Node.js:
```bash
cd Centro-de-Operaciones-v2
npx serve
```

Si tienes VS Code: usar la extensión "Live Server" (botón "Go Live" en la barra de estado).

---

## Hacer cambios comunes

### Cambiar un color del tema

Los colores están en `css/base.css` como variables CSS:

```css
:root {
  --bg: #0A0A0A;       /* Fondo principal */
  --rd: #E24B4A;       /* Rojo de marca */
  --gn: #1D9E75;       /* Verde (Hero, completado) */
  /* ... */
}
```

Cambias la variable y se actualiza en TODA la app.

### Agregar una actividad nueva al procedimiento

1. Editar `js/data.js`.
2. Buscar el día correspondiente en el array `DAYS`.
3. Agregar el nuevo step:

```javascript
{
  c: 'tra',                    // Área (inv, con, log, tra, ven)
  t: 'Nueva actividad',        // Título
  d: 'Descripción larga...',   // Descripción
  act: 'Acción concreta...',   // Qué hacer
  pre: 'Prerrequisito...',     // Qué debe estar listo antes
  tp: 'reg',                   // Tipo (exec, reg, val, com)
  doc: 'Archivo Excel'         // (opcional) Documento donde se registra
}
```

4. Si la actividad se debe registrar en SharePoint, agregar también en `ACTIVIDADES_TRAM` (mismo archivo) con un `num` único.
5. Si está en el mapeo `TRAM_ACT_NUM_MAP`, agregar la entrada.

### Cambiar una URL de Power Automate

**Para uno mismo (temporal):** ir a Configuración → ingresar PIN → editar el campo de la URL → Guardar. Esto sobrescribe la URL solo para ese usuario.

**Para todos (permanente):** editar `js/config.js` y cambiar el valor en `DEFAULT_URLS`. Hacer commit y push.

### Agregar un nuevo módulo / pestaña

Ver `arquitectura.md` sección "Cómo agregar una nueva pestaña".

### Cambiar un texto del UI

Buscar el texto en los archivos `js/modules/*.js` con grep o el buscador del editor. La mayoría de strings están hardcoded en los `renderXxx()`.

```bash
grep -rn "Texto a buscar" js/
```

---

## Debugging

### Ver el estado actual del app

Abrir consola del navegador (F12 → Console). Las variables globales están disponibles:

```javascript
// Ver qué moto está activa
pActive

// Ver datos de Negocios
negMotos

// Ver registros de Servicio Técnico
aRecs

// Ver URLs efectivas
getUrl('tramC')
```

### Forzar re-render

```javascript
render()
```

### Limpiar localStorage para testing

```javascript
localStorage.clear()
location.reload()
```

### Ver requests a Power Automate

F12 → tab "Network" → filtrar por "powerautomate" → ver requests y respuestas.

---

## Convenciones de código

### Variables

- Los nombres tienen un prefijo de módulo:
  - `neg*`: Negocios
  - `p*`: Procedimiento (Trámites)
  - `a*`: Servicio Técnico (alistamiento)
  - `plan*`: Plan
  - `cfg*`: Configuración

### Funciones

- `renderXxx()`: genera HTML del módulo Xxx.
- `xxxView()`: vista parcial dentro de un módulo (ej: `aRegView`, `aHistView`).
- `apiXxxYyy()`: llamada a Power Automate (ej: `apiTramConsultarMoto`).

### CSS

- Clases con prefijo según contexto:
  - `.neg-*`: Negocios
  - `.step-*`: Steps del procedimiento
  - `.act-*`: Actividades
  - `.alist-*`: Alistamientos

---

## Cómo probar antes de subir

1. **Validar sintaxis JS:**
   ```bash
   for f in js/*.js js/modules/*.js; do node -c "$f"; done
   ```

2. **Probar en local:**
   - Iniciar servidor local.
   - Probar cada pestaña.
   - Probar en móvil con DevTools (F12 → ícono de móvil).

3. **Probar las funciones críticas:**
   - Buscar una moto en Trámites.
   - Marcar un check.
   - Confirmar que aparece en SharePoint.

4. **Si todo OK:** commit y push.

---

## Errores comunes

### "Uncaught ReferenceError: getUrl is not defined"

Falta cargar `js/config.js` antes del archivo donde lo usas. Verificar el orden de los `<script>` en `index.html`.

### "Cannot read property 'codigoBarras' of undefined"

Algún módulo está intentando leer datos que aún no se cargaron. Probablemente falta validar `if (!negMotos) return;`.

### El localStorage del usuario está corrupto

Configuración → "Reiniciar TODO" (botón rojo al final). O en consola:
```javascript
localStorage.clear(); location.reload();
```

### El flujo de Power Automate no responde

Probar el flujo directamente desde portal Microsoft. Si funciona ahí pero no aquí, verificar:
- La URL en `js/config.js` es correcta.
- El navegador no está bloqueando el request (CORS, ad-blocker).
- El cuerpo del request coincide con lo que espera el flujo.

---

## Roadmap futuro

Cosas que podrían venir en próximas versiones:

### v2.1
- Comentarios por moto (icono de chat en Negocios).
- Filtro por asesor en Negocios.
- Exportar Negocios a CSV.

### v2.2
- Notificaciones push cuando llega una nueva moto.
- Vista calendario de motos por fecha de venta.

### v3.0 (cambio mayor)
- Migrar a Vite + ES6 modules.
- Posible migración a Svelte o Vue.
- Build optimizado para producción.

Estos son ideas, no compromisos.
