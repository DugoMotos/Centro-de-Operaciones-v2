/* ============================================================
   APP.JS — Punto de entrada de la aplicación
   ============================================================ */

// URLs válidas y su título/subtítulo para <title>
var __TITLE = {
  home:      { t: 'Inicio',            s: '' },
  negocios:  { t: 'Negocios activos',  s: 'Ventas' },
  proc:      { t: 'Trámites',          s: 'Procedimiento' },
  alist:     { t: 'Alistamiento',      s: 'Servicio técnico' },
  plan:      { t: 'Plan',              s: 'Servicio técnico' },
  planilla:  { t: 'Planilla diaria',   s: 'Servicio técnico' },
  config:    { t: 'Configuración',     s: 'Sistema' }
};

function __setTitle(sec) {
  var meta = __TITLE[sec] || __TITLE.home;
  document.title = 'Centro de Operaciones · ' + meta.t;
}

// Toggle grupo Trámites del sidebar
function toggleProcParent() {
  var p = document.getElementById('parentProc');
  var s = document.getElementById('procSubs');
  if (!p || !s) return;
  var open = s.classList.toggle('open');
  p.classList.toggle('expanded', open);
}

// Toggle sidebar mobile
function toggleSideMobile() {
  var s = document.querySelector('.side');
  var o = document.getElementById('sideOverlay');
  if (!s || !o) return;
  var open = s.classList.toggle('open');
  o.classList.toggle('show', open);
}

function closeSideMobile() {
  var s = document.querySelector('.side');
  var o = document.getElementById('sideOverlay');
  if (!s || !o) return;
  s.classList.remove('open');
  o.classList.remove('show');
}

// Marca visualmente el link activo en el sidebar
function __markActive(sec) {
  document.querySelectorAll('.side-link, .sublink').forEach(function(el) {
    el.classList.toggle('on', el.getAttribute('data-sec') === sec);
  });
}

// Cambia sección principal
function setMain(sec) {
  if (!sec || !__TITLE[sec]) sec = 'home';
  if (sec === main) return;
  main = sec;
  __setTitle(sec);
  __markActive(sec);

  // Auto-abrir Trámites parent si vamos a proc o config
  if (sec === 'proc' || sec === 'config') {
    var p = document.getElementById('parentProc');
    var s = document.getElementById('procSubs');
    if (s && !s.classList.contains('open')) {
      s.classList.add('open');
      if (p) p.classList.add('expanded');
    }
  }

  if (window.innerWidth <= 768) closeSideMobile();
  render();

  // Auto-sync al entrar por primera vez a cada módulo
  if (sec === 'negocios' && negMotos === null && !negLoading) {
    setTimeout(negSync, 0);
  }
  if (sec === 'plan' && planData === null && !planLoading) {
    setTimeout(planSync, 0);
  }
  if (sec === 'planilla' && planillaData === null && !planillaLoading) {
    setTimeout(planillaSync, 0);
  }
}

// Router principal — decide qué módulo renderizar
function render() {
  var el = document.getElementById('c');
  if (!el) return;
  if (main === 'home') el.innerHTML = renderHome();
  else if (main === 'alist') el.innerHTML = renderAlist();
  else if (main === 'plan') el.innerHTML = renderPlan();
  else if (main === 'planilla') el.innerHTML = renderPlanilla();
  else if (main === 'negocios') el.innerHTML = renderNegocios();
  else if (main === 'config') el.innerHTML = renderConfig();
  else el.innerHTML = renderProc();
}

// Toast global
function toast(msg, isError) {
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  var t = document.createElement('div');
  t.className = 'toast' + (isError ? ' toast-error' : '');
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(function() {
    t.classList.add('fade-out');
    setTimeout(function() { t.remove(); }, 300);
  }, 2500);
}

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  __setTitle(main);
  __markActive(main);
  render();
});
