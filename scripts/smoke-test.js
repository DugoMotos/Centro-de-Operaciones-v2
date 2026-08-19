/* ============================================================
   SMOKE-TEST.JS — Prueba de humo sin navegador
   ============================================================
   Carga los archivos del app en el MISMO ORDEN que index.html,
   con las APIs del navegador simuladas, y después ejecuta cada
   render*() para ver si alguna revienta.

   No reemplaza probar en el navegador: no valida cómo se ve.
   Sí detecta lo que más duele y más rápido:
     - un archivo que no carga
     - una función que se llama y no existe (typo)
     - un render que tira excepción con datos vacíos O con datos
       que traen caracteres raros (comillas, &, <)

   La segunda ronda es la importante: mete datos con caracteres
   que rompen HTML para verificar que esc() los está manejando.

   ------------------------------------------------------------
   USO
   ------------------------------------------------------------
     npm run smoke
   ============================================================ */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var raiz = path.join(__dirname, '..');

/* Mismo orden que los <script> de index.html */
var ARCHIVOS = [
  'js/config.js',
  'js/data.js',
  'js/utils.js',
  'js/state.js',
  'js/api.js',
  'js/modules/negocios.js',
  'js/modules/procedimiento.js',
  'js/modules/alistamiento.js',
  'js/modules/plan.js',
  'js/modules/home.js',
  'js/modules/planilla.js',
  'js/modules/config.js',
  'js/app.js'
];

/* ---------- Simulación mínima del navegador ---------- */

function elementoFalso() {
  return {
    innerHTML: '', textContent: '', value: '', className: '', style: {},
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    addEventListener: function () {}, focus: function () {}, setSelectionRange: function () {},
    appendChild: function () {}, removeChild: function () {}
  };
}

var almacen = {};

var sandbox = {
  console: console,
  setTimeout: function () { return 0; },   // no ejecutamos timers
  clearTimeout: function () {},
  Promise: Promise,
  Intl: Intl,
  Date: Date,
  Math: Math,
  JSON: JSON,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  Number: Number,
  String: String,
  Object: Object,
  Array: Array,
  Error: Error,
  RegExp: RegExp,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,

  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(almacen, k) ? almacen[k] : null; },
    setItem: function (k, v) { almacen[k] = String(v); },
    removeItem: function (k) { delete almacen[k]; }
  },
  document: {
    getElementById: function () { return elementoFalso(); },
    querySelector: function () { return elementoFalso(); },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    readyState: 'complete'
  },
  window: { innerWidth: 1400, print: function () {} },
  fetch: function () { return Promise.reject(new Error('fetch deshabilitado en smoke-test')); },
  AbortController: function () { this.signal = {}; this.abort = function () {}; },
  alert: function () {},
  confirm: function () { return false; }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

/* ---------- 1. Cargar archivos en orden ---------- */

var errores = [];

console.log('\n=== 1. CARGA DE ARCHIVOS ===\n');

ARCHIVOS.forEach(function (rel) {
  var abs = path.join(raiz, rel);
  try {
    var codigo = fs.readFileSync(abs, 'utf8');
    vm.runInContext(codigo, sandbox, { filename: rel });
    console.log('  OK    ' + rel);
  } catch (e) {
    console.log('  FALLA ' + rel + '  →  ' + e.message);
    errores.push(rel + ': ' + e.message);
  }
});

/* ---------- 2. Ejecutar cada render con estado vacío ---------- */

var VISTAS = [
  { nombre: 'home', fn: 'renderHome' },
  { nombre: 'negocios', fn: 'renderNegocios' },
  { nombre: 'proc', fn: 'renderProc' },
  { nombre: 'alist', fn: 'renderAlist' },
  { nombre: 'plan', fn: 'renderPlan' },
  { nombre: 'planilla', fn: 'renderPlanilla' },
  { nombre: 'config', fn: 'renderConfig' }
];

console.log('\n=== 2. RENDER CON ESTADO VACÍO ===\n');

VISTAS.forEach(function (v) {
  try {
    var html = sandbox[v.fn]();
    var largo = (html || '').length;
    console.log('  OK    ' + v.fn + '()  →  ' + largo + ' chars');
  } catch (e) {
    console.log('  FALLA ' + v.fn + '()  →  ' + e.message);
    errores.push(v.fn + ' (vacío): ' + e.message);
  }
});

