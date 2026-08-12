/* ============================================================
   PLAN.JS — Módulo Plan de alistamientos
   ============================================================
   Funciones expuestas:
   - renderPlan(): genera el HTML del módulo
   - planSync(): carga datos desde SharePoint BD_Plan
   - planToggle(code): expande/colapsa una moto
   - planCargarUbicacion(code): trae ubicación desde BD_Tramites

   Estado: variables plan* en state.js
   APIs: apiPlanConsultar, apiTramConsultarMoto

   Cambios ago 2026:
   - Consolidación por código de barras con contador X/Y
   - Expand/collapse para ver detalle de actividades
   - Ubicación desde BD_Tramites (consulta on-demand)
   - Fecha formateada dd/mm/aaaa + hora de Modified
   ============================================================ */

/* Helper: fecha dd/mm/aaaa desde cualquier formato */
function planFmtFecha(valor) {
  if (!valor) return '';
  try {
    var d;
    var numVal = Number(valor);
    if (!isNaN(numVal) && numVal > 25569 && numVal < 100000) {
      d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    } else if (typeof valor === 'string' && valor.indexOf('/') >= 0) {
      return valor; // ya formateado
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

/* Helper: hora hh:mm desde ISO */
function planFmtHora(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var opts = { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false };
    var partes = new Intl.DateTimeFormat('es-CO', opts).formatToParts(d);
    var map = {};
    partes.forEach(function(p) { map[p.type] = p.value; });
    return map.hour + ':' + map.minute;
  } catch (e) {
    return '';
  }
}

function renderPlan() {
  var h = '<div class="eyebrow">PROCEDIMIENTO / PLAN</div><h1 class="h1">Plan de alistamientos</h1>' +
    '<div class="sub-title">Vista consolidada de motocicletas y sus actividades</div>';

  if (!pCfg.planC) {
    h += '<div style="text-align:center;padding:30px;color:var(--tm)">' +
      '<div style="font-size:28px;margin-bottom:8px">⚠️</div>' +
      '<div style="font-size:12px">URL de consulta no configurada.<br>Ingresá a Configuración para agregar la URL de BD Plan de alistamientos.</div></div>';
    return h;
  }

  h += '<div class="flex" style="margin-bottom:10px"><button class="btn btn-p" style="width:auto;padding:9px 16px;font-size:12px" onclick="planSync()">🔄 Actualizar datos</button></div>';

  if (planLoading) {
    h += '<div style="text-align:center;padding:30px"><div style="width:30px;height:30px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div><div style="font-size:11px;color:var(--tm);margin-top:8px">Cargando datos...</div></div>';
    return h;
  }

  if (!planData || !planData.length) {
    h += '<div style="text-align:center;padding:30px;color:var(--tm);font-size:12px">Sin datos. Presiona "Actualizar datos" para cargar.</div>';
    return h;
  }

  // Filtros
  h += '<div class="lbl">Filtros</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">';
  h += '<input class="inp inp-sm" id="planFilterInp" placeholder="Código (sin DM)..." value="' + planFilter + '" oninput="planFilter=this.value" onchange="render()" onkeydown="if(event.key===\'Enter\'){planFilter=this.value;render()}">';
  h += '<input type="date" class="inp inp-sm" value="' + planFilterFecha + '" onchange="planFilterFecha=this.value;render()">';
  h += '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">';
  h += '<select class="inp inp-sm" value="' + planFilterProc + '" onchange="planFilterProc=this.value;render()">' +
    '<option value=""' + (planFilterProc === '' ? ' selected' : '') + '>Todos los procesos</option>' +
    '<option value="Alistamiento"' + (planFilterProc === 'Alistamiento' ? ' selected' : '') + '>Alistamiento</option>' +
    '<option value="Marcación"' + (planFilterProc === 'Marcación' ? ' selected' : '') + '>Marcación</option>' +
    '<option value="Defensas"' + (planFilterProc === 'Defensas' ? ' selected' : '') + '>Defensas</option>' +
    '<option value="GPS"' + (planFilterProc === 'GPS' ? ' selected' : '') + '>GPS</option>' +
    '<option value="Placa"' + (planFilterProc === 'Placa' ? ' selected' : '') + '>Placa</option>' +
    '</select>';
  h += '<select class="inp inp-sm" value="' + planFilterEstado + '" onchange="planFilterEstado=this.value;render()">' +
    '<option value=""' + (planFilterEstado === '' ? ' selected' : '') + '>Todos los estados</option>' +
    '<option value="Pendiente"' + (planFilterEstado === 'Pendiente' ? ' selected' : '') + '>Pendiente</option>' +
    '<option value="Ejecutada"' + (planFilterEstado === 'Ejecutada' ? ' selected' : '') + '>Ejecutada</option>' +
    '</select>';
  h += '</div>';
  h += '<div style="margin-bottom:10px"><button style="font-size:10px;color:var(--bl);background:none;border:none;cursor:pointer;text-decoration:underline" onclick="planFilter=\'\';planFilterProc=\'\';planFilterEstado=\'\';planFilterFecha=\'\';planExpanded={};render()">Limpiar filtros</button></div>';

  // Aplicar filtros a nivel actividad (Opción B: los filtros aíslan actividades)
  var filtered = planData.slice();
  if (planFilter) filtered = filtered.filter(function(r) { return (r.codigo_barras || '').toUpperCase().indexOf(planFilter.toUpperCase()) >= 0; });
  if (planFilterFecha) filtered = filtered.filter(function(r) {
    var f = r.fecha || '';
    if (f.indexOf('/') >= 0) {
      var p = f.split('/');
      f = p[2] + '-' + p[1] + '-' + p[0];
    } else {
      f = planFmtFecha(f);
      if (f.indexOf('/') >= 0) {
        var p2 = f.split('/');
        f = p2[2] + '-' + p2[1] + '-' + p2[0];
      }
    }
    return f.indexOf(planFilterFecha) >= 0;
  });
  if (planFilterProc) filtered = filtered.filter(function(r) { return (r.proceso || '') === planFilterProc; });
  if (planFilterEstado === 'Pendiente') filtered = filtered.filter(function(r) {
    var e = (r.estado || '').toLowerCase();
    return !e || e === 'pendiente';
  });
  else if (planFilterEstado === 'Ejecutada') filtered = filtered.filter(function(r) {
    var e = (r.estado || '').toLowerCase();
    return e === 'ejecutada' || e === 'ejecutado';
  });

  // Agrupar por código_barras
  var grupos = {};
  filtered.forEach(function(r) {
    var code = (r.codigo_barras || '').toUpperCase();
    if (!code) return;
    if (!grupos[code]) {
      grupos[code] = {
        code: code,
        actividades: [],
        marca: r.marca || '',
        linea: r.linea || ''
      };
    }
    grupos[code].actividades.push(r);
  });

  var motos = Object.keys(grupos).map(function(k) { return grupos[k]; });
  motos.sort(function(a, b) { return a.code.localeCompare(b.code); });

  // Header con conteos
  var totalMotos = motos.length;
  var totalActs = filtered.length;
  h += '<div style="font-family:var(--fm);font-size:10px;color:var(--tm);margin-bottom:8px">' +
    totalMotos + ' motocicleta' + (totalMotos !== 1 ? 's' : '') + ' · ' +
    totalActs + ' actividad' + (totalActs !== 1 ? 'es' : '') + '</div>';

  if (!motos.length) {
    h += '<div style="text-align:center;padding:24px;color:var(--tl);font-size:12px">Sin resultados con los filtros aplicados</div>';
    return h;
  }

  // Limitar a 50 motos
  motos.slice(0, 50).forEach(function(g) {
    var acts = g.actividades;
    var ejec = acts.filter(function(r) {
      var e = (r.estado || '').toLowerCase();
      return e === 'ejecutada' || e === 'ejecutado';
    });
    var pend = acts.filter(function(r) {
      var e = (r.estado || '').toLowerCase();
      return e !== 'ejecutada' && e !== 'ejecutado';
    });
    var done = ejec.length;
    var total = acts.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    var isExpanded = !!planExpanded[g.code];

    // Encontrar Modified más reciente entre ejecutadas
    var maxIso = null;
    ejec.forEach(function(r) {
      var t = r.Modified || r.modified || r.fecha_ejecucion || null;
      if (t && (!maxIso || t > maxIso)) maxIso = t;
    });
    var ultActFecha = planFmtFecha(maxIso);
    var ultActHora = planFmtHora(maxIso);

    // Fecha de solicitud (la primera actividad tiene la fecha del pedido)
    var fechaSolicitud = planFmtFecha(acts[0].fecha);

    // Ubicación cacheada
    var ubicacion = planUbicaciones[g.code] || '';

    // Tarjeta principal
    h += '<div style="border-radius:8px;background:var(--sf);border:.5px solid var(--bd);margin-bottom:8px;overflow:hidden">';

    // Cabecera clickeable
    h += '<div style="padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="planToggle(\'' + g.code + '\')">';

    // Indicador expand
    h += '<span style="font-size:14px;color:var(--tm);transform:rotate(' + (isExpanded ? '90' : '0') + 'deg);transition:transform .2s;flex-shrink:0">▸</span>';

    // Código + contador
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
    h += '<span style="font-family:var(--fm);font-size:14px;font-weight:700">' + g.code + '</span>';
    h += '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:' + (pct === 100 ? 'var(--gnl)' : pct >= 50 ? 'var(--bll)' : 'var(--yll)') + ';color:' + (pct === 100 ? 'var(--gnd)' : pct >= 50 ? 'var(--bld)' : 'var(--yld)') + '">' + done + '/' + total + '</span>';
    if (fechaSolicitud) {
      h += '<span style="font-size:9px;color:var(--tm);font-family:var(--fm)">Solicitado ' + fechaSolicitud + '</span>';
    }
    h += '</div>';

    // Línea inferior (opcional: ubicación si está cacheada)
    if (ubicacion) {
      h += '<div style="font-size:10px;color:var(--tm);margin-top:3px">📍 ' + ubicacion + '</div>';
    } else if (isExpanded) {
      h += '<div style="font-size:10px;color:var(--tl);font-style:italic;margin-top:3px">Cargando ubicación...</div>';
    }
    h += '</div>';

    // Última actualización (si hay)
    if (ultActFecha) {
      h += '<div style="text-align:right;font-size:9px;color:var(--tm);flex-shrink:0;font-family:var(--fm)">';
      h += '<div>Últ. act.</div>';
      h += '<div style="color:var(--tx);font-weight:600">' + ultActFecha + ' ' + ultActHora + '</div>';
      h += '</div>';
    }

    h += '</div>';

    // Cuerpo expandido
    if (isExpanded) {
      h += '<div style="padding:0 14px 12px 14px;border-top:.5px solid var(--bd)">';

      var procColor = { 'Alistamiento': '#34D399', 'Marcación': '#60A5FA', 'Defensas': '#FB923C', 'GPS': '#22D3EE', 'Placa': '#A78BFA' };

      acts.forEach(function(r) {
        var est = (r.estado || '').toLowerCase();
        var isEjec = est === 'ejecutada' || est === 'ejecutado';
        var estBg = isEjec ? 'var(--gnl)' : 'var(--yll)';
        var estColor = isEjec ? 'var(--gnd)' : 'var(--yld)';
        var estText = isEjec ? '✓ Ejecutada' : '⏳ Pendiente';
        var actModified = r.Modified || r.modified || '';
        var actHora = isEjec ? planFmtHora(actModified) : '';
        var actFechaEjec = isEjec ? planFmtFecha(actModified) : '';

        h += '<div style="padding:8px 10px;margin-top:8px;border-radius:6px;background:var(--bg);border:.5px solid var(--bd);display:flex;align-items:center;gap:10px">';
        h += '<div style="width:8px;height:8px;border-radius:50%;background:' + (procColor[r.proceso] || 'var(--tm)') + ';flex-shrink:0"></div>';
        h += '<div style="flex:1;min-width:0">';
        h += '<div style="font-size:12px;font-weight:600">' + (r.proceso || 'Sin nombre') + '</div>';
        if (r.responsable || r.ejecuto) {
          h += '<div style="font-size:9px;color:var(--tm);margin-top:2px">' + (r.ejecuto ? 'Ejecutó: ' + r.ejecuto : 'Resp: ' + r.responsable) + '</div>';
        }
        h += '</div>';
        h += '<div style="text-align:right;flex-shrink:0">';
        h += '<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:' + estBg + ';color:' + estColor + '">' + estText + '</span>';
        if (actFechaEjec) {
          h += '<div style="font-size:9px;color:var(--tm);font-family:var(--fm);margin-top:3px">' + actFechaEjec + ' ' + actHora + '</div>';
        }
        h += '</div>';
        h += '</div>';
      });

      // Contador de ejecutadas al final
      h += '<div style="margin-top:10px;padding:8px 10px;background:var(--sf);border-radius:6px;text-align:center;font-size:11px;color:var(--tm)">';
      h += '<span style="font-weight:600;color:var(--gnd)">' + done + ' ejecutada' + (done !== 1 ? 's' : '') + '</span>';
      h += ' de <span style="font-weight:600">' + total + ' programada' + (total !== 1 ? 's' : '') + '</span>';
      h += '</div>';

      h += '</div>';
    }

    h += '</div>';
  });

  if (motos.length > 50) {
    h += '<div style="text-align:center;padding:10px;font-size:11px;color:var(--tm)">Mostrando 50 de ' + motos.length + '. Usá los filtros para reducir.</div>';
  }

  return h;
}

/* Expande/colapsa una moto y carga ubicación si es necesario */
function planToggle(code) {
  planExpanded[code] = !planExpanded[code];
  render();

  // Al expandir por primera vez, cargar ubicación desde BD_Tramites
  if (planExpanded[code] && !planUbicaciones[code] && pCfg.tramC) {
    apiTramConsultarMoto(code).then(function(data) {
      var rows = data.value || data;
      var row = null;
      if (Array.isArray(rows) && rows.length > 0) row = rows[0];
      else if (rows && !Array.isArray(rows) && Object.keys(rows).length > 0) row = rows;
      if (row) {
        planUbicaciones[code] = row.ubicacion || row.UBICACION || row.Ubicacion || 'Sin ubicación';
        render();
      }
    }).catch(function() {
      planUbicaciones[code] = 'Sin ubicación';
      render();
    });
  }
}

function planSync() {
  if (!pCfg.planC) { toast('URL de consulta no configurada', 1); return; }
  planLoading = true;
  render();

  apiPlanConsultar('*').then(function(data) {
    planData = data.value || data;
    if (!Array.isArray(planData)) planData = [];
    planLoading = false;
    // Al recargar, resetear expansiones y cache de ubicaciones
    planExpanded = {};
    planUbicaciones = {};
    toast('✓ ' + planData.length + ' registros cargados');
    render();
  }).catch(function() {
    planLoading = false;
    toast('Error al cargar datos', 1);
    render();
  });
}
