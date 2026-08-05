/* ============================================================
   NEGOCIOS.JS — Módulo Negocios
   ============================================================
   Funciones expuestas:
   - renderNegocios(): genera el HTML del módulo
   - negSync(): carga motos + avances desde BD_Tramites + Supabase
   - negSort(key): ordena por columna
   - negShowComment(code): placeholder para comentarios

   Estado: variables neg* en state.js
   APIs: apiTramListar (Power Automate), apiAvanceConsultar (Supabase)

   Migración jun/jul 2026:
   - "Actividad en curso" = primera pendiente del catálogo Trámites+Contabilidad
     ordenada por 'orden', no la última ejecutada.
   - Nueva columna: Área responsable de la actividad en curso.
   - Nueva columna: Última actualización (MAX created_at de registros).
   - Sin numeración #N en textos visibles.
   ============================================================ */

/* Helper: catálogo de manuales del scope Trámites + Contabilidad
   ordenado por 'orden'. Se computa una vez y se cachea.
   NOTA: si en el futuro ACTIVIDADES_TRAM cambia dinámicamente,
   convertir en función que recalcule cada vez. */
var _negScopeCache = null;
function negGetScopeActs() {
  if (_negScopeCache) return _negScopeCache;
  _negScopeCache = ACTIVIDADES_TRAM
    .filter(function(a) {
      return a.responsable === 'Trámites' || a.responsable === 'Contabilidad';
    })
    .slice()
    .sort(function(a, b) { return a.orden - b.orden; });
  return _negScopeCache;
}

/* Helper: dado un set de actividad_num ejecutadas, devuelve la
   PRIMERA actividad pendiente del scope, o null si no hay más. */
function negFirstPending(ejecutadasSet) {
  var scope = negGetScopeActs();
  for (var i = 0; i < scope.length; i++) {
    var actNum = parseInt(scope[i].num, 10);
    if (!ejecutadasSet[actNum]) {
      return scope[i];
    }
  }
  return null;
}

/* Helper: formatear fecha ISO a dd/mm/aaaa hh:mm en zona Bogotá */
function negFmtFechaHora(iso) {
  if (!iso) return '—';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
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
    return '—';
  }
}

