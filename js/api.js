/* ============================================================
   API.JS — Capa de comunicación con Power Automate + Supabase
   ============================================================
   Centraliza TODOS los fetch. Beneficios:
   - Si cambia la forma de enviar requests, se cambia aquí
   - Manejo consistente de timeouts y errores
   - Fácil de mockear para tests futuros
   - Ningún módulo llama fetch directamente

   Migración a Supabase:
   - apiAvanceConsultar → Supabase GET registro_actividades
   - apiAvanceEscribir  → Supabase POST registro_actividades
   - Resto de funciones sigue apuntando a Power Automate
   ============================================================ */

/* Timeout por defecto en milisegundos */
var API_TIMEOUT = 12000;
var API_TIMEOUT_LONG = 20000;

/* ============================================================
   apiPost: helper genérico para llamadas POST a Power Automate
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
   apiSupabase: helper para llamadas REST a Supabase
   ============================================================
   method: 'GET', 'POST', 'PATCH', 'DELETE'
   path: '/rest/v1/registro_actividades?select=*'
   body: objeto o array (para POST/PATCH)
   ============================================================ */
function apiSupabase(method, path, body, timeout) {
  if (!supabaseReady()) {
    return Promise.reject(new Error('Supabase no configurado en config.js'));
  }
  var ctrl = new AbortController();
  var to = setTimeout(function() { ctrl.abort(); }, timeout || API_TIMEOUT);

  var opts = {
    method: method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    signal: ctrl.signal
  };

  if (body !== undefined && body !== null) {
    opts.body = JSON.stringify(body);
  }

  return fetch(SUPABASE_URL + path, opts).then(function(r) {
    clearTimeout(to);
    if (!r.ok) {
      return r.text().then(function(text) {
        throw new Error('Supabase ' + r.status + ': ' + (text || r.statusText));
      });
    }
    if (r.status === 204) return [];
    return r.json();
  });
}

/* ============================================================
   APIs DE TRÁMITES (Power Automate → BD_Tramites Excel)
   ============================================================ */

function apiTramConsultarMoto(codigoBarras) {
  return apiPost(getUrl('tramC'), { codigoBarras: codigoBarras });
}

function apiTramEscribirFecha(codigoBarras, columna, valor) {
  return apiPost(getUrl('tramW'), {
    codigoBarras: codigoBarras,
    columna: columna,
    valor: valor
  });
}

function apiContEscribirFecha(codigo_barras, fecha) {
  return apiPost(getUrl('contW'), {
    codigo_barras: codigo_barras,
    fecha: fecha
  });
}

function apiInvEscribirPlaca(codigo_barras, placa) {
  return apiPost(getUrl('invW'), {
    codigo_barras: codigo_barras,
    placa: placa
  });
}

function apiTramListar() {
  return apiPost(getUrl('tramLista'), {}, API_TIMEOUT_LONG);
}

/* ============================================================
   APIs DE REGISTRO DE ACTIVIDADES (Supabase - REEMPLAZA SharePoint)
   ============================================================
   Formato de respuesta compatible: devuelve { value: [...] }
   ============================================================ */

/* Consulta TODAS las actividades registradas */
function apiAvanceConsultar() {
  var path = '/rest/v1/' + SUPABASE_TABLES.registro +
             '?select=id,codigo_barras,actividad_num,estado,fecha_registro,comentario,created_at' +
             '&order=codigo_barras.asc,actividad_num.asc';
  return apiSupabase('GET', path, null, API_TIMEOUT_LONG)
    .then(function(rows) {
      return { value: rows || [] };
    });
}

/* Escribe una actividad ejecutada
   payload esperado (formato legacy compatible):
   { codigo_barras, actividad_num, actividad, dia, estado, responsable,
     fecha_registro } */
