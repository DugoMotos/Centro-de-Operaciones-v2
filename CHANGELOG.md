# Changelog

Todas las versiones notables del Centro de Operaciones Dugomotos.

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
