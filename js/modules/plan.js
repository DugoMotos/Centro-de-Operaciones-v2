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
  var t = r.fecha_ejecucion || r.fechaEjec || null;
      if (t && (!maxIso || t > maxIso)) maxIso = t;
    });
    var ultActFecha = planFmtFecha(maxIso);
    var ultActHora = planFmtHora(maxIso);

    // Fecha de solicitud (la primera actividad tiene la fecha del pedido)
    var fechaSolicitud = planFmtFecha(acts[0].fecha);

    // Ubicación cacheada
    var ubicacion = planUbicaciones[g.code] || '';

   // Traer datos de BD_Tramites (indexado por planUbicaciones)
    var tramData = planUbicaciones[g.code] || {};
    var marca = (tramData.marca || g.marca || '').toUpperCase();
    var linea = tramData.linea || g.linea || '';
    var referencia = tramData.referencia || acts[0].referencia || '';
    var modelo = tramData.modelo || '';
    var color = tramData.color || '';
    var chasisCompleto = tramData.chasis || acts[0].chasis || '';
    var ubicacion = tramData.ubicacion || '';

    // Colores según marca (mismo estilo que Servicio Técnico)
    var marcaBg = marca === 'HERO' 
      ? 'linear-gradient(135deg,#085041 0%,#1D9E75 100%)' 
      : marca === 'SYM'
        ? 'linear-gradient(135deg,#712B13 0%,#993C1D 100%)'
        : 'linear-gradient(135deg,#4A4A4A 0%,#6B6B6B 100%)';
    var marcaAccent = marca === 'HERO' ? '#5DCAA5' : marca === 'SYM' ? '#F0997B' : '#B4B2A9';

    // Tarjeta principal
    h += '<div style="border-radius:8px;margin-bottom:8px;overflow:hidden;border:.5px solid var(--bd);background:var(--sf)">';

    // Encabezado clickeable con degradado marca
    h += '<div style="background:' + marcaBg + ';padding:10px 14px;cursor:pointer;position:relative" onclick="planToggle(\'' + g.code + '\')">';
    h += '<div style="display:flex;align-items:center;gap:10px">';
    h += '<span style="font-size:14px;color:#fff;opacity:0.8;transform:rotate(' + (isExpanded ? '90' : '0') + 'deg);transition:transform .2s;flex-shrink:0">▸</span>';
    h += '<div style="flex:1;min-width:0">';
    if (marca) h += '<div style="font-size:9px;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.65);margin-bottom:2px">' + marca + '</div>';
    h += '<div style="font-size:15px;font-weight:700;color:#fff;letter-spacing:0.3px">' + (linea + ' ' + referencia).trim() + '</div>';
    if (chasisCompleto) {
      h += '<div style="font-size:11px;font-family:var(--fm);color:rgba(255,255,255,0.75);margin-top:2px;letter-spacing:0.5px">' + chasisCompleto + '</div>';
    }
    h += '</div>';
    // Chip del código de barras
    h += '<div style="font-family:var(--fm);font-size:12px;font-weight:600;padding:4px 10px;border-radius:4px;background:rgba(255,255,255,0.18);color:#fff;flex-shrink:0">' + g.code + '</div>';
    h += '</div>';
    h += '</div>';

    // Fila inferior: contadores + fechas
    h += '<div style="padding:8px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:11px">';
    // Contador
    h += '<span style="font-weight:700;padding:3px 10px;border-radius:10px;background:' + (pct === 100 ? 'var(--gnl)' : pct >= 50 ? 'var(--bll)' : 'var(--yll)') + ';color:' + (pct === 100 ? 'var(--gnd)' : pct >= 50 ? 'var(--bld)' : 'var(--yld)') + '">' + done + '/' + total + '</span>';
    // Ubicación
    if (ubicacion) {
      h += '<span style="color:' + marcaAccent + ';font-weight:600">📍 ' + ubicacion + '</span>';
    }
    // Fecha de solicitud
    if (fechaSolicitud) {
      h += '<span style="color:var(--tm);font-family:var(--fm);font-size:10px">Solicitado ' + fechaSolicitud + '</span>';
    }
    // Última actualización a la derecha
    if (ultActFecha) {
      h += '<span style="margin-left:auto;color:var(--tm);font-family:var(--fm);font-size:10px">Últ. act. <span style="color:var(--tx);font-weight:600">' + ultActFecha + ' ' + ultActHora + '</span></span>';
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
      h += '<div style="padding:12px 14px;border-top:.5px solid var(--bd)">';

      // Info adicional de la moto (chasis, modelo, color)
      var infoLine = [];
            if (modelo) infoLine.push('Modelo ' + modelo);
      if (color) infoLine.push(color);
      if (infoLine.length) {
        h += '<div style="font-size:10px;color:var(--tm);margin-bottom:10px;padding-bottom:10px;border-bottom:.5px dashed var(--bd)">' + infoLine.join(' · ') + '</div>';
      }

      var procColor = { 'Alistamiento': '#34D399', 'Marcación': '#60A5FA', 'Defensas': '#FB923C', 'GPS': '#22D3EE', 'Placa': '#A78BFA' };

      acts.forEach(function(r) {
        var est = (r.estado || '').toLowerCase();
        var isEjec = est === 'ejecutada' || est === 'ejecutado';
        var estBg = isEjec ? 'var(--gnl)' : 'var(--yll)';
        var estColor = isEjec ? 'var(--gnd)' : 'var(--yld)';
        var estText = isEjec ? '✓ Ejecutada' : '⏳ Pendiente';
        var actModified = r.fecha_ejecucion || r.fechaEjec || '';
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
}

function planSync() {
  if (!pCfg.planC) { toast('URL de consulta no configurada', 1); return; }
  planLoading = true;
  render();

  Promise.all([
    apiPlanConsultar('*'),
    pCfg.tramC ? apiTramListar() : Promise.resolve({ value: [] })
  ]).then(function(results) {
    planData = results[0].value || results[0];
    if (!Array.isArray(planData)) planData = [];

    // Indexar motos por código_barras desde BD_Tramites
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
  }).catch(function() {
    planLoading = false;
    toast('Error al cargar datos', 1);
    render();
  });
}
