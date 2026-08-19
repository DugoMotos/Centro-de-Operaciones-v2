/* ============================================================
   NEGOCIOS.JS — Módulo Negocios Activos
   ============================================================
   Columnas:
   Código | Fecha Venta | Marca | Referencia | Cliente | Asesor
   | Proceso Actual | Área | Avance | Últ. Actualización | Días

   Filtros (dropdowns): Área | Marca | Tipo | Asesor
   Búsqueda: texto libre (código, cliente, asesor, referencia, actividad)
   Filtros activos se muestran como chips removibles

   TABLA: <table> HTML nativa
   - Cada columna toma el ancho de su contenido más largo
   - Una línea por celda (nombres largos no se parten)
   - Scroll horizontal + vertical cuando no cabe
   - Header sticky (se queda arriba al hacer scroll vertical)
   - Columna Código sticky (se queda a la izquierda al scroll horizontal)
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

/* NOTA: negFmtFecha, negDiasDesde, negNormMarca, negNormTipo,
   negProgressColor, negParseFechaHora y esc viven en js/utils.js
   — los comparte con home.js. No los redefinas acá. */

/* ============================================================
   negUltimaAct — Última vez que se registró algo de esta moto
   ============================================================
   Recorre TODAS las actividades registradas de la moto (no solo
   las ejecutadas: un "no aplica" también es movimiento del
   proceso) y se queda con la más reciente.

   QUÉ FECHA USA — importa el detalle:

   `fecha_registro` es la fecha de negocio (la que reportó la
   persona) y `created_at` es cuándo entró el registro a la BD.

   Hoy pCheckStep NO envía fecha_registro, así que en la práctica
   viene vacía y el dato real es created_at. Pero si algún día se
   empieza a mandar como fecha sola (sin hora), mostrarla haría
   perder la hora — que es justo lo que sirve para saber cuánto
   lleva parada la moto durante el día.

   Por eso: se usa fecha_registro solo si TRAE HORA. Si no, gana
   created_at.

   Devuelve:
     ts      milisegundos del último movimiento (0 = sin registros)
     conHora si ese valor trae hora o es solo fecha
     dias    días de CALENDARIO desde entonces (para el color)
   ============================================================ */
function negUltimaAct(actividades) {
  var maxTs = 0;
  var conHora = false;

  (actividades || []).forEach(function(r) {
    var reg = r.fecha_registro || '';
    var cre = r.created_at || '';

    // Preferimos el valor que traiga hora
    var elegido = negTieneHora(reg) ? reg : (cre || reg);
    if (!elegido) return;

    var d = negParseFechaHora(elegido);
    if (!d) return;

    var ts = d.getTime();
    if (ts > maxTs) {
      maxTs = ts;
      conHora = negTieneHora(elegido);
    }
  });

  return {
    ts: maxTs,
    conHora: conHora,
    dias: maxTs ? negDiasCalendario(maxTs) : null
  };
}

/* ============================================================
   negUltimaActTexto — Cómo se muestra en la celda
   ============================================================
   Devuelve { principal, relativo }.

     hoy 14:32        · hace 3h
     ayer 09:15       · hace 1d
     18/08/2026 14:32 · hace 20d

   La hora siempre está a la vista cuando el dato la tiene: es lo
   que permite saber cuánto lleva sin moverse dentro del día.
   ============================================================ */
