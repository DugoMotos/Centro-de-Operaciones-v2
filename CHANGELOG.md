# Changelog

Todas las versiones notables del Centro de Operaciones Dugomotos.

---

## [2.3.0] — 2026-08-19

### ✨ La columna "Últ. actualización" ahora muestra la hora

El formato anterior solo daba el día, así que no servía para saber cuánto
llevaba parada una moto **dentro** de la jornada.

```
  antes                    ahora
  18/08/2026   ayer        hoy 15:38          hace 20 min
  30/07/2026   hace 20d    hoy 10:58          hace 5h
                           ayer 15:58         hace 1d
                           10/08/2026 15:58   hace 9d
```

- "hoy" y "ayer" reemplazan la fecha cuando corresponde; **la hora se
  muestra siempre** que el dato la tenga.
- El texto relativo ahora baja a horas y minutos dentro del día
  (`recién`, `hace 25 min`, `hace 5h`).
- "hoy"/"ayer" se calculan por **día de calendario en Bogotá**, no por
  bloques de 24 horas: a las 00:30, algo de las 23:50 de anoche pasó hace
  40 minutos pero dice "ayer", que es lo que espera cualquiera.
- La hora se convierte a `America/Bogota`. Los timestamps de Supabase
  llegan en UTC; sin convertir se mostrarían 5 horas corridas.
- El *tooltip* de la celda siempre lleva la fecha completa, útil cuando
  arriba dice solo "hoy".

**Corregido de paso**: `negUltimaAct` priorizaba `fecha_registro` sobre
`created_at`, pero hoy `pCheckStep` **no envía** `fecha_registro`
(ver `procedimiento.js`), y si algún día se enviara como fecha sola se
perdería la hora. Ahora se usa `fecha_registro` **solo si trae hora**;
si no, gana `created_at`.

### 🐛 El scroll ya no se reinicia al ordenar

Con la tabla desplazada a la derecha, ordenar cualquier columna devolvía
la vista al extremo izquierdo.

**Causa**: `render()` reemplaza el `innerHTML` completo, así que el
contenedor `.neg-table` se destruye y se vuelve a crear — y un elemento
nuevo arranca en `scrollLeft = 0`. Es el costo del repintado total, no un
error puntual.

**Solución**: `negRender()` anota la posición del scroll, renderiza y la
restaura.

- **Al ordenar** son las mismas filas en otro orden → se conservan las dos
  direcciones.
- **Al filtrar** cambia el conjunto de filas → se conserva solo el
  horizontal; mantener la altura podría dejarte mirando un vacío.
- Los 12 manejadores de filtros y chips pasaron a usarlo.

---

## [2.2.0] — 2026-08-19

### ✨ Nueva columna "Últ. actualización" en Negocios activos

Muestra cuándo fue la última vez que se registró movimiento en el proceso
de cada moto. Sirve para detectar negocios estancados: una moto puede tener
30% de avance y llevar tres semanas sin que nadie toque nada.

- **De dónde sale el dato**: la actividad más reciente de esa moto en
  `registro_actividades`. Se consideran **todas** las actividades
  registradas, no solo las ejecutadas — un "no aplica" también es
  movimiento del proceso.
- **Qué fecha usa**: `fecha_registro` (la que reportó la persona) y, si no
  está, `created_at` (cuándo entró a la BD). Si alguien registra hoy algo
  que hizo ayer, para el negocio vale ayer.
- **Cómo se ve**: la fecha más un "hoy / ayer / hace Nd" al lado.
  El color avisa cuando el proceso lleva tiempo quieto —
  **amarillo a los 7 días, rojo a los 15**. Los umbrales están en
  `negocios.js`, dentro del bloque de la celda.
- Motos sin ninguna actividad registrada muestran **"Sin registros"**.
- La columna es **ordenable**, como el resto.

### 🐛 Corregido

- **Ordenamiento numérico de fechas.** El `sort` de la tabla convertía a
  texto todo lo que no fuera `pct` o `dias`. Se reemplazó por una lista
  `COLS_NUMERICAS` para que la columna nueva ordene por timestamp real y
  no alfabéticamente.
- **Corrimiento de un día en fechas sin hora.** `new Date('2026-08-19')`
  se interpreta como medianoche **UTC**, que en horario de Bogotá (UTC-5)
  es el día anterior a las 19:00 — la columna habría mostrado 18/08.
  La nueva `negParseFechaHora()` en `utils.js` construye esas fechas como
  locales. Verificado en máquina con zona `UTC-05:00`.

---

## [2.1.0] — 2026-08-19

### 🧹 Limpieza de duplicados

- **Eliminadas 5 funciones duplicadas** entre `utils.js` y `negocios.js`
  (`negFmtFecha`, `negDiasDesde`, `negNormMarca`, `negNormTipo`, `negProgressColor`).
  Las de `utils.js` estaban completamente sombreadas por las de `negocios.js`
  y **no eran equivalentes** (la vieja no conocía BAJAJ y mapeaba mal el tipo).
  Se conservaron las que ya se estaban ejecutando y se movieron a `utils.js`,
  así `home.js` deja de depender de `negocios.js`.
- **Eliminada `apiInvEscribirPlaca` duplicada** en `api.js`. Había dos con
  firmas distintas; la segunda pisaba a la primera. Se conservó la que
  apunta a `invEscrPlaca` (la que ya corría y la que la UI de Configuración expone).
- `invW` en `config.js` marcada como sin uso.
- **Eliminada `negParseFecha`**: solo la usaban las funciones muertas de arriba.

