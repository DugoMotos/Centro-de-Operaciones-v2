/* ============================================================
   PLAN.JS — Vista consolidada por moto de alistamientos
   ============================================================
   Muestra alistamientos programados desde Supabase agrupados
   por moto (código_barras). Cada moto se expande para ver
   sus procesos con estado y quién los ejecutó.

   Consulta 2 fuentes en paralelo:
   - Supabase (registro_alistamientos con JOIN procesos/técnicos)
   - BD_Tramites (para obtener ubicación, marca, chasis real)

   Rango de fechas: por defecto últimos 30 días (evita trae toda
   la historia). Editable por el usuario en la toolbar.
   ============================================================ */

/* Formatear fecha corta: dd/mm/aaaa */
function planFmtFecha(valor) {
  if (!valor) return '';
  try {
    var d;
    if (typeof valor === 'string' && valor.indexOf('/') >= 0) {
      var p = valor.split('/');
      d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    } else if (typeof valor === 'number') {
      // Serial de Excel (número de días desde 1900)
      d = new Date((valor - 25569) * 86400 * 1000);
    } else {
      d = new Date(valor);
    }
    if (isNaN(d.getTime())) return String(valor);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    return dd + '/' + mm + '/' + yy;
  } catch (e) { return String(valor); }
}

/* Formatear fecha + hora: dd/mm/aaaa hh:mm */
function planFmtFechaHora(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var parts = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);
    var dd = '', mm = '', yy = '', hh = '', min = '';
    parts.forEach(function(p) {
      if (p.type === 'day') dd = p.value;
      else if (p.type === 'month') mm = p.value;
      else if (p.type === 'year') yy = p.value;
      else if (p.type === 'hour') hh = p.value;
      else if (p.type === 'minute') min = p.value;
    });
    return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + min;
  } catch (e) { return ''; }
}

