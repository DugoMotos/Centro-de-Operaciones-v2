/* ============================================================
   PLAN.JS — Vista consolidada por moto de alistamientos
   ============================================================
   Muestra alistamientos programados desde Supabase agrupados
   por moto. Filtros por rango de fechas con presets rápidos.
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

/* Presets rápidos de rango */
function planSetPresetRango(preset) {
  var hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  var hastaDate = new Date(hoy);
  var desdeDate = new Date(hoy);

  if (preset === 'hoy') {
    // desde/hasta = hoy
  } else if (preset === 'ayer') {
    desdeDate.setDate(desdeDate.getDate() - 1);
    hastaDate.setDate(hastaDate.getDate() - 1);
  } else if (preset === '7d') {
    desdeDate.setDate(desdeDate.getDate() - 6);
  } else if (preset === '30d') {
    desdeDate.setDate(desdeDate.getDate() - 29);
  }

  planFechaDesde = planIsoDate(desdeDate);
  planFechaHasta = planIsoDate(hastaDate);
  planSync();
}

/* Cambio de fecha "Desde": NO recarga, solo actualiza variable */
function planSetFechaDesde(val) {
  planFechaDesde = val;
  // No sincroniza aún, espera a que HASTA esté completo o que se cambie HASTA
  render();
}

/* Cambio de fecha "Hasta": SÍ recarga si ambas fechas están completas */
function planSetFechaHasta(val) {
  planFechaHasta = val;
  if (planFechaDesde && planFechaHasta) {
    planSync();
  } else {
    render();
  }
}

/* Detectar qué preset está activo (para resaltar el botón) */
function planPresetActivo() {
  if (!planFechaDesde || !planFechaHasta) return '';
  var hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  var hoyIso = planIsoDate(hoy);

  if (planFechaDesde === hoyIso && planFechaHasta === hoyIso) return 'hoy';

  var ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  var ayerIso = planIsoDate(ayer);
  if (planFechaDesde === ayerIso && planFechaHasta === ayerIso) return 'ayer';

  var hace7 = new Date(hoy);
  hace7.setDate(hace7.getDate() - 6);
  if (planFechaDesde === planIsoDate(hace7) && planFechaHasta === hoyIso) return '7d';

  var hace30 = new Date(hoy);
  hace30.setDate(hace30.getDate() - 29);
  if (planFechaDesde === planIsoDate(hace30) && planFechaHasta === hoyIso) return '30d';

  return '';
}

/* ============================================================
   renderPlan — Vista principal del módulo
   ============================================================ */
