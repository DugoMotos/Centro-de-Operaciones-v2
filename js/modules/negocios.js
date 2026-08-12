/* ============================================================
   NEGOCIOS.JS — Módulo Negocios Activos (Opción A: barra + chips)
   ============================================================
   Columnas:
   Código | Fecha Venta | Marca | Referencia | Cliente | Asesor
   | Proceso Actual | Avance | Días

   Filtros (dropdowns): Área | Marca | Tipo
   Búsqueda: texto libre (código, cliente, asesor, referencia, actividad)
   Filtros activos se muestran como chips removibles
   ============================================================ */

/* Scope de manuales Trámites + Contabilidad ordenadas por 'orden' */
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

/* Primera pendiente del scope según set de ejecutadas */
function negFirstPending(ejecutadasSet) {
  var scope = negGetScopeActs();
  for (var i = 0; i < scope.length; i++) {
    var actNum = parseInt(scope[i].num, 10);
    if (!ejecutadasSet[actNum]) return scope[i];
  }
  return null;
}

/* Formatear fecha a dd/mm/aaaa */
function negFmtFecha(valor) {
  if (!valor) return '—';
  try {
    var d;
    // Si es un serial de Excel (número puro)
    var numVal = Number(valor);
    if (!isNaN(numVal) && numVal > 25569 && numVal < 100000) {
      // Excel epoch: 1899-12-30 (por el bug de 1900)
      d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
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

/* Días transcurridos desde fecha (ISO o dd/mm/aaaa) */
function negDiasDesde(fecha) {
  if (!fecha) return 0;
  try {
    var d;
    var numVal = Number(fecha);
    if (!isNaN(numVal) && numVal > 25569 && numVal < 100000) {
      d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    } else if (fecha.indexOf && fecha.indexOf('/') >= 0) {
      var p = fecha.split('/');
      d = new Date(p[2], parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    } else {
      d = new Date(fecha);
    }
    if (isNaN(d.getTime())) return 0;
    var ms = new Date().getTime() - d.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  } catch (e) {
    return 0;
  }
}

/* Normalización de marca */
function negNormMarca(m) {
  m = (m || '').toString().toUpperCase().trim();
  if (m === 'HERO') return 'HERO';
  if (m === 'SYM') return 'SYM';
  if (!m) return '';
  return 'OTRA';
}

/* Normalización de tipo */
function negNormTipo(t) {
  t = (t || '').toString().toLowerCase().trim();
  if (t.indexOf('nueva') >= 0) return 'nd';
  if (t.indexOf('sub') >= 0) return 'ns';
  if (t.indexOf('usad') >= 0) return 'us';
  return '';
}

/* Color de la barra de avance */
function negProgressColor(pct) {
  if (pct >= 100) return 'var(--gn)';
  if (pct >= 75) return 'var(--gn)';
  if (pct >= 50) return 'var(--yl)';
  return 'var(--or)';
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
    var linea = m.linea || m.LINEA || m.Linea || '';
    var referencia = m.referencia || m.REFERENCIA || m.Referencia || '';
    var motoRef = (linea + ' ' + referencia).trim() || '—';
var clienteRaw = m.cliente || m.CLIENTE || m.Cliente || '';
var cliente = clienteRaw ? clienteRaw.toLowerCase().split(' ').map(function(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}).join(' ') : '—';
    var asesorRaw = m.asesor || m.ASESOR || m.Asesor || '';
var asesor = asesorRaw ? asesorRaw.toLowerCase().split(' ').map(function(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}).join(' ') : '—';
    var fecha = m.fecha_venta || m.FechaVenta || m.fechaVenta || '';
    var dias = negDiasDesde(fecha);

    var actividades = (negAvances || []).filter(function(r) {
      return (r.codigo_barras || r.Title || '') === code;
    });
    var ejecutadas = actividades.filter(function(r) {
      return (r.estado || '').toLowerCase() === 'ejecutada';
    });

    var ejecutadasSet = {};
    ejecutadas.forEach(function(r) {
      var n = String(r.actividad_num || '');
      if (n && n.indexOf('.') < 0) ejecutadasSet[parseInt(n, 10)] = true;
    });

    var doneScope = 0;
    scopeActs.forEach(function(a) {
      if (ejecutadasSet[parseInt(a.num, 10)]) doneScope++;
    });
    var pct = totalScope ? Math.round((doneScope / totalScope) * 100) : 0;

    var enCurso = negFirstPending(ejecutadasSet);
    var procLabel, procArea, procCls;
    if (enCurso) {
      procLabel = enCurso.titulo;
      procArea = enCurso.responsable;
      procCls = pct === 100 ? 'green' : pct >= 75 ? 'green' : pct >= 50 ? 'warn' : 'purple';
    } else if (doneScope > 0) {
      procLabel = 'Proceso finalizado';
      procArea = '—';
      procCls = 'green';
    } else {
      procLabel = '—';
      procArea = '—';
      procCls = 'empty';
    }

    return {
      code: code, marca: marca, referencia: motoRef, cliente: cliente,
      asesor: asesor, fecha: fecha, dias: dias, pct: pct,
      proc: procLabel, procArea: procArea, procCls: procCls,
      tipo: tipo
    };
  }).filter(function(r) { return r.code; });

  // Aplicar filtros
  var filtered = rows.slice();
  if (negFilterArea) filtered = filtered.filter(function(x) { return x.procArea === negFilterArea; });
  if (negFilterMarca) filtered = filtered.filter(function(x) { return x.marca === negFilterMarca; });
  if (negFilterTipo) filtered = filtered.filter(function(x) { return x.tipo === negFilterTipo; });
   if (negFilterAsesor) filtered = filtered.filter(function(x) {
    return x.asesor === negFilterAsesor;
  });
  if (negSearchTxt) {
    var s = negSearchTxt.toLowerCase();
    filtered = filtered.filter(function(x) {
      return (x.code + ' ' + x.referencia + ' ' + x.cliente + ' ' + x.asesor + ' ' + x.proc).toLowerCase().indexOf(s) >= 0;
    });
  }

  // Ordenar
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

  // Barra de filtros: búsqueda + dropdowns
  h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">';
  h += '<div style="flex:1;min-width:220px;position:relative">';
  h += '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--tm);font-size:13px">🔍</span>';
  h += '<input type="text" class="inp" id="negSearchInput" placeholder="Buscar código, cliente, asesor, actividad..." value="' + negSearchTxt + '" oninput="negSearchTxt=this.value;render();setTimeout(function(){var el=document.getElementById(\'negSearchInput\');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},0)" style="padding-left:32px;padding-right:32px;font-size:12px;height:34px">';
  if (negSearchTxt) {
    h += '<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--tm);font-size:16px;cursor:pointer;line-height:1" onclick="negSearchTxt=\'\';render()" title="Limpiar búsqueda">×</span>';
  }
  h += '</div>';

  h += '<select class="neg-select" style="height:34px;min-width:130px" onchange="negFilterArea=this.value;render()">' +
    '<option value=""' + (negFilterArea === '' ? ' selected' : '') + '>Todas las áreas</option>' +
    '<option value="Trámites"' + (negFilterArea === 'Trámites' ? ' selected' : '') + '>Trámites</option>' +
    '<option value="Contabilidad"' + (negFilterArea === 'Contabilidad' ? ' selected' : '') + '>Contabilidad</option>' +
    '<option value="Logística"' + (negFilterArea === 'Logística' ? ' selected' : '') + '>Logística</option>' +
    '<option value="Inventario"' + (negFilterArea === 'Inventario' ? ' selected' : '') + '>Inventario</option>' +
    '</select>';

  h += '<select class="neg-select" style="height:34px;min-width:120px" onchange="negFilterMarca=this.value;render()">' +
    '<option value=""' + (negFilterMarca === '' ? ' selected' : '') + '>Todas las marcas</option>' +
    '<option value="HERO"' + (negFilterMarca === 'HERO' ? ' selected' : '') + '>Hero</option>' +
    '<option value="SYM"' + (negFilterMarca === 'SYM' ? ' selected' : '') + '>SYM</option>' +
    '<option value="OTRA"' + (negFilterMarca === 'OTRA' ? ' selected' : '') + '>Otra</option>' +
    '</select>';

  h += '<select class="neg-select" style="height:34px;min-width:150px" onchange="negFilterTipo=this.value;render()">' +
    '<option value=""' + (negFilterTipo === '' ? ' selected' : '') + '>Todos los tipos</option>' +
    '<option value="nd"' + (negFilterTipo === 'nd' ? ' selected' : '') + '>Nueva Distribución</option>' +
    '<option value="ns"' + (negFilterTipo === 'ns' ? ' selected' : '') + '>Subdistribución</option>' +
    '<option value="us"' + (negFilterTipo === 'us' ? ' selected' : '') + '>Usadas</option>' +
    '</select>';

   // Dropdown de asesores
  h += '<select class="neg-select" style="height:34px;min-width:150px" onchange="negFilterAsesor=this.value;render()">';
  h += '<option value=""' + (negFilterAsesor === '' ? ' selected' : '') + '>Todos los asesores</option>';
  if (negAsesores && negAsesores.length) {
    negAsesores.forEach(function(a) {
      h += '<option value="' + a.nombre_completo + '"' + (negFilterAsesor === a.nombre_completo ? ' selected' : '') + '>' + a.nombre_completo + '</option>';
    });
  }
  h += '</select>';

  h += '<button class="btn btn-o" style="width:auto;padding:0 14px;font-size:11px;height:34px" onclick="negSync()">🔄 Actualizar</button>';
  h += '</div>';

  // Chips de filtros activos
  var hasFilters = negFilterArea || negFilterMarca || negFilterTipo || negFilterAsesor || negSearchTxt;
  if (hasFilters) {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;padding:8px 0;border-top:0.5px solid var(--bd);border-bottom:0.5px solid var(--bd);margin-bottom:10px;align-items:center">';
    h += '<span style="font-size:10px;color:var(--tm);margin-right:4px">FILTROS ACTIVOS:</span>';
    if (negFilterArea) {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + negFilterArea + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterArea=\'\';render()">×</span></span>';
    }
    if (negFilterMarca) {
      var mLabel = negFilterMarca === 'HERO' ? 'Hero' : negFilterMarca === 'SYM' ? 'SYM' : 'Otra';
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + mLabel + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterMarca=\'\';render()">×</span></span>';
    }
    if (negFilterTipo) {
      var tLabel = negFilterTipo === 'nd' ? 'Nueva Distribución' : negFilterTipo === 'ns' ? 'Subdistribución' : 'Usadas';
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + tLabel + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterTipo=\'\';render()">×</span></span>';
    }
     if (negFilterAsesor) {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + negFilterAsesor + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterAsesor=\'\';render()">×</span></span>';
    }
    if (negSearchTxt) {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">"' + negSearchTxt + '" <span style="cursor:pointer;font-weight:700" onclick="negSearchTxt=\'\';render()">×</span></span>';
    }
    h += '<span style="font-size:11px;color:var(--bl);cursor:pointer;margin-left:6px;text-decoration:underline" onclick="negFilterArea=\'\';negFilterMarca=\'\';negFilterTipo=\'\';negFilterAsesor=\'\';negSearchTxt=\'\';render()">Limpiar todos</span>';
    h += '</div>';
  }

  // Tabla
  h += '<div class="neg-table">';
  h += '<div class="neg-table-bar">';
  h += '<div class="neg-table-count">' + filtered.length + ' NEGOCIO' + (filtered.length !== 1 ? 'S' : '') + ' EN CURSO</div>';
  h += '</div>';

  function th(key, label, right) {
    var active = negSortKey === key;
    var arrowUp = active && negSortDir === 'asc' ? ' on' : '';
    var arrowDn = active && negSortDir === 'desc' ? ' on' : '';
    return '<div class="neg-th' + (active ? ' active' : '') + (right ? ' right' : '') + '" onclick="negSort(\'' + key + '\')">' + label + '<span class="neg-th-arrow"><span class="up' + arrowUp + '">▲</span><span class="dn' + arrowDn + '">▼</span></span></div>';
  }
  h += '<div class="neg-cols neg-table-head">';
  h += th('code', 'CÓDIGO');
  h += th('fecha', 'FECHA VENTA');
  h += th('marca', 'MARCA');
  h += th('referencia', 'REFERENCIA');
  h += th('cliente', 'CLIENTE');
  h += th('asesor', 'ASESOR');
  h += th('proc', 'PROCESO ACTUAL');
   h += th('procArea', 'ÁREA');
  h += th('pct', 'AVANCE');
  h += th('dias', 'DÍAS', true);
  h += '</div>';

  if (!filtered.length) {
    h += '<div class="empty">Sin resultados con los filtros aplicados</div>';
  } else {
    var tagMap = {
      warn: 'neg-tag-warn',
      purple: 'neg-tag-purple',
      green: 'neg-tag-green',
      empty: 'neg-tag-empty'
    };
    filtered.forEach(function(r) {
      var markCls = r.marca === 'HERO' ? 'hero' : r.marca === 'SYM' ? 'sym' : 'otra';
      var daysCls = r.dias >= 15 ? ' neg-days-danger' : r.dias >= 10 ? ' neg-days-warn' : '';
      h += '<div class="neg-cols neg-row">';
      h += '<div class="neg-code">' + r.code + '</div>';
      h += '<div class="neg-fecha">' + negFmtFecha(r.fecha) + '</div>';
      h += '<div><span class="neg-mark ' + markCls + '">' + (r.marca || '—') + '</span></div>';
      h += '<div class="neg-cell">' + r.referencia + '</div>';
      h += '<div class="neg-cell">' + r.cliente + '</div>';
      h += '<div class="neg-cell">' + r.asesor + '</div>';
      h += '<div style="display:flex;align-items:center"><span class="neg-tag ' + (tagMap[r.procCls] || 'neg-tag-empty') + '">' + r.proc + '</span></div>';
      h += '<div class="neg-cell" style="font-size:12px;color:var(--tm)">' + r.procArea + '</div>'; 
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

function negSync() {
  negLoading = true;
  negError = '';
  render();

  if (!getUrl('tramLista')) {
    negLoading = false;
    negError = 'Falta URL de TRAM_Consulta_Lista en Configuración';
    render();
    return;
  }

  if (!supabaseReady()) {
    negLoading = false;
    negError = 'Supabase no configurado';
    render();
    return;
  }

  Promise.all([
    apiTramListar(),
    apiAvanceConsultar(),
    apiAsesoresConsultar()
  ]).then(function(results) {
     
    negLoading = false;
    var motos = results[0].value || results[0] || [];
    var avances = results[1].value || results[1] || [];
    if (!Array.isArray(motos)) motos = [];
    if (!Array.isArray(avances)) avances = [];
    negMotos = motos;
    negAvances = avances;
    negAsesores = results[2] || [];
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
