/* ============================================================
   PLAN.JS — Módulo Plan de Alistamientos
   ============================================================
   Muestra las motos con actividades de alistamiento pendientes.
   Permite marcarlas como ejecutadas.

   Cambios jul 2026:
   - Eliminado texto redundante "Pendiente" del título de la tarjeta
   - Fecha "Solicitado" formateada como dd/mm/aaaa
   - Agregada hora de última modificación (Modified de SharePoint)
     al final de cada tarjeta como referencia de última ejecución
   ============================================================ */

/* Estado local del módulo */
var planError = '';

/* Helper: fecha corta dd/mm/aaaa */
function planFmtFecha(iso) {
  if (!iso) return '—';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var opts = { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' };
    var partes = new Intl.DateTimeFormat('es-CO', opts).formatToParts(d);
    var map = {};
    partes.forEach(function(p) { map[p.type] = p.value; });
    return map.day + '/' + map.month + '/' + map.year;
  } catch (e) {
    return String(iso);
  }
}

/* Helper: fecha + hora dd/mm/aaaa hh:mm */
function planFmtFechaHora(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var opts = {
      timeZone: 'America/Bogota',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    };
    var partes = new Intl.DateTimeFormat('es-CO', opts).formatToParts(d);
    var map = {};
    partes.forEach(function(p) { map[p.type] = p.value; });
    return map.day + '/' + map.month + '/' + map.year + ' ' + map.hour + ':' + map.minute;
  } catch (e) {
    return '';
  }
}

function renderPlan() {
  var pHeader = '<div class="eyebrow">ALISTAMIENTOS</div><h1 class="h1">Plan de alistamientos</h1>';

  if (planLoading) {
    return pHeader +
      '<div style="text-align:center;padding:50px 20px">' +
      '<div style="font-size:32px;margin-bottom:12px">🔍</div>' +
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Consultando plan...</div>' +
      '<div style="margin-top:16px"><div style="width:40px;height:40px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div></div>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>' +
      '</div>';
  }

  if (!planData) {
    return pHeader +
      '<div class="sub-title">Motocicletas con actividades de alistamiento pendientes</div>' +
      '<div style="text-align:center;padding:40px 20px">' +
      '<button class="btn btn-p" style="max-width:260px;margin:0 auto" onclick="planSync()">Cargar plan</button>' +
      (planError ? '<div style="margin-top:14px;padding:10px 14px;background:var(--rdl);border-radius:8px;border:0.5px solid var(--rd);color:var(--rdd);font-size:11px;max-width:340px;margin-left:auto;margin-right:auto">' + planError + '</div>' : '') +
      '</div>';
  }

  var h = pHeader;
  h += '<div class="sub-title">' + planData.length + ' motocicleta' + (planData.length !== 1 ? 's' : '') + ' con actividades pendientes</div>';
  h += '<div style="margin-bottom:14px;display:flex;gap:8px">';
  h += '<button class="btn btn-o" style="width:auto;padding:8px 14px;font-size:12px" onclick="planSync()">🔄 Actualizar</button>';
  h += '</div>';

  if (!planData.length) {
    h += '<div style="text-align:center;padding:40px 20px;color:var(--tm)">No hay motocicletas con actividades pendientes</div>';
    return h;
  }

  planData.forEach(function(m) {
    var code = m.codigoBarras || m.codigo_barras || m.Title || '—';
    var acts = m.actividades || [];
    var pendientes = acts.filter(function(a) { return !a.ejecutada && !a.fecha_ejecucion; });
    var totalActs = acts.length;
    var doneActs = totalActs - pendientes.length;
    var pctActs = totalActs ? Math.round((doneActs / totalActs) * 100) : 0;

    // Fecha solicitado (formato dd/mm/aaaa)
    var fs = m.fechaSol || m.fecha || m.Modified || '';
    var fsFmt = planFmtFecha(fs);

    // Última modificación
    var mod = m.Modified || m.modified || m.updated_at || '';
    var modFmt = planFmtFechaHora(mod);

    // Chequeo needN
    var needN = acts.some(function(a) {
      return (a.actividad || '').toLowerCase().indexOf('nueva') >= 0;
    });

    h += '<div class="p-card" style="margin-bottom:12px">';
    h += '<div class="p-title">';
    h += '<span style="font-family:var(--fm);letter-spacing:.3px">' + code + '</span>';
    if (needN) h += ' <span style="font-size:9px;font-weight:700;color:var(--yld);background:var(--yll);padding:2px 6px;border-radius:5px;margin-left:6px">NUEVA</span>';
    h += '</div>';

    h += '<div class="p-meta">Solicitado: ' + fsFmt + '</div>';

    h += '<div style="margin-top:8px;height:4px;background:var(--sf);border-radius:2px;overflow:hidden">';
    h += '<div style="height:100%;width:' + pctActs + '%;background:' + (pctActs === 100 ? 'var(--gn)' : 'var(--or)') + '"></div>';
    h += '</div>';
    h += '<div style="font-size:10px;color:var(--tm);margin-top:4px">' + doneActs + '/' + totalActs + ' actividades (' + pctActs + '%)</div>';

    if (pendientes.length) {
      h += '<div style="margin-top:10px;padding-top:10px;border-top:.5px solid var(--bd)">';
      pendientes.forEach(function(a) {
        h += '<div class="p-act-row" style="display:flex;align-items:center;gap:8px;padding:6px 0">';
        h += '<div style="flex:1"><span style="font-size:12px;font-weight:600">' + (a.actividad || 'Sin nombre') + '</span>';
        if (a.responsable) h += '<div style="font-size:10px;color:var(--tm);margin-top:2px">' + a.responsable + '</div>';
        h += '</div>';
        h += '<button class="btn btn-o" style="width:auto;padding:5px 10px;font-size:11px" onclick="planExec(\'' + a.id + '\')">Marcar OK</button>';
        h += '</div>';
      });
      h += '</div>';
    }

    if (modFmt) {
      h += '<div style="margin-top:10px;padding-top:8px;border-top:.5px dashed var(--bd);font-size:10px;color:var(--tm);text-align:right">';
      h += 'Última actualización: <span style="font-family:var(--fm);color:var(--tx);font-weight:600">' + modFmt + '</span>';
      h += '</div>';
    }

    h += '</div>';
  });

  return h;
}

