/* ============================================================
   PLAN.JS — Módulo Plan de alistamientos
   ============================================================
   Funciones expuestas:
   - renderPlan(): genera el HTML del módulo
   - planSync(): carga datos desde SharePoint BD_Plan

   Estado: variables plan* en state.js
   APIs: apiPlanConsultar
   ============================================================ */

function renderPlan() {
  var h = '<div class="eyebrow">PROCEDIMIENTO / PLAN</div><h1 class="h1">Plan de alistamientos</h1>' +
    '<div class="sub-title">Vista de la tabla BD_Plan desde SharePoint</div>';

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

  // Filters
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
  h += '<div style="margin-bottom:10px"><button style="font-size:10px;color:var(--bl);background:none;border:none;cursor:pointer;text-decoration:underline" onclick="planFilter=\'\';planFilterProc=\'\';planFilterEstado=\'\';planFilterFecha=\'\';render()">Limpiar filtros</button></div>';

  var filtered = planData.slice();
  if (planFilter) filtered = filtered.filter(function(r) { return (r.codigo_barras || '').toUpperCase().indexOf(planFilter.toUpperCase()) >= 0; });
  if (planFilterFecha) filtered = filtered.filter(function(r) {
    var f = r.fecha || '';
    if (f.indexOf('/') >= 0) {
      var p = f.split('/');
      f = p[2] + '-' + p[1] + '-' + p[0];
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

  h += '<div style="font-family:var(--fm);font-size:10px;color:var(--tm);margin-bottom:8px">' + filtered.length + ' de ' + planData.length + ' registros</div>';

  // Table cards
  filtered.slice(0, 50).forEach(function(r) {
    var est = (r.estado || '').toLowerCase();
    var isEjec = est === 'ejecutada' || est === 'ejecutado';
    var estBg = isEjec ? 'var(--gnl)' : 'var(--yll)';
    var estColor = isEjec ? 'var(--gnd)' : 'var(--yld)';
    var estText = isEjec ? 'Ejecutada' : 'Pendiente';
    var procColor = { 'Alistamiento': '#34D399', 'Marcación': '#60A5FA', 'Defensas': '#FB923C', 'GPS': '#22D3EE' };

    h += '<div style="padding:10px 12px;border-radius:8px;background:var(--sf);border:.5px solid var(--bd);margin-bottom:4px">';
    h += '<div class="flex fxc fxb">';
    h += '<div style="flex:1">';
    h += '<div class="flex fxc" style="gap:6px;margin-bottom:3px">';
    h += '<span style="font-family:var(--fm);font-size:13px;font-weight:700">' + (r.codigo_barras || '') + '</span>';
    h += '<span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;background:' + estBg + ';color:' + estColor + '">' + estText + '</span>';
    h += '</div>';
    h += '<div class="flex fxc" style="gap:6px">';
    h += '<div style="width:8px;height:8px;border-radius:50%;background:' + (procColor[r.proceso] || 'var(--tm)') + '"></div>';
    h += '<span style="font-size:11px;font-weight:600">' + (r.proceso || '') + '</span>';
    if (r.marca) h += '<span style="font-size:9px;color:var(--tm)">' + (r.marca || '') + ' ' + (r.linea || '') + '</span>';
    h += '</div>';
    if (r.responsable || r.ejecuto) h += '<div style="font-size:9px;color:var(--tm);margin-top:2px">' + (r.ejecuto ? 'Ejecutó: ' + r.ejecuto : 'Resp: ' + r.responsable) + '</div>';
    h += '</div>';
    h += '<div style="text-align:right;flex-shrink:0">';
    if (r.fecha) h += '<div style="font-size:9px;color:var(--tm)">' + (r.fecha || '') + '</div>';
    if (r.placa) h += '<div style="font-size:9px;font-family:var(--fm);color:var(--tx);margin-top:2px">' + (r.placa || '') + '</div>';
    h += '</div></div></div>';
  });

  if (filtered.length > 50) h += '<div style="text-align:center;padding:10px;font-size:11px;color:var(--tm)">Mostrando 50 de ' + filtered.length + '. Usá los filtros para reducir.</div>';

  return h;
}

function planSync() {
  if (!pCfg.planC) { toast('URL de consulta no configurada', 1); return; }
  planLoading = true;
  render();

  apiPlanConsultar('*').then(function(data) {
    planData = data.value || data;
    if (!Array.isArray(planData)) planData = [];
    planLoading = false;
    toast('✓ ' + planData.length + ' registros cargados');
    render();
  }).catch(function() {
    planLoading = false;
    toast('Error al cargar datos', 1);
    render();
  });
}