### 🐛 Correcciones

- **Escape de HTML en todos los módulos.** `negEsc` se renombró a `esc`,
  se movió a `utils.js` y ahora se aplica a **todos** los datos que vienen de
  SharePoint y Supabase. Antes solo `negocios.js` escapaba: un cliente llamado
  `Motos & Cía` o un comentario con `<` rompía el render de Planilla, Plan,
  Alistamientos, Trámites y Home. `esc` ahora también escapa comillas simples.
- **`apiPost` ahora verifica `r.ok`.** Antes, un error 500 de Power Automate que
  devolviera HTML explotaba con `Unexpected token <` y el mensaje real del flow
  se perdía. Ahora se propaga el status y el cuerpo del error.
  También se agregó `clearTimeout` en el camino de error (antes el timer del
  abort quedaba vivo si el fetch fallaba).
  El `AbortError` se propaga **sin envolver**, porque `negocios.js` y
  `procedimiento.js` dependen de `e.name === 'AbortError'`.

### ➕ Agregado

- **Cache-busting** (`?v=2.1.0`) en todos los `<link>` y `<script>` de
  `index.html`. Sin esto el navegador puede servir CSS/JS viejo tras un deploy.
  ⚠️ **Hay que subir ese número en cada deploy.**
- **Herramientas de verificación** (requieren Node.js; el aplicativo **no**):

  | Comando | Qué hace |
  |---|---|
  | `npm run check` | Valida sintaxis de los 13 archivos JS |
  | `npm run check:dupes` | Detecta funciones duplicadas **entre** archivos |
  | `npm run lint` | ESLint |
  | `npm run smoke` | Carga todo y ejecuta cada `render()`, incluyendo una ronda con datos que rompen HTML |
  | `npm run verify` | Las cuatro, en orden |
  | `npm run serve` | Servidor local |

  - `eslint.config.js` — configurado con `builtinGlobals: false` en `no-redeclare`
    y `no-unused-vars` apagada: como las globales se comparten entre archivos y
    muchas funciones se llaman desde `onclick` en el HTML, sin esos ajustes
    ESLint produce cientos de falsos positivos y se vuelve inútil.
  - `scripts/check-duplicados.js` — ESLint lintea archivo por archivo, así que
    **no puede** ver duplicados entre archivos. Este script cubre ese hueco, que
    es justamente el riesgo principal de esta arquitectura.
  - `scripts/smoke-test.js` — corre los módulos con las APIs del navegador
    simuladas. La tercera fase inyecta `Motos & Cía "El <Rayo>"` y falla si ese
    texto aparece sin escapar en el HTML. Validado neutralizando `esc()`: las
    7 vistas detectan la fuga.
  - `.gitignore` para que `node_modules/` no llegue al repositorio.

### 🧹 Higiene

- 4 redeclaraciones de `var` en el mismo ámbito de función en
  `procedimiento.js` (`h`, `ti` ×2, `i`). No eran bugs — cada una se
  reinicializaba antes de usarse — pero hacían que `npm run lint` siempre
  fallara, y un linter que siempre falla es un linter que se ignora.

---

## [2.0.0] — 2026-05-05

### 🎉 Refactor mayor — Modularización

Esta versión es una reorganización completa del código. **Funcionalmente equivalente a v1.x** pero con arquitectura modular para facilitar mantenimiento.

### Cambios estructurales

- **Separado el monolítico `index.html` (1934 líneas)** en 19 archivos organizados por responsabilidad.
- **CSS dividido en 7 archivos**: base, layout, components, y un módulo por pestaña.
- **JavaScript dividido en 11 archivos**: config, data, state, utils, api, app, y un módulo por pestaña.
- **Documentación añadida**: arquitectura, despliegue, desarrollo.

### Eliminado

- ❌ **Pestaña "Avance"** completa (~250 líneas de código muerto, no estaba enlazada en el sidebar).
- ❌ **Declaración duplicada** de `ACTIVIDADES_TRAM` y `TOTAL_TRAM` (línea ~1430 sobrescribía la línea ~1280).
- ❌ **Funciones huérfanas** que referenciaban variables inexistentes:
  - `pCfgView()` reemplazada por `renderConfig()`.
  - `aCfgView()`, `aCheckPin()`, `aChangePin()` que crasheaban por usar `aAdmin`/`aPinInput` no declarados.
- ❌ Variables huérfanas: `pAdmin`, `aAdmin`, `pPinInput`, `aPinInput`.
- ❌ Array `DEMO` con datos legacy.

### Mejorado

- 📂 **Organización**: cada módulo tiene su lógica en un archivo separado.
- 🔧 **Mantenibilidad**: cambiar un módulo no afecta al resto.
- 📖 **Legibilidad**: comentarios extensivos en cada archivo.
- 🧪 **Validación**: todos los archivos JS validados con `node -c`.
- 🌐 **API centralizada**: todas las llamadas fetch están en `js/api.js`.

### Mantenido

- ✅ **Funcionalidad idéntica**: todas las features de v1.x funcionan igual.
- ✅ **Datos del usuario**: el `localStorage` se mantiene compatible (mismas claves `dugo-*`).
- ✅ **URLs de Power Automate**: las URLs están embebidas en `js/config.js`.
- ✅ **Diseño visual**: pixel-perfect respecto a v1.x.

---

## [1.x] — Histórico (repo Centro-de-Operaciones)

Versiones anteriores en el repositorio original:
https://github.com/DugoMotos/Centro-de-Operaciones

Esa versión sigue activa para producción mientras se valida la v2.0.0.
