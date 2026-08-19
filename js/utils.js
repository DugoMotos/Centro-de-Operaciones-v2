/* ============================================================
   UTILS.JS — Funciones utilitarias reusables
   ============================================================
   Helpers que NO tienen lógica de negocio:
   - Persistencia (localStorage)
   - Formato de fechas
   - Toasts
   - Iconos SVG inline
   ============================================================ */

/* ============================================================
   PERSISTENCIA EN LOCALSTORAGE
   ============================================================ */

/* Lee y parsea JSON desde localStorage */
function ls(k) {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch (e) {
    return null;
  }
}

/* Guarda como JSON en localStorage */
function sv(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}

/* ============================================================
   FECHAS
   ============================================================ */

/* Fecha de hoy en formato ISO YYYY-MM-DD */
function iD() {
  return new Date().toISOString().split('T')[0];
}

/* Formatea fecha ISO a string legible es-CO (DD MMM HH:MM) */
function fD(iso) {
  if (!iso || iso === 'NA') return 'N/A';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/* Hoy en formato es-CO (02 may 2026) */
function fT() {
  return new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/* Formatea fecha a YYYY-MM-DD (sin ambigüedad mes/día) */
function fIso(date) {
  var d = date || new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

/* ============================================================
   FECHAS DE ORIGEN EXTERNO (Negocios / Home)
   ============================================================
   Los datos que llegan de SharePoint/Excel traen la fecha en
   formatos mezclados: serial de Excel, ISO, o DD/MM/AAAA.
   Estos dos helpers absorben esa variedad.

   Se usan desde negocios.js y home.js — por eso viven acá y no
   dentro de un módulo.
   ============================================================ */

/* Formatear fecha a dd/mm/aaaa (soporta seriales de Excel) */
function negFmtFecha(valor) {
  if (!valor) return '—';
  try {
    var d;
    var numVal = Number(valor);
    if (!isNaN(numVal) && numVal > 25569 && numVal < 100000) {
      d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    } else {
      d = new Date(valor);
    }
    if (isNaN(d.getTime())) return String(valor);
    var opts = { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' };
    var partes = new Intl.DateTimeFormat('es-CO', opts).formatToParts(d);
    var map = {};
    partes.forEach(function(p) { map[p.type] = p.value; });
    return map.day + '/' + map.month + '/' + map.year;
  } catch (e) {
    return String(valor);
  }
}

/* ------------------------------------------------------------
   Parsea un valor de fecha/hora de Supabase a Date.

   Ojo con el caso 'YYYY-MM-DD' (fecha sola): `new Date('2026-08-19')`
   lo interpreta como medianoche UTC, y al mostrarlo en horario de
   Bogotá (UTC-5) queda como las 19:00 del DÍA ANTERIOR. Por eso las
   fechas solas se construyen como fecha local.

   Devuelve Date o null.
   ------------------------------------------------------------ */
function negParseFechaHora(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  var s = String(v).trim();
  if (!s) return null;

  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/* ¿El valor trae hora, o es solo una fecha?
   '2026-08-19'            -> false (no hay hora que mostrar)
   '2026-08-19T14:32:00Z'  -> true                              */
function negTieneHora(v) {
  if (v instanceof Date) return true;
  return /\d{1,2}:\d{2}/.test(String(v || ''));
}

/* Hora en formato 24h de Bogotá (HH:MM).
   Los timestamps de Supabase vienen en UTC: hay que convertirlos o
   la hora se muestra corrida 5 horas. */
function negFmtHora(v) {
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

/* Día calendario en Bogotá como 'YYYY-MM-DD' */
function negDiaBogota(v) {
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d);
}

/* ------------------------------------------------------------
   Diferencia en días de CALENDARIO (Bogotá) entre una fecha y hoy.

   Ojo: no es lo mismo que dividir milisegundos por 86400000. A las
   00:30, algo registrado a las 23:50 de anoche pasó hace 40 minutos
   pero es "ayer". Para el usuario manda el calendario, no las horas.
   ------------------------------------------------------------ */
function negDiasCalendario(v) {
  var aStr = negDiaBogota(v);
  var bStr = negDiaBogota(new Date());
  if (!aStr || !bStr) return null;

  var a = aStr.split('-');
  var b = bStr.split('-');
  var da = new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10));
  var db = new Date(parseInt(b[0], 10), parseInt(b[1], 10) - 1, parseInt(b[2], 10));
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/* Días transcurridos desde fecha (soporta seriales de Excel, ISO, dd/mm/aaaa) */
function negDiasDesde(fecha) {
  if (!fecha) return 0;
  try {
    var d;
    var numVal = Number(fecha);
    if (!isNaN(numVal) && numVal > 25569 && numVal < 100000) {
      d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    } else if (fecha.indexOf && fecha.indexOf('/') >= 0) {
      var p = fecha.split('/');
      d = new Date(p[2], parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    } else {
      d = new Date(fecha);
    }
    if (isNaN(d.getTime())) return 0;
    var ms = new Date().getTime() - d.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  } catch (e) {
    return 0;
  }
}

/* ============================================================
   TOAST (notificación flotante)
   ============================================================ */
function toast(m, e) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = m;
  t.className = 'toast' + (e ? ' err' : '');
  setTimeout(function() { t.classList.add('show'); }, 10);
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}

/* ============================================================
   ICONOS SVG INLINE
   ============================================================ */

/* Check mark blanco (para indicar paso completado) */
var chk = '<svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ============================================================
   ESCAPE DE HTML
   ============================================================
   Obligatorio para cualquier dato que venga de SharePoint o
   Supabase y se interpole en un string de HTML. Sin esto, un
   nombre de cliente con < o " rompe el render.
   ============================================================ */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   COLORES POR PORCENTAJE (Negocios)
   ============================================================ */
function negProgressColor(pct) {
  if (pct >= 100) return 'var(--gn)';
  if (pct >= 75) return 'var(--gn)';
  if (pct >= 50) return 'var(--yl)';
  return 'var(--or)';
}

/* ============================================================
   NORMALIZACIÓN DE TEXTOS (Negocios)
   ============================================================ */

/* Normalización de marca */
function negNormMarca(m) {
  m = (m || '').toString().toUpperCase().trim();
  if (m === 'HERO') return 'HERO';
  if (m === 'SYM') return 'SYM';
  if (m === 'BAJAJ') return 'BAJAJ';
  if (!m) return '';
  return 'OTRA';
}

/* Normalización de tipo */
function negNormTipo(t) {
  t = (t || '').toString().toLowerCase().trim();
  if (t.indexOf('nueva') >= 0) return 'nd';
  if (t.indexOf('sub') >= 0) return 'ns';
  if (t.indexOf('usad') >= 0) return 'us';
  return '';
}
