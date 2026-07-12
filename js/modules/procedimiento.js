/* ============================================================
   PROCEDIMIENTO.JS — Módulo del check‑list por día
   ============================================================
   Muestra las actividades del proceso agrupadas por día,
   permite marcarlas como ejecutadas, y sincroniza con:
   - Excel BD_Tramites (Power Automate): fechas por columna
   - Supabase registro_actividades: cada actividad ejecutada

   Estado: variables p* en state.js
   APIs: apiTramConsultarMoto, apiTramEscribirFecha (Power Automate)
         apiAvanceEscribir (Supabase)

   Migración jun 2026:
   - Ya no depende de TRAM_ACT_NUM_MAP.
   - Cada step de DAYS trae directamente su actNum.
   ============================================================ */

/* ============================================================
   1. LOAD/SAVE persistente
   ============================================================ */
function pLoad() {
  try {
    var s = localStorage.getItem(SK_P);
    pMotos = s ? JSON.parse(s) : {};
  } catch(e) { pMotos = {}; }
  try {
    var c = localStorage.getItem(SK_PC);
    if (c) {
      var cfg = JSON.parse(c);
      pUserArea = cfg.area || '';
      pUserName = cfg.name || '';
    }
  } catch(e) { }
}

function pSave() {
  try { localStorage.setItem(SK_P, JSON.stringify(pMotos)); } catch(e) { }
}

function pSaveCfg() {
  try {
    localStorage.setItem(SK_PC, JSON.stringify({
      area: pUserArea,
      name: pUserName
    }));
  } catch(e) { }
}

/* ============================================================
   2. Selección de moto
   ============================================================ */
function pOpen() {
  var code = (prompt('Código de barras (DMxxxx):') || '').trim().toUpperCase();
  if (!code) return;
  pCurrentDM = code;
  if (!pMotos[code]) pMotos[code] = { steps: {}, fechas: {} };
  pSave();
  render();
}

function pClose() {
  pCurrentDM = null;
  pQueue = {};
  render();
}

/* ============================================================
   3. Toggle de step (marcar/desmarcar)
   ============================================================ */
function pToggle(dayNum, stepIdx) {
  if (!pCurrentDM || !pMotos[pCurrentDM]) return;
  var key = dayNum + '_' + stepIdx;
  var moto = pMotos[pCurrentDM];
  if (moto.steps[key]) {
    delete moto.steps[key];
  } else {
    moto.steps[key] = {
      done: 1,
      by: pUserName || '?',
      at: new Date().toISOString().slice(0,10)
    };
    // Encolar para envío
    pQueue[key] = { dayNum: dayNum, stepIdx: stepIdx };
  }
  pSave();
  render();
}

function pToggleNA(dayNum, stepIdx) {
  if (!pCurrentDM || !pMotos[pCurrentDM]) return;
  var key = dayNum + '_' + stepIdx;
  var moto = pMotos[pCurrentDM];
  if (moto.steps[key] && moto.steps[key].na) {
    delete moto.steps[key];
  } else {
    moto.steps[key] = {
      done: 1,
      na: 1,
      by: pUserName || '?',
      at: new Date().toISOString().slice(0,10)
    };
  }
  pSave();
  render();
}

/* ============================================================
   4. Guardar fecha operativa
   ============================================================ */
function pSaveFecha(campo, valor) {
  if (!pCurrentDM || !pMotos[pCurrentDM]) return;
  pMotos[pCurrentDM].fechas[campo] = valor;
  pSave();
  if (valor) {
    apiTramEscribirFecha(pCurrentDM, campo, valor)
      .then(function() {
        toast('✓ Fecha guardada');
      })
      .catch(function(e) {
        toast('✗ Error al guardar fecha', 1);
      });
  }
}

/* ============================================================
   5. Envío al backend (flush)
   ============================================================
   Envía todos los steps encolados a Supabase.
   Ya NO usa TRAM_ACT_NUM_MAP: cada step trae su actNum inline en DAYS.
   ============================================================ */
function pFlushWrites() {
  if (!pCurrentDM) return;
  var moto = pMotos[pCurrentDM];
  if (!moto) return;

  var keys = Object.keys(pQueue);
  if (!keys.length) {
    toast('No hay cambios por enviar');
    return;
  }

  var enviados = 0;
  var fallidos = 0;
  var promises = [];

  keys.forEach(function(key) {
    var q = pQueue[key];
    var day = DAYS.find(function(d) { return d.day === q.dayNum; });
    if (!day) return;
    var step = day.steps[q.stepIdx];
    if (!step) return;

    // Solo registrar en Supabase si el step tiene actNum mapeado
    if (!step.actNum) return;

    var payload = {
      codigo_barras: pCurrentDM,
      actividad_num: step.actNum
    };

    var p = apiAvanceEscribir(payload)
      .then(function(r) {
        enviados++;
        delete pQueue[key];
      })
      .catch(function(e) {
        fallidos++;
        console.error('Error registrando actividad', step.actNum, e);
      });
    promises.push(p);
  });

  Promise.all(promises).then(function() {
    if (fallidos === 0) {
      toast('✓ ' + enviados + ' actividad(es) sincronizada(s)');
    } else {
      toast('⚠ ' + enviados + ' OK / ' + fallidos + ' con error', 1);
    }
    render();
  });
}

/* ============================================================
   6. Sync desde BD_Tramites (leer una moto)
   ============================================================ */
