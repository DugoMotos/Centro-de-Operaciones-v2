/* ============================================================
   API.JS — Capa de comunicación con Power Automate
   ============================================================
   Centraliza TODOS los fetch a flujos. Beneficios:
   - Si cambia la forma de enviar requests, se cambia aquí
   - Manejo consistente de timeouts y errores
   - Fácil de mockear para tests futuros
   - Ningún módulo llama fetch directamente, todos pasan por aquí
   ============================================================ */

/* Timeout por defecto en milisegundos */
var API_TIMEOUT = 12000;
var API_TIMEOUT_LONG = 20000;

/* ============================================================
   apiPost: helper genérico para llamadas POST
   ============================================================
   Retorna una Promise que se resuelve con el JSON de respuesta
   o rechaza con error.
   ============================================================ */
function apiPost(url, body, timeout) {
  if (!url) return Promise.reject(new Error('URL no configurada'));
  var ctrl = new AbortController();
  var to = setTimeout(function() { ctrl.abort(); }, timeout || API_TIMEOUT);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    signal: ctrl.signal
  }).then(function(r) {
    clearTimeout(to);
    return r.json();
  });
}

/* ============================================================
   APIs DE TRÁMITES
   ============================================================ */

/* Consulta UNA moto por código de barras en BD_Tramites */
function apiTramConsultarMoto(codigoBarras) {
  return apiPost(getUrl('tramC'), { codigoBarras: codigoBarras });
}

/* Escribe una fecha en una columna de BD_Tramites */
function apiTramEscribirFecha(codigoBarras, columna, valor) {
  return apiPost(getUrl('tramW'), {
    codigoBarras: codigoBarras,
    columna: columna,
    valor: valor
  });
}

/* ============================================================
   APIs DE LISTA SHAREPOINT (Registro_Actividades)
   ============================================================ */

/* Consulta TODAS las actividades registradas en la lista */
function apiAvanceConsultar() {
  return apiPost(getUrl('tramAvance'), { codigo_barras: '*' }, API_TIMEOUT_LONG);
}

/* Escribe una actividad ejecutada en la lista SharePoint */
function apiAvanceEscribir(payload) {
  return apiPost(getUrl('tramEscrAct'), payload);
}

/* Consulta lista completa de motos en BD_Tramites */
function apiTramListar() {
  return apiPost(getUrl('tramLista'), {}, API_TIMEOUT_LONG);
}

/* ============================================================
   APIs DE PLAN DE ALISTAMIENTOS
   ============================================================ */

/* Consulta plan completo o filtrado */
function apiPlanConsultar(filter) {
  return apiPost(getUrl('planC'), {
    codigoBarras: filter || '*'
  }, 15000);
}

/* Escribe una nueva fila en BD_Plan */
function apiPlanEscribir(payload) {
  return apiPost(getUrl('planW'), payload);
}

/* ============================================================
   APIs DE SERVICIO TÉCNICO
   ============================================================ */

/* Consulta plan por chasis */
function apiAlistConsultar(chasis) {
  return apiPost(getUrl('alistC'), {
    chasis: chasis,
    codigoBarras: chasis
  });
}

/* Actualiza estado de actividad de alistamiento */
function apiAlistEscribir(payload) {
  return apiPost(getUrl('alistW'), payload);
}

/* ============================================================
   APIs DE INVENTARIO
   ============================================================ */

/* Escribe placa en BD_Inventario_Dugomotos */
function apiInvEscribirPlaca(codigoBarras, placa) {
  return apiPost(getUrl('invEscrPlaca'), {
    codigo_barras: codigoBarras,
    placa: placa
  });
}
