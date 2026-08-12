/* ============================================================
   STATE.JS — Estado global de la aplicación
   ============================================================
   Variables que cambian durante la ejecución (estado mutable).
   Aquí se centralizan para tener un solo lugar donde inspeccionar
   el estado del app cuando hay bugs.
   ============================================================ */

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
/* Sección activa: 'negocios' | 'proc' | 'alist' | 'plan' | 'config' */
var main = 'proc';

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */
var adminPin = ls(SK_PIN) || '';
var cfgAdmin = false;
var cfgPinInput = '';

/* ============================================================
   CONFIGURACIÓN DE URLs (overrides del usuario)
   ============================================================ */
var urlOverrides = ls(SK_OVR) || {};

/* Compatibilidad backward: getters que combinan defaults + overrides */
var aCfg = {
  get urlC() { return getUrl('alistC'); },
  get urlW() { return getUrl('alistW'); }
};

var pCfg = {
  get tramC() { return getUrl('tramC'); },
  get tramW() { return getUrl('tramW'); },
  get cajaC() { return getUrl('cajaC'); },
  get cajaW() { return getUrl('cajaW'); },
  get contC() { return getUrl('contC'); },
  get contW() { return getUrl('contW'); },
  get planC() { return getUrl('planC'); },
  get planW() { return getUrl('planW'); }
};

/* ============================================================
   ESTADO DE NEGOCIOS
   ============================================================ */
var negMotos = null;
var negAvances = null;
var negLoading = false;
var negError = '';
var negSortKey = 'code';
var negSortDir = 'asc';
var negFilterArea = '';
var negFilterTipo = '';
var negFilterMarca = '';
var negSearchTxt = '';
var negAsesores = null;
var negFilterAsesor = '';
var negAsesorInput = '';         // Lo que el usuario está escribiendo
var negAsesorDropdownOpen = false; // Si la lista está desplegada

/* ============================================================
   ESTADO DE PROCEDIMIENTO / TRÁMITES
   ============================================================ */
var pSub = 'flujo';
var pArea = '';
var pMotos = ls(SK_P) || {};
var pActive = null;
var pAlistSel = [];
var pMode = '';
var pLoading = false;
var pUserArea = '';
var pOpenDays = {};
var pFocusReg = null;
var pExpandStep = null;

/* ============================================================
   ESTADO DE SERVICIO TÉCNICO (alistamientos)
   ============================================================ */
var aTab = 'Registrar';
var aRecs = ls(SK_A) || [];
var aMoto = null;
var aRows = [];
var aChosen = null;
var aSt = 'ejecutada';
var aResp = '';
var aCmt = '';
var aFD = iD();
var aFA = '';
var aFR = '';
var aFC = '';
var aLoading = false;

/* ============================================================
   ESTADO DE PLAN
   ============================================================ */
var planData = null;
var planLoading = false;
var planFilter = '';
var planFilterProc = '';
var planFilterEstado = '';
var planFilterFecha = '';
var planExpanded = {};
var planUbicaciones = {};
