/* ============================================================
   ALISTAMIENTO.JS — Módulo de Servicio Técnico
   ============================================================
   Registro de ejecución de alistamientos en Supabase.
   
   Búsqueda inteligente:
   - Si empieza con "DM" + números → busca por código de barras
   - Si es alfanumérico → busca por últimos N dígitos del chasis
     en BD_Tramites, resuelve a código_barras y consulta Supabase
   ============================================================ */

/* ============================================================
   aStripNonAlnumUpper — Limpia input: solo alfanumérico mayúscula
   ============================================================ */
function aStripNonAlnumUpper(el) {
  if (!el) return;
  var v = (el.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (el.value !== v) el.value = v;
}

/* ============================================================
   aBuscar — Búsqueda inteligente (DM o chasis parcial)
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
    promesaCodigo = Promise.resolve(raw);
  } else {
    if (!pCfg.tramC) {
      aLoading = false;
      render();
      alert('Para buscar por chasis parcial necesitás configurar BD_Tramites en Configuración.');
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
    // Buscar en Supabase con el código resuelto
    return apiRegAlistConsultar({ codigo: codigoBarras }).then(function(registros) {
      if (!registros || !registros.length) {
        throw new Error('SIN_ALISTAMIENTOS');
      }

      // Adaptar shape para el render existente
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

      // Consulta adicional a BD_Tramites para datos completos de la moto
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
      alert('La moto no tiene alistamientos programados.\n\nPosibles causas:\n• Aún no se corrió "Programar alistamientos" en Trámites\n• Ya fueron todos ejecutados');
    } else {
      alert('Error al consultar: ' + (e.message || 'desconocido'));
    }
  });
}

/* ============================================================
   aRegistrar — Marca actividad como ejecutada en Supabase
   ============================================================ */
function aRegistrar() {
  if (!aChosen) { toast('Seleccioná una actividad', 1); return; }
  if (!aResp) { toast('Seleccioná el técnico', 1); return; }

  if (!supabaseReady()) {
    toast('Supabase no configurado', 1);
    return;
  }

  aLoading = true;
  render();

  apiRegAlistMarcarEjecutada(aChosen.id, aResp)
    .then(function() {
      // Actualizar el estado local para reflejar el cambio inmediato
      var idx = aRows.findIndex(function(r) { return r.id === aChosen.id; });
      if (idx >= 0) {
        aRows[idx].estado = 'ejecutada';
        aRows[idx].fecha_ejecucion = new Date().toISOString();
        aRows[idx].ejecuto = aResp;
        aRows[idx].responsable = aResp;
      }
      aChosen = null;
      aResp = '';
      aCmt = '';
      aLoading = false;
      toast('✓ Alistamiento registrado en Supabase');
      render();
    })
    .catch(function(e) {
      aLoading = false;
      render();
      alert('Error al registrar en Supabase: ' + (e.message || 'desconocido'));
    });
}

/* ============================================================
   aReset — Limpia el estado del módulo
   ============================================================ */
function aReset() {
  aRows = null;
  aMoto = null;
  aChosen = null;
  aResp = '';
  aCmt = '';
  var inp = document.getElementById('aIn');
  if (inp) inp.value = '';
  render();
}

/* ============================================================
   aRegView — Vista de registro (moto encontrada + actividades)
   ============================================================ */
function aRegView() {
  if (!aMoto) return '';

  var marca = (aMoto.marca || '').toString().toUpperCase();
  var mLinea = aMoto.linea || '';
  var mRef = aMoto.referencia || '';
  var mChasis = aMoto.chasis || '';
  var mCodigoBarras = aMoto.codigo_barras || '';
  var mColor = aMoto.color || '';
  var mUbicacion = aMoto.ubicacion || '';
  var mModelo = aMoto.modelo || '';

  var marcaBg = marca === 'HERO'
    ? 'linear-gradient(135deg,#085041 0%,#1D9E75 100%)'
    : 'linear-gradient(135deg,#712B13 0%,#993C1D 100%)';
  var marcaAccent = marca === 'HERO' ? '#5DCAA5' : '#F0997B';

  // Destacar últimos 6 dígitos del chasis
  var mChasisDisplay = mChasis || '—';
  if (mChasis && mChasis.length > 6) {
    var head = mChasis.substring(0, mChasis.length - 6);
    var tail = mChasis.substring(mChasis.length - 6);
    mChasisDisplay = '<span style="opacity:0.6">' + head + '</span><span style="color:#fff;font-weight:700">' + tail + '</span>';
  } else if (mChasis) {
    mChasisDisplay = '<span style="color:#fff;font-weight:700">' + mChasis + '</span>';
  }

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
  h += '<div style="color:var(--tm)">Chasis: <span style="font-family:var(--fm)">' + mChasisDisplay + '</span></div>';
  if (mUbicacion) h += '<div style="color:' + marcaAccent + ';font-weight:600">' + mUbicacion + '</div>';
  h += '</div>';
  h += '</div>';

  // Filtrar actividades pendientes vs ejecutadas
  var pendientes = aRows.filter(function(r) { return r.estado === 'pendiente'; });
  var ejecutadas = aRows.filter(function(r) { return r.estado === 'ejecutada' || r.estado === 'ejecutado'; });

  h += '<div class="lbl" style="margin-top:12px">Actividades pendientes (' + pendientes.length + ')</div>';
  if (pendientes.length) {
    pendientes.forEach(function(r) {
      var isChosen = aChosen && aChosen.id === r.id;
      var borderCls = isChosen ? 'var(--gn)' : 'var(--bd)';
      h += '<div style="padding:10px 12px;border:.5px solid ' + borderCls + ';border-radius:6px;margin-bottom:6px;cursor:pointer;background:' + (isChosen ? 'var(--gnl)' : 'transparent') + '" onclick="aElegir(\'' + r.id + '\')">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between">';
      h += '<div style="font-size:13px;font-weight:600">' + (r.proceso || '—') + '</div>';
      h += '<span class="badge" style="background:var(--yll);color:var(--yld);font-size:9px">Pendiente</span>';
      h += '</div>';
      h += '</div>';
    });
  } else {
    h += '<div style="padding:14px;color:var(--tm);font-size:11px;text-align:center">No hay actividades pendientes</div>';
  }

  if (ejecutadas.length) {
    h += '<div class="lbl" style="margin-top:12px">Ya ejecutadas (' + ejecutadas.length + ')</div>';
    ejecutadas.forEach(function(r) {
      h += '<div style="padding:8px 12px;border:.5px solid var(--bd);border-radius:6px;margin-bottom:4px;background:rgba(29,158,117,0.04);opacity:0.8">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between">';
      h += '<div style="font-size:12px;color:#ccc">' + (r.proceso || '—') + '</div>';
      h += '<span class="badge" style="background:var(--gnl);color:var(--gnd);font-size:9px">Ejecutada</span>';
      h += '</div>';
      if (r.ejecuto) h += '<div style="font-size:10px;color:var(--tm);margin-top:3px">Por ' + r.ejecuto + '</div>';
      h += '</div>';
    });
  }

  // Formulario de registro (si hay una actividad seleccionada)
  if (aChosen) {
    h += '<div style="margin-top:14px;padding:14px;background:var(--bg);border:.5px solid var(--gn);border-radius:8px">';
    h += '<div class="lbl" style="color:var(--gnd);margin-bottom:8px">Registrar: ' + aChosen.proceso + '</div>';

    h += '<div style="margin-bottom:8px"><label class="lbl">Técnico que ejecutó</label>';
    h += '<select class="inp" onchange="aResp=this.value">';
    h += '<option value="">— Seleccionar —</option>';
    var opts = (aChosen.proceso === 'Instalación GPS') ? RESP_GPS :
               (aChosen.proceso === 'Marcación') ? RESP_MARCA :
               (aChosen.proceso === 'Defensas') ? RESP_DEF :
               RESP_ALIST;
    opts.forEach(function(o) {
      h += '<option value="' + o + '"' + (aResp === o ? ' selected' : '') + '>' + o + '</option>';
    });
    h += '</select></div>';

    h += '<button class="btn btn-p" style="width:100%;margin-top:8px" onclick="aRegistrar()">';
    h += (aLoading ? '⏳ Registrando...' : '✓ Confirmar ejecución');
    h += '</button>';

    h += '<button style="width:100%;margin-top:6px;background:none;border:none;color:var(--tm);font-size:11px;cursor:pointer" onclick="aChosen=null;aResp=\'\';render()">Cancelar</button>';
    h += '</div>';
  }

  return h;
}

/* ============================================================
   aElegir — Selecciona una actividad de la lista
   ============================================================ */
function aElegir(id) {
  var row = aRows.find(function(r) { return r.id === id; });
  if (row && row.estado === 'pendiente') {
    aChosen = row;
    aResp = '';
    render();
  }
}

/* ============================================================
   renderAlist — Render principal del módulo
   ============================================================ */
function renderAlist() {
  var h = '<div class="eyebrow">SERVICIO TÉCNICO</div><h1 class="h1">Alistamientos</h1>' +
    '<div class="sub-title">Buscar por código DM o últimos dígitos del chasis</div>';

  h += '<div class="flex" style="gap:6px;margin-bottom:12px">';
  h += '<input id="aIn" class="inp" style="text-transform:uppercase" ' +
    'placeholder="Ej: DM1196 o A30566" ' +
    'oninput="aStripNonAlnumUpper(this)" ' +
    'onkeydown="if(event.key===\'Enter\')aBuscar()">';
  h += '<button class="btn btn-p" style="width:auto;padding:0 18px" onclick="aBuscar()">Buscar</button>';
  h += '</div>';

  if (aLoading && !aMoto) {
    h += '<div style="text-align:center;padding:30px"><div style="width:30px;height:30px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div><div style="font-size:11px;color:var(--tm);margin-top:8px">Buscando...</div></div>';
  } else if (aMoto) {
    h += aRegView();
    h += '<div style="margin-top:14px;text-align:center"><button style="background:none;border:none;color:var(--tm);font-size:11px;cursor:pointer;text-decoration:underline" onclick="aReset()">← Buscar otra moto</button></div>';
  }

  return h;
}
