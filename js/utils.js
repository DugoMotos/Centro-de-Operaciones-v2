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
   PARSEO DE FECHAS (Negocios)
   ============================================================
   Soporta múltiples formatos: DD/MM/YYYY, ISO, número serial
   de Excel, Date object. Retorna Date o null.
   ============================================================ */
function negParseFecha(v) {
  if (!v) return null;

  // Si ya es Date
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  var s = String(v).trim();
  if (!s || s === '—' || s.toLowerCase() === 'na') return null;

  // Formato DD/MM/YYYY o DD/MM/YY
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    var dia = parseInt(m[1], 10);
    var mes = parseInt(m[2], 10) - 1;
    var anio = parseInt(m[3], 10);
    if (anio < 100) anio += 2000;
    var d = new Date(anio, mes, dia);
    return isNaN(d.getTime()) ? null : d;
  }

  // Número serial de Excel (días desde 1900-01-01)
  if (/^\d+(\.\d+)?$/.test(s)) {
    var n = parseFloat(s);
    if (n > 25569 && n < 60000) { // entre 1970 y ~2064
      var d = new Date((n - 25569) * 86400000);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Formato ISO o cualquiera que JS reconozca
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/* Días desde una fecha hasta hoy */
function negDiasDesde(fechaRaw) {
  var d = negParseFecha(fechaRaw);
  if (!d) return 0;
  var ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/* Formato DD/MM/AA para mostrar */
function negFmtFecha(v) {
  var d = negParseFecha(v);
  if (!d) return '—';
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + String(d.getFullYear()).slice(-2);
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
   COLORES POR PORCENTAJE (Negocios)
   ============================================================ */
function negProgressColor(p) {
  return p >= 100 ? '#1D9E75' :
         p >= 75  ? '#97C459' :
         p >= 50  ? '#EF9F27' :
         p >= 25  ? '#BA7517' :
                    '#E24B4A';
}

/* ============================================================
   NORMALIZACIÓN DE TEXTOS (Negocios)
   ============================================================ */

/* Normaliza tipo de moto desde BD_Tramites */
function negNormTipo(t) {
  if (!t) return '';
  var s = String(t).toLowerCase();
  if (s.indexOf('subdistr') >= 0) return 'ns';
  if (s.indexOf('distrib') >= 0) return 'nd';
  if (s.indexOf('usad') >= 0) return 'us';
  return '';
}

/* Normaliza marca a HERO/SYM/OTRA */
function negNormMarca(m) {
  if (!m) return 'OTRA';
  var s = String(m).toUpperCase().trim();
  if (s.indexOf('HERO') >= 0) return 'HERO';
  if (s.indexOf('SYM') >= 0) return 'SYM';
  return 'OTRA';
}
