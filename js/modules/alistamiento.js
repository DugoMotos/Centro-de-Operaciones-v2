/* ============================================================
   ALISTAMIENTO.JS — Módulo Servicio Técnico
   ============================================================
   Funciones expuestas:
   - renderAlist(): genera HTML del módulo
   - aRegView(), aHistView(), aResView(): sub-vistas
   - aBuscar(): consulta plan por chasis
   - aPick(i): selecciona actividad pendiente
   - aGuardar(), aGuardarCerrar(): guarda registro
   - aReset(): limpia vista
   - aExpCSV(): exporta historial a CSV

   Estado: variables a* en state.js
   APIs: apiAlistConsultar, apiAlistEscribir
   ============================================================ */

function renderAlist() {
  var hasUrl = !!aCfg.urlC;
  var h = '<div class="eyebrow">PROCEDIMIENTO / SERVICIO TÉCNICO</div><h1 class="h1">Servicio Técnico</h1>' +
    '<div class="sub-title">Registro de actividades del equipo de alistamiento por chasis</div>';
  h += '<div class="flex fxc fxb" style="margin-bottom:10px">' +
    '<div class="conn"><div class="conn-dot" style="background:' + (hasUrl ? 'var(--gn)' : 'var(--yl)') + '"></div>' +
    '<span style="color:' + (hasUrl ? 'var(--gnd)' : 'var(--yld)') + '">' + (hasUrl ? 'Conectado' : 'Sin conexión') + '</span></div>' +
    '<div style="font-size:10px;color:var(--tm)">Llave: chasis</div></div>';
  h += '<div class="sub-tabs">' + ['Registrar', 'Historial', 'Resumen'].map(function(t) {
    return '<button class="sub-tab' + (aTab === t ? ' on' : '') + '" onclick="aTab=\'' + t + '\';render()">' + t + '</button>';
  }).join('') + '</div>';

  if (aTab === 'Registrar') h += aRegView();
  else if (aTab === 'Historial') h += aHistView();
  else h += aResView();

  return h;
}

/* ============================================================
   aRegView — Vista de registro de actividades
   ============================================================ */
