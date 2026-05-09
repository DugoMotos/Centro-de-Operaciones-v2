/* ============================================================
   APP.JS — Orquestador principal de la aplicación
   ============================================================
   Funciones expuestas:
   - setMain(m): cambia la sección activa
   - render(): re-pinta el área principal según main
   - toggleSide(): abre/cierra menú móvil
   - toggleProcParent(): expande/colapsa menú procedimiento
   - init(): inicializa el app

   Este archivo se carga AL FINAL después de todos los módulos.
   ============================================================ */

/* ============================================================
   setMain — Cambia la sección activa del app
   ============================================================ */
function setMain(m) {
  main = m;
  document.querySelectorAll('.side-link').forEach(function(x) { x.classList.remove('on'); });
  document.querySelectorAll('.sublink').forEach(function(x) { x.classList.remove('on'); });

  var isSubProc = m === 'proc' || m === 'alist' || m === 'plan';
  if (isSubProc) {
    var p = document.getElementById('parentProc');
    if (p) { p.classList.add('on', 'expanded'); }
    var sp = document.getElementById('subProc');
    if (sp) sp.classList.add('open');
    var sl = document.querySelector('.sublink[data-sec="' + m + '"]');
    if (sl) sl.classList.add('on');
  } else {
    var l = document.querySelector('.side-link[data-sec="' + m + '"]');
    if (l) l.classList.add('on');
  }

  // En móvil, cerrar el menú al navegar
  if (window.innerWidth <= 768) {
    var s = document.getElementById('sideMenu');
    var o = document.getElementById('sideOverlay');
    if (s) s.classList.remove('open');
    if (o) o.classList.remove('show');
  }
  render();
}

/* ============================================================
   toggleProcParent — Expande/colapsa menú Procedimiento
   ============================================================ */
function toggleProcParent() {
  var p = document.getElementById('parentProc');
  var sp = document.getElementById('subProc');
  if (!p || !sp) return;
  var expanded = p.classList.contains('expanded');
  if (expanded) {
    p.classList.remove('expanded', 'on');
    sp.classList.remove('open');
  } else {
    p.classList.add('expanded');
    sp.classList.add('open');
    setMain('proc');
  }
}

/* ============================================================
   toggleSide — Abre/cierra el sidebar en móvil
   ============================================================ */
function toggleSide() {
  var s = document.getElementById('sideMenu');
  var o = document.getElementById('sideOverlay');
  if (!s) return;
  s.classList.toggle('open');
  if (o) o.classList.toggle('show');
}

/* ============================================================
   render — Re-pinta el área principal según main
   ============================================================ */
function render() {
  var el = document.getElementById('c');
  if (!el) return;
  if (main === 'alist') el.innerHTML = renderAlist();
  else if (main === 'plan') el.innerHTML = renderPlan();
  else if (main === 'negocios') el.innerHTML = renderNegocios();
  else if (main === 'config') el.innerHTML = renderConfig();
  else el.innerHTML = renderProc();
}

/* ============================================================
   init — Punto de entrada del app
   ============================================================
   Se llama cuando todo el DOM y los scripts están cargados.
   Maneja errores en el render inicial.
   ============================================================ */
function init() {
  try {
    render();
  } catch (e) {
    var el = document.getElementById('c');
    if (el) {
      el.innerHTML = '<div style="text-align:center;padding:40px">' +
        '<div style="font-size:28px;margin-bottom:10px">⚠️</div>' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:8px">Error al cargar</div>' +
        '<div style="font-size:12px;color:var(--tm);margin-bottom:16px">' + e.message + '</div>' +
        '<button class="btn btn-d" style="max-width:240px;margin:0 auto" onclick="localStorage.removeItem(SK_A);localStorage.removeItem(SK_P);location.reload()">Reiniciar datos y recargar</button>' +
        '</div>';
    }
    console.error('Error en init:', e);
  }
}

// Ejecutar init cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
