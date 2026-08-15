/* ============================================================
   NEGOCIOS.JS — Vista de negocios activos
   ============================================================
   Muestra todas las motos activas desde Supabase agrupadas
   por área (Trámites / Contabilidad) con filtros y ordenamiento.
   ============================================================ */

/* ============================================================
   HELPERS
   ============================================================ */

function negDiasDesde(fechaValor) {
  if (!fechaValor) return 0;
  try {
    var f;
    if (typeof fechaValor === 'string' && fechaValor.indexOf('/') >= 0) {
      var p = fechaValor.split('/');
      f = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    } else if (typeof fechaValor === 'number') {
      f = new Date((fechaValor - 25569) * 86400 * 1000);
    } else {
      f = new Date(fechaValor);
    }
    if (isNaN(f.getTime())) return 0;
    var hoy = new Date();
    return Math.floor((hoy.getTime() - f.getTime()) / (86400 * 1000));
  } catch (e) { return 0; }
}

function negFmtFecha(fechaValor) {
  if (!fechaValor) return '';
  try {
    var f;
    if (typeof fechaValor === 'string' && fechaValor.indexOf('/') >= 0) {
      return fechaValor;
    } else if (typeof fechaValor === 'number') {
      f = new Date((fechaValor - 25569) * 86400 * 1000);
    } else {
      f = new Date(fechaValor);
    }
    if (isNaN(f.getTime())) return String(fechaValor);
    var dd = String(f.getDate()).padStart(2, '0');
    var mm = String(f.getMonth() + 1).padStart(2, '0');
    var yy = f.getFullYear();
    return dd + '/' + mm + '/' + yy;
  } catch (e) { return String(fechaValor); }
}

function negNormMarca(m) {
  m = (m || '').toString().toUpperCase().trim();
  if (m === 'HERO') return 'HERO';
  if (m === 'SYM') return 'SYM';
  if (m === 'BAJAJ') return 'BAJAJ';
  return m;
}

/* Buscar primera actividad pendiente según ejecutadasSet */
function negFirstPending(ejecutadasSet) {
  var scopeActs = negGetScopeActs();
  for (var i = 0; i < scopeActs.length; i++) {
    var act = scopeActs[i];
    if (!ejecutadasSet[act.num]) return act;
  }
  return null;
}

/* Actividades del ámbito actual (Trámites o Contabilidad) */
function negGetScopeActs() {
  if (!Array.isArray(ACTIVIDADES_TRAM)) return [];
  return ACTIVIDADES_TRAM.filter(function(a) {
    if (negFilterArea === 'Trámites') return a.responsable === 'Trámites';
    if (negFilterArea === 'Contabilidad') return a.responsable === 'Contabilidad';
    return true;
  });
}

