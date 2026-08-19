/* ============================================================
   CHECK-DUPLICADOS.JS
   ============================================================
   Detecta funciones y variables globales definidas MÁS DE UNA
   VEZ en todo el proyecto.

   ¿Por qué existe este script si ya tenemos ESLint?

   Porque ESLint lintea cada archivo por separado. No tiene forma
   de saber que `negFmtFecha` está definida en utils.js Y TAMBIÉN
   en modules/negocios.js. Ese fue exactamente el bug de la v2.1.0:
   cinco helpers duplicados donde la versión de negocios.js pisaba
   silenciosamente a la de utils.js — y no eran equivalentes.

   Como este proyecto usa scripts clásicos con globales
   compartidas, la última definición que carga gana SIN ERROR.
   Este script es la única red de seguridad contra eso.

   ------------------------------------------------------------
   USO
   ------------------------------------------------------------
     npm run check:dupes

   Sale con código 1 si encuentra duplicados (útil para CI).
   ============================================================ */

'use strict';

var fs = require('fs');
var path = require('path');

/* Mismo orden que los <script> de index.html — importa, porque
   determina cuál definición gana en caso de duplicado. */
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

var raiz = path.join(__dirname, '..');

/* Solo declaraciones de nivel superior (sin indentación).
   Las funciones anidadas dentro de otra función no son globales. */
var RE_FUNCION = /^function\s+([A-Za-z_$][\w$]*)\s*\(/;
var RE_VARIABLE = /^var\s+([A-Za-z_$][\w$]*)\s*=/;

var definiciones = {};
var faltantes = [];

ARCHIVOS.forEach(function (rel) {
  var abs = path.join(raiz, rel);
  if (!fs.existsSync(abs)) {
    faltantes.push(rel);
    return;
  }

  var lineas = fs.readFileSync(abs, 'utf8').split(/\r?\n/);

  lineas.forEach(function (linea, i) {
    var m = RE_FUNCION.exec(linea) || RE_VARIABLE.exec(linea);
    if (!m) return;

    var nombre = m[1];
    if (!definiciones[nombre]) definiciones[nombre] = [];
    definiciones[nombre].push({ archivo: rel, linea: i + 1 });
  });
});

/* ---------- Reporte ---------- */

if (faltantes.length) {
  console.log('\n⚠  Archivos listados pero no encontrados:');
  faltantes.forEach(function (f) { console.log('   ' + f); });
  console.log('   (revisá la lista ARCHIVOS en este script)');
}

var nombres = Object.keys(definiciones);
var duplicados = nombres.filter(function (n) { return definiciones[n].length > 1; });

console.log('\nRevisados ' + (ARCHIVOS.length - faltantes.length) + ' archivos, ' +
            nombres.length + ' definiciones globales.\n');

if (!duplicados.length) {
  console.log('✓ Sin duplicados.\n');
  process.exit(0);
}

console.log('✗ ' + duplicados.length + ' DEFINICIÓN(ES) DUPLICADA(S):\n');

duplicados.forEach(function (nombre) {
  var lugares = definiciones[nombre];
  console.log('  ' + nombre);
  lugares.forEach(function (l, idx) {
    var esUltima = idx === lugares.length - 1;
    // La última en cargarse es la que efectivamente corre
    var marca = esUltima ? '  ← ESTA es la que corre' : '     (queda sombreada)';
    console.log('    ' + l.archivo + ':' + l.linea + marca);
  });
  console.log('');
});

console.log('Las definiciones sombreadas nunca se ejecutan. Verificá si las');
console.log('versiones son equivalentes antes de borrar cualquiera: puede que');
console.log('la que estás leyendo no sea la que el aplicativo usa.\n');

process.exit(1);
