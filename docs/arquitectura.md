# Arquitectura del aplicativo

Este documento explica cómo está organizado el código y por qué.

---

## Filosofía

**Separación por responsabilidad.** Cada archivo tiene un propósito claro y un solo motivo para cambiar.

- ¿Cambia el procedimiento? → editar `js/data.js`.
- ¿Cambia un color? → editar `css/base.css`.
- ¿Cambia cómo funciona Negocios? → editar `js/modules/negocios.js`.
- ¿Cambia una URL de Power Automate? → editar `js/config.js`.

---

## Capas

El código está organizado en 3 capas:

```
┌─────────────────────────────────────┐
│  CAPA 3: Módulos (negocios, proc..) │  ← Lógica de cada pestaña
├─────────────────────────────────────┤
│  CAPA 2: Soporte (api, state, app)  │  ← Infraestructura compartida
├─────────────────────────────────────┤
│  CAPA 1: Base (config, data, utils) │  ← Datos y helpers
└─────────────────────────────────────┘
```

**Regla:** las capas superiores pueden usar las inferiores, pero nunca al revés.

---

## Orden de carga (CRÍTICO)

Los scripts se cargan en este orden en `index.html`:

```html
1. js/config.js      ← URLs y getUrl()
2. js/data.js        ← Constantes
3. js/utils.js       ← Helpers
4. js/state.js       ← Estado global
5. js/api.js         ← Llamadas fetch
6. js/modules/*.js   ← Módulos
7. js/app.js         ← Orquestador
```

**Si cambias el orden, el app no funciona.** Por ejemplo, `state.js` usa `ls()` que está en `utils.js` y `SK_*` que están en `config.js`, así que los dos deben cargarse antes.

---

## Capa 1: Base

### `js/config.js`
- Define `DEFAULT_URLS` con todas las URLs de Power Automate.
- Define las claves de localStorage (`SK_A`, `SK_P`, etc.).
- Función `getUrl(key)` que combina overrides del usuario + defaults.

### `js/data.js`
- Constantes del negocio: áreas, días, pasos, actividades, responsables.
- Es la **fuente de verdad** del procedimiento.
- Si cambia una actividad, un día, un responsable, se cambia aquí.

### `js/utils.js`
- Helpers genéricos sin lógica de negocio:
  - `ls(k)` / `sv(k, v)`: localStorage
  - `iD()`, `fD()`, `fT()`, `fIso()`: formato de fechas
  - `negParseFecha`, `negDiasDesde`, `negFmtFecha`: parseo robusto
  - `toast(m, e)`: notificaciones
  - `chk`: ícono SVG de check
  - `negProgressColor`, `negNormTipo`, `negNormMarca`: helpers de Negocios

---

## Capa 2: Soporte

### `js/state.js`
- **Estado mutable** del app: variables globales que cambian durante la ejecución.
- Centralizado en un solo archivo para facilitar debugging.
- Variables organizadas por módulo (`neg*`, `p*`, `a*`, `plan*`).

### `js/api.js`
- **Capa única** de comunicación con Power Automate.
- Todos los `fetch()` viven aquí, ningún módulo llama fetch directamente.
- Funciones nombradas por intención: `apiTramConsultarMoto()`, `apiAvanceEscribir()`, etc.
- Si Power Automate cambia la forma de recibir requests, se cambia aquí en un solo lugar.

### `js/app.js`
- Orquestador del app:
  - `setMain(m)`: cambia la sección activa.
  - `render()`: re-pinta el área principal.
  - `toggleSide()`: abre/cierra menú móvil.
  - `init()`: punto de entrada.
- Se carga AL FINAL porque depende de TODOS los módulos.

---

## Capa 3: Módulos

Cada módulo es **autocontenido**: tiene sus propias funciones de render y manejo de estado.

### `js/modules/negocios.js`
- `renderNegocios()`: tabla de motos con filtros, ordenamiento, progress bars.
- `negSync()`: carga datos desde SharePoint.
- `negSort(key)`: ordena por columna.

### `js/modules/procedimiento.js`
- El módulo más grande (~660 líneas).
- `renderProc()`: dispatcher entre vistas.
- `pTrackView()`: vista de moto activa con steps por día.
- `pFlujoView()`: vista de solo lectura del procedimiento.
- `pBuscar()`, `pReg()`, `pCheckStep()`, `pConfirmAlist()`, `pRegPlaca()`: acciones.

