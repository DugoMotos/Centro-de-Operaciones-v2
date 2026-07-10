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
   ============================================================ */

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

  var rows = negMotos.map(function(m) {
    var code = m.codigo_barras || m.codigoBarras || m.Title || '';
    var tipo = negNormTipo(m.tipo_motocicleta || m.tipo);
    var marca = negNormMarca(m.marca || m.MARCA || m.Marca);
    var moto = ((m.linea || m.LINEA || '') + ' ' + (m.referencia || m.REFERENCIA || '')).trim() || '—';
    var fecha = m.fecha_venta || m.FechaVenta || m.fechaVenta || '';
    var dias = negDiasDesde(fecha);

    var actividades = (negAvances || []).filter(function(r) {
      return (r.codigo_barras || r.Title || '') === code;
    });
    var ejecutadas = actividades.filter(function(r) {
      return (r.estado || '').toLowerCase() === 'ejecutada';
    });

    var nums = {};
    ejecutadas.forEach(function(r) {
      var n = String(r.actividad_num || '');
      if (n && n.indexOf('.') < 0) nums[n] = true;
    });
    var doneCount = Object.keys(nums).length;
    var pct = Math.round((doneCount / TOTAL_TRAM) * 100);

    var sorted = ejecutadas.slice().sort(function(a, b) {
      var na = parseFloat(a.actividad_num || '0');
      var nb = parseFloat(b.actividad_num || '0');
      return nb - na;
    });
    var ultima = sorted[0];
    var actLabel = '—', actCls = 'empty';
    if (ultima) {
      var num = ultima.actividad_num || '';
      var actObj = ACTIVIDADES_TRAM.find(function(a) { return a.num === String(num); });
      var titulo = actObj ? actObj.titulo : (ultima.actividad || '');
      actLabel = num + ' · ' + titulo;
      actCls = pct === 100 ? 'green' : pct >= 75 ? 'green' : pct >= 50 ? 'warn' : 'purple';
    }

    return {
      code: code, moto: moto, marca: marca, tipo: tipo, fecha: fecha,
      dias: dias, pct: pct, doneCount: doneCount,
      act: actLabel, actCls: actCls,
      com: '', comAuthor: '', comDate: ''
    };
  }).filter(function(r) { return r.code; });

  var filtered = rows.slice();
  if (negFilterTipo) filtered = filtered.filter(function(x) { return x.tipo === negFilterTipo; });
  if (negFilterMarca) filtered = filtered.filter(function(x) { return x.marca === negFilterMarca; });
  if (negSearchTxt) {
    var s = negSearchTxt.toLowerCase();
    filtered = filtered.filter(function(x) {
      return (x.code + ' ' + x.moto + ' ' + x.act).toLowerCase().indexOf(s) >= 0;
    });
  }

  var cNd = rows.filter(function(r) { return r.tipo === 'nd'; }).length;
  var cNs = rows.filter(function(r) { return r.tipo === 'ns'; }).length;
  var cUs = rows.filter(function(r) { return r.tipo === 'us'; }).length;

  filtered.sort(function(a, b) {
    var va = a[negSortKey], vb = b[negSortKey];
    if (negSortKey === 'pct' || negSortKey === 'dias') {
      va = Number(va); vb = Number(vb);
    } else {
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
    }
    if (va < vb) return negSortDir === 'asc' ? -1 : 1;
    if (va > vb) return negSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  var h = '<div class="eyebrow">VENTAS</div><h1 class="h1">Negocios activos</h1>' +
    '<div class="sub-title">Lista de motocicletas en proceso · clic en encabezados para ordenar</div>';

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

  h += '<div class="neg-table">';
  h += '<div class="neg-table-bar">';
  h += '<div class="neg-table-count">' + filtered.length + ' NEGOCIO' + (filtered.length !== 1 ? 'S' : '') + ' EN CURSO</div>';
  h += '<input type="text" class="inp-sm" placeholder="Buscar código, moto, actividad..." value="' + negSearchTxt + '" oninput="negSearchTxt=this.value;render()" style="width:280px">';
  h += '</div>';

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
    toast('✓ ' + motos.length + ' motos cargadas');
    render();
  }).catch(function(e) {
    negLoading = false;
    negError = e.name === 'AbortError' ? 'Tiempo agotado al consultar' : 'Error: ' + e.message;
    toast('Error al cargar negocios', 1);
    render();
  });
}
