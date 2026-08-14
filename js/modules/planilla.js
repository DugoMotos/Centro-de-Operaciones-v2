/* ============================================================
   PLANILLA.JS — Reporte diario imprimible de alistamientos
   ============================================================
   Consulta registro_alistamientos filtrado por fecha_programacion
   y hace merge con BD_Tramites para traer datos de la moto
   (marca, línea, referencia, chasis, modelo, color, ubicación)

   Filtros: fecha, marca, proceso, incluir_ejecutadas
   Vista impresa: 1 hoja por marca con columna de firma
   ============================================================ */

/* Formatear fecha a dd/mm/aaaa desde YYYY-MM-DD */
function planillaFmtFechaLarga(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    var opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' };
    var s = new Intl.DateTimeFormat('es-CO', opts).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch (e) { return iso; }
}

/* Formatear hora hh:mm */
function planillaFmtHora(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var opts = { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('es-CO', opts).format(d);
  } catch (e) { return ''; }
}

/* Normalización de marca */
function planillaNormMarca(m) {
  m = (m || '').toString().toUpperCase().trim();
  if (m === 'HERO') return 'HERO';
  if (m === 'SYM') return 'SYM';
  if (!m) return 'SIN_MARCA';
  return 'OTRA';
}

/* Colores por proceso */
var PLANILLA_PROC_COLOR = {
  'Alistamiento': '#34D399',
  'Marcación': '#60A5FA',
  'Defensas': '#FB923C',
  'Instalación GPS': '#22D3EE',
  'Instalación Placa': '#A78BFA'
};

