# Centro de Operaciones Dugomotos · v2

Aplicativo web para gestión del procedimiento de venta y alistamiento de motocicletas en Dugomotos. Conecta con Power Automate y SharePoint para registrar avances en tiempo real.

> **v2.0.0** — Versión modularizada del aplicativo. La versión monolítica original está en el repo [Centro-de-Operaciones](https://github.com/DugoMotos/Centro-de-Operaciones).

---

## ¿Qué hace?

Permite a los equipos de Dugomotos:

- 📊 **Negocios**: Ver lista de motos en proceso con avance, fecha de venta, días en proceso y actividad actual.
- 📋 **Trámites**: Registrar fechas y avances del procedimiento día a día (7 días, ~50 pasos).
- ⚙ **Servicio Técnico**: Registrar ejecución de actividades de alistamiento (alistamiento general, marcación, defensas, GPS, placa).
- 📅 **Plan**: Ver tabla completa de BD_Plan con filtros por código, proceso, estado, fecha.
- 🔧 **Configuración**: Administrador puede modificar URLs de Power Automate y reiniciar datos.

---

## Estructura

```
Centro-de-Operaciones-v2/
├── index.html              ← Estructura HTML
├── css/                    ← Estilos
│   ├── base.css            ← Variables, reset, fonts
│   ├── layout.css          ← Grid, sidebar, mobile
│   ├── components.css      ← Botones, cards, inputs
│   └── modules/            ← Estilos por módulo
├── js/                     ← Lógica
│   ├── config.js           ← URLs de Power Automate
│   ├── data.js             ← Catálogos del negocio
│   ├── state.js            ← Estado global
│   ├── utils.js            ← Helpers (fechas, toasts)
│   ├── api.js              ← Llamadas a Power Automate
│   ├── app.js              ← Orquestador (setMain, render)
│   └── modules/            ← Lógica por módulo
└── docs/                   ← Documentación técnica
    ├── arquitectura.md     ← Cómo está organizado el código
    ├── despliegue.md       ← Cómo desplegar a GitHub Pages
    └── desarrollo.md       ← Cómo agregar nuevas features
```

---

## Despliegue

Ver [`docs/despliegue.md`](docs/despliegue.md) para la guía completa.

**Resumen rápido:**

1. Subir todos los archivos al repositorio `Centro-de-Operaciones-v2` en GitHub.
2. Activar GitHub Pages: **Settings → Pages → Source: main / root**.
3. El equipo accede a `https://dugomotos.github.io/Centro-de-Operaciones-v2/`.

⚠️ **Importante**: Para que GitHub Pages funcione gratis, el repositorio debe ser **público**.

---

## Desarrollo

Ver [`docs/desarrollo.md`](docs/desarrollo.md) para detalles técnicos.

**Para hacer cambios:**

1. Identificar el módulo afectado (Negocios, Trámites, etc.).
2. Modificar el archivo correspondiente en `js/modules/` o `css/modules/`.
3. Probar localmente abriendo `index.html` con un servidor local.
4. Hacer commit y push al repositorio.

---

## Tecnologías

- **HTML/CSS/JS vanilla** sin frameworks ni build tools.
- **Power Automate** para la integración con SharePoint.
- **GitHub Pages** para hosting.

Sin dependencias externas más allá de Google Fonts (DM Sans, DM Mono).

---

## Versionado

Ver [`CHANGELOG.md`](CHANGELOG.md) para el historial de cambios.

---

## Equipo

Desarrollado por Andrés Salazar (Dugomotos).

Contacto: [GitHub Issues](https://github.com/DugoMotos/Centro-de-Operaciones-v2/issues)