function renderPlan() {
  var h = '<div class="eyebrow">SERVICIO TÉCNICO</div><h1 class="h1">Plan de alistamientos</h1>';

  // Subtítulo con rango actual
  var rangoTexto = '';
  if (planFechaDesde && planFechaHasta) {
    if (planFechaDesde === planFechaHasta) {
      rangoTexto = planFmtFecha(planFechaDesde);
    } else {
      rangoTexto = 'Desde ' + planFmtFecha(planFechaDesde) + ' hasta ' + planFmtFecha(planFechaHasta);
    }
  } else if (planFechaDesde) {
    rangoTexto = 'Desde ' + planFmtFecha(planFechaDesde) + ' (seleccioná "Hasta")';
  } else {
    rangoTexto = 'Últimos 30 días';
  }
  h += '<div class="sub-title">Vista consolidada por moto · ' + rangoTexto + '</div>';

  // ═══════════════════════════════════════════════════════
  // TOOLBAR: presets + rango + filtros + acciones
  // ═══════════════════════════════════════════════════════

  // Fila 1: presets rápidos
  var presetActivo = planPresetActivo();
  h += '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center">';
  h += '<span style="font-size:10px;color:var(--tm);letter-spacing:0.5px;text-transform:uppercase;font-weight:600;margin-right:4px">Rango:</span>';
  var presets = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'ayer', label: 'Ayer' },
    { id: '7d', label: '7 días' },
    { id: '30d', label: '30 días' }
  ];
  presets.forEach(function(p) {
    var isActive = presetActivo === p.id;
    var bg = isActive ? 'rgba(94,106,210,0.15)' : 'transparent';
    var color = isActive ? '#B7BEEF' : 'var(--tm)';
    var border = isActive ? '#5E6AD2' : 'var(--bd)';
    h += '<button style="background:' + bg + ';color:' + color + ';border:0.5px solid ' + border + ';border-radius:5px;padding:4px 12px;font-size:11px;cursor:pointer;font-weight:500;font-family:inherit" ' +
         'onclick="planSetPresetRango(\'' + p.id + '\')">' + p.label + '</button>';
  });
  h += '</div>';

  // Fila 2: filtros
  h += '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center">';

  // Rango de fechas manual
  h += '<div style="display:flex;align-items:center;gap:6px">';
  h += '<span style="font-size:10px;color:var(--tm);letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Desde</span>';
  h += '<input type="date" class="inp" style="width:130px;height:32px;padding:4px 8px;font-size:11px" ' +
       'value="' + esc(planFechaDesde || '') + '" ' +
       'onchange="planSetFechaDesde(this.value)">';
  h += '<span style="font-size:10px;color:var(--tm);letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Hasta</span>';
  h += '<input type="date" class="inp" style="width:130px;height:32px;padding:4px 8px;font-size:11px" ' +
       'value="' + esc(planFechaHasta || '') + '" ' +
       'onchange="planSetFechaHasta(this.value)">';
  if (planFechaDesde || planFechaHasta) {
    h += '<button style="background:rgba(226,75,74,0.15);color:#F26F6E;border:none;border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:1" ' +
         'title="Limpiar rango" ' +
         'onclick="planFechaDesde=\'\';planFechaHasta=\'\';planSync()">×</button>';
  }
  h += '</div>';

  // Filtros (proceso, estado, buscador)
  var uniqueProcesos = [];
  var uniqueEstados = [];
  (planData || []).forEach(function(r) {
    if (r.proceso && uniqueProcesos.indexOf(r.proceso) < 0) uniqueProcesos.push(r.proceso);
    if (r.estado && uniqueEstados.indexOf(r.estado) < 0) uniqueEstados.push(r.estado);
  });
  uniqueProcesos.sort();
  uniqueEstados.sort();

  h += '<select class="inp" style="width:150px;height:32px;padding:4px 8px;font-size:11px" onchange="planFilterProc=this.value;render()">' +
       '<option value="">Todos los procesos</option>';
  uniqueProcesos.forEach(function(p) {
    h += '<option value="' + esc(p) + '"' + (planFilterProc === p ? ' selected' : '') + '>' + esc(p) + '</option>';
  });
  h += '</select>';

  h += '<select class="inp" style="width:130px;height:32px;padding:4px 8px;font-size:11px" onchange="planFilterEstado=this.value;render()">' +
       '<option value="">Todos los estados</option>';
  uniqueEstados.forEach(function(e) {
    h += '<option value="' + esc(e) + '"' + (planFilterEstado === e ? ' selected' : '') + '>' + esc(e) + '</option>';
  });
  h += '</select>';

  h += '<input class="inp" style="width:180px;height:32px;padding:4px 8px;font-size:11px" ' +
       'placeholder="Buscar código o proceso" ' +
       'value="' + esc(planFilter || '') + '" oninput="planFilter=this.value;render()">';

  if (planFilter || planFilterProc || planFilterEstado) {
    h += '<button class="btn" style="width:auto;padding:0 12px;height:32px;font-size:11px" ' +
         'onclick="planFilter=\'\';planFilterProc=\'\';planFilterEstado=\'\';render()">Limpiar filtros</button>';
  }

  h += '<div style="flex:1"></div>';

  h += '<button class="btn btn-p" style="width:auto;padding:0 14px;height:32px;font-size:11px" ' +
       'onclick="planSync()">🔄 Actualizar</button>';

  h += '</div>';

  // ═══════════════════════════════════════════════════════
  // ESTADOS
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

  // Agrupar por moto
  var motos = {};
  filtered.forEach(function(r) {
    var code = r.codigo_barras;
    if (!motos[code]) motos[code] = [];
    motos[code].push(r);
  });
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

  var marcaBg = marca === 'HERO'
    ? 'linear-gradient(135deg,#085041 0%,#1D9E75 100%)'
    : marca === 'SYM'
    ? 'linear-gradient(135deg,#712B13 0%,#993C1D 100%)'
    : marca === 'BAJAJ'
    ? 'linear-gradient(135deg,#1E3A8A 0%,#3B82F6 100%)'
    : 'linear-gradient(135deg,#4A4A4A 0%,#6B6B6B 100%)';

  var h = '<div style="margin-bottom:10px;border:0.5px solid var(--bd);border-radius:8px;overflow:hidden;background:var(--sf)">';

  h += '<div style="cursor:pointer" onclick="planToggle(\'' + code + '\')">';
  h += '<div style="background:' + marcaBg + ';padding:10px 14px;display:flex;align-items:center;justify-content:space-between">';
  h += '<div style="display:flex;align-items:center;gap:12px">';
  h += '<span style="font-family:var(--fm);font-size:12px;font-weight:600;background:rgba(255,255,255,0.15);color:#fff;padding:4px 10px;border-radius:4px">' + esc(code) + '</span>';
  if (marca) h += '<span style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,0.7)">' + esc(marca) + '</span>';
  if (linea || ref) h += '<span style="font-size:13px;color:#fff;font-weight:600">' + esc((linea + ' ' + ref).trim()) + '</span>';
  h += '</div>';
  h += '<div style="display:flex;align-items:center;gap:12px">';
  var statusColor = completo ? '#6EDA92' : (ejecutadas > 0 ? '#F5C572' : 'rgba(255,255,255,0.7)');
  h += '<span style="font-size:11px;color:' + statusColor + ';font-weight:600">' + ejecutadas + '/' + total + '</span>';
  h += '<span style="font-size:11px;color:rgba(255,255,255,0.7)">' + (expanded ? '▲' : '▼') + '</span>';
  h += '</div>';
  h += '</div>';

  // Barra inferior con chasis completo y ubicación
  h += '<div style="background:rgba(0,0,0,0.15);padding:6px 14px;display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.6)">';
  h += '<div>Chasis: <span style="font-family:var(--fm);color:#fff">' + esc(chasis || code) + '</span></div>';
  if (ubicacion) h += '<div>📍 ' + esc(ubicacion) + '</div>';
  h += '</div>';
  h += '</div>';

  if (expanded) {
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

      h += '<div>';
      h += '<div style="display:flex;align-items:center;gap:8px">';
      h += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + procColor + '"></span>';
      h += '<span style="font-size:12px;color:var(--tx);font-weight:500">' + esc(r.proceso) + '</span>';
      h += '<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:' + tagBg + ';color:' + tagColor + ';font-weight:600">' + tagText + '</span>';
      h += '</div>';

      var detalles = [];
      detalles.push('Programada: ' + planFmtFechaHora(r.fecha));
      if (isEjec) {
        if (r.ejecuto) detalles.push('Por: ' + esc(r.ejecuto));
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