function apiAvanceEscribir(payload) {
  var supabasePayload = {
    codigo_barras: payload.codigo_barras || payload.Title || '',
    actividad_num: parseInt(payload.actividad_num, 10)
  };

  if (payload.estado) supabasePayload.estado = payload.estado;
  if (payload.fecha_registro) supabasePayload.fecha_registro = payload.fecha_registro;
  if (payload.comentario) supabasePayload.comentario = payload.comentario;

  var path = '/rest/v1/' + SUPABASE_TABLES.registro;
  return apiSupabase('POST', path, supabasePayload)
    .catch(function(err) {
      // Duplicados bloqueados por UNIQUE constraint = OK silencioso
      if (String(err.message).indexOf('duplicate key') >= 0 ||
          String(err.message).indexOf('uq_registro_actividad') >= 0) {
        console.warn('Registro duplicado bloqueado por BD:', supabasePayload);
        return { alreadyExists: true };
      }
      throw err;
    });
}

/* Consulta el catálogo de actividades manuales activas
   Nuevo endpoint para futura carga dinámica del catálogo */
function apiCatalogoConsultar() {
  var path = '/rest/v1/' + SUPABASE_TABLES.catalogo +
             '?select=actividad_num,nombre,responsable,tipo' +
             '&activa=eq.true' +
             '&tipo=eq.manual' +
             '&order=actividad_num.asc';
  return apiSupabase('GET', path);
}

/* Consulta los registros ejecutados de UNA moto específica
   Útil para poblar el estado local al abrir una moto (bloqueo global) */
function apiAvanceConsultarMoto(codigoBarras) {
  var path = '/rest/v1/' + SUPABASE_TABLES.registro +
             '?select=actividad_num,estado,fecha_registro' +
             '&codigo_barras=eq.' + encodeURIComponent(codigoBarras) +
             '&order=actividad_num.asc';
  return apiSupabase('GET', path);
}

/* Consulta lista de asesores activos desde Supabase */
function apiAsesoresConsultar() {
  var path = '/rest/v1/asesores' +
             '?select=id,nombre_completo,area,activo' +
             '&activo=eq.true' +
             '&order=nombre_completo.asc';
  return apiSupabase('GET', path);
}

/* ============================================================
   APIs DE PLAN DE ALISTAMIENTOS
   ============================================================ */

function apiPlanConsultar(filter) {
  return apiPost(getUrl('planC'), {
    codigoBarras: filter || '*'
  }, 15000);
}

function apiPlanEscribir(payload) {
  return apiPost(getUrl('planW'), payload);
}

/* ============================================================
   APIs DE SERVICIO TÉCNICO
   ============================================================ */

function apiAlistConsultar(chasis) {
  return apiPost(getUrl('alistC'), {
    chasis: chasis,
    codigoBarras: chasis
  });
}

function apiAlistEscribir(payload) {
  return apiPost(getUrl('alistW'), payload);
}

/* ============================================================
   APIs DE INVENTARIO
   ============================================================ */

function apiInvEscribirPlaca(codigoBarras, placa) {
  return apiPost(getUrl('invEscrPlaca'), {
    codigo_barras: codigoBarras,
    placa: placa
  });
}
/* ============================================================
   apiRegAlistCrear — Crea N registros en registro_alistamientos
   ============================================================
   Insert masivo. Consulta primero los IDs de los procesos por
   nombre. Todos se crean con estado='pendiente', tecnico_id=null,
   fecha_programacion=ahora.

   procesosNombres: array como ['Alistamiento', 'Marcación', 'GPS']
   ============================================================ */
