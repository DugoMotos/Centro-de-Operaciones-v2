/* ============================================================
   PLANILLA.JS — Reporte diario imprimible de alistamientos
   ============================================================
   Consulta registro_alistamientos filtrado por fecha_programacion
   y hace merge con BD_Tramites para traer datos de la moto.

   Vista: bloque por marca (HERO, SYM, Bajaj) siempre visibles
   Orden fijo: Alistamiento → Marcación → Defensas → GPS → Placa
   La Placa aparece con separador visual al final
   ============================================================ */

/* Colores por proceso (coinciden con alistamiento.js) */
var PLANILLA_PROC_COLOR = {
  'Alistamiento': '#34D399',
  'Marcación': '#60A5FA',
  'Defensas': '#FB923C',
  'Instalación GPS': '#22D3EE',
  'Instalación Placa': '#A78BFA'
};

/* Orden fijo de procesos dentro de cada bloque */
var PLANILLA_PROC_ORDEN = {
  'Alistamiento': 1,
  'Marcación': 2,
  'Defensas': 3,
  'Instalación GPS': 4,
  'Instalación Placa': 5
};

/* Marcas siempre visibles */
var PLANILLA_MARCAS_FIJAS = ['HERO', 'SYM', 'BAJAJ'];

/* Formatear fecha larga */
function planillaFmtFechaLarga(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    var s = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bogota'
    }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch (e) { return iso; }
}