/* Formato ISO YYYY-MM-DD desde Date */
function planIsoDate(d) {
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

/* Colores por proceso */
var PLAN_PROC_COLOR = {
  'Alistamiento': '#34D399',
  'Marcación': '#60A5FA',
  'Defensas': '#FB923C',
  'Instalación GPS': '#22D3EE',
  'Instalación Placa': '#A78BFA'
};

/* Toggle expandir/colapsar una moto */
function planToggle(code) {
  planExpanded[code] = !planExpanded[code];
  render();
}

/* ============================================================
   renderPlan — Vista principal del módulo
   ============================================================ */
function renderPlan() {
  var h = '<div class="eyebrow">SERVICIO TÉCNICO</div><h1 class="h1">Plan de alistamientos</h1>';

  // Subtítulo informativo con rango actual
  var rangoTexto = '';
  if (planFechaDesde && planFechaHasta) {
    rangoTexto = 'Desde ' + planFmtFecha(planFechaDesde) + ' hasta ' + planFmtFecha(planFechaHasta);
  } else if (planFechaDesde) {
    rangoTexto = 'Desde ' + planFmtFecha(planFechaDesde);
  } else if (planFechaHasta) {
    rangoTexto = 'Hasta ' + planFmtFecha(planFechaHasta);
  } else {
    rangoTexto = 'Últimos 30 días';
  }
  h += '<div class="sub-title">Vista consolidada por moto · ' + rangoTexto + '</div>';

  // ═══════════════════════════════════════════════════════
  // TOOLBAR: rango fechas + filtros + acciones
  // ═══════════════════════════════════════════════════════
  h += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">';

  // Rango de fechas
  h += '<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;background:rgba(255,255,255,0.02);border:0.5px solid var(--bd);border-radius:6px">';
  h += '<span style="font-size:10px;color:var(--tm);letter-spacing:0.5px;text-transform:uppercase;font-weight:600;margin-right:4px">Desde</span>';
  h += '<input type="date" class="inp" style="max-width:135px;height:28px;padding:2px 6px;font-size:11px" ' +
       'value="' + (planFechaDesde || '') + '" ' +
       'onchange="planFechaDesde=this.value;planSync()">';
  h += '<span style="font-size:10px;color:var(--tm);letter-spacing:0.5px;text-transform:uppercase;font-weight:600;margin:0 4px">Hasta</span>';
  h += '<input type="date" class="inp" style="max-width:135px;height:28px;padding:2px 6px;font-size:11px" ' +
       'value="' + (planFechaHasta || '') + '" ' +
       'onchange="planFechaHasta=this.value;planSync()">';
  if (planFechaDesde || planFechaHasta) {
    h += '<button style="background:rgba(226,75,74,0.15);color:#F26F6E;border:none;border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:1;margin-left:4px" ' +
         'title="Limpiar rango" ' +
         'onclick="planFechaDesde=\'\';planFechaHasta=\'\';planSync()">×</button>';
  }
  h += '</div>';

  // Filtros
  var uniqueProcesos = [];
  var uniqueEstados = [];
  (planData || []).forEach(function(r) {
    if (r.proceso && uniqueProcesos.indexOf(r.proceso) < 0) uniqueProcesos.push(r.proceso);
    if (r.estado && uniqueEstados.indexOf(r.estado) < 0) uniqueEstados.push(r.estado);
  });
  uniqueProcesos.sort();
  uniqueEstados.sort();

  h += '<select class="inp" style="max-width:150px" onchange="planFilterProc=this.value;render()">' +
       '<option value="">Todos los procesos</option>';
  uniqueProcesos.forEach(function(p) {
    h += '<option value="' + p + '"' + (planFilterProc === p ? ' selected' : '') + '>' + p + '</option>';
  });
  h += '</select>';

  h += '<select class="inp" style="max-width:130px" onchange="planFilterEstado=this.value;render()">' +
       '<option value="">Todos los estados</option>';
  uniqueEstados.forEach(function(e) {
    h += '<option value="' + e + '"' + (planFilterEstado === e ? ' selected' : '') + '>' + e + '</option>';
  });
  h += '</select>';

  // Buscador
  h += '<input class="inp" style="max-width:200px" placeholder="Buscar código o proceso" ' +
       'value="' + (planFilter || '') + '" oninput="planFilter=this.value;render()">';

  // Botón limpiar filtros
  if (planFilter || planFilterProc || planFilterEstado) {
    h += '<button class="btn" style="width:auto;padding:0 12px;height:34px;font-size:11px" ' +
         'onclick="planFilter=\'\';planFilterProc=\'\';planFilterEstado=\'\';render()">Limpiar filtros</button>';
  }

  h += '<div style="flex:1"></div>';

  // Botón actualizar
  h += '<button class="btn btn-p" style="width:auto;padding:0 14px;height:34px;font-size:12px" ' +
       'onclick="planSync()">🔄 Actualizar</button>';

  h += '</div>';

  // ═══════════════════════════════════════════════════════
  // ESTADOS: cargando / sin datos / con datos
  // ═══════════════════════════════════════════════════════
  if (planLoading) {
    h += '<div style="text-align:center;padding:40px"><div style="width:32px;height:32px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div><div style="font-size:11px;color:var(--tm);margin-top:10px">Cargando plan de alistamientos...</div></div>';
    return h;
  }

  if (!planData) {
    h += '<div style="text-align:center;padding:40px;color:var(--tm);font-size:12px">Presiona 🔄 Actualizar para cargar el plan de alistamientos</div>';
    return h;
  }

  // Aplicar filtros
  var filtered = planData.slice();
  if (planFilter) {
    var q = planFilter.toLowerCase();
    filtered = filtered.filter(function(r) {
      return (r.codigo_barras || '').toLowerCase().indexOf(q) >= 0 ||
             (r.proceso || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  if (planFilterProc) {
    filtered = filtered.filter(function(r) { return r.proceso === planFilterProc; });
  }
  if (planFilterEstado) {
    filtered = filtered.filter(function(r) { return r.estado === planFilterEstado; });
  }

  if (filtered.length === 0) {
    h += '<div style="text-align:center;padding:40px;color:var(--tm);font-size:12px">Sin actividades para el rango y filtros aplicados</div>';
    return h;
  }

  // Agrupar por moto (código_barras)
  var motos = {};
  filtered.forEach(function(r) {
    var code = r.codigo_barras;
    if (!motos[code]) motos[code] = [];
    motos[code].push(r);
  });

  // Ordenar códigos alfabéticamente
  var codesOrdenados = Object.keys(motos).sort();

  // KPIs generales
  var totalActividades = filtered.length;
  var totalEjecutadas = filtered.filter(function(r) {
    return r.estado === 'ejecutada' || r.estado === 'ejecutado';
  }).length;
  var totalPendientes = totalActividades - totalEjecutadas;

  h += '<div style="display:flex;gap:12px;margin-bottom:14px;font-size:11px">';
  h += '<div style="color:var(--tm)">Motos: <strong style="color:var(--tx)">' + codesOrdenados.length + '</strong></div>';
  h += '<div style="color:var(--tm)">Actividades: <strong style="color:var(--tx)">' + totalActividades + '</strong></div>';
  h += '<div style="color:var(--tm)">Ejecutadas: <strong style="color:#6EDA92">' + totalEjecutadas + '</strong></div>';
  h += '<div style="color:var(--tm)">Pendientes: <strong style="color:#F5C572">' + totalPendientes + '</strong></div>';
  h += '</div>';

  // Renderizar cada moto
  codesOrdenados.forEach(function(code) {
    h += planRenderMotoCard(code, motos[code]);
  });

  return h;
}

/* ============================================================
   planRenderMotoCard — Card por moto (colapsable)
   ============================================================ */
function planRenderMotoCard(code, actividades) {
  var motoInfo = planUbicaciones[code] || {};
  var marca = (motoInfo.marca || '').toUpperCase();
  var linea = motoInfo.linea || '';
  var ref = motoInfo.referencia || '';
  var chasis = motoInfo.chasis || '';
  var ubicacion = motoInfo.ubicacion || '';

  var ejecutadas = actividades.filter(function(r) {
    return r.estado === 'ejecutada' || r.estado === 'ejecutado';
  }).length;
  var total = actividades.length;
  var completo = ejecutadas === total;

  var expanded = !!planExpanded[code];

  // Estilo del encabezado según marca
  var marcaBg = marca === 'HERO'
    ? 'linear-gradient(135deg,#085041 0%,#1D9E75 100%)'
    : marca === 'SYM'
    ? 'linear-gradient(135deg,#712B13 0%,#993C1D 100%)'
    : marca === 'BAJAJ'
    ? 'linear-gradient(135deg,#1E3A8A 0%,#3B82F6 100%)'
    : 'linear-gradient(135deg,#4A4A4A 0%,#6B6B6B 100%)';

  // Chasis con últimos 6 destacados
  var chasisDisplay = chasis || code;
  if (chasis && chasis.length > 6) {
    var head = chasis.substring(0, chasis.length - 6);
    var tail = chasis.substring(chasis.length - 6);
    chasisDisplay = '<span style="opacity:0.5">' + head + '</span><strong style="color:#fff">' + tail + '</strong>';
  }

  var h = '<div style="margin-bottom:10px;border:0.5px solid var(--bd);border-radius:8px;overflow:hidden;background:var(--sf)">';

  // Encabezado clickeable
  h += '<div style="cursor:pointer" onclick="planToggle(\'' + code + '\')">';
  h += '<div style="background:' + marcaBg + ';padding:10px 14px;display:flex;align-items:center;justify-content:space-between">';
  h += '<div style="display:flex;align-items:center;gap:12px">';
  h += '<span style="font-family:var(--fm);font-size:12px;font-weight:600;background:rgba(255,255,255,0.15);color:#fff;padding:4px 10px;border-radius:4px">' + code + '</span>';
  if (marca) h += '<span style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,0.7)">' + marca + '</span>';
  if (linea || ref) h += '<span style="font-size:13px;color:#fff;font-weight:600">' + (linea + ' ' + ref).trim() + '</span>';
  h += '</div>';
  h += '<div style="display:flex;align-items:center;gap:12px">';
  var statusColor = completo ? '#6EDA92' : (ejecutadas > 0 ? '#F5C572' : 'rgba(255,255,255,0.7)');
  h += '<span style="font-size:11px;color:' + statusColor + ';font-weight:600">' + ejecutadas + '/' + total + '</span>';
  h += '<span style="font-size:11px;color:rgba(255,255,255,0.7)">' + (expanded ? '▲' : '▼') + '</span>';
  h += '</div>';
  h += '</div>';

  // Barra inferior con chasis y ubicación
  h += '<div style="background:rgba(0,0,0,0.15);padding:6px 14px;display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.6)">';
  h += '<div>Chasis: <span style="font-family:var(--fm)">' + chasisDisplay + '</span></div>';
  if (ubicacion) h += '<div>📍 ' + ubicacion + '</div>';
  h += '</div>';
  h += '</div>';

  // Actividades (expandido)
  if (expanded) {
    // Ordenar por orden del proceso
    actividades.sort(function(a, b) {
      var oA = a.proceso_orden || 99;
      var oB = b.proceso_orden || 99;
      return oA - oB;
    });

    h += '<div style="padding:8px 14px">';
    actividades.forEach(function(r) {
      var isEjec = r.estado === 'ejecutada' || r.estado === 'ejecutado';
      var procColor = PLAN_PROC_COLOR[r.proceso] || '#6d6d75';
      var tagBg = isEjec ? 'rgba(34,197,94,0.15)' : 'rgba(245,165,36,0.15)';
      var tagColor = isEjec ? '#6EDA92' : '#F5C572';
      var tagText = isEjec ? 'Ejecutada' : 'Pendiente';

      h += '<div style="display:grid;grid-template-columns:1fr auto;gap:12px;padding:8px 0;border-bottom:0.5px solid rgba(255,255,255,0.04)">';

      // Info del proceso
      h += '<div>';
      h += '<div style="display:flex;align-items:center;gap:8px">';
      h += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + procColor + '"></span>';
      h += '<span style="font-size:12px;color:var(--tx);font-weight:500">' + r.proceso + '</span>';
      h += '<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:' + tagBg + ';color:' + tagColor + ';font-weight:600">' + tagText + '</span>';
      h += '</div>';

      // Detalles
      var detalles = [];
      detalles.push('Programada: ' + planFmtFechaHora(r.fecha));
      if (isEjec) {
        if (r.ejecuto) detalles.push('Por: ' + r.ejecuto);
        if (r.fecha_ejecucion) detalles.push('Ejecutada: ' + planFmtFechaHora(r.fecha_ejecucion));
      }
      h += '<div style="font-size:10px;color:var(--tm);margin-top:3px;margin-left:16px">' + detalles.join(' · ') + '</div>';
      h += '</div>';

      h += '</div>';
    });
    h += '</div>';
  }

  h += '</div>';
  return h;
}

/* ============================================================
   planSync — Cargar plan desde Supabase + BD_Tramites
   ============================================================ */
function planSync() {
  planLoading = true;
  render();

  // Preparar rango de fechas
  var opts = {};
  if (planFechaDesde) opts.fechaDesde = planFechaDesde;
  if (planFechaHasta) opts.fechaHasta = planFechaHasta;

  // Si no hay rango, últimos 30 días por defecto
  if (!planFechaDesde && !planFechaHasta) {
    var hoy = new Date();
    var hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    opts.fechaDesde = planIsoDate(hace30);
    opts.fechaHasta = planIsoDate(hoy);
  }

  Promise.all([
    apiRegAlistConsultar(opts),
    pCfg.tramC ? apiTramListar() : Promise.resolve({ value: [] })
  ]).then(function(results) {
    // 1. Adaptar registros de Supabase
    var registros = results[0] || [];
    if (!Array.isArray(registros)) registros = [];

    planData = registros.map(function(r) {
      return {
        id: r.id,
        codigo_barras: r.codigo_barras,
        fecha: r.fecha_programacion,
        fecha_ejecucion: r.fecha_ejecucion,
        proceso: (r.proceso && r.proceso.nombre) || '—',
        proceso_orden: (r.proceso && r.proceso.orden) || 0,
        estado: r.estado,
        ejecuto: (r.tecnico && r.tecnico.nombre_completo) || '',
        responsable: (r.tecnico && r.tecnico.nombre_completo) || ''
      };
    });

    // 2. Indexar motos desde BD_Tramites
    var tramMotos = results[1].value || results[1] || [];
    if (!Array.isArray(tramMotos)) tramMotos = [];
    planUbicaciones = {};
    tramMotos.forEach(function(m) {
      var code = (m.codigo_barras || m.codigoBarras || m.Title || '').toUpperCase();
      if (!code) return;
      planUbicaciones[code] = {
        ubicacion: m.ubicacion || m.UBICACION || m.Ubicacion || '',
        chasis: m.chasis || m.CHASIS || m.Chasis || '',
        modelo: m.modelo || m.MODELO || m.Modelo || '',
        color: m.color || m.COLOR || m.Color || '',
        marca: m.marca || m.MARCA || m.Marca || '',
        linea: m.linea || m.LINEA || m.Linea || '',
        referencia: m.referencia || m.REFERENCIA || m.Referencia || ''
      };
    });

    planLoading = false;
    planExpanded = {};
    toast('✓ ' + planData.length + ' actividades / ' + tramMotos.length + ' motos');
    render();
  }).catch(function(e) {
    planLoading = false;
    toast('Error al cargar: ' + (e.message || 'desconocido'), 1);
    render();
  });
}