function apiRegAlistCrear(codigo_barras, procesosNombres) {
  if (!procesosNombres || !procesosNombres.length) {
    return Promise.reject(new Error('Sin procesos a crear'));
  }

  // 1. Consultar los IDs de los procesos por nombre
  var nombresQuery = procesosNombres.map(function(n) {
    return '"' + n.replace(/"/g, '\\"') + '"';
  }).join(',');
  var pathProc = '/rest/v1/procesos_alistamiento' +
                 '?select=id,nombre' +
                 '&nombre=in.(' + nombresQuery + ')';

  return apiSupabase('GET', pathProc).then(function(procesos) {
    if (!procesos || !procesos.length) {
      throw new Error('No se encontraron procesos con esos nombres');
    }

    var nowIso = new Date().toISOString();

    // 2. Armar las filas a insertar
    var filas = procesos.map(function(p) {
      return {
        codigo_barras: codigo_barras,
        proceso_id: p.id,
        tecnico_id: null,
        fecha_programacion: nowIso,
        estado: 'pendiente'
      };
    });

    // 3. Insert masivo
    return apiSupabase('POST', '/rest/v1/registro_alistamientos', filas);
  });
}

/* ============================================================
   apiRegAlistConsultar — Trae registros con JOIN a procesos/técnicos
   ============================================================
   Filtros opcionales:
   - codigo (string): un solo código de barras
   - fecha (YYYY-MM-DD): solo registros de esa fecha específica
   - fechaDesde (YYYY-MM-DD): rango — desde esta fecha
   - fechaHasta (YYYY-MM-DD): rango — hasta esta fecha
   - estado ('pendiente' | 'ejecutada'): filtra por estado

   Nota: si se pasa 'fecha', ignora 'fechaDesde/fechaHasta'
   ============================================================ */
function apiRegAlistConsultar(opts) {
  opts = opts || {};
  var params = [];

  params.push('select=id,codigo_barras,estado,fecha_programacion,fecha_ejecucion,observaciones,created_at,updated_at,proceso:procesos_alistamiento(id,nombre,orden),tecnico:tecnicos_alistamiento(id,nombre_completo,tipo)');

  if (opts.codigo) {
    params.push('codigo_barras=eq.' + encodeURIComponent(opts.codigo));
  }
  if (opts.estado) {
    params.push('estado=eq.' + encodeURIComponent(opts.estado));
  }

  // Fecha única tiene prioridad sobre rango
  if (opts.fecha) {
    params.push('fecha_programacion=gte.' + opts.fecha + 'T00:00:00');
    params.push('fecha_programacion=lte.' + opts.fecha + 'T23:59:59');
  } else {
    if (opts.fechaDesde) {
      params.push('fecha_programacion=gte.' + opts.fechaDesde + 'T00:00:00');
    }
    if (opts.fechaHasta) {
      params.push('fecha_programacion=lte.' + opts.fechaHasta + 'T23:59:59');
    }
  }

  params.push('order=fecha_programacion.desc,created_at.desc');

  var path = '/rest/v1/registro_alistamientos?' + params.join('&');
  return apiSupabase('GET', path);
}

/* ============================================================
   apiRegAlistMarcarEjecutada — Marca un registro como ejecutado
   ============================================================
   Actualiza estado, fecha_ejecucion y opcionalmente tecnico_id.
   ============================================================ */
function apiRegAlistMarcarEjecutada(registroId, tecnicoNombre) {
  var nowIso = new Date().toISOString();
  var body = {
    estado: 'ejecutada',
    fecha_ejecucion: nowIso
  };

  // Si viene técnico, resolver su ID primero
  if (tecnicoNombre) {
    var pathTec = '/rest/v1/tecnicos_alistamiento' +
                  '?select=id&nombre_completo=eq.' + encodeURIComponent(tecnicoNombre);
    return apiSupabase('GET', pathTec).then(function(tecnicos) {
      if (tecnicos && tecnicos.length) body.tecnico_id = tecnicos[0].id;
      return apiSupabase('PATCH', '/rest/v1/registro_alistamientos?id=eq.' + registroId, body);
    });
  }

  return apiSupabase('PATCH', '/rest/v1/registro_alistamientos?id=eq.' + registroId, body);
}

/* ============================================================
   apiRegListar — Consulta registros de actividades con JOIN
   ============================================================
   Trae los registros de registro_actividades con el catálogo
   embebido para tener el nombre del proceso y el responsable.
   Usado por Negocios activos para calcular en qué actividad
   está cada moto.
   ============================================================ */
function apiRegListar() {
  var path = '/rest/v1/registro_actividades?' +
    'select=id,codigo_barras,actividad_num,estado,fecha_programacion,fecha_ejecucion,responsable,ejecuto,observaciones,created_at,updated_at,' +
    'catalogo:catalogo_actividades(actividad_num,nombre,responsable,tipo,orden)' +
    '&order=created_at.desc';
  return apiSupabase('GET', path);
}