function planSync() {
  planLoading = true;
  planError = '';
  render();

  if (!getUrl('planC')) {
    planLoading = false;
    planError = 'Falta URL de Plan en Configuración';
    render();
    return;
  }

  apiPlanConsultar()
    .then(function(data) {
      planLoading = false;
      var rows = data.value || data || [];
      if (!Array.isArray(rows)) rows = [];
      var grouped = {};
      rows.forEach(function(r) {
        var code = r.codigoBarras || r.codigo_barras || r.Title || '';
        if (!code) return;
        if (!grouped[code]) {
          grouped[code] = {
            codigoBarras: code,
            fechaSol: r.fechaSol || r.fecha || r.Modified || '',
            Modified: r.Modified || r.modified || '',
            actividades: []
          };
        }
        if (r.Modified && (!grouped[code].Modified || r.Modified > grouped[code].Modified)) {
          grouped[code].Modified = r.Modified;
        }
        grouped[code].actividades.push({
          id: r.id || r.ID || '',
          actividad: r.actividad || r.proceso || '',
          responsable: r.responsable || '',
          ejecutada: !!r.ejecutada,
          fecha_ejecucion: r.fecha_ejecucion || null
        });
      });
      planData = Object.values(grouped);
      toast('✓ ' + planData.length + ' motocicletas cargadas');
      render();
    })
    .catch(function(e) {
      planLoading = false;
      planError = e.name === 'AbortError' ? 'Tiempo agotado al consultar' : 'Error: ' + e.message;
      toast('Error al cargar plan', 1);
      render();
    });
}

function planExec(id) {
  if (!id) return;
  var fecha = new Date().toISOString();
  apiPlanEscribir({ id: id, action: 'exec', fecha: fecha })
    .then(function() {
      toast('✓ Actividad marcada');
      planSync();
    })
    .catch(function(e) {
      toast('Error al marcar: ' + e.message, 1);
    });
}