function renderPlanilla() {
  var h = '<div class="eyebrow">SERVICIO TÉCNICO / REPORTE</div><h1 class="h1">Planilla diaria</h1>' +
    '<div class="sub-title">Programación de alistamientos por marca · lista para imprimir</div>';

  // Toolbar filtros
  h += '<div class="planilla-toolbar">';
  h += '<div class="planilla-filter">';
  h += '<div class="planilla-filter-lbl">Fecha</div>';
  h += '<input type="date" class="inp" value="' + planillaFecha + '" onchange="planillaFecha=this.value;planillaSync()">';
  h += '</div>';
  h += '<div class="planilla-filter">';
  h += '<div class="planilla-filter-lbl">Marca</div>';
  h += '<select class="inp" onchange="planillaFilterMarca=this.value;render()">';
  h += '<option value=""' + (planillaFilterMarca === '' ? ' selected' : '') + '>Todas</option>';
  h += '<option value="HERO"' + (planillaFilterMarca === 'HERO' ? ' selected' : '') + '>HERO</option>';
  h += '<option value="SYM"' + (planillaFilterMarca === 'SYM' ? ' selected' : '') + '>SYM</option>';
  h += '</select>';
  h += '</div>';
  h += '<div class="planilla-filter">';
  h += '<div class="planilla-filter-lbl">Proceso</div>';
  h += '<select class="inp" onchange="planillaFilterProc=this.value;render()">';
  h += '<option value=""' + (planillaFilterProc === '' ? ' selected' : '') + '>Todos</option>';
  ['Alistamiento', 'Marcación', 'Defensas', 'Instalación GPS', 'Instalación Placa'].forEach(function(p) {
    h += '<option value="' + p + '"' + (planillaFilterProc === p ? ' selected' : '') + '>' + p + '</option>';
  });
  h += '</select>';
  h += '</div>';
  h += '<label class="planilla-check">';
  h += '<input type="checkbox"' + (planillaMostrarEjec ? ' checked' : '') + ' onchange="planillaMostrarEjec=this.checked;render()">';
  h += '<span>Mostrar ejecutadas</span>';
  h += '</label>';
  h += '<div style="flex:1"></div>';
  h += '<button class="btn btn-o" style="width:auto;padding:0 14px;height:34px;font-size:11px" onclick="window.print()">🖨 Imprimir</button>';
  h += '</div>';

  if (planillaLoading) {
    h += '<div style="text-align:center;padding:40px"><div style="width:32px;height:32px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div><div style="font-size:11px;color:var(--tm);margin-top:10px">Cargando planilla...</div></div>';
    return h;
  }

  if (!planillaData) {
    h += '<div style="text-align:center;padding:40px;color:var(--tm);font-size:12px">Presiona una fecha para cargar la planilla</div>';
    return h;
  }

  // Aplicar filtros
  var filtered = planillaData.slice();
  if (!planillaMostrarEjec) {
    filtered = filtered.filter(function(r) { return r.estado === 'pendiente'; });
  }
  if (planillaFilterProc) {
    filtered = filtered.filter(function(r) { return r.proceso === planillaFilterProc; });
  }
  if (planillaFilterMarca) {
    filtered = filtered.filter(function(r) { return r.marca === planillaFilterMarca; });
  }

  // Agrupar por marca
  var grupos = {};
  filtered.forEach(function(r) {
    var marca = r.marca || 'SIN_MARCA';
    if (!grupos[marca]) grupos[marca] = [];
    grupos[marca].push(r);
  });

  // KPIs por marca (contando TODA la data, no la filtrada por checkbox)
  var kpis = {};
  planillaData.forEach(function(r) {
    var marca = r.marca || 'SIN_MARCA';
    if (!kpis[marca]) kpis[marca] = { total: 0, ejec: 0, pend: 0, motos: {} };
    kpis[marca].total++;
    if (r.estado === 'ejecutada' || r.estado === 'ejecutado') kpis[marca].ejec++;
    else kpis[marca].pend++;
    kpis[marca].motos[r.codigo_barras] = true;
  });

  var totalRegistros = filtered.length;
  if (totalRegistros === 0) {
    h += '<div style="text-align:center;padding:40px;color:var(--tm);font-size:12px">Sin actividades programadas para esta fecha con los filtros aplicados</div>';
    return h;
  }

  // KPIs cards
  h += '<div class="planilla-kpis">';
  ['HERO', 'SYM', 'OTRA', 'SIN_MARCA'].forEach(function(m) {
    if (!kpis[m]) return;
    var k = kpis[m];
    var motoCount = Object.keys(k.motos).length;
    var label = m === 'SIN_MARCA' ? 'Sin marca' : m;
    h += '<div class="planilla-kpi planilla-kpi-' + m.toLowerCase() + '">';
    h += '<div class="planilla-kpi-header">';
    h += '<div class="planilla-kpi-label">' + label + '</div>';
    h += '<div class="planilla-kpi-value">' + motoCount + ' <span class="planilla-kpi-sub">motos</span></div>';
    h += '</div>';
    h += '<div class="planilla-kpi-breakdown">';
    h += '<div><div class="planilla-kpi-mini-lbl">Total actividades</div><div class="planilla-kpi-mini-val">' + k.total + '</div></div>';
    h += '<div><div class="planilla-kpi-mini-lbl">Ejecutadas</div><div class="planilla-kpi-mini-val" style="color:#5DCAA5">' + k.ejec + '</div></div>';
    h += '<div><div class="planilla-kpi-mini-lbl">Pendientes</div><div class="planilla-kpi-mini-val" style="color:#EF9F27">' + k.pend + '</div></div>';
    h += '</div>';
    h += '</div>';
  });
  h += '</div>';

  // Bloques por marca
  var ordenMarcas = ['HERO', 'SYM', 'OTRA', 'SIN_MARCA'];
  ordenMarcas.forEach(function(m) {
    if (!grupos[m]) return;
    var registros = grupos[m];
    var motoCount = {};
    registros.forEach(function(r) { motoCount[r.codigo_barras] = true; });
    var motoTotal = Object.keys(motoCount).length;

    var mCls = m === 'HERO' ? 'hero' : m === 'SYM' ? 'sym' : 'otra';
    var mLabel = m === 'SIN_MARCA' ? 'Sin marca' : m;

    h += '<div class="planilla-block planilla-block-' + mCls + ' planilla-print-page">';
    h += '<div class="planilla-block-head">';
    h += '<div>';
    h += '<div class="planilla-block-marca">' + mLabel + '</div>';
    h += '<div class="planilla-block-title">Plan del día · ' + planillaFmtFechaLarga(planillaFecha) + '</div>';
    h += '</div>';
    h += '<div class="planilla-block-count">' + motoTotal + ' motos · ' + registros.length + ' actividades</div>';
    h += '</div>';

    h += '<div class="planilla-block-body">';
    // Header
    h += '<div class="planilla-row planilla-row-head">';
    h += '<div>Código</div>';
    h += '<div>Chasis</div>';
    h += '<div>Modelo</div>';
    h += '<div>Actividad</div>';
    h += '<div>Técnico</div>';
    h += '<div class="planilla-firma-head">Firma / Estado</div>';
    h += '</div>';
    // Filas
    registros.forEach(function(r) {
      var isEjec = r.estado === 'ejecutada' || r.estado === 'ejecutado';
      var procColor = PLANILLA_PROC_COLOR[r.proceso] || 'var(--tm)';
      var mChasis = r.chasis || r.codigo_barras;
      var mChasisDisplay = mChasis;
      if (mChasis && mChasis.length > 6) {
        var head = mChasis.substring(0, mChasis.length - 6);
        var tail = mChasis.substring(mChasis.length - 6);
        mChasisDisplay = '<span style="opacity:0.5">' + head + '</span><strong>' + tail + '</strong>';
      }

      h += '<div class="planilla-row">';
      h += '<div class="planilla-code">' + r.codigo_barras + '</div>';
      h += '<div class="planilla-chasis">' + mChasisDisplay + '</div>';
      h += '<div class="planilla-modelo">' + (r.linea ? (r.linea + ' ' + (r.referencia || '')).trim() : '—') + '</div>';
      h += '<div class="planilla-act"><span class="planilla-dot" style="background:' + procColor + '"></span>' + r.proceso + '</div>';
      h += '<div class="planilla-tec">' + (r.tecnico || '—') + '</div>';
      if (isEjec) {
        h += '<div class="planilla-firma"><span class="planilla-tag-ejec">✓ Ejecutada ' + planillaFmtHora(r.fecha_ejecucion) + '</span></div>';
      } else {
        h += '<div class="planilla-firma planilla-firma-empty"></div>';
      }
      h += '</div>';
    });
    h += '</div>';

    // Footer del bloque (visible al imprimir)
    h += '<div class="planilla-block-footer">';
    h += '<div>Generado ' + new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }) + ' · Centro de Operaciones v2</div>';
    h += '<div>' + mLabel + ' · ' + motoTotal + ' motos · ' + registros.length + ' actividades</div>';
    h += '</div>';
    h += '</div>';
  });

  return h;
}