function pSyncMoto() {
  if (!pCurrentDM) return;
  toast('Consultando ' + pCurrentDM + '...');
  apiTramConsultarMoto(pCurrentDM)
    .then(function(data) {
      if (data && data.value && data.value.length) {
        var row = data.value[0];
        if (!pMotos[pCurrentDM].info) pMotos[pCurrentDM].info = {};
        pMotos[pCurrentDM].info = row;
        pSave();
        toast('✓ Datos actualizados');
        render();
      } else {
        toast('Moto no encontrada en BD_Tramites', 1);
      }
    })
    .catch(function(e) {
      toast('Error al consultar: ' + e.message, 1);
    });
}

/* ============================================================
   7. Cálculo de avance (local, para el header del módulo)
   ============================================================ */
function pTrackView() {
  if (!pCurrentDM || !pMotos[pCurrentDM]) {
    return { done: 0, total: 0, pct: 0 };
  }
  var moto = pMotos[pCurrentDM];
  var allAreaSteps = [];
  DAYS.forEach(function(day) {
    day.steps.forEach(function(s, si) {
      if (!pUserArea || s.c === pUserArea) {
        allAreaSteps.push({ dayNum: day.day, idx: si });
      }
    });
  });
  var done = 0;
  allAreaSteps.forEach(function(a) {
    var key = a.dayNum + '_' + a.idx;
    if (moto.steps[key]) done++;
  });
  var total = allAreaSteps.length;
  var pct = total ? Math.round((done / total) * 100) : 0;
  return { done: done, total: total, pct: pct };
}

/* ============================================================
   8. Render principal
   ============================================================ */
function renderProcedimiento() {
  if (!pUserArea || !pUserName) {
    return '<div class="eyebrow">TRÁMITES</div><h1 class="h1">Procedimiento</h1>' +
      '<div class="sub-title">Configurar usuario y área</div>' +
      '<div style="max-width:400px;margin:20px auto">' +
      '<label class="lbl">Área</label>' +
      '<select class="inp" onchange="pUserArea=this.value;pSaveCfg();render()">' +
      '<option value="">--</option>' +
      AREAS.map(function(a) {
        return '<option value="' + a.key + '"' + (pUserArea === a.key ? ' selected' : '') + '>' + a.label + '</option>';
      }).join('') +
      '</select>' +
      '<label class="lbl" style="margin-top:10px">Nombre</label>' +
      '<input class="inp" value="' + (pUserName || '') + '" onchange="pUserName=this.value;pSaveCfg();render()" placeholder="Tu nombre">' +
      '</div>';
  }

  if (!pCurrentDM) {
    return '<div class="eyebrow">TRÁMITES</div><h1 class="h1">Procedimiento</h1>' +
      '<div class="sub-title">Seleccionar moto por código de barras</div>' +
      '<div style="text-align:center;padding:40px 20px">' +
      '<button class="btn btn-p" style="max-width:260px;margin:0 auto" onclick="pOpen()">Abrir moto</button>' +
      '<div style="margin-top:20px;font-size:11px;color:var(--tm)">Área: ' + pUserArea + ' · Usuario: ' + pUserName + '</div>' +
      '</div>';
  }

  var moto = pMotos[pCurrentDM];
  var track = pTrackView();

  var h = '<div class="eyebrow">TRÁMITES</div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<h1 class="h1" style="margin:0">' + pCurrentDM + '</h1>';
  h += '<div style="display:flex;gap:8px">';
  h += '<button class="btn btn-o" style="width:auto;padding:6px 12px;font-size:11px" onclick="pSyncMoto()">🔄 Sync</button>';
  h += '<button class="btn btn-o" style="width:auto;padding:6px 12px;font-size:11px" onclick="pFlushWrites()">📤 Enviar</button>';
  h += '<button class="btn btn-o" style="width:auto;padding:6px 12px;font-size:11px" onclick="pClose()">Cerrar</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="sub-title">' + track.done + ' / ' + track.total + ' actividades (' + track.pct + '%)</div>';
  h += '<div class="p-progress-bar" style="margin:12px 0"><div class="p-progress-fill" style="width:' + track.pct + '%"></div></div>';

  DAYS.forEach(function(day) {
    var areaSteps = pUserArea ? day.steps.filter(function(s) { return s.c === pUserArea; }) : day.steps;
    if (!areaSteps.length) return;

    h += '<div class="p-day"><div class="p-day-title">Día ' + day.day + ' — ' + day.title + '</div>';

    day.steps.forEach(function(step, si) {
      if (pUserArea && step.c !== pUserArea) return;
      var key = day.day + '_' + si;
      var state = moto.steps[key];
      var done = state && state.done;
      var na = state && state.na;

      var iconClass = done ? (na ? 'p-check na' : 'p-check on') : 'p-check';
      var icon = done ? (na ? 'N/A' : '✓') : '';

      h += '<div class="p-step">';
      h += '<span class="' + iconClass + '" onclick="pToggle(' + day.day + ',' + si + ')">' + icon + '</span>';
      h += '<div class="p-step-content">';
      h += '<div class="p-step-title">' + step.t;
      if (step.actNum) h += ' <span class="p-step-num">#' + step.actNum + '</span>';
      h += '</div>';
      if (state) {
        h += '<div class="p-step-meta">' + state.at + ' · ' + state.by + (na ? ' · N/A' : '') + '</div>';
      }
      if (step.naOption && !na) {
        h += '<button class="btn-tiny" onclick="pToggleNA(' + day.day + ',' + si + ')">Marcar N/A</button>';
      }
      h += '</div></div>';
    });

    h += '</div>';
  });

  return h;
}