function renderNegocios() {
  if (negLoading) {
    return '<div class="eyebrow">VENTAS</div><h1 class="h1">Negocios activos</h1>' +
      '<div style="text-align:center;padding:60px 20px">' +
      '<div style="font-size:14px;font-weight:500;margin-bottom:6px">Cargando negocios...</div>' +
      '<div style="font-size:11px;color:var(--tm)">Consultando BD Trámites y Registro de actividades</div>' +
      '<div style="margin-top:20px"><div style="width:36px;height:36px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div></div>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>' +
      '</div>';
  }

  if (!negMotos) {
    return '<div class="eyebrow">VENTAS</div><h1 class="h1">Negocios activos</h1>' +
      '<div class="sub-title">Lista de motocicletas en proceso</div>' +
      '<div style="text-align:center;padding:40px 20px">' +
      '<button class="btn btn-p" style="max-width:260px;margin:0 auto" onclick="negSync()">Cargar lista de motos</button>' +
      (negError ? '<div style="margin-top:14px;padding:10px 14px;background:var(--rdl);border-radius:8px;border:0.5px solid var(--rd);color:var(--rdd);font-size:11px;max-width:340px;margin-left:auto;margin-right:auto">' + negError + '</div>' : '') +
      '</div>';
  }

  var scopeActs = negGetScopeActs();
  var totalScope = scopeActs.length;

  var rows = negMotos.map(function(m) {
    var code = m.codigo_barras || m.codigoBarras || m.Title || '';
    var tipo = negNormTipo(m.tipo_motocicleta || m.tipo);
    var marca = negNormMarca(m.marca || m.MARCA || m.Marca);
    var moto = ((m.linea || m.LINEA || '') + ' ' + (m.referencia || m.REFERENCIA || '')).trim() || '—';
    var fecha = m.fecha_venta || m.FechaVenta || m.fechaVenta || '';
    var dias = negDiasDesde(fecha);

    // Registros de esta moto
    var actividades = (negAvances || []).filter(function(r) {
      return (r.codigo_barras || r.Title || '') === code;
    });
    var ejecutadas = actividades.filter(function(r) {
      return (r.estado || '').toLowerCase() === 'ejecutada';
    });

    // Set de actividad_num ejecutadas (solo primarias, sin ".x")
    var ejecutadasSet = {};
    ejecutadas.forEach(function(r) {
      var n = String(r.actividad_num || '');
      if (n && n.indexOf('.') < 0) {
        ejecutadasSet[parseInt(n, 10)] = true;
      }
    });

    // Contar solo las del scope Trámites+Contabilidad ejecutadas
    var doneScope = 0;
    scopeActs.forEach(function(a) {
      if (ejecutadasSet[parseInt(a.num, 10)]) doneScope++;
    });
    var pct = totalScope ? Math.round((doneScope / totalScope) * 100) : 0;

    // ── ACTIVIDAD EN CURSO: primera pendiente del scope ──
    var enCurso = negFirstPending(ejecutadasSet);
    var actLabel, actArea, actCls;
    if (enCurso) {
      actLabel = enCurso.titulo;
      actArea = enCurso.responsable;
      actCls = pct === 100 ? 'green' : pct >= 75 ? 'green' : pct >= 50 ? 'warn' : 'purple';
    } else if (doneScope > 0) {
      actLabel = 'Proceso finalizado';
      actArea = '—';
      actCls = 'green';
    } else {
      actLabel = '—';
      actArea = '—';
      actCls = 'empty';
    }

    // ── ÚLTIMA ACTUALIZACIÓN: MAX created_at de esta moto ──
    var maxIso = null;
    actividades.forEach(function(r) {
      var t = r.created_at || r.fecha_registro || null;
      if (t && (!maxIso || t > maxIso)) maxIso = t;
    });
    var ultActLabel = negFmtFechaHora(maxIso);
    var ultActSort = maxIso || '';

    return {
      code: code, moto: moto, marca: marca, tipo: tipo, fecha: fecha,
      dias: dias, pct: pct, doneCount: doneScope,
      act: actLabel, actArea: actArea, actCls: actCls,
      ultAct: ultActLabel, ultActSort: ultActSort,
      com: '', comAuthor: '', comDate: ''
    };
  }).filter(function(r) { return r.code; });

  // Filtros
  var filtered = rows.slice();
  if (negFilterTipo) filtered = filtered.filter(function(x) { return x.tipo === negFilterTipo; });
  if (negFilterMarca) filtered = filtered.filter(function(x) { return x.marca === negFilterMarca; });
  if (negSearchTxt) {
    var s = negSearchTxt.toLowerCase();
    filtered = filtered.filter(function(x) {
      return (x.code + ' ' + x.moto + ' ' + x.act + ' ' + x.actArea).toLowerCase().indexOf(s) >= 0;
    });
  }

  // Conteos para filtros
  var cNd = rows.filter(function(r) { return r.tipo === 'nd'; }).length;
  var cNs = rows.filter(function(r) { return r.tipo === 'ns'; }).length;
  var cUs = rows.filter(function(r) { return r.tipo === 'us'; }).length;

  // Orden
  filtered.sort(function(a, b) {
    var va = a[negSortKey], vb = b[negSortKey];
    if (negSortKey === 'pct' || negSortKey === 'dias') {
      va = Number(va); vb = Number(vb);
    } else if (negSortKey === 'ultAct') {
      va = a.ultActSort; vb = b.ultActSort;
    } else {
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
    }
    if (va < vb) return negSortDir === 'asc' ? -1 : 1;
    if (va > vb) return negSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Header
  var h = '<div class="eyebrow">VENTAS</div><h1 class="h1">Negocios activos</h1>' +
    '<div class="sub-title">Lista de motocicletas en proceso · clic en encabezados para ordenar</div>';

  // Filtros
  h += '<div class="neg-filters">';
  h += '<div class="neg-filter-block"><span class="neg-select-label">Tipo de moto</span>' +
    '<select class="neg-select" onchange="negFilterTipo=this.value;render()">' +
    '<option value=""' + (negFilterTipo === '' ? ' selected' : '') + '>Todos los tipos</option>' +
    '<option value="nd"' + (negFilterTipo === 'nd' ? ' selected' : '') + '>Nueva Distribución (' + cNd + ')</option>' +
    '<option value="ns"' + (negFilterTipo === 'ns' ? ' selected' : '') + '>Subdistribución (' + cNs + ')</option>' +
    '<option value="us"' + (negFilterTipo === 'us' ? ' selected' : '') + '>Usadas (' + cUs + ')</option>' +
    '</select></div>';
  h += '<div class="neg-filter-block"><span class="neg-select-label">Marca</span>' +
    '<select class="neg-select" onchange="negFilterMarca=this.value;render()">' +
    '<option value=""' + (negFilterMarca === '' ? ' selected' : '') + '>Todas las marcas</option>' +
    '<option value="HERO"' + (negFilterMarca === 'HERO' ? ' selected' : '') + '>Hero</option>' +
    '<option value="SYM"' + (negFilterMarca === 'SYM' ? ' selected' : '') + '>SYM</option>' +
    '<option value="OTRA"' + (negFilterMarca === 'OTRA' ? ' selected' : '') + '>Otra</option>' +
    '</select></div>';
  h += '<button class="btn btn-o" style="width:auto;padding:9px 16px;font-size:11px;height:38px;align-self:flex-end" onclick="negSync()">🔄 Actualizar</button>';
  h += '</div>';

  // Tabla
  h += '<div class="neg-table">';
  h += '<div class="neg-table-bar">';
  h += '<div class="neg-table-count">' + filtered.length + ' NEGOCIO' + (filtered.length !== 1 ? 'S' : '') + ' EN CURSO</div>';
  h += '<input type="text" class="inp-sm" placeholder="Buscar código, moto, actividad..." value="' + negSearchTxt + '" oninput="negSearchTxt=this.value;render()" style="width:280px">';
  h += '</div>';

  // Encabezados
  function th(key, label, right) {
    var active = negSortKey === key;
    var arrowUp = active && negSortDir === 'asc' ? ' on' : '';
    var arrowDn = active && negSortDir === 'desc' ? ' on' : '';
    return '<div class="neg-th' + (active ? ' active' : '') + (right ? ' right' : '') + '" onclick="negSort(\'' + key + '\')">' + label + '<span class="neg-th-arrow"><span class="up' + arrowUp + '">▲</span><span class="dn' + arrowDn + '">▼</span></span></div>';
  }
  h += '<div class="neg-cols neg-table-head">';
  h += th('code', 'CÓDIGO');
  h += th('moto', 'MOTO');
  h += th('fecha', 'FECHA VENTA');
  h += th('act', 'ACTIVIDAD EN CURSO');
  h += th('actArea', 'ÁREA');
  h += th('ultAct', 'ÚLTIMA ACTUALIZACIÓN');
  h += th('pct', 'AVANCE');
  h += th('dias', 'DÍAS', true);
  h += '</div>';

  if (!filtered.length) {
    h += '<div class="empty">Sin resultados con los filtros aplicados</div>';
  } else {
    var tagMap = {
      warn: 'neg-tag-warn',
      purple: 'neg-tag-purple',
      red: 'neg-tag-red',
      green: 'neg-tag-green',
      blue: 'neg-tag-blue',
      empty: 'neg-tag-empty'
    };
    filtered.forEach(function(r) {
      var commentBlock = r.com
        ? '<span class="neg-comment-icon" onclick="event.stopPropagation();negShowComment(\'' + r.code + '\')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span class="neg-comment-dot"></span></span>'
        : '<span class="neg-comment-spacer"></span>';
      var markCls = r.marca === 'HERO' ? 'hero' : r.marca === 'SYM' ? 'sym' : 'otra';
      var daysCls = r.dias >= 15 ? ' neg-days-danger' : r.dias >= 10 ? ' neg-days-warn' : '';
      h += '<div class="neg-cols neg-row">';
      h += '<div class="neg-code">' + r.code + '</div>';
      h += '<div><div class="neg-cell">' + r.moto + '</div><span class="neg-mark ' + markCls + '">' + r.marca + '</span></div>';
      h += '<div class="neg-fecha">' + negFmtFecha(r.fecha) + '</div>';
      h += '<div style="display:flex;align-items:center"><span class="neg-tag ' + (tagMap[r.actCls] || 'neg-tag-empty') + '">' + r.act + '</span>' + commentBlock + '</div>';
      h += '<div style="font-size:12px;color:var(--tx)">' + r.actArea + '</div>';
      h += '<div style="font-size:11px;color:var(--tm);font-family:var(--fm)">' + r.ultAct + '</div>';
      h += '<div class="neg-progress"><div class="neg-progress-bar"><div class="neg-progress-fill" style="width:' + r.pct + '%;background:' + negProgressColor(r.pct) + '"></div></div><span class="neg-progress-pct" style="color:' + negProgressColor(r.pct) + '">' + r.pct + '%</span></div>';
      h += '<div style="text-align:right;font-size:13px' + (daysCls ? ';' + (r.dias >= 15 ? 'color:var(--rd)' : 'color:var(--yl)') + ';font-weight:500' : '') + '">' + r.dias + '</div>';
      h += '</div>';
    });
  }
  h += '</div>';
  return h;
}

function negSort(key) {
  if (negSortKey === key) {
    negSortDir = negSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    negSortKey = key;
    negSortDir = 'asc';
  }
  render();
}

function negShowComment(code) {
  toast('Comentarios pendientes de implementar');
}

function negSync() {
  negLoading = true;
  negError = '';
  render();

  // Check de BD_Tramites (sigue en Power Automate)
  if (!getUrl('tramLista')) {
    negLoading = false;
    negError = 'Falta URL de TRAM_Consulta_Lista en Configuración';
    render();
    return;
  }

  // Check de Supabase (nuevo)
  if (!supabaseReady()) {
    negLoading = false;
    negError = 'Supabase no configurado (revisá SUPABASE_URL y SUPABASE_ANON_KEY en config.js)';
    render();
    return;
  }

  Promise.all([
    apiTramListar(),
    apiAvanceConsultar()
  ]).then(function(results) {
    negLoading = false;
    var motos = results[0].value || results[0] || [];
    var avances = results[1].value || results[1] || [];
    if (!Array.isArray(motos)) motos = [];
    if (!Array.isArray(avances)) avances = [];
    negMotos = motos;
    negAvances = avances;
    // Invalidar cache del scope por si ACTIVIDADES_TRAM cambió
    _negScopeCache = null;
    toast('✓ ' + motos.length + ' motos cargadas');
    render();
  }).catch(function(e) {
    negLoading = false;
    negError = e.name === 'AbortError' ? 'Tiempo agotado al consultar' : 'Error: ' + e.message;
    toast('Error al cargar negocios', 1);
    render();
  });
}