function negUltimaActTexto(ts, conHora, diasCal) {
  var hora = conHora ? negFmtHora(ts) : '';

  var fecha;
  if (diasCal === 0) fecha = 'hoy';
  else if (diasCal === 1) fecha = 'ayer';
  else fecha = negFmtFecha(ts);

  var ms = Date.now() - ts;
  var mins = Math.floor(ms / 60000);
  var horas = Math.floor(ms / 3600000);

  var relativo;
  if (diasCal === 0 && mins < 1) relativo = 'recién';
  else if (diasCal === 0 && mins < 60) relativo = 'hace ' + mins + ' min';
  else if (diasCal === 0) relativo = 'hace ' + horas + 'h';
  else relativo = 'hace ' + diasCal + 'd';

  return {
    principal: (fecha + (hora ? ' ' + hora : '')).trim(),
    relativo: relativo
  };
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

    var ultAct = negUltimaAct(actividades);

    return {
      code: code, marca: marca, referencia: motoRef, cliente: cliente,
      asesor: asesor, fecha: fecha, dias: dias, pct: pct,
      proc: procLabel, procArea: procArea, procCls: procCls,
      tipo: tipo,
      ultActTs: ultAct.ts, ultActDias: ultAct.dias, ultActConHora: ultAct.conHora
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
  // ultActTs es un timestamp en milisegundos: va por el camino numérico,
  // si no ordenaría como texto y quedaría mal.
  var COLS_NUMERICAS = { pct: 1, dias: 1, ultActTs: 1 };
  filtered.sort(function(a, b) {
    var va = a[negSortKey], vb = b[negSortKey];
    if (COLS_NUMERICAS[negSortKey]) {
      va = Number(va) || 0; vb = Number(vb) || 0;
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
  h += '<input type="text" class="inp" id="negSearchInput" placeholder="Buscar código, cliente, asesor, actividad..." value="' + esc(negSearchTxt) + '" oninput="negSearchTxt=this.value;negRender();setTimeout(function(){var el=document.getElementById(\'negSearchInput\');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},0)" style="padding-left:32px;padding-right:32px;font-size:12px;height:34px">';
  if (negSearchTxt) {
    h += '<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--tm);font-size:16px;cursor:pointer;line-height:1" onclick="negSearchTxt=\'\';negRender()" title="Limpiar búsqueda">×</span>';
  }
  h += '</div>';

  h += '<select class="neg-select" style="height:34px;min-width:130px" onchange="negFilterArea=this.value;negRender()">' +
    '<option value=""' + (negFilterArea === '' ? ' selected' : '') + '>Todas las áreas</option>' +
    '<option value="Trámites"' + (negFilterArea === 'Trámites' ? ' selected' : '') + '>Trámites</option>' +
    '<option value="Contabilidad"' + (negFilterArea === 'Contabilidad' ? ' selected' : '') + '>Contabilidad</option>' +
    '<option value="Logística"' + (negFilterArea === 'Logística' ? ' selected' : '') + '>Logística</option>' +
    '<option value="Inventario"' + (negFilterArea === 'Inventario' ? ' selected' : '') + '>Inventario</option>' +
    '</select>';

  h += '<select class="neg-select" style="height:34px;min-width:120px" onchange="negFilterMarca=this.value;negRender()">' +
    '<option value=""' + (negFilterMarca === '' ? ' selected' : '') + '>Todas las marcas</option>' +
    '<option value="HERO"' + (negFilterMarca === 'HERO' ? ' selected' : '') + '>Hero</option>' +
    '<option value="SYM"' + (negFilterMarca === 'SYM' ? ' selected' : '') + '>SYM</option>' +
    '<option value="BAJAJ"' + (negFilterMarca === 'BAJAJ' ? ' selected' : '') + '>Bajaj</option>' +
    '<option value="OTRA"' + (negFilterMarca === 'OTRA' ? ' selected' : '') + '>Otra</option>' +
    '</select>';

  h += '<select class="neg-select" style="height:34px;min-width:150px" onchange="negFilterTipo=this.value;negRender()">' +
    '<option value=""' + (negFilterTipo === '' ? ' selected' : '') + '>Todos los tipos</option>' +
    '<option value="nd"' + (negFilterTipo === 'nd' ? ' selected' : '') + '>Nueva Distribución</option>' +
    '<option value="ns"' + (negFilterTipo === 'ns' ? ' selected' : '') + '>Subdistribución</option>' +
    '<option value="us"' + (negFilterTipo === 'us' ? ' selected' : '') + '>Usadas</option>' +
    '</select>';

  // Dropdown de asesores
  h += '<select class="neg-select" style="height:34px;min-width:150px" onchange="negFilterAsesor=this.value;negRender()">';
  h += '<option value=""' + (negFilterAsesor === '' ? ' selected' : '') + '>Todos los asesores</option>';
  if (negAsesores && negAsesores.length) {
    negAsesores.forEach(function(a) {
      h += '<option value="' + esc(a.nombre_completo) + '"' + (negFilterAsesor === a.nombre_completo ? ' selected' : '') + '>' + esc(a.nombre_completo) + '</option>';
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
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + esc(negFilterArea) + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterArea=\'\';negRender()">×</span></span>';
    }
    if (negFilterMarca) {
      var mLabel = negFilterMarca === 'HERO' ? 'Hero' : negFilterMarca === 'SYM' ? 'SYM' : negFilterMarca === 'BAJAJ' ? 'Bajaj' : 'Otra';
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + mLabel + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterMarca=\'\';negRender()">×</span></span>';
    }
    if (negFilterTipo) {
      var tLabel = negFilterTipo === 'nd' ? 'Nueva Distribución' : negFilterTipo === 'ns' ? 'Subdistribución' : 'Usadas';
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + tLabel + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterTipo=\'\';negRender()">×</span></span>';
    }
    if (negFilterAsesor) {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">' + esc(negFilterAsesor) + ' <span style="cursor:pointer;font-weight:700" onclick="negFilterAsesor=\'\';negRender()">×</span></span>';
    }
    if (negSearchTxt) {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--bll);color:var(--bld);font-weight:600">"' + esc(negSearchTxt) + '" <span style="cursor:pointer;font-weight:700" onclick="negSearchTxt=\'\';negRender()">×</span></span>';
    }
    h += '<span style="font-size:11px;color:var(--bl);cursor:pointer;margin-left:6px;text-decoration:underline" onclick="negFilterArea=\'\';negFilterMarca=\'\';negFilterTipo=\'\';negFilterAsesor=\'\';negSearchTxt=\'\';negRender()">Limpiar todos</span>';
    h += '</div>';
  }

  // ══════════════════════════════════════════════════════════
  // TABLA HTML NATIVA
  // ══════════════════════════════════════════════════════════
  h += '<div class="neg-table">';
  h += '<div class="neg-table-bar">';
  h += '<div class="neg-table-count">' + filtered.length + ' NEGOCIO' + (filtered.length !== 1 ? 'S' : '') + ' EN CURSO</div>';
  h += '</div>';

  // Helper para header de columna con flechas de orden
  function thCol(key, label, opts) {
    opts = opts || {};
    var active = negSortKey === key;
    var arrowUp = active && negSortDir === 'asc' ? ' on' : '';
    var arrowDn = active && negSortDir === 'desc' ? ' on' : '';
    var cls = 'neg-th';
    if (active) cls += ' active';
    if (opts.right) cls += ' right';
    if (opts.sticky) cls += ' neg-sticky-col';
    return '<th class="' + cls + '" onclick="negSort(\'' + key + '\')">' +
      '<span class="neg-th-inner">' + label +
      '<span class="neg-th-arrow"><span class="up' + arrowUp + '">▲</span><span class="dn' + arrowDn + '">▼</span></span>' +
      '</span></th>';
  }

  h += '<table class="neg-tbl">';

  // Encabezado
  h += '<thead><tr>';
  h += thCol('code', 'CÓDIGO', { sticky: true });
  h += thCol('fecha', 'FECHA VENTA');
  h += thCol('marca', 'MARCA');
  h += thCol('referencia', 'REFERENCIA');
  h += thCol('cliente', 'CLIENTE');
  h += thCol('asesor', 'ASESOR');
  h += thCol('proc', 'PROCESO ACTUAL');
  h += thCol('procArea', 'ÁREA');
  h += thCol('pct', 'AVANCE');
  h += thCol('ultActTs', 'ÚLT. ACTUALIZACIÓN');
  h += thCol('dias', 'DÍAS', { right: true });
  h += '</tr></thead>';

  // Cuerpo
  h += '<tbody>';

  if (!filtered.length) {
    h += '<tr><td colspan="11" class="neg-empty">Sin resultados con los filtros aplicados</td></tr>';
  } else {
    var tagMap = {
      warn: 'neg-tag-warn',
      purple: 'neg-tag-purple',
      green: 'neg-tag-green',
      empty: 'neg-tag-empty'
    };
    filtered.forEach(function(r) {
      var markCls = r.marca === 'HERO' ? 'hero' : r.marca === 'SYM' ? 'sym' : r.marca === 'BAJAJ' ? 'bajaj' : 'otra';
      var diasCls = r.dias >= 15 ? 'neg-days-danger' : r.dias >= 10 ? 'neg-days-warn' : '';

      h += '<tr>';

      // Código (columna fija)
      h += '<td class="neg-sticky-col"><span class="neg-code">' + esc(r.code) + '</span></td>';

      // Fecha
      h += '<td><span class="neg-fecha">' + negFmtFecha(r.fecha) + '</span></td>';

      // Marca
      h += '<td><span class="neg-mark ' + markCls + '">' + esc(r.marca || '—') + '</span></td>';

      // Referencia
      h += '<td>' + esc(r.referencia) + '</td>';

      // Cliente
      h += '<td>' + esc(r.cliente) + '</td>';

      // Asesor
      h += '<td>' + esc(r.asesor) + '</td>';

      // Proceso actual
      h += '<td><span class="neg-tag ' + (tagMap[r.procCls] || 'neg-tag-empty') + '">' + esc(r.proc) + '</span></td>';

      // Área
      h += '<td><span class="neg-area">' + esc(r.procArea) + '</span></td>';

      // Avance
      h += '<td><div class="neg-progress"><div class="neg-progress-bar"><div class="neg-progress-fill" style="width:' + r.pct + '%;background:' + negProgressColor(r.pct) + '"></div></div><span class="neg-progress-pct" style="color:' + negProgressColor(r.pct) + '">' + r.pct + '%</span></div></td>';

      // Última actualización del proceso
      if (r.ultActTs) {
        // Sin movimiento hace mucho = proceso estancado
        var ultCls = r.ultActDias >= 15 ? ' neg-ult-danger'
                   : r.ultActDias >= 7  ? ' neg-ult-warn'
                   : '';
        var ult = negUltimaActTexto(r.ultActTs, r.ultActConHora, r.ultActDias);
        // El title lleva la fecha completa, útil cuando arriba dice "hoy"
        var titulo = negFmtFecha(r.ultActTs) +
                     (r.ultActConHora ? ' ' + negFmtHora(r.ultActTs) : ' (sin hora registrada)') +
                     ' · ' + ult.relativo;
        h += '<td class="neg-ult-cell' + ultCls + '" title="' + esc(titulo) + '">' +
             '<span class="neg-ult-fecha">' + esc(ult.principal) + '</span>' +
             '<span class="neg-ult-rel">' + esc(ult.relativo) + '</span>' +
             '</td>';
      } else {
        h += '<td class="neg-ult-cell neg-ult-vacio" title="Esta moto no tiene ninguna actividad registrada">Sin registros</td>';
      }

      // Días
      h += '<td class="neg-dias-cell ' + diasCls + '">' + r.dias + '</td>';

      h += '</tr>';
    });
  }

  h += '</tbody></table>';
  h += '</div>';

  return h;
}

/* ============================================================
   negRender — render() que no pierde la posición del scroll
   ============================================================
   El problema: render() reemplaza el innerHTML completo del área
   principal, así que el contenedor .neg-table se destruye y se
   vuelve a crear. Un elemento nuevo arranca con scrollLeft = 0,
   y por eso la tabla "saltaba" al principio cada vez que se
   ordenaba una columna teniendo el scroll a la derecha.

   La solución: anotar dónde estaba el scroll, renderizar, y
   devolverlo a su lugar.

   conservarVertical:
     - Al ORDENAR son las mismas filas en otro orden: se conservan
       las dos direcciones.
     - Al FILTRAR cambia el conjunto de filas, así que mantener la
       altura no tiene sentido (podés quedar en un vacío). Se
       conserva solo el horizontal, que es el que molesta.
   ============================================================ */
function negRender(conservarVertical) {
  var prev = document.querySelector('.neg-table');
  var x = prev ? prev.scrollLeft : 0;
  var y = prev ? prev.scrollTop : 0;

  render();

  var nuevo = document.querySelector('.neg-table');
  if (!nuevo) return;

  nuevo.scrollLeft = x;
  if (conservarVertical) nuevo.scrollTop = y;
}

function negSort(key) {
  if (negSortKey === key) {
    negSortDir = negSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    negSortKey = key;
    negSortDir = 'asc';
  }
  negRender(true);
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