/* Formatear hora */
function planillaFmtFechaHora(iso) {
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

/* Normalización de marca */
function planillaNormMarca(m) {
  m = (m || '').toString().toUpperCase().trim();
  if (m === 'HERO') return 'HERO';
  if (m === 'SYM') return 'SYM';
  if (m === 'BAJAJ') return 'BAJAJ';
  return 'OTRA';
}

/* ============================================================
   renderPlanilla — Render principal
   ============================================================ */
function renderPlanilla() {
  var h = '<div class="eyebrow">SERVICIO TÉCNICO / REPORTE</div><h1 class="h1">Planilla diaria</h1>' +
    '<div class="sub-title">Alistamientos programados y ejecutados · agrupados por marca</div>';

  // Toolbar filtros
  h += '<div class="plnl-toolbar">';
  h += '<div class="plnl-filter">';
  h += '<div class="plnl-filter-lbl">Fecha</div>';
  h += '<input type="date" class="plnl-inp" value="' + esc(planillaFecha) + '" onchange="planillaFecha=this.value;planillaSync()">';
  h += '</div>';
  h += '<div class="plnl-filter">';
  h += '<div class="plnl-filter-lbl">Marca</div>';
  h += '<select class="plnl-inp" onchange="planillaFilterMarca=this.value;render()">';
  h += '<option value=""' + (planillaFilterMarca === '' ? ' selected' : '') + '>Todas</option>';
  h += '<option value="HERO"' + (planillaFilterMarca === 'HERO' ? ' selected' : '') + '>HERO</option>';
  h += '<option value="SYM"' + (planillaFilterMarca === 'SYM' ? ' selected' : '') + '>SYM</option>';
  h += '<option value="BAJAJ"' + (planillaFilterMarca === 'BAJAJ' ? ' selected' : '') + '>Bajaj</option>';
  h += '</select>';
  h += '</div>';
  h += '<div class="plnl-filter">';
  h += '<div class="plnl-filter-lbl">Proceso</div>';
  h += '<select class="plnl-inp" onchange="planillaFilterProc=this.value;render()">';
  h += '<option value=""' + (planillaFilterProc === '' ? ' selected' : '') + '>Todos</option>';
  ['Alistamiento', 'Marcación', 'Defensas', 'Instalación GPS', 'Instalación Placa'].forEach(function(p) {
    h += '<option value="' + p + '"' + (planillaFilterProc === p ? ' selected' : '') + '>' + p + '</option>';
  });
  h += '</select>';
  h += '</div>';
  h += '<label class="plnl-check">';
  h += '<input type="checkbox"' + (planillaMostrarEjec ? ' checked' : '') + ' onchange="planillaMostrarEjec=this.checked;render()">';
  h += '<span>Mostrar ejecutadas</span>';
  h += '</label>';
  h += '<div style="flex:1"></div>';
  h += '<button class="plnl-btn" onclick="window.print()">🖨 Imprimir</button>';
  h += '</div>';

  if (planillaLoading) {
    h += '<div style="text-align:center;padding:40px"><div style="width:32px;height:32px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div><div style="font-size:11px;color:var(--tm);margin-top:10px">Cargando planilla...</div></div>';
    return h;
  }

  if (!planillaData) {
    h += '<div style="text-align:center;padding:40px;color:var(--tm);font-size:12px">Selecciona una fecha para cargar la planilla</div>';
    return h;
  }

  // Determinar qué marcas mostrar según filtro
  var marcasVisibles = planillaFilterMarca
    ? [planillaFilterMarca]
    : PLANILLA_MARCAS_FIJAS;

  // Renderizar cada bloque de marca
  marcasVisibles.forEach(function(m) {
    h += planillaRenderBlock(m);
  });

  return h;
}

/* ============================================================
   planillaRenderBlock — Renderiza un bloque de marca
   ============================================================ */
function planillaRenderBlock(marca) {
  var mLabel = marca === 'BAJAJ' ? 'BAJAJ' : marca;
  var mCls = marca === 'HERO' ? 'hero' : marca === 'SYM' ? 'sym' : marca === 'BAJAJ' ? 'bajaj' : 'otra';

  // Filtrar registros de esta marca
  var registros = (planillaData || []).filter(function(r) { return r.marca === marca; });

  // Aplicar filtros de UI
  var filtered = registros.slice();
  if (!planillaMostrarEjec) {
    filtered = filtered.filter(function(r) { return r.estado === 'pendiente'; });
  }
  if (planillaFilterProc) {
    filtered = filtered.filter(function(r) { return r.proceso === planillaFilterProc; });
  }

  // Contar por proceso (sobre TODA la data de la marca, no la filtrada)
  var counts = {
    'Alistamiento': 0,
    'Marcación': 0,
    'Defensas': 0,
    'Instalación GPS': 0,
    'Instalación Placa': 0
  };
  registros.forEach(function(r) {
    if (counts[r.proceso] !== undefined) counts[r.proceso]++;
  });
  var total = registros.length;

  var h = '<div class="plnl-block plnl-block-' + mCls + '">';

  // Encabezado: badge + título + corp
  h += '<div class="plnl-head">';
  h += '<div class="plnl-brand-badge">' + mLabel + '</div>';
  h += '<div class="plnl-head-center">';
  h += '<div class="plnl-head-title">Alistamiento Diario</div>';
  h += '<div class="plnl-head-date">' + planillaFmtFechaLarga(planillaFecha) + '</div>';
  h += '</div>';
  h += '<div class="plnl-corp">DUGOMOTOS</div>';
  h += '</div>';

  // Grid de 6 celdas
  h += '<div class="plnl-summary">';
  h += '<div class="plnl-sum-cell"><div class="plnl-sum-lbl">Alistamiento</div><div class="plnl-sum-val">' + counts['Alistamiento'] + '</div></div>';
  h += '<div class="plnl-sum-cell"><div class="plnl-sum-lbl">Marcación</div><div class="plnl-sum-val">' + counts['Marcación'] + '</div></div>';
  h += '<div class="plnl-sum-cell"><div class="plnl-sum-lbl">Defensas</div><div class="plnl-sum-val">' + counts['Defensas'] + '</div></div>';
  h += '<div class="plnl-sum-cell"><div class="plnl-sum-lbl">GPS</div><div class="plnl-sum-val">' + counts['Instalación GPS'] + '</div></div>';
  h += '<div class="plnl-sum-cell"><div class="plnl-sum-lbl">Placa</div><div class="plnl-sum-val plnl-sum-placa">' + counts['Instalación Placa'] + '</div></div>';
  h += '<div class="plnl-sum-cell"><div class="plnl-sum-lbl">Total</div><div class="plnl-sum-val plnl-sum-total">' + total + '</div></div>';
  h += '</div>';

  // Si no hay filas después de filtrar, mensaje vacío
  if (filtered.length === 0) {
    h += '<div class="plnl-empty-block">Sin actividades para mostrar con los filtros actuales</div>';
    h += '</div>';
    return h;
  }

  // Ordenar filas: primero por orden del proceso, luego por código
  filtered.sort(function(a, b) {
    var oA = PLANILLA_PROC_ORDEN[a.proceso] || 99;
    var oB = PLANILLA_PROC_ORDEN[b.proceso] || 99;
    if (oA !== oB) return oA - oB;
    return a.codigo_barras.localeCompare(b.codigo_barras);
  });

  // Detectar el índice de la primera fila de Placa
  var indexPrimeraPlaca = -1;
  for (var i = 0; i < filtered.length; i++) {
    if (filtered[i].proceso === 'Instalación Placa') {
      indexPrimeraPlaca = i;
      break;
    }
  }

  // Tabla
  h += '<table class="plnl-table">';
  h += '<thead><tr>';
  h += '<th>Cód.</th>';
  h += '<th>Chasis</th>';
  h += '<th>Referencia</th>';
  h += '<th>Color</th>';
  h += '<th>Cliente</th>';
  h += '<th>Proceso</th>';
  h += '<th>Estado</th>';
  h += '<th>Ejecutó</th>';
  h += '<th>Fecha ejec</th>';
  h += '</tr></thead><tbody>';

  filtered.forEach(function(r, idx) {
    var isEjec = r.estado === 'ejecutada' || r.estado === 'ejecutado';
    var procColor = PLANILLA_PROC_COLOR[r.proceso] || '#6d6d75';
    var isPlacaFirst = idx === indexPrimeraPlaca;

    var chasisHtml = '—';
    if (r.chasis) {
      if (r.chasis.length > 6) {
        var head = r.chasis.substring(0, r.chasis.length - 6);
        var tail = r.chasis.substring(r.chasis.length - 6);
        chasisHtml = '<span class="plnl-chasis-head">' + esc(head) + '</span><span class="plnl-chasis-tail">' + esc(tail) + '</span>';
      } else {
        chasisHtml = '<span class="plnl-chasis-tail">' + esc(r.chasis) + '</span>';
      }
    }
    var ref = ((r.linea || '') + ' ' + (r.referencia || '')).trim() || '—';

    h += '<tr' + (isPlacaFirst ? ' class="plnl-placa-first"' : '') + '>';
    h += '<td class="plnl-code">' + esc(r.codigo_barras) + '</td>';
    h += '<td class="plnl-chasis">' + chasisHtml + '</td>';
    h += '<td>' + esc(ref) + '</td>';
    h += '<td>' + esc(r.color || '—') + '</td>';
    h += '<td>' + esc(r.cliente || '—') + '</td>';
    h += '<td><span class="plnl-proc-dot" style="background:' + procColor + '"></span>' + esc(r.proceso) + '</td>';
    if (isEjec) {
      h += '<td><span class="plnl-tag plnl-tag-ejec">Ejecutada</span></td>';
      h += '<td class="plnl-tec">' + esc(r.tecnico || '—') + '</td>';
      h += '<td class="plnl-tec">' + planillaFmtFechaHora(r.fecha_ejecucion) + '</td>';
    } else {
      h += '<td><span class="plnl-tag plnl-tag-pend">Pendiente</span></td>';
      h += '<td class="plnl-empty">—</td>';
      h += '<td class="plnl-empty">—</td>';
    }
    h += '</tr>';
  });

  h += '</tbody></table>';
  h += '</div>';

  return h;
}

/* ============================================================
   planillaSync — Cargar datos de Supabase + BD_Tramites
   ============================================================ */
function planillaSync() {
  if (typeof supabaseReady !== 'function' || !supabaseReady()) {
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

    // Merge
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
        marca: motoInfo.marca || 'OTRA',
        linea: motoInfo.linea,
        referencia: motoInfo.referencia,
        chasis: motoInfo.chasis || r.codigo_barras,
        modelo: motoInfo.modelo,
        color: motoInfo.color,
        cliente: motoInfo.cliente
      };
    });

    planillaLoading = false;
    toast('✓ Planilla: ' + planillaData.length + ' actividades');
    render();
  }).catch(function(e) {
    planillaLoading = false;
    toast('Error: ' + (e.message || 'desconocido'), 1);
    render();
  });
}
