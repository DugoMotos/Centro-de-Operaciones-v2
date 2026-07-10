/* ============================================================
   CONFIG.JS — Configuración de URLs y credenciales
   ============================================================
   URLs por defecto de los flujos de Power Automate + Supabase.
   El usuario puede sobreescribir las URLs de Power Automate
   en Configuración del app.

   IMPORTANTE: Estas URLs NO son secretas (van en código del
   navegador). Son seguras solo si Power Automate valida el
   origen o si los flujos solo escriben en columnas controladas.

   Para Supabase, la seguridad la dan las RLS Policies definidas
   en la propia BD. La anon key expuesta acá es esperada y no
   representa un riesgo.
   ============================================================ */

/* ────────────────────────────────────────────────────────────
   SUPABASE — Registro de Actividades (reemplaza SharePoint)
   ──────────────────────────────────────────────────────────── */
var SUPABASE_URL = 'https://bfnkumsxvnpbbwyvfkjv.supabase.co/rest/v1/';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbmt1bXN4dm5wYmJ3eXZma2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTAyMDEsImV4cCI6MjA5NjMyNjIwMX0.MOBCbgOHeQtSnPTooleg0r7B5XyBc_5XfHZlMc-i1zk';
var SUPABASE_TABLES = {
  catalogo: 'catalogo_actividades',
  registro: 'registro_actividades'
};

/* URLs por defecto embebidas en el app */
var DEFAULT_URLS = {
  // ----- Pestaña Alistamientos / Servicio Técnico -----
  alistC: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ed95d66f1f474cb4844f9d02cb0e4211/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=VkAy_elVjBc7ejJpuG9kR4EsRfihwhsbHflYTCRzLIU',
  alistW: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1b6f0ebb3c644a16ba88065af68b1734/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ze5QVdskYnUwsvfbOm4fuwGwPxaNc-9HtYObpyxyLvI',

  // ----- Pestaña Procedimiento / Trámites -----
  tramC: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/2348e1037b434da79d11bd0b14a1d553/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3N6FFVcPhf2kCG0XJbBazkv_7wNgeZicUVXEEr8V2-U',
  tramW: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3eeece43880e412283046538942a1d0e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=G9aiMxAQDTnxHgAcEFLjRhCIGEZNQFvCDb_vs_RUZt0',
  planW: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8458340b115e482e93f27dbcbda7b799/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZOb_KGQZOUXi-DltCEN4oqUTpYgO7-pkw4BOHz-KnyI',

  // ----- Pestaña Plan -----
  planC: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3d940aab92b649af9b8aac13adaca11b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MYl8E3vGLn7Q2OCuw-be3mb8ZyGI8_vgDDpW2-k1Eiw',

  // ----- Lista SharePoint Registro_Actividades (LEGACY - reemplazadas por Supabase) -----
  // Se mantienen por si necesitás rollback rápido a la arquitectura anterior.
  tramAvance: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c3c12da24d6f4c0e99f16052a4ba8aa4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=nyBQQh9ZPVjC-XyPcSlngrfltqUi8JPYR_0uTn4RmLY',
  tramEscrAct: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/62544a55453949f4893dabe4321c2f83/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=6OHV4Yw6sJAJUeDhWCzBMTirYYGgZbOAMqE7ulN6lrY',
  tramLista: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8bb7152418da49f684d2c78e54ee5d82/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=34OIs9vYrLwN0nHIsKFiEA_sh5FHTmmNiW5Ei3lXX7c',

  // ----- Inventario Dugomotos (escritura de placa) -----
  invEscrPlaca: 'https://defaultcf4c3cc039c24ec1a7440591e622df.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6b46cb08eefc446d98d18fae55135403/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=EzxjURemuE9hRrBPX76WVyuvzs3HuED2dIu5WGj-MVo',

  // ----- Pendientes de implementar -----
  cajaC: '',
  cajaW: '',
  contC: '',
  contW: ''
};

/* Claves de localStorage */
var SK_A = 'dugo-a-v4';      // Servicio Técnico - registros
var SK_AC = 'dugo-ac-v2';    // Servicio Técnico - config
var SK_P = 'dugo-p-v2';      // Trámites - motos
var SK_PC = 'dugo-pc-v1';    // Trámites - config
var SK_OVR = 'dugo-url-overrides';
var SK_PIN = 'dugo-admin-pin';

/* Helper para obtener URL: primero busca override del usuario,
   luego cae a DEFAULT_URLS */
function getUrl(key) {
  return urlOverrides[key] || DEFAULT_URLS[key] || '';
}

/* Helper para verificar si Supabase está configurado */
function supabaseReady() {
  return SUPABASE_URL &&
         SUPABASE_URL.indexOf('TU_PROYECTO') < 0 &&
         SUPABASE_ANON_KEY &&
         SUPABASE_ANON_KEY.indexOf('TU_ANON_KEY') < 0;
}