### `js/modules/alistamiento.js`
- `renderAlist()`: dispatcher entre 3 sub-pestañas.
- `aRegView()`: vista de registro.
- `aHistView()`: historial filtrable.
- `aResView()`: resumen del día.
- `aBuscar()`, `aGuardar()`, `aExpCSV()`: acciones.

### `js/modules/plan.js`
- `renderPlan()`: vista de tabla BD_Plan con filtros.
- `planSync()`: carga desde SharePoint.

### `js/modules/config.js`
- `renderConfig()`: pantalla de configuración con secciones por módulo.
- `cfgCheckPin()`: validación de PIN.

---

## Estilos CSS

### `css/base.css`
- Variables CSS (`--bg`, `--rd`, `--gn`, etc.).
- Reset, body, scrollbars, fuentes.

### `css/layout.css`
- Estructura de la página: app grid, sidebar, mobile bar, main.
- Media queries para responsive.

### `css/components.css`
- Componentes reusables: botones, cards, inputs, toasts, badges, sub-tabs.

### `css/modules/*.css`
- Estilos específicos de cada módulo.

---

## Estado del app

### Estado persistente (en localStorage)

| Clave | Tipo | Contenido |
|-------|------|-----------|
| `dugo-a-v4` | Array | Registros históricos de Servicio Técnico |
| `dugo-p-v2` | Object | Datos por moto en Trámites |
| `dugo-url-overrides` | Object | URLs personalizadas (sobreescriben defaults) |
| `dugo-admin-pin` | String | PIN del administrador |

### Estado en memoria (durante la sesión)

Variables globales declaradas en `state.js`. Por ejemplo:
- `main`: sección activa.
- `pActive`: código de moto activa en Trámites.
- `negMotos`, `negAvances`: cache de datos descargados.

---

## Flujo típico de uso

**Usuario abre el app:**
1. Navegador carga `index.html`.
2. CSS se carga (paralelo).
3. Scripts se cargan en orden (secuencial, definido por las tags `<script>`).
4. `app.js` ejecuta `init()` que llama a `render()`.
5. `render()` mira la variable `main` (default: `'proc'`) y renderiza.

**Usuario clickea "Negocios" en sidebar:**
1. Se ejecuta `setMain('negocios')` (en `app.js`).
2. `setMain` actualiza la variable `main` y los estilos del sidebar.
3. Llama a `render()`.
4. `render()` ejecuta `renderNegocios()` (en `js/modules/negocios.js`).
5. El HTML resultante se inyecta en `<main id="c">`.

**Usuario clickea "Cargar lista de motos":**
1. El botón llama a `negSync()` (en `js/modules/negocios.js`).
2. `negSync()` cambia `negLoading = true` y llama a `render()` (vista de carga).
3. Se ejecutan en paralelo `apiTramListar()` y `apiAvanceConsultar()` (en `js/api.js`).
4. Cuando responden, se guardan en `negMotos` y `negAvances`.
5. Se llama `render()` de nuevo, ahora pinta la tabla con los datos.

---

## Cómo agregar una nueva pestaña

1. Crear `css/modules/nueva.css` con los estilos.
2. Crear `js/modules/nueva.js` con `renderNueva()` y funciones auxiliares.
3. Agregar las variables de estado en `js/state.js` (si necesita estado).
4. Agregar el link en `index.html` dentro del sidebar.
5. Agregar el case en `render()` dentro de `js/app.js`.
6. Si necesita Power Automate: agregar URL en `js/config.js` y función en `js/api.js`.

---

## Decisiones técnicas

### ¿Por qué scripts clásicos y no ES6 modules?
- ES6 modules requieren servir desde HTTP (no funcionan abriendo el HTML local).
- Scripts clásicos son más simples para alguien que no es desarrollador.
- En el futuro se migrará a Vite + ES6 modules cuando el proyecto crezca más.

### ¿Por qué variables globales y no encapsulamiento?
- Compatibilidad con la versión anterior (mismos nombres, mismo localStorage).
- Más fácil de inspeccionar en consola del navegador.
- Para una app de este tamaño, el encapsulamiento agrega complejidad sin beneficio claro.

### ¿Por qué innerHTML en lugar de templates o JSX?
- Sin build tools, sin compilación.
- Funciona directamente en cualquier navegador.
- Sintaxis simple para el equipo.