/* Sincronizar datos de Supabase + BD_Tramites */
function planillaSync() {
  if (!supabaseReady()) {
    toast('Supabase no configurado', 1);
    return;
  }

  planillaLoading = true;
  render();

  Promise.all([
    apiRegAlistConsultar({ fecha: planillaFecha }),
    pCfg.tramC ? apiTramListar() : Promise.resolve({ value: [] })
  ]).then(function(results) {
    var registros = results[0] || [];
    if (!Array.isArray(registros)) registros = [];

    // Indexar motos por código_barras
    var tramMotos = results[1].value || results[1] || [];
    if (!Array.isArray(tramMotos)) tramMotos = [];
    var motoIndex = {};
    tramMotos.forEach(function(m) {
      var code = (m.codigo_barras || m.codigoBarras || m.Title || '').toUpperCase();
      if (!code) return;
      motoIndex[code] = {
        marca: planillaNormMarca(m.marca || m.MARCA),
        linea: m.linea || m.LINEA || '',
        referencia: m.referencia || m.REFERENCIA || '',
        chasis: m.chasis || m.CHASIS || '',
        modelo: m.modelo || m.MODELO || '',
        color: m.color || m.COLOR || '',
        cliente: m.cliente || m.CLIENTE || ''
      };
    });

    // Merge: cada registro incluye datos de la moto
    planillaData = registros.map(function(r) {
      var motoInfo = motoIndex[r.codigo_barras] || {};
      return {
        id: r.id,
        codigo_barras: r.codigo_barras,
        proceso: (r.proceso && r.proceso.nombre) || '—',
        proceso_orden: (r.proceso && r.proceso.orden) || 0,
        tecnico: (r.tecnico && r.tecnico.nombre_completo) || '',
        estado: r.estado,
        fecha_programacion: r.fecha_programacion,
        fecha_ejecucion: r.fecha_ejecucion,
        marca: motoInfo.marca || 'SIN_MARCA',
        linea: motoInfo.linea,
        referencia: motoInfo.referencia,
        chasis: motoInfo.chasis || r.codigo_barras,
        modelo: motoInfo.modelo,
        color: motoInfo.color,
        cliente: motoInfo.cliente
      };
    });

    // Ordenar por marca, luego código_barras, luego proceso_orden
    planillaData.sort(function(a, b) {
      if (a.marca !== b.marca) return a.marca.localeCompare(b.marca);
      if (a.codigo_barras !== b.codigo_barras) return a.codigo_barras.localeCompare(b.codigo_barras);
      return a.proceso_orden - b.proceso_orden;
    });

    planillaLoading = false;
    toast('✓ Planilla cargada: ' + planillaData.length + ' actividades');
    render();
  }).catch(function(e) {
    planillaLoading = false;
    toast('Error: ' + (e.message || 'desconocido'), 1);
    render();
  });
}