function aRegView() {
  if (aLoading) {
    return '<div style="text-align:center;padding:50px 20px">' +
      '<div style="font-size:32px;margin-bottom:12px">🔍</div>' +
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Buscando actividades...</div>' +
      '<div style="font-size:12px;color:var(--tm)">Consultando BD Plan en SharePoint</div>' +
      '<div style="margin-top:16px"><div style="width:40px;height:40px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div></div>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>' +
      '<button class="btn btn-o" style="max-width:200px;margin:20px auto 0" onclick="aLoading=false;render()">Cancelar</button>' +
      '</div>';
  }

  if (!aMoto) {
    var h = '<div class="lbl">Código chasis</div>';
    h += '<div class="flex" style="margin-bottom:10px"><input class="inp" id="aIn" placeholder="Ej: HB0044" maxlength="6" onkeydown="if(event.key===\'Enter\')aBuscar()"><button class="btn btn-p" style="width:auto;padding:11px 18px" onclick="aBuscar()">Buscar</button></div>';
    h += '<div class="card" style="padding:10px 12px"><div style="font-size:9px;font-weight:600;color:var(--tm);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Prefijos</div><div class="prefix-grid">';
    for (var k in PREFIXES) {
      h += '<div class="prefix-item"><div class="prefix-letter">' + k + '</div>' + PREFIXES[k] + '</div>';
    }
    h += '</div></div>';
    return h;
  }

  var marca = (aMoto.marca || aMoto.MARCA || '').toUpperCase();
  var done = aRows.filter(function(r) {
    var e = (r.estado || '').toLowerCase();
    return e === 'ejecutada' || e === 'ejecutado';
  });
  var pend = aRows.filter(function(r) {
    var e = (r.estado || '').toLowerCase();
    return e !== 'ejecutada' && e !== 'ejecutado';
  });
  var mLinea = aMoto.linea || aMoto.LINEA || '';
  var mRef = aMoto.referencia || aMoto.REFERENCIA || '';
  var mColor = aMoto.color || aMoto.COLOR || '';
  var mChasis = aMoto.chasis || aMoto.CHASIS || '';
  var mCodigoBarras = aMoto.codigo_barras || aMoto.codigoBarras || aMoto.Title || '';

  var mUbicacion = aMoto.ubicacion || aMoto.UBICACION || '';
  var mModelo = aMoto.modelo || aMoto.MODELO || '';
  var marcaBg = marca === 'HERO' 
    ? 'linear-gradient(135deg,#085041 0%,#1D9E75 100%)' 
    : 'linear-gradient(135deg,#712B13 0%,#993C1D 100%)';
  var marcaAccent = marca === 'HERO' ? '#5DCAA5' : '#F0997B';

  var h = '<div style="margin-bottom:14px">';
  h += '<div style="background:' + marcaBg + ';border-radius:8px 8px 0 0;padding:14px 18px;position:relative">';
  h += '<div style="font-size:9px;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.6);margin-bottom:4px">' + marca + '</div>';
  h += '<div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px">' + mLinea + ' ' + mRef + '</div>';
  var subDetails = [];
  if (mModelo) subDetails.push('Modelo ' + mModelo);
  if (mColor) subDetails.push(mColor);
  if (subDetails.length) h += '<div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px">' + subDetails.join(' · ') + '</div>';
  if (mCodigoBarras) h += '<div style="position:absolute;top:14px;right:18px;font-family:var(--fm);font-size:12px;font-weight:600;padding:4px 10px;border-radius:4px;background:rgba(255,255,255,0.15);color:#fff">' + mCodigoBarras + '</div>';
  h += '</div>';
  h += '<div style="background:var(--sf);border-radius:0 0 8px 8px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;font-size:11px;border:0.5px solid var(--bd);border-top:none">';
  h += '<div style="color:var(--tm)">Chasis: <span style="font-family:var(--fm);color:#ccc;font-weight:600">' + (mChasis || '—') + '</span></div>';
  if (mUbicacion) {
    h += '<div style="color:' + marcaAccent + ';font-weight:600">' + mUbicacion + '</div>';
  }
  h += '</div>';
  h += '</div>';

  if (done.length) {
    h += '<div class="lbl">Completadas</div>';
    done.forEach(function(r) {
      h += '<div class="done-row" style="opacity:.7"><div style="width:9px;height:9px;border-radius:50%;background:' + ACT_C[actK(r.proceso)] + '"></div>' +
        '<span style="font-size:12px;font-weight:600;flex:1">' + r.proceso + '</span>' +
        '<div style="text-align:right"><span style="font-size:10px;font-weight:600;color:var(--gn)">✓</span>' +
        (r.ejecuto ? '<div style="font-size:8px;color:var(--tm)">' + r.ejecuto + '</div>' : '') + '</div></div>';
    });
  }

  if (pend.length) {
    h += '<div class="lbl" style="margin-top:10px">Pendientes</div>';
    pend.forEach(function(r, i) {
      var proc = r.proceso;
      var resps = RESP_R[proc + '|' + marca] || ['Servicio Técnico'];
      h += '<div class="act-row' + (aChosen === i ? ' on' : '') + '" onclick="aPick(' + i + ')">' +
        '<div style="width:11px;height:11px;border-radius:50%;background:' + ACT_C[actK(proc)] + '"></div>' +
        '<div style="flex:1"><div style="font-size:13px;font-weight:600">' + proc + '</div>' +
        '<div style="font-size:9px;color:var(--tm);margin-top:1px">' + resps.join(' / ') + '</div></div></div>';
    });

    if (aChosen !== null) {
      var proc = pend[aChosen].proceso;
      var resps = RESP_R[proc + '|' + marca] || ['Servicio Técnico'];
      h += '<div class="lbl" style="margin-top:10px">Estado</div><div class="flex" style="margin-bottom:10px">' +
        '<button class="btn' + (aSt === 'ejecutada' ? ' btn-p' : ' btn-o') + '" style="flex:1" onclick="aSt=\'ejecutada\';render()">✓ Ejecutada</button>' +
        '<button class="btn" style="flex:1;' + (aSt === 'pendiente' ? 'background:var(--yl);color:#000;border:none' : 'background:transparent;border:1px solid var(--bd2);color:var(--tm)') + '" onclick="aSt=\'pendiente\';render()">⏳ Pendiente</button></div>';
      if (aSt === 'pendiente') {
        h += '<textarea style="width:100%;padding:9px;border-radius:var(--r);border:1.5px solid var(--yl);background:var(--sf);font-family:var(--ff);font-size:12px;color:var(--tx);resize:none;height:45px;outline:none;margin-bottom:10px;box-sizing:border-box" maxlength="100" placeholder="Comentario..." oninput="aCmt=this.value">' + aCmt + '</textarea>';
      }
      h += '<div class="lbl">Responsable</div><select class="sel" style="margin-bottom:10px" onchange="aResp=this.value;render()">' +
        '<option value="">Seleccionar...</option>' +
        resps.map(function(r) { return '<option value="' + r + '"' + (aResp === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') +
        '</select>';
      h += '<div style="display:flex;gap:6px;margin-top:4px"><button class="btn btn-p" style="flex:1" ' + (aResp ? '' : 'disabled') + ' onclick="aGuardar()">✓ Guardar</button>' +
        '<button class="btn btn-o" style="flex:1" ' + (aResp ? '' : 'disabled') + ' onclick="aGuardarCerrar()">✓ Guardar y cerrar</button></div>';
    }
  } else {
    h += '<div style="background:var(--gnl);border:1px solid var(--gn);border-radius:10px;padding:16px;text-align:center;margin:12px 0">' +
      '<div style="font-size:13px;font-weight:700;color:var(--gnd)">✓ Todas completadas</div></div>';
  }

  h += '<button class="btn btn-o" style="margin-top:10px" onclick="aReset()">← Nueva consulta</button>';
  return h;
}

/* ============================================================
   aHistView — Historial filtrable
   ============================================================ */
function aHistView() {
  var r2 = aRecs.slice();
  if (aFD) r2 = r2.filter(function(r) { return r.fecha === aFD; });
  if (aFA) r2 = r2.filter(function(r) { return r.proceso === aFA; });
  if (aFR) r2 = r2.filter(function(r) { return r.responsable === aFR; });
  if (aFC) r2 = r2.filter(function(r) { return (r.chasis || '').toUpperCase().indexOf(aFC.toUpperCase()) >= 0; });
  r2 = r2.slice(0, 200);

  var h = '<div class="lbl">Filtros</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">';
  h += '<input type="date" class="inp inp-sm" value="' + aFD + '" onchange="aFD=this.value;render()">';
  h += '<select class="inp inp-sm" onchange="aFA=this.value;render()"><option value="">Todas</option><option>Alistamiento</option><option>Marcación</option><option>Defensas</option><option>Instalación placa</option><option>Instalación GPS</option></select>';
  h += '<select class="inp inp-sm" onchange="aFR=this.value;render()"><option value="">Todos</option>' +
    ALL_R.map(function(r) { return '<option>' + r + '</option>'; }).join('') + '</select>';
  h += '<input class="inp inp-sm" placeholder="Chasis..." value="' + aFC + '" oninput="aFC=this.value;render()">';
  h += '</div>';
  h += '<div class="flex fxc fxb" style="margin-bottom:8px"><span style="font-family:var(--fm);font-size:10px;color:var(--tm);background:var(--sf);padding:3px 8px;border-radius:10px">' + r2.length + ' reg.</span>' +
    '<button style="font-size:10px;font-weight:600;color:var(--rd);background:none;border:1px solid var(--rd);border-radius:5px;padding:3px 8px;cursor:pointer" onclick="aRecs=[];sv(SK_A,[]);toast(\'Limpiado\');render()">Limpiar</button></div>';

  if (!r2.length) return h + '<div style="text-align:center;padding:24px;color:var(--tl);font-size:12px">Sin registros</div>';

  r2.forEach(function(r) {
    h += '<div class="hist-row"><div style="width:9px;height:9px;border-radius:50%;background:' + ACT_C[actK(r.proceso)] + ';margin-top:3px;flex-shrink:0"></div>' +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-family:var(--fm);font-size:11px;font-weight:700">' + r.chasis + '</div>' +
      '<div style="font-size:9px;font-weight:600;color:' + ACT_C[actK(r.proceso)] + ';text-transform:uppercase;letter-spacing:.5px">' + r.proceso + '</div>' +
      '<div style="font-size:9px;color:var(--tm)">' + r.responsable + '</div>' +
      (r.comentario ? '<div style="font-size:9px;color:var(--yl);font-style:italic">"' + r.comentario + '"</div>' : '') +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0">' +
      '<div style="font-family:var(--fm);font-size:9px;color:var(--tm)">' + r.hora + '</div>' +
      '<div style="font-size:8px;color:var(--tl)">' + r.fecha + '</div>' +
      '<span style="font-size:8px;font-weight:700;padding:2px 5px;border-radius:3px;background:' + (r.estado === 'ejecutada' ? 'var(--gnl)' : 'var(--yll)') + ';color:' + (r.estado === 'ejecutada' ? 'var(--gnd)' : 'var(--yld)') + '">' + (r.estado === 'ejecutada' ? '✓' : '⏳') + '</span></div></div>';
  });
  return h;
}

/* ============================================================
   aResView — Resumen del día
   ============================================================ */
function aResView() {
  var td = iD();
  var tr = aRecs.filter(function(r) { return r.fecha === td; });
  var c = function(p) { return tr.filter(function(r) { return r.proceso === p; }).length; };

  return '<div class="lbl">Actividades hoy</div><div class="stat-grid">' +
    [['Alistamiento', 'alistamiento'], ['Marcación', 'marcacion'], ['Defensas', 'defensas'], ['Inst. Placa', 'placa'], ['Inst. GPS', 'gps']].map(function(x) {
      var l = x[0], k = x[1];
      var p = l === 'Inst. Placa' ? 'Instalación placa' : l === 'Inst. GPS' ? 'Instalación GPS' : l;
      return '<div class="stat-card"><div class="stat-num" style="color:' + ACT_C[k] + '">' + c(p) + '</div><div class="stat-lbl">' + l + '</div></div>';
    }).join('') +
    '<div class="stat-card"><div class="stat-num">' + tr.length + '</div><div class="stat-lbl">Total</div></div></div>';
}

/* ============================================================
   aBuscar — Consulta plan por chasis
   ============================================================ */
function aBuscar() {
  var inp = document.getElementById('aIn');
  var raw = (inp ? inp.value : '').trim().toUpperCase();
  if (!raw || raw.length < 5) { toast('Mín 5 caracteres', 1); return; }

  if (!supabaseReady()) {
    toast('Supabase no configurado', 1);
    return;
  }

  aLoading = true;
  render();

  // Detección automática: DM + números = código directo
  //                       resto = chasis parcial → resolver en BD_Tramites
  var esCodigoDM = /^DM\d+$/.test(raw);

  var promesaCodigo;
  if (esCodigoDM) {
    // Búsqueda directa
    promesaCodigo = Promise.resolve(raw);
  } else {
    // Resolver chasis parcial en BD_Tramites
    if (!pCfg.tramC) {
      aLoading = false;
      render();
      alert('Para buscar por chasis parcial necesitás configurar BD_Tramites');
      return;
    }
    promesaCodigo = apiTramListar().then(function(data) {
      var motos = data.value || data || [];
      if (!Array.isArray(motos)) motos = [];
      var match = motos.find(function(m) {
        var chasis = (m.chasis || m.CHASIS || m.Chasis || '').toUpperCase();
        return chasis && chasis.endsWith(raw);
      });
      if (!match) throw new Error('CHASIS_NO_ENCONTRADO');
      return match.codigo_barras || match.codigoBarras || match.Title;
    });
  }

  promesaCodigo.then(function(codigoBarras) {
    // Ahora sí, buscar en Supabase con el código resuelto
    return apiRegAlistConsultar({ codigo: codigoBarras }).then(function(registros) {
      if (!registros || !registros.length) {
        throw new Error('SIN_ALISTAMIENTOS');
      }

      // Adaptar shape
      aRows = registros.map(function(r) {
        return {
          id: r.id,
          codigo_barras: r.codigo_barras,
          chasis: r.codigo_barras,
          fecha: r.fecha_programacion,
          fecha_ejecucion: r.fecha_ejecucion,
          proceso: (r.proceso && r.proceso.nombre) || '—',
          estado: r.estado,
          ejecuto: (r.tecnico && r.tecnico.nombre_completo) || '',
          responsable: (r.tecnico && r.tecnico.nombre_completo) || ''
        };
      });
      aMoto = aRows[0];
      aChosen = null;
      aResp = '';
      aCmt = '';

      // Consulta adicional a BD_Tramites para datos completos
      if (pCfg.tramC) {
        return apiTramConsultarMoto(codigoBarras).then(function(tramData) {
          var rows = tramData.value || tramData;
          var tramRow = null;
          if (Array.isArray(rows) && rows.length > 0) tramRow = rows[0];
          else if (rows && !Array.isArray(rows) && Object.keys(rows).length > 0) tramRow = rows;
          if (tramRow) {
            aMoto.ubicacion = tramRow.ubicacion || tramRow.UBICACION || '';
            aMoto.marca = tramRow.marca || tramRow.MARCA || '';
            aMoto.linea = tramRow.linea || tramRow.LINEA || '';
            aMoto.referencia = tramRow.referencia || tramRow.REFERENCIA || '';
            aMoto.modelo = tramRow.modelo || tramRow.MODELO || '';
            aMoto.color = tramRow.color || tramRow.COLOR || '';
            aMoto.chasis = tramRow.chasis || tramRow.CHASIS || codigoBarras;
          }
        }).catch(function() {});
      }
    });
  }).then(function() {
    aLoading = false;
    render();
  }).catch(function(e) {
    aLoading = false;
    render();
    if (e.message === 'CHASIS_NO_ENCONTRADO') {
      alert('El chasis con final "' + raw + '" no se encuentra en BD_Tramites.\n\nVerificá que el chasis exista y que los últimos dígitos coincidan.');
    } else if (e.message === 'SIN_ALISTAMIENTOS') {
      alert('La moto no tiene alistamientos programados en el sistema.\n\nPosibles causas:\n• Aún no se corrió la actividad "Programar alistamientos" en Trámites\n• Ya fueron ejecutados y no quedan pendientes');
    } else {
      alert('Error al consultar: ' + (e.message || 'desconocido'));
    }
  });
}

/* ============================================================
   aPick / aGuardar / aGuardarCerrar / aReset
   ============================================================ */
function aPick(i) {
  aChosen = i;
  var marca = (aMoto.marca || '').toUpperCase();
  var pend = aRows.filter(function(r) { return (r.estado || '').toLowerCase() !== 'ejecutada'; });
  var resps = RESP_R[pend[i].proceso + '|' + marca] || ['Servicio Técnico'];
  aResp = resps.length === 1 ? resps[0] : '';
  render();
}

function aGuardar() {
  var pend = aRows.filter(function(r) { return (r.estado || '').toLowerCase() !== 'ejecutada'; });
  var row = pend[aChosen];
  var now = new Date();
  var proc = row.proceso || row.PROCESO;
  var chasis = row.chasis || row.CHASIS || row.codigo_barras || '';
  var codigoB = row.codigo_barras || row.chasis || '';
  var rec = {
    chasis: chasis,
    proceso: proc,
    estado: aSt,
    responsable: aResp,
    comentario: aSt === 'pendiente' ? aCmt : '',
    fecha: iD(),
    hora: now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    timestamp: now.toISOString(),
    referencia: (row.linea || row.LINEA || '') + ' ' + (row.referencia || row.REFERENCIA || ''),
    marca: row.marca || row.MARCA || ''
  };
  aRecs.unshift(rec);
  sv(SK_A, aRecs);

  var url = aCfg.urlW || pCfg.planW;
  if (url) {
    apiAlistEscribir({
      id: codigoB + '_' + proc,
      chasis: chasis,
      proceso: proc,
      estado: aSt === 'ejecutada' ? 'Ejecutada' : 'Pendiente',
      ejecuto: aResp,
      responsable: aResp,
      comentario: rec.comentario,
      fecha: rec.fecha,
      hora: rec.hora
    }).then(function() {
      toast('✓ ' + proc + ' — guardado en SharePoint');
    }).catch(function() {
      toast('✓ ' + proc + ' — guardado local', 1);
    });
  } else {
    toast('✓ ' + proc);
  }

  var idx = aRows.findIndex(function(r) {
    return (r.proceso || r.PROCESO) === proc && (r.estado || '').toLowerCase() !== 'ejecutada';
  });
  if (idx >= 0) {
    aRows[idx].estado = aSt === 'ejecutada' ? 'Ejecutada' : 'Pendiente';
    aRows[idx].ejecuto = aResp;
  }
  aChosen = null;
  aResp = '';
  aCmt = '';
  aSt = 'ejecutada';
  render();
}

function aGuardarCerrar() {
  aGuardar();
  setTimeout(function() {
    aMoto = null;
    aRows = [];
    aChosen = null;
    toast('Sesión cerrada');
    render();
  }, 500);
}

function aReset() {
  aMoto = null;
  aRows = [];
  aChosen = null;
  render();
}

/* ============================================================
   aExpCSV — Exporta historial a CSV
   ============================================================ */
function aExpCSV() {
  if (!aRecs.length) { toast('Sin registros', 1); return; }
  var h = 'CHASIS,PROCESO,ESTADO,RESPONSABLE,COMENTARIO,FECHA,HORA\n';
  var rs = aRecs.map(function(r) {
    return '"' + r.chasis + '","' + r.proceso + '","' + r.estado + '","' + r.responsable + '","' + (r.comentario || '') + '","' + r.fecha + '","' + r.hora + '"';
  }).join('\n');
  var b = new Blob(['\uFEFF' + h + rs], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'alistamientos_' + iD() + '.csv';
  a.click();
  toast('✓ ' + aRecs.length + ' exportados');
}