function negAvatarInitials(nombre) {
  if (!nombre) return '?';
  var partes = nombre.trim().split(' ');
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function negAvatarColor(nombre) {
  if (!nombre) return 'linear-gradient(135deg,#6a6a6a,#4a4a4a)';
  var colors = [
    'linear-gradient(135deg,#5E6AD2,#3F4CB3)',
    'linear-gradient(135deg,#22C55E,#166534)',
    'linear-gradient(135deg,#F5A524,#B45309)',
    'linear-gradient(135deg,#E24B4A,#A32D2D)',
    'linear-gradient(135deg,#22D3EE,#0891B2)',
    'linear-gradient(135deg,#EC4899,#9D174D)'
  ];
  var hash = 0;
  for (var i = 0; i < nombre.length; i++) hash += nombre.charCodeAt(i);
  return colors[hash % colors.length];
}

/* ============================================================
   negSync — Cargar datos desde Supabase
   ============================================================ */
function negSync() {
  if (!supabaseReady()) {
    toast('Supabase no configurado', 1);
    return;
  }
  if (!pCfg.tramC) {
    toast('URL de BD_Tramites no configurada', 1);
    return;
  }

  negLoading = true;
  negError = '';
  render();

  Promise.all([
    apiTramListar(),
    apiRegAvancesConsultar()
  ]).then(function(results) {
    var motosRaw = results[0].value || results[0] || [];
    if (!Array.isArray(motosRaw)) motosRaw = [];

    negMotos = motosRaw.map(function(m) {
      return {
        codigo_barras: m.codigo_barras || m.codigoBarras || m.Title || '',
        chasis: m.chasis || m.CHASIS || m.Chasis || '',
        marca: negNormMarca(m.marca || m.MARCA || m.Marca),
        linea: m.linea || m.LINEA || m.Linea || '',
        referencia: m.referencia || m.REFERENCIA || m.Referencia || '',
        modelo: m.modelo || m.MODELO || m.Modelo || '',
        color: m.color || m.COLOR || m.Color || '',
        placa: m.placa || m.PLACA || m.Placa || '',
        cliente: m.cliente || m.CLIENTE || m.Cliente || '',
        cedula: m.cedula || m.CEDULA || m.Cedula || '',
        asesor: m.asesor || m.ASESOR || m.Asesor || '',
        ubicacion: m.ubicacion || m.UBICACION || m.Ubicacion || '',
        fecha_venta: m.fecha_venta || m.FechaVenta || m.fechaVenta || m['Fecha Venta'] || ''
      };
    });

    negAvances = results[1] || [];
    if (!Array.isArray(negAvances)) negAvances = [];

    // Lista de asesores únicos
    negAsesores = [];
    var seenAsesores = {};
    negMotos.forEach(function(m) {
      if (m.asesor && !seenAsesores[m.asesor]) {
        seenAsesores[m.asesor] = true;
        negAsesores.push(m.asesor);
      }
    });
    negAsesores.sort();

    negLoading = false;
    toast('✓ ' + negMotos.length + ' motos activas');
    render();
  }).catch(function(e) {
    negLoading = false;
    negError = e.message || 'Error desconocido';
    toast('Error: ' + negError, 1);
    render();
  });
}

/* ============================================================
   renderNegocios — Vista principal
   ============================================================ */
function renderNegocios() {
  var h = '<div class="eyebrow">VENTAS</div><h1 class="h1">Negocios activos</h1>' +
    '<div class="sub-title">Motos en proceso desde la venta hasta la entrega</div>';

  if (negLoading) {
    h += '<div style="text-align:center;padding:40px"><div style="width:32px;height:32px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div><div style="font-size:11px;color:var(--tm);margin-top:10px">Cargando negocios...</div></div>';
    return h;
  }

  if (negError) {
    h += '<div style="text-align:center;padding:30px;color:#F26F6E;font-size:12px">Error: ' + negError + '</div>';
    h += '<div style="text-align:center"><button class="btn btn-p" style="max-width:200px;margin:0 auto" onclick="negSync()">Reintentar</button></div>';
    return h;
  }

  if (!negMotos) {
    h += '<div style="text-align:center;padding:40px"><button class="btn btn-p" style="max-width:200px;margin:0 auto" onclick="negSync()">Cargar negocios</button></div>';
    return h;
  }

  // Toolbar: filtros
  h += '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center">';

  // Filtro área (Trámites / Contabilidad / Todos)
  h += '<div style="display:flex;background:rgba(255,255,255,0.03);border:0.5px solid var(--bd);border-radius:6px;padding:2px">';
  ['', 'Trámites', 'Contabilidad'].forEach(function(area) {
    var isActive = negFilterArea === area;
    var label = area || 'Todas';
    var bg = isActive ? 'rgba(94,106,210,0.15)' : 'transparent';
    var color = isActive ? '#B7BEEF' : 'var(--tm)';
    h += '<button style="background:' + bg + ';color:' + color + ';border:none;border-radius:4px;padding:5px 12px;font-size:11px;cursor:pointer;font-weight:500;font-family:inherit" ' +
         'onclick="negFilterArea=\'' + area + '\';render()">' + label + '</button>';
  });
  h += '</div>';

  // Filtro tipo
  h += '<select class="inp" style="width:110px;height:32px;font-size:11px;padding:0 8px" onchange="negFilterTipo=this.value;render()">';
  h += '<option value=""' + (negFilterTipo === '' ? ' selected' : '') + '>Todos</option>';
  h += '<option value="Preventa"' + (negFilterTipo === 'Preventa' ? ' selected' : '') + '>Preventa</option>';
  h += '<option value="Postventa"' + (negFilterTipo === 'Postventa' ? ' selected' : '') + '>Postventa</option>';
  h += '</select>';

  // Filtro marca
  h += '<select class="inp" style="width:110px;height:32px;font-size:11px;padding:0 8px" onchange="negFilterMarca=this.value;render()">';
  h += '<option value=""' + (negFilterMarca === '' ? ' selected' : '') + '>Todas</option>';
  h += '<option value="HERO"' + (negFilterMarca === 'HERO' ? ' selected' : '') + '>Hero</option>';
  h += '<option value="SYM"' + (negFilterMarca === 'SYM' ? ' selected' : '') + '>SYM</option>';
  h += '<option value="BAJAJ"' + (negFilterMarca === 'BAJAJ' ? ' selected' : '') + '>Bajaj</option>';
  h += '</select>';

  // Filtro asesor
  h += '<select class="inp" style="width:160px;height:32px;font-size:11px;padding:0 8px" onchange="negFilterAsesor=this.value;render()">';
  h += '<option value=""' + (negFilterAsesor === '' ? ' selected' : '') + '>Todos los asesores</option>';
  (negAsesores || []).forEach(function(a) {
    h += '<option value="' + a + '"' + (negFilterAsesor === a ? ' selected' : '') + '>' + a + '</option>';
  });
  h += '</select>';

  // Buscador
  h += '<div style="position:relative;flex:1;max-width:260px">';
  h += '<input class="inp" style="width:100%;height:32px;font-size:11px;padding:0 28px 0 8px" ' +
       'placeholder="Buscar código, chasis, cliente" ' +
       'value="' + (negSearchTxt || '') + '" ' +
       'oninput="negSearchTxt=this.value;render()">';
  if (negSearchTxt) {
    h += '<button style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--tm);cursor:pointer;font-size:14px;line-height:1;padding:2px 6px" ' +
         'onclick="negSearchTxt=\'\';render()">×</button>';
  }
  h += '</div>';

  // Botón limpiar
  var hayFiltros = negFilterArea || negFilterTipo || negFilterMarca || negFilterAsesor || negSearchTxt;
  if (hayFiltros) {
    h += '<button class="btn" style="width:auto;padding:0 12px;height:32px;font-size:11px" ' +
         'onclick="negFilterArea=\'\';negFilterTipo=\'\';negFilterMarca=\'\';negFilterAsesor=\'\';negSearchTxt=\'\';render()">Limpiar</button>';
  }

  h += '<div style="flex:1"></div>';

  // Botón actualizar
  h += '<button class="btn btn-p" style="width:auto;padding:0 14px;height:32px;font-size:11px" onclick="negSync()">🔄 Actualizar</button>';

  h += '</div>';

  // Chips de filtros activos
  if (hayFiltros) {
    h += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">';
    var chips = [];
    if (negFilterArea) chips.push({ lbl: 'Área: ' + negFilterArea, clear: 'negFilterArea=\'\'' });
    if (negFilterTipo) chips.push({ lbl: 'Tipo: ' + negFilterTipo, clear: 'negFilterTipo=\'\'' });
    if (negFilterMarca) chips.push({ lbl: 'Marca: ' + negFilterMarca, clear: 'negFilterMarca=\'\'' });
    if (negFilterAsesor) chips.push({ lbl: 'Asesor: ' + negFilterAsesor, clear: 'negFilterAsesor=\'\'' });
    if (negSearchTxt) chips.push({ lbl: '"' + negSearchTxt + '"', clear: 'negSearchTxt=\'\'' });
    chips.forEach(function(c) {
      h += '<div style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px;background:rgba(94,106,210,0.1);color:#B7BEEF;border-radius:12px;font-size:10px">';
      h += c.lbl;
      h += '<button style="background:none;border:none;color:#B7BEEF;cursor:pointer;font-size:12px;line-height:1;padding:0 2px" onclick="' + c.clear + ';render()">×</button>';
      h += '</div>';
    });
    h += '</div>';
  }

  // Filtrar motos
  var filtered = negMotos.slice();

  if (negFilterTipo === 'Preventa') {
    // Motos que aún no facturaron
    filtered = filtered.filter(function(m) {
      var ejecutadas = negAvances.filter(function(r) {
        return r.codigo_barras === m.codigo_barras &&
               (r.estado || '').toLowerCase() === 'ejecutada';
      });
      var actNumFactura = 15; // TODO: parametrizar
      return !ejecutadas.some(function(r) { return parseInt(r.actividad_num, 10) === actNumFactura; });
    });
  } else if (negFilterTipo === 'Postventa') {
    filtered = filtered.filter(function(m) {
      var ejecutadas = negAvances.filter(function(r) {
        return r.codigo_barras === m.codigo_barras &&
               (r.estado || '').toLowerCase() === 'ejecutada';
      });
      var actNumFactura = 15;
      return ejecutadas.some(function(r) { return parseInt(r.actividad_num, 10) === actNumFactura; });
    });
  }

  if (negFilterMarca) {
    filtered = filtered.filter(function(m) { return m.marca === negFilterMarca; });
  }
  if (negFilterAsesor) {
    filtered = filtered.filter(function(m) { return m.asesor === negFilterAsesor; });
  }

  if (negSearchTxt) {
    var q = negSearchTxt.toLowerCase();
    filtered = filtered.filter(function(m) {
      return (m.codigo_barras || '').toLowerCase().indexOf(q) >= 0 ||
             (m.chasis || '').toLowerCase().indexOf(q) >= 0 ||
             (m.cliente || '').toLowerCase().indexOf(q) >= 0 ||
             (m.cedula || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  if (negFilterArea) {
    // Filtrar solo motos con actividad pendiente en esa área
    filtered = filtered.filter(function(m) {
      var ejecutadas = negAvances.filter(function(r) {
        return r.codigo_barras === m.codigo_barras &&
               (r.estado || '').toLowerCase() === 'ejecutada';
      });
      var ejecutadasSet = {};
      ejecutadas.forEach(function(r) {
        var n = parseInt(r.actividad_num, 10);
        if (!isNaN(n)) ejecutadasSet[n] = true;
      });
      var proxima = negFirstPending(ejecutadasSet);
      return proxima && proxima.responsable === negFilterArea;
    });
  }

  if (filtered.length === 0) {
    h += '<div style="text-align:center;padding:40px;color:var(--tm);font-size:12px">Sin motos que coincidan con los filtros aplicados</div>';
    return h;
  }

  // Ordenar
  filtered.sort(function(a, b) {
    var mult = negSortDir === 'desc' ? -1 : 1;
    if (negSortKey === 'code') return (a.codigo_barras || '').localeCompare(b.codigo_barras || '') * mult;
    if (negSortKey === 'dias') return (negDiasDesde(a.fecha_venta) - negDiasDesde(b.fecha_venta)) * mult;
    if (negSortKey === 'cliente') return (a.cliente || '').localeCompare(b.cliente || '') * mult;
    return 0;
  });

  // KPIs
  h += '<div style="display:flex;gap:12px;margin-bottom:14px;font-size:11px">';
  h += '<div style="color:var(--tm)">Total: <strong style="color:var(--tx)">' + filtered.length + '</strong></div>';
  var promDias = 0;
  var conFecha = 0;
  filtered.forEach(function(m) {
    var d = negDiasDesde(m.fecha_venta);
    if (d > 0) { promDias += d; conFecha++; }
  });
  if (conFecha) {
    h += '<div style="color:var(--tm)">Días promedio: <strong style="color:var(--tx)">' + Math.round(promDias / conFecha) + '</strong></div>';
  }
  h += '</div>';

  // Tabla de motos
  h += '<div style="background:var(--sf);border:0.5px solid var(--bd);border-radius:8px;overflow:hidden">';
  h += '<div style="display:grid;grid-template-columns:80px 1fr 80px 1.5fr 130px 60px;gap:12px;padding:10px 14px;background:#131315;border-bottom:0.5px solid var(--bd);font-size:10px;color:var(--tm);letter-spacing:0.8px;text-transform:uppercase;font-weight:600">';
  h += '<div style="cursor:pointer" onclick="negSortKey=\'code\';negSortDir=negSortDir===\'asc\'?\'desc\':\'asc\';render()">Código</div>';
  h += '<div>Moto</div>';
  h += '<div>Marca</div>';
  h += '<div>Área / Actividad</div>';
  h += '<div>Asesor</div>';
  h += '<div style="text-align:right;cursor:pointer" onclick="negSortKey=\'dias\';negSortDir=negSortDir===\'asc\'?\'desc\':\'asc\';render()">Días</div>';
  h += '</div>';

  filtered.forEach(function(m) {
    // Calcular actividad actual
    var ejecutadas = negAvances.filter(function(r) {
      return r.codigo_barras === m.codigo_barras &&
             (r.estado || '').toLowerCase() === 'ejecutada';
    });
    var ejecutadasSet = {};
    ejecutadas.forEach(function(r) {
      var n = parseInt(r.actividad_num, 10);
      if (!isNaN(n)) ejecutadasSet[n] = true;
    });
    var proxima = negFirstPending(ejecutadasSet);
    var dias = negDiasDesde(m.fecha_venta);
    var diasColor = dias >= 60 ? '#F26F6E' : dias >= 30 ? '#F5C572' : 'var(--tm)';

    // Colores por marca
    var brandBg = m.marca === 'HERO' ? 'rgba(29,158,117,0.15)' :
                  m.marca === 'SYM' ? 'rgba(217,90,48,0.15)' :
                  m.marca === 'BAJAJ' ? 'rgba(59,130,246,0.15)' :
                  'rgba(255,255,255,0.05)';
    var brandColor = m.marca === 'HERO' ? '#5DCAA5' :
                     m.marca === 'SYM' ? '#F0997B' :
                     m.marca === 'BAJAJ' ? '#93C5FD' :
                     'var(--tm)';

    h += '<div style="display:grid;grid-template-columns:80px 1fr 80px 1.5fr 130px 60px;gap:12px;padding:10px 14px;align-items:center;border-bottom:0.5px solid rgba(255,255,255,0.03);font-size:12px;cursor:pointer" ' +
         'onclick="setMain(\'proc\');pActive=\'' + m.codigo_barras + '\';render()">';

    h += '<div class="plnl-code" style="font-family:var(--fm);color:#F26F6E;font-weight:600">' + m.codigo_barras + '</div>';

    h += '<div><div style="color:var(--tx);font-weight:500">' + (m.linea + ' ' + m.referencia).trim() + '</div>';
    if (m.cliente) h += '<div style="font-size:10px;color:var(--tm);margin-top:2px">' + m.cliente + '</div>';
    h += '</div>';

    h += '<div>';
    if (m.marca) {
      h += '<span style="font-size:10px;padding:2px 8px;border-radius:3px;background:' + brandBg + ';color:' + brandColor + ';font-weight:600">' + m.marca + '</span>';
    } else {
      h += '<span style="color:var(--tm);font-size:11px">—</span>';
    }
    h += '</div>';

    h += '<div>';
    if (proxima) {
      var areaColor = proxima.responsable === 'Trámites' ? '#B7BEEF' :
                      proxima.responsable === 'Contabilidad' ? '#F5C572' : 'var(--tm)';
      h += '<div style="font-size:10px;color:' + areaColor + ';font-weight:600;letter-spacing:0.5px;text-transform:uppercase">' + proxima.responsable + '</div>';
      h += '<div style="font-size:11px;color:#ccc;margin-top:2px">' + proxima.titulo + '</div>';
    } else {
      h += '<div style="font-size:10px;color:#6EDA92;font-weight:600">✓ Completo</div>';
    }
    h += '</div>';

    h += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#aaa">';
    if (m.asesor) {
      h += '<div style="width:22px;height:22px;border-radius:50%;background:' + negAvatarColor(m.asesor) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:600">' + negAvatarInitials(m.asesor) + '</div>';
      h += '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + m.asesor + '</span>';
    } else {
      h += '<span style="color:var(--tm)">—</span>';
    }
    h += '</div>';

    h += '<div style="text-align:right;font-family:var(--fm);font-size:11px;color:' + diasColor + ';font-weight:600">' + dias + 'd</div>';

    h += '</div>';
  });

  h += '</div>';

  return h;
}