/* ---------- 3. Render con datos HOSTILES ---------- */
/* Acá se verifica que esc() esté haciendo su trabajo: si algún
   dato sin escapar llega al HTML, lo detectamos.                */

console.log('\n=== 3. RENDER CON DATOS QUE ROMPEN HTML ===\n');

var VENENO = 'Motos & Cía "El <Rayo>" \'23';

sandbox.negMotos = [{
  codigo_barras: 'DM1196', marca: 'HERO', linea: VENENO, referencia: VENENO,
  cliente: VENENO, asesor: VENENO, tipo_motocicleta: 'Nueva', fecha_venta: '2026-01-15'
}];
sandbox.negAvances = [{
  codigo_barras: 'DM1196', actividad_num: '1', estado: 'ejecutada',
  ejecuto: VENENO, created_at: '2026-08-19T10:00:00Z',
  /* Fecha sola a propósito: ejercita la rama de negParseFechaHora que
     evita que la columna "Última actualización" se corra un día en
     horario de Bogotá. */
  fecha_registro: '2026-08-19'
}];
sandbox.negAsesores = [{ nombre_completo: VENENO }];
sandbox.planData = [{
  codigo_barras: 'DM1196', proceso: VENENO, estado: 'pendiente',
  fecha: '2026-08-19', ejecuto: VENENO
}];
sandbox.planUbicaciones = {
  DM1196: { marca: 'HERO', linea: VENENO, referencia: VENENO, chasis: VENENO, ubicacion: VENENO }
};
sandbox.planillaData = [{
  codigo_barras: 'DM1196', marca: 'HERO', chasis: 'ABC123456789', linea: VENENO,
  referencia: VENENO, color: VENENO, cliente: VENENO, proceso: 'Alistamiento',
  estado: 'pendiente', tecnico: VENENO
}];
sandbox.aMoto = {
  marca: 'HERO', linea: VENENO, referencia: VENENO, chasis: 'ABC123456789',
  codigo_barras: 'DM1196', color: VENENO, ubicacion: VENENO, modelo: VENENO
};
sandbox.aRows = [{ id: '1', proceso: VENENO, estado: 'pendiente' }];
sandbox.planFilter = VENENO;
sandbox.negSearchTxt = VENENO;

/* Trámites: hay que activar una moto para llegar a pTrackView(),
   que es donde se pintan los datos que vienen de BD_Tramites. */
sandbox.pActive = 'DM1196';
sandbox.pMode = 'track';
sandbox.pLoading = false;
sandbox.pMotos = {
  DM1196: {
    created: '2026-08-01T10:00:00Z',
    steps: {}, alist: [], remote: {}, checks: {},
    info: { marca: 'HERO', linea: VENENO, referencia: VENENO, color: VENENO, modelo: VENENO }
  }
};

/* Configuración: hay que estar autenticado como admin para que
   se rendericen los campos de URL. */
sandbox.cfgAdmin = true;
sandbox.adminPin = '1234';
sandbox.cfgPinInput = VENENO;
sandbox.urlOverrides = { tramC: VENENO, alistC: VENENO };

/* Marcadores que indican HTML roto: el texto crudo se coló */
function buscarSinEscapar(html) {
  var problemas = [];
  if (html.indexOf('<Rayo>') >= 0) problemas.push('<Rayo> sin escapar');
  if (html.indexOf('Cía "El') >= 0) problemas.push('comillas sin escapar');
  return problemas;
}

VISTAS.forEach(function (v) {
  try {
    var html = sandbox[v.fn]() || '';
    var problemas = buscarSinEscapar(html);
    if (problemas.length) {
      console.log('  FUGA  ' + v.fn + '()  →  ' + problemas.join(', '));
      errores.push(v.fn + ' (hostil): ' + problemas.join(', '));
    } else {
      console.log('  OK    ' + v.fn + '()  →  datos escapados correctamente');
    }
  } catch (e) {
    console.log('  FALLA ' + v.fn + '()  →  ' + e.message);
    errores.push(v.fn + ' (hostil): ' + e.message);
  }
});

/* ---------- Resultado ---------- */

console.log('');
if (errores.length) {
  console.log('✗ ' + errores.length + ' problema(s):\n');
  errores.forEach(function (e) { console.log('   ' + e); });
  console.log('');
  process.exit(1);
}
console.log('✓ Todo pasó.\n');
process.exit(0);
