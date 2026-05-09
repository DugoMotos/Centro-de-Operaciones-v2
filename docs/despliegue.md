# Despliegue a GitHub Pages

Guía paso a paso para desplegar el aplicativo en producción.

---

## Pre-requisitos

- ✅ Repositorio `Centro-de-Operaciones-v2` ya creado en GitHub (público).
- ✅ Cuenta con permisos de escritura en el repositorio.
- ✅ Archivos del proyecto descomprimidos en tu computadora.

⚠️ **El repositorio DEBE ser público** para que GitHub Pages funcione gratis. Si lo cambias a privado, Pages se desactiva automáticamente.

---

## Opción A: Subir via interfaz web (más simple)

### Paso 1: Subir archivos

1. Ve a https://github.com/DugoMotos/Centro-de-Operaciones-v2
2. Si el repositorio tiene archivos previos (como `README.md` por defecto), está bien.
3. Clic en **"Add file" → "Upload files"**.
4. Arrastra **TODOS los archivos y carpetas** del proyecto:
   - `index.html`
   - `README.md`
   - `CHANGELOG.md`
   - Carpeta `css/` completa
   - Carpeta `js/` completa
   - Carpeta `docs/` completa
5. **Commit message**: `feat: refactor v2.0.0 - estructura modular`
6. **"Commit changes"**.

### Paso 2: Activar GitHub Pages

1. **Settings** (rueda dentada arriba del repo).
2. En el menú izquierdo, **Pages**.
3. **Source**: selecciona **"Deploy from a branch"**.
4. **Branch**: selecciona **`main`** y carpeta **`/ (root)`**.
5. Clic en **Save**.

### Paso 3: Esperar el despliegue

GitHub Pages tarda 1-3 minutos la primera vez. Verás un mensaje como:

> Your site is live at `https://dugomotos.github.io/Centro-de-Operaciones-v2/`

### Paso 4: Probar

Abre la URL en el navegador. Debe verse la intranet exactamente igual que la versión anterior.

---

## Opción B: Subir via Git (para usuarios con experiencia)

```bash
# Clonar el repositorio
git clone https://github.com/DugoMotos/Centro-de-Operaciones-v2.git
cd Centro-de-Operaciones-v2

# Copiar todos los archivos del proyecto refactorizado aquí

# Hacer commit
git add .
git commit -m "feat: refactor v2.0.0 - estructura modular"
git push origin main
```

Luego activar Pages como en la Opción A, paso 2.

---

## Validación post-despliegue

Después de desplegar, verificar manualmente:

### 1. Carga inicial
- [ ] La página carga sin errores.
- [ ] Se ven el sidebar y la sección Trámites.
- [ ] Los íconos del sidebar se ven correctamente.

### 2. Navegación
- [ ] Clic en "Negocios" cambia la vista.
- [ ] Clic en "Procedimiento → Servicio Técnico" navega correctamente.
- [ ] Clic en "Configuración" abre la pantalla de PIN.

### 3. Mobile
- [ ] En móvil, aparece el botón hamburguesa.
- [ ] Tocar hamburguesa abre el menú lateral.
- [ ] Tocar fuera del menú lo cierra.
- [ ] Al navegar, el menú se cierra automáticamente.

### 4. Funcionalidad

**Negocios:**
- [ ] Clic en "Cargar lista de motos" descarga datos.
- [ ] Se ve la tabla con motos.
- [ ] Filtros por tipo y marca funcionan.
- [ ] Búsqueda en tiempo real funciona.

**Procedimiento → Trámites:**
- [ ] Clic en "Registrar avance" pide área.
- [ ] Seleccionar área muestra input de código.
- [ ] Buscar una moto existente (ej: DM2029) funciona.
- [ ] Marcar checks de pasos funciona y se envía a SharePoint.

**Servicio Técnico:**
- [ ] Buscar un chasis funciona.
- [ ] Se ven actividades pendientes.
- [ ] Guardar actividad funciona.

**Plan:**
- [ ] "Actualizar datos" descarga datos.
- [ ] Filtros funcionan.

**Configuración:**
- [ ] Acepta PIN configurado en la versión anterior.
- [ ] Se ven todas las URLs por defecto.
- [ ] Modificar una URL y guardar funciona.

---

## Si algo falla

### Caso 1: 404 al abrir la URL

**Posible causa:** Pages no está activado o hay un error de configuración.

**Solución:** Settings → Pages → verificar que **Source** sea **"Deploy from a branch"** con **main / root**.

### Caso 2: La página carga pero está vacía

**Posible causa:** Algún archivo JS no se cargó (404 en la red).

**Solución:** Abrir la consola del navegador (F12) → tab "Console" → buscar errores de tipo "Failed to load". Verificar que todos los archivos están en sus rutas correctas.

### Caso 3: Diseño roto

**Posible causa:** Algún archivo CSS no se cargó.

**Solución:** F12 → tab "Network" → recargar la página → verificar que los archivos `.css` retornan 200, no 404.

### Caso 4: Funcionalidad rota (ej: no carga datos)

**Posible causa:** Las URLs de Power Automate cambiaron o el flujo está caído.

**Solución:** Abrir la consola (F12) → "Console" → ver errores. Probar el flujo de Power Automate directamente desde Microsoft Flow para verificar que está activo.

---

## Migración del repo viejo

Una vez validado que v2 funciona correctamente:

### Opción suave: convivir un tiempo
- Mantener `Centro-de-Operaciones` activo.
- Anunciar al equipo la nueva URL `Centro-de-Operaciones-v2`.
- Probar 1-2 semanas con un grupo reducido.
- Una vez todo OK, redirigir tráfico (ver más abajo).

### Opción: redirigir Centro-de-Operaciones a v2

En el repo viejo, reemplazar `index.html` por:

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=https://dugomotos.github.io/Centro-de-Operaciones-v2/">
<title>Redirigiendo...</title>
</head>
<body>
<p>Redirigiendo a la nueva versión...</p>
<p>Si no ocurre automáticamente, <a href="https://dugomotos.github.io/Centro-de-Operaciones-v2/">haz clic aquí</a>.</p>
</body>
</html>
```

Esto redirige automáticamente a quien acceda al URL viejo.
