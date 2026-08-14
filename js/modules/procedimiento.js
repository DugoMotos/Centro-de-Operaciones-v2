/* ============================================================
   PROCEDIMIENTO.JS — Módulo Trámites / Procedimiento
   ============================================================
   Funciones expuestas:
   - renderProc(): genera el HTML del módulo
   - pTrackView(): vista de moto activa con steps por día
   - pFlujoView(): vista de solo lectura del procedimiento
   - pBuscar(): consulta moto en BD_Tramites
   - pReg(sid), pRegNA(sid): registra fecha en columna
   - pCheckStep(dayNum, stepIdx): marca step como ejecutado
   - pConfirmAlist(): programa actividades de alistamiento
   - pRegPlaca(): programa instalación de placa
   - pToggle, pToggleDay, pToggleAll: helpers de UI

   Estado: variables p* en state.js
   APIs: apiTramConsultarMoto, apiTramEscribirFecha, apiAvanceEscribir

   Migración jun 2026:
   - pCheckStep ahora usa step.actNum (inline en DAYS) en lugar de
     TRAM_ACT_NUM_MAP. Envía a Supabase en lugar de SharePoint.
   ============================================================ */

function renderProc() {
  var pHeader = '<div class="eyebrow">PROCEDIMIENTO</div><h1 class="h1">Trámites</h1>' +
    '<div class="sub-title">Registra avances o consulta el procedimiento por área</div>';

  if (pLoading) {
    return pHeader +
      '<div style="text-align:center;padding:50px 20px">' +
      '<div style="font-size:32px;margin-bottom:12px">🔍</div>' +
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Buscando motocicleta...</div>' +
      '<div style="font-size:12px;color:var(--tm)">Consultando BD Trámites en SharePoint</div>' +
      '<div style="margin-top:16px"><div style="width:40px;height:40px;border:3px solid var(--bd);border-top-color:var(--gn);border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div></div>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>' +
      '<button class="btn btn-o" style="max-width:200px;margin:20px auto 0" onclick="pLoading=false;render()">Cancelar</button>' +
      '</div>';
  }

  if (!pActive) {
    var recent = Object.entries(pMotos).sort(function(a, b) {
      var aL = Object.values(a[1].steps).sort().pop() || a[1].created;
      var bL = Object.values(b[1].steps).sort().pop() || b[1].created;
      return bL.localeCompare(aL);
    }).slice(0, 8);

    var h = pHeader + '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">';
    h += '<div style="text-align:center;margin-bottom:4px"><div style="font-size:13px;font-weight:700">¿Qué deseas hacer?</div></div>';
    h += '<div class="card" style="border:1.5px solid var(--bl);cursor:pointer" onclick="pMode=\'track\';render()"><div class="flex fxc" style="gap:12px"><div style="width:36px;height:36px;border-radius:8px;background:var(--bll);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📝</div><div><div style="font-size:13px;font-weight:700">Registrar avance</div><div style="font-size:10px;color:var(--tm);margin-top:1px">Ingresar código de barras y registrar progreso</div></div></div></div>';
    h += '<div class="card" style="border:1.5px solid var(--bd);cursor:pointer" onclick="pMode=\'view\';pActive=\'__view__\';render()"><div class="flex fxc" style="gap:12px"><div style="width:36px;height:36px;border-radius:8px;background:var(--sf);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">👁</div><div><div style="font-size:13px;font-weight:700">Solo visualizar</div><div style="font-size:10px;color:var(--tm);margin-top:1px">Consultar pasos del procedimiento por área</div></div></div></div>';
    h += '</div>';

    if (pMode === 'track') {
      h += '<div class="lbl">¿A qué área perteneces?</div><div class="flex" style="flex-wrap:wrap;margin-bottom:14px">';
      for (var k in AREAS) {
        var ar = AREAS[k];
        h += '<button class="btn btn-o" style="width:auto;padding:8px 14px;font-size:12px;' +
          (pUserArea === k ? 'border-color:' + ar.s + ';color:' + ar.s + ';background:' + ar.f + ';font-weight:700' : '') +
          '" onclick="pUserArea=\'' + k + '\';render()">' + ar.l + '</button>';
      }
      h += '</div>';

      if (pUserArea) {
        h += '<div class="lbl">Código de barras</div>';
        h += '<div class="flex" style="margin-bottom:14px"><input class="inp" style="font-size:14px;letter-spacing:1px" id="pIn" placeholder="Escanear o digitar..." onkeydown="if(event.key===\'Enter\')pBuscar()"><button class="btn btn-p" style="width:auto;padding:11px 18px" onclick="pBuscar()">Buscar</button></div>';

        if (recent.length) {
          h += '<div class="lbl">Motos recientes</div>';
          recent.forEach(function(x) {
            var code = x[0], data = x[1];
            var checks = data.checks || {};
            var allS = [];
            DAYS.forEach(function(day) {
              day.steps.forEach(function(s, si) {
                if (!pUserArea || s.c === pUserArea) allS.push({ k: day.day + '_' + si });
              });
            });
            var totS = allS.length || 1;
            var doneS = allS.filter(function(s) { return checks[s.k]; }).length;
            var p2 = Math.round((doneS / totS) * 100);
            h += '<button class="recent-btn" onclick="pActive=\'' + code + '\';pMode=\'track\';pAlistSel=[];render()">' +
              '<span style="font-family:var(--fm);font-size:13px;font-weight:700">' + code + '</span>' +
              '<span style="font-size:10px;font-weight:700;color:' + (p2 === 100 ? 'var(--gn)' : 'var(--tx)') + '">' + p2 + '%</span>' +
              '</button>';
          });
        }
      } else {
        h += '<div style="text-align:center;padding:16px;color:var(--tm);font-size:12px">Selecciona tu área para continuar</div>';
      }
    }
    return h;
  }

  if (pActive === '__view__') {
    var h = '<button style="font-size:12px;color:var(--tm);background:none;border:none;cursor:pointer;margin-bottom:10px" onclick="pActive=null;pMode=\'\';render()">← Volver</button>';
    h += pFlujoView();
    return h;
  }

  try {
    return pTrackView();
  } catch (e) {
    return '<div style="padding:20px;text-align:center"><div style="font-size:28px;margin-bottom:10px">⚠️</div><div style="font-size:14px;font-weight:600;margin-bottom:8px">Error en pTrackView</div><div style="font-size:12px;color:red;background:#fee;padding:10px;border-radius:8px;text-align:left;word-break:break-all">' + e.message + '<br><br>Stack: ' + e.stack + '</div><button class="btn btn-o" style="margin-top:12px" onclick="pActive=null;pMode=\'\';render()">← Volver</button></div>';
  }
}

/* ============================================================
   pFlujoView — Vista de solo lectura del procedimiento
   ============================================================ */
function pFlujoView() {
  var h = '<div class="lbl">Filtrar por área</div>';
  h += '<div class="flex" style="flex-wrap:wrap;margin-bottom:12px">';
  h += '<button class="btn' + (pArea === '' ? ' btn-p' : ' btn-o') + '" style="width:auto;padding:7px 12px;font-size:11px" onclick="pArea=\'\';render()">Todas</button>';
  for (var k in AREAS) {
    var a = AREAS[k];
    h += '<button class="btn btn-o" style="width:auto;padding:7px 12px;font-size:11px;' +
      (pArea === k ? 'border-color:' + a.s + ';color:' + a.s + ';background:' + a.f : '') +
      '" onclick="pArea=\'' + k + '\';render()">' + a.l + '</button>';
  }
  h += '</div>';

  var tpColors = {
    exec: { bg: 'var(--sf)', color: 'var(--tm)', label: 'Ejecución' },
    reg: { bg: 'var(--bll)', color: 'var(--bld)', label: 'Registro' },
    val: { bg: 'var(--vll)', color: 'var(--vl)', label: 'Validación' },
    com: { bg: 'var(--prl)', color: 'var(--pr)', label: 'Comunicado' }
  };

  DAYS.forEach(function(day) {
    var steps = pArea ? day.steps.filter(function(s) { return s.c === pArea; }) : day.steps;
    if (!steps.length) return;
    h += '<div style="margin-bottom:16px"><div style="padding:10px 12px;border-radius:8px;background:var(--sf);margin-bottom:4px">';
    h += '<div style="font-size:13px;font-weight:700">Día ' + day.day + ' — ' + day.title + '</div>';
    if (day.desc) h += '<div style="font-size:10px;color:var(--tm);margin-top:2px">' + day.desc + '</div>';
    h += '</div>';

    steps.forEach(function(step) {
      var a = AREAS[step.c];
      var tpc = tpColors[step.tp] || tpColors.exec;
      h += '<div class="step" style="opacity:1"><div class="step-line"><div class="step-dot" style="width:20px;height:20px;background:' + a.f + ';border:2px solid ' + a.s + '"></div><div class="step-bar" style="background:' + a.s + ';opacity:.15"></div></div>';
      h += '<div class="step-body" style="border:.5px solid var(--bd);padding:12px">';
      h += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">';
      h += '<span class="step-tag" style="background:' + a.f + ';color:' + a.s + '">' + a.l + '</span>';
      h += '<span class="step-tag" style="background:' + tpc.bg + ';color:' + tpc.color + '">' + tpc.label + '</span>';
      if (step.gate) h += '<span class="step-tag" style="background:var(--rdl);color:var(--rdd)">Gate</span>';
      h += '</div>';
      h += '<div class="step-t">' + step.t + '</div>';
      if (step.d) h += '<div style="font-size:11px;color:var(--tm);margin-top:4px;line-height:1.5">' + step.d + '</div>';
      if (step.pre) h += '<div style="margin-top:6px;padding:6px 10px;background:var(--yll);border-radius:0;border-left:3px solid var(--yl)"><div style="font-size:9px;font-weight:700;color:var(--yld);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Prerrequisito</div><div style="font-size:10px;color:var(--yld);line-height:1.4">' + step.pre + '</div></div>';
      if (step.act) h += '<div style="margin-top:6px;padding:6px 10px;background:var(--sf);border-radius:6px"><div style="font-size:9px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Acción</div><div style="font-size:10px;color:var(--tx);line-height:1.4">' + step.act + '</div></div>';
      if (step.doc) h += '<div style="margin-top:6px;display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;border:.5px solid var(--bd)"><svg width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0"><rect x="3" y="1" width="10" height="14" rx="1.5" fill="none" stroke="var(--tm)" stroke-width="1"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke="var(--tm)" stroke-width=".7"/><line x1="5.5" y1="7.5" x2="10.5" y2="7.5" stroke="var(--tm)" stroke-width=".7"/></svg><div><div style="font-size:8px;color:var(--tm)">Documento / archivo</div><div style="font-size:10px;font-weight:600;color:var(--tx)">' + step.doc + '</div></div></div>';
      if (step.gate && step.gl) h += '<div style="margin-top:6px;padding:6px 10px;background:var(--rdl);border-radius:0;border-left:3px solid var(--rd)"><div style="font-size:10px;font-weight:600;color:var(--rdd)">⚠ ' + step.gl + '</div></div>';
      h += '</div></div>';
    });
    h += '</div>';
  });
  return h;
}

/* ============================================================
   pTrackView — Vista activa con tracking de moto
   ============================================================ */
function pTrackView() {
  if (pLoading) {
    return '<div style="text-align:center;padding:40px"><div style="font-size:28px;margin-bottom:10px">⏳</div><div style="font-size:14px;font-weight:600">Consultando SharePoint...</div><div style="font-size:11px;color:var(--tm);margin-top:4px">Verificando actividades para ' + pActive + '</div><button class="btn btn-o" style="max-width:200px;margin:16px auto 0" onclick="pLoading=false;render()">Cancelar</button></div>';
  }

  var md = pMotos[pActive];
  if (!md) {
    md = { created: new Date().toISOString(), steps: {}, alist: [], remote: {}, checks: {}, info: {} };
    pMotos[pActive] = md;
    sv(SK_P, pMotos);
  }
  if (!md.checks) md.checks = {};
  if (!md.steps) md.steps = {};
  if (!md.info) md.info = {};

  var regS = TRAM_STEPS.filter(function(s) { return s.bd; });
  var datesDone = regS.filter(function(s) { return md.steps[s.id]; }).length;
  var allAreaSteps = [];
  DAYS.forEach(function(day) {
    day.steps.forEach(function(s, si) {
      if (!pUserArea || s.c === pUserArea) allAreaSteps.push({ dayNum: day.day, idx: si });
    });
  });
  var totalSteps = allAreaSteps.length || 1;
  var completedChecks = allAreaSteps.filter(function(s) { return md.checks[s.dayNum + '_' + s.idx]; }).length;
  var pct = Math.round((completedChecks / totalSteps) * 100);
  var userAreaInfo = AREAS[pUserArea] || { s: 'var(--tm)', f: 'var(--sf)', l: 'Todas' };
  var isOnline = !!pCfg.tramC;

  var info = md.info || {};
  var mMarca = (info.marca || '').toUpperCase();
  var mColor = info.color || '';

  // STICKY HEADER
  var h = '<div style="position:sticky;top:0;z-index:5;background:var(--bg);margin:0 -18px;border-bottom:2px solid var(--bd)">';

  h += '<div style="padding:12px 18px">';
  h += '<div class="flex fxc fxb" style="margin-bottom:10px">';
  h += '<button style="font-size:12px;color:var(--tm);background:none;border:none;cursor:pointer" onclick="pActive=null;pMode=\'\';pAlistSel=[];render()">← Volver</button>';
  h += '<div style="display:flex;gap:6px">';
  h += '<button style="font-size:10px;color:var(--rd);background:none;border:1px solid var(--rd);border-radius:5px;padding:3px 8px;cursor:pointer" onclick="if(confirm(\'¿Borrar todos los registros de ' + pActive + '?\')){pMotos[pActive]={created:new Date().toISOString(),steps:{},alist:[],remote:{},checks:{},info:{}};sv(SK_P,pMotos);toast(\'Registros limpiados\');render()}">Limpiar</button>';
  h += '<button style="font-size:10px;color:var(--bl);background:none;border:1px solid var(--bl);border-radius:5px;padding:3px 8px;cursor:pointer" onclick="pActive=null;render()">Nueva consulta</button>';
  h += '</div></div>';

  if (mMarca) {
    var marcaBg = mMarca === 'HERO' ? 'linear-gradient(135deg,#085041,#1D9E75)' : 'linear-gradient(135deg,#712B13,#D85A30)';
    h += '<div style="background:' + marcaBg + ';border-radius:10px;padding:12px 14px;color:#fff;margin-bottom:8px">';
    h += '<div class="flex fxc fxb">';
    h += '<div style="flex:1">';
    h += '<div style="font-size:11px;font-weight:600;opacity:.7;text-transform:uppercase;letter-spacing:1px">' + mMarca + '</div>';
    h += '<div style="font-size:18px;font-weight:800;margin-top:2px">' + (info.linea || '') + ' ' + (info.referencia || '') + '</div>';
    var details = [];
    if (info.modelo) details.push('Modelo ' + info.modelo);
    if (details.length) h += '<div style="font-size:11px;opacity:.8;margin-top:2px">' + details.join(' · ') + '</div>';
    h += '</div>';
    h += '<div style="text-align:right">';
    h += '<div style="font-family:var(--fm);font-size:14px;font-weight:700;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:6px">' + pActive + '</div>';
    if (mColor) h += '<div style="display:flex;align-items:center;gap:4px;justify-content:flex-end;margin-top:6px"><div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid rgba(255,255,255,.4)"></div><span style="font-size:10px;font-weight:600;opacity:.9">' + mColor + '</span></div>';
    h += '</div></div></div>';
  } else {
    h += '<div style="background:var(--sf);border-radius:10px;padding:12px 14px;margin-bottom:8px">';
    h += '<div style="font-family:var(--fm);font-size:20px;font-weight:800">' + pActive + '</div>';
    h += '<div style="font-size:11px;color:var(--tm);margin-top:2px">Sin datos de SharePoint</div>';
    h += '</div>';
  }

  h += '<div class="flex fxc fxb">';
  h += '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">';
  h += '<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:5px;background:' + userAreaInfo.f + ';color:' + userAreaInfo.s + '">' + userAreaInfo.l + '</span>';
  if (pUserArea === 'tra') h += '<span style="font-size:8px;color:var(--bld);background:var(--bll);padding:2px 6px;border-radius:5px">' + datesDone + '/' + regS.length + ' fechas</span>';
  h += '<div class="conn"><div class="conn-dot" style="background:' + (isOnline ? 'var(--gn)' : 'var(--yl)') + '"></div><span style="color:' + (isOnline ? 'var(--gnd)' : 'var(--yld)') + '">' + (isOnline ? 'SP' : 'Local') + '</span></div>';
  h += '</div>';
  h += '<div style="font-size:20px;font-weight:800;color:' + (pct === 100 ? 'var(--gn)' : 'var(--tx)') + '">' + pct + '%<span style="font-size:10px;font-weight:600;color:var(--tm);margin-left:4px">' + completedChecks + '/' + totalSteps + '</span></div>';
  h += '</div>';
  h += '<div style="height:5px;background:var(--sf);border-radius:3px;overflow:hidden;margin-top:6px"><div style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? 'var(--gn)' : 'var(--or)') + ';border-radius:3px;transition:width .5s"></div></div>';
  h += '</div></div>';

  h += '<div class="lbl" style="margin-top:4px">Procedimiento por día</div>';
  h += '<div style="margin-bottom:4px"><button style="font-size:10px;color:var(--bl);background:none;border:none;cursor:pointer;text-decoration:underline" onclick="pToggleAll()">Desplegar / colapsar todos</button></div>';

  DAYS.forEach(function(day) {
    var steps = pUserArea ? day.steps.filter(function(s) { return s.c === pUserArea; }) : day.steps;
    if (!steps.length) return;
    var isOpen = !!pOpenDays[day.day];
    var stepCount = steps.length;
    var dayChecked = steps.filter(function(s) {
      var oi = day.steps.indexOf(s);
      return md.checks[day.day + '_' + oi];
    }).length;
    var dayDone = dayChecked === stepCount;

    h += '<div style="margin-bottom:6px">';
    h += '<div style="padding:10px 12px;border-radius:8px;background:' + (dayDone ? 'var(--gnl)' : 'var(--sf)') + ';cursor:pointer;display:flex;align-items:center;justify-content:space-between;border:.5px solid ' + (dayDone ? 'var(--gn)' : 'var(--bd)') + '" onclick="pToggleDay(' + day.day + ')">';
    h += '<div><div style="font-size:13px;font-weight:700">Día ' + day.day + ' — ' + day.title + '</div></div>';
    h += '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:10px;font-weight:600;color:' + (dayDone ? 'var(--gnd)' : 'var(--tm)') + ';background:var(--bg);padding:2px 8px;border-radius:10px">' + dayChecked + '/' + stepCount + '</span><span style="font-size:14px;color:var(--tm);display:inline-block;transform:rotate(' + (isOpen ? '90' : '0') + 'deg)">▸</span></div>';
    h += '</div>';

    if (isOpen) {
      var tpColors = {
        exec: { bg: 'var(--sf)', color: 'var(--tm)', label: 'Ejecución' },
        reg: { bg: 'var(--bll)', color: 'var(--bld)', label: 'Registro' },
        val: { bg: 'var(--vll)', color: 'var(--vl)', label: 'Validación' },
        com: { bg: 'var(--prl)', color: 'var(--pr)', label: 'Comunicado' }
      };
      h += '<div style="padding:6px 0 0">';
      steps.forEach(function(step) {
        var a = AREAS[step.c];
        var origIdx = day.steps.indexOf(step);
        var checkKey = day.day + '_' + origIdx;
        var isChecked = !!md.checks[checkKey];
        var tpc = tpColors[step.tp] || tpColors.exec;

        var tramStep = pFindTramStep(step);
        var hasDateReg = tramStep && tramStep.bd && tramStep.col;
        var dateRegistered = tramStep ? !!md.steps[tramStep.id] : false;
        var isAlist = tramStep && tramStep.tp === 'alist';
        var savedAlist = md.alist || [];

        var dotBg = isChecked ? 'var(--gn)' : a.f;
        var dotBd = isChecked ? 'var(--gn)' : a.s;
        var bodyBg = isChecked ? '#F7FBF2' : 'transparent';
        var bodyBd = isChecked ? '.5px solid #C0DD97' : '.5px solid var(--bd)';

        h += '<div class="step" style="opacity:1"><div class="step-line"><div class="step-dot" style="width:' + (isChecked ? 20 : 18) + 'px;height:' + (isChecked ? 20 : 18) + 'px;background:' + dotBg + ';border:2px solid ' + dotBd + ';cursor:pointer" onclick="pCheckStep(' + day.day + ',' + origIdx + ')">' + (isChecked ? chk : '') + '</div><div class="step-bar" style="background:' + a.s + ';opacity:.15"></div></div>';

        var stepExpandKey = day.day + '_' + origIdx;
        var isExpanded = isChecked ? (pExpandStep === stepExpandKey) : true;

        if (isChecked && !isExpanded) {
          h += '<div class="step-body" style="background:#F7FBF2;border:.5px solid #C0DD97;padding:8px 12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between" onclick="pExpandStep=\'' + stepExpandKey + '\';render()">';
          h += '<div style="display:flex;align-items:center;gap:6px"><span class="step-tag" style="background:' + a.f + ';color:' + a.s + '">' + a.l + '</span><span style="font-size:13px;font-weight:600;color:var(--gnd)">' + step.t + '</span></div>';
          h += '<span style="font-size:10px;color:var(--gn)">✓</span>';
          h += '</div></div>';
        } else {
          h += '<div class="step-body" style="background:' + bodyBg + ';border:' + bodyBd + ';padding:12px' + (isChecked ? ';cursor:pointer' : '') + '"' + (isChecked ? ' onclick="pExpandStep=null;render()"' : '') + '>';

          h += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">';
          h += '<span class="step-tag" style="background:' + a.f + ';color:' + a.s + '">' + a.l + '</span>';
          h += '<span class="step-tag" style="background:' + tpc.bg + ';color:' + tpc.color + '">' + tpc.label + '</span>';
          if (step.gate) h += '<span class="step-tag" style="background:var(--rdl);color:var(--rdd)">Gate</span>';
          if (hasDateReg) h += '<span class="step-tag" style="background:var(--bll);color:var(--bld)">Consignar fecha</span>';
          h += '</div>';

          h += '<div class="step-t">' + step.t + '</div>';
          if (step.d) h += '<div style="font-size:11px;color:var(--tm);margin-top:4px;line-height:1.5">' + step.d + '</div>';
          if (step.pre) h += '<div style="margin-top:6px;padding:6px 10px;background:var(--yll);border-left:3px solid var(--yl)"><div style="font-size:9px;font-weight:700;color:var(--yld);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Prerrequisito</div><div style="font-size:10px;color:var(--yld);line-height:1.4">' + step.pre + '</div></div>';
          if (step.act) h += '<div style="margin-top:6px;padding:6px 10px;background:var(--sf);border-radius:6px"><div style="font-size:9px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Acción</div><div style="font-size:10px;color:var(--tx);line-height:1.4">' + step.act + '</div></div>';
          if (step.gate && step.gl) h += '<div style="margin-top:6px;padding:6px 10px;background:var(--rdl);border-left:3px solid var(--rd)"><div style="font-size:10px;font-weight:600;color:var(--rdd)">⚠ ' + step.gl + '</div></div>';

          if (hasDateReg) {
            var bdNames = { tram: 'BD Trámites', plan: 'BD Plan alistamientos', caja: 'BD Caja', cont: 'BD Contabilidad' };
            var isNA = md.steps[tramStep.id] === 'NA';
            if (dateRegistered) {
              if (isNA) {
                h += '<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:var(--sf);border:.5px solid var(--bd)"><div style="font-size:10px;font-weight:600;color:var(--tm)">N/A — No aplica</div><div style="font-size:9px;color:var(--tl);margin-top:2px">' + (bdNames[tramStep.bd] || '') + ' → ' + tramStep.col + '</div></div>';
              } else {
                h += '<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:var(--gnl);border:.5px solid var(--gn)"><div style="font-size:10px;font-weight:600;color:var(--gnd)">✓ Fecha registrada: ' + fD(md.steps[tramStep.id]) + '</div><div style="font-size:9px;color:var(--gn);margin-top:2px">' + (bdNames[tramStep.bd] || '') + ' → ' + tramStep.col + '</div></div>';
              }
            } else {
              h += '<div style="margin-top:6px;cursor:pointer" onclick="event.stopPropagation();pFocusReg=pFocusReg===\'' + tramStep.id + '\'?null:\'' + tramStep.id + '\';render()">';
              h += '<div style="padding:6px 10px;border-radius:6px;background:var(--bll);border:.5px solid var(--bl);display:flex;align-items:center;justify-content:space-between">';
              h += '<div style="font-size:10px;font-weight:600;color:var(--bld)">📝 Consignar fecha</div>';
              h += '<span style="font-size:12px;color:var(--bld);transform:rotate(' + (pFocusReg === tramStep.id ? '90' : '0') + 'deg);display:inline-block">▸</span>';
              h += '</div>';
              if (pFocusReg === tramStep.id) {
                h += '<div style="padding:8px 10px;background:var(--bll);border-radius:0 0 6px 6px;border:.5px solid var(--bl);border-top:0">';
                h += '<div style="font-size:9px;color:var(--bld);margin-bottom:6px">' + (bdNames[tramStep.bd] || '') + ' → <strong>' + tramStep.col + '</strong></div>';
                h += '<button class="btn btn-p" style="font-size:12px;padding:9px;margin-bottom:6px" onclick="event.stopPropagation();pReg(\'' + tramStep.id + '\')">Registrar fecha — ' + fT() + '</button>';
                if (tramStep.naOption) {
                  h += '<button class="btn btn-o" style="font-size:11px;padding:8px;color:var(--tm)" onclick="event.stopPropagation();pRegNA(\'' + tramStep.id + '\')">No aplica (N/A)</button>';
                }
                h += '</div>';
              }
              h += '</div>';
            }
          }

          if (isAlist && !md.steps[tramStep.id]) {
            h += '<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--vll);border:.5px solid var(--vlb)">';
            h += '<div style="font-size:9px;font-weight:700;color:var(--vl);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Seleccionar actividades</div>';
            ALIST_OPTS.forEach(function(opt) {
              var on = pAlistSel.indexOf(opt.v) >= 0;
              h += '<div class="alist-opt' + (on ? ' on' : '') + '" onclick="event.stopPropagation();pToggle(\'' + opt.v + '\')"><div class="alist-chk">' + (on ? chk : '') + '</div><span style="font-size:12px;font-weight:600">' + opt.l + '</span></div>';
            });
            h += '<div style="font-size:9px;color:var(--vl);margin-top:5px;padding:5px 8px;background:var(--bg);border-radius:5px">→ Código de barras → Plan de alistamientos</div>';
            h += '<button class="btn btn-p" style="margin-top:6px;font-size:12px;padding:9px" ' + (pAlistSel.length ? '' : 'disabled') + ' onclick="event.stopPropagation();pConfirmAlist()">Confirmar ' + pAlistSel.length + ' actividad' + (pAlistSel.length !== 1 ? 'es' : '') + '</button>';
            h += '</div>';
          }
          if (isAlist && md.steps[tramStep.id] && savedAlist.length) {
            h += '<div style="margin-top:6px">' + savedAlist.map(function(a) {
              return '<span style="display:inline-block;font-size:9px;font-weight:600;color:var(--gnd);background:var(--gnl);padding:2px 7px;border-radius:5px;margin:0 3px 2px 0">' + a + '</span>';
            }).join('') + '</div>';
          }

          var isPlaca = step.tp === 'placa';
          var placaDone = isPlaca && md.steps['placa_programada'];
          if (isPlaca && !placaDone) {
            h += '<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--vll);border:.5px solid var(--vlb)">';
            h += '<div style="font-size:10px;color:var(--vl);margin-bottom:6px">Se registrará "Placa" en Plan de alistamientos</div>';
            h += '<button class="btn btn-p" style="font-size:12px;padding:9px" onclick="event.stopPropagation();pRegPlaca()">Programar instalación de placa</button>';
            h += '</div>';
          }
          if (isPlaca && placaDone) {
            h += '<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:var(--gnl);border:.5px solid var(--gn)"><div style="font-size:10px;font-weight:600;color:var(--gnd)">✓ Placa programada en alistamientos</div></div>';
          }

          if (isChecked) h += '<div style="margin-top:4px;font-size:9px;color:var(--gn)">✓ Completado</div>';

          h += '</div></div>';
        }
      });
      h += '</div>';
    }
    h += '</div>';
  });

  h += '<button class="btn btn-o" style="margin-top:10px" onclick="pActive=null;pMode=\'\';pAlistSel=[];render()">← Volver al menú</button>';
  return h;
}

/* ============================================================
   pFindTramStep — helper para relacionar step de DAYS con TRAM_STEPS
   ============================================================ */
function pFindTramStep(step) {
  for (var ti = 0; ti < TRAM_STEPS.length; ti++) {
    if (TRAM_STEPS[ti].t === step.t) return TRAM_STEPS[ti];
  }
  // Matching específico para Contabilidad (actividad #12)
  if (step.c === 'con' && step.actNum === 12) {
    for (var ti = 0; ti < TRAM_STEPS.length; ti++) {
      if (TRAM_STEPS[ti].id === 's12') return TRAM_STEPS[ti];
    }
  }
   if (step.c === 'tra') {
    for (var ti = 0; ti < TRAM_STEPS.length; ti++) {
      var ts = TRAM_STEPS[ti];
      if ((step.t.indexOf('Verificar ítems') >= 0 && ts.id === 's01') ||
          (step.t.indexOf('Programar alistamientos') >= 0 && ts.id === 's02') ||
          (step.t.indexOf('Asignar manifiesto') >= 0 && ts.id === 's03') ||
          (step.t.indexOf('preasignación') >= 0 && ts.id === 's04a') ||
          (step.t.indexOf('Validar cotización') >= 0 && ts.id === 's05') ||
          (step.t.indexOf('Solicitar SOAT') >= 0 && ts.id === 's06') ||
          (step.t.indexOf('Verificar activación SOAT') >= 0 && ts.id === 's07') ||
          (step.t.indexOf('Entregar paquetes') >= 0 && ts.id === 's08') ||
          (step.t.indexOf('matrícula en RUNT') >= 0 && ts.id === 's09') ||
          (step.t.indexOf('Recibir matrícula') >= 0 && ts.id === 's10') ||
          (step.t.indexOf('Activar garantía') >= 0 && ts.id === 's11')) {
        return ts;
      }
    }
  }
  return null;
}

/* ============================================================
   pBuscar — Consulta moto por código de barras
   ============================================================ */
function pBuscar() {
  var inp = document.getElementById('pIn');
  var code = (inp ? inp.value : '').trim().toUpperCase();
  if (!code) { toast('Ingresa código', 1); return; }

  if (!pCfg.tramC) {
    toast('No hay conexión configurada', 1);
    return;
  }

  pLoading = true;
  pActive = null;
  render();

  apiTramConsultarMoto(code).then(function(data) {
    var rows = data.value || data;
    var row = null;
    if (Array.isArray(rows) && rows.length > 0) row = rows[0];
    else if (rows && !Array.isArray(rows) && Object.keys(rows).length > 0) row = rows;

    if (!row) {
      pLoading = false;
      pActive = null;
      render();
      alert('La motocicleta ' + code + ' no se encuentra registrada en BD Trámites.\n\nPosibles causas:\n• No está en proceso de venta\n• Ya fue entregada al cliente\n• El código fue digitado incorrectamente');
      return;
    }

    if (!pMotos[code]) {
      pMotos[code] = { created: new Date().toISOString(), steps: {}, alist: [], remote: {}, checks: {}, info: {} };
    }
    pMotos[code].checks = pMotos[code].checks || {};
    pMotos[code].steps = pMotos[code].steps || {};
    pMotos[code].info = {
      marca: row.marca || row.MARCA || row.Marca || '',
      linea: row.linea || row.LINEA || row.Linea || '',
      referencia: row.referencia || row.REFERENCIA || row.Referencia || '',
      modelo: row.modelo || row.MODELO || row.Modelo || '',
      color: row.color || row.COLOR || row.Color || ''
    };
    var colMap = {
      'manifiesto': 's03', 'asig_placa': 's04a', 'cot_datapro': 's05',
      'solic_soat': 's06', 'soat_ok': 's07', 'matricula': 's08',
      'mat_ok': 's09', 'rec_placa': 's10', 'garantia': 's11'
    };
    for (var col in colMap) {
      var val = row[col] || '';
      if (val && val.toString().trim() !== '') pMotos[code].steps[colMap[col]] = val;
    }
    sv(SK_P, pMotos);
    pAlistSel = [];
    pExpandStep = null;
    pFocusReg = null;

    // NUEVO: consultar registros de Supabase para bloqueo global
    if (typeof supabaseReady === 'function' && supabaseReady()) {
      apiAvanceConsultarMoto(code)
        .then(function(rows) {
          // Marcar como ejecutadas las actividades que ya están en Supabase
          // Reconstruir los checks locales usando actNum de DAYS
          (rows || []).forEach(function(r) {
            var actNum = r.actividad_num;
            // Buscar el step en DAYS que tenga este actNum
            DAYS.forEach(function(day) {
              day.steps.forEach(function(s, si) {
                if (s.actNum === actNum) {
                  var key = day.day + '_' + si;
                  if (!pMotos[code].checks[key]) {
                    pMotos[code].checks[key] = r.fecha_registro || new Date().toISOString();
                  }
                }
              });
            });
          });
          sv(SK_P, pMotos);
          pLoading = false;
          pActive = code;
          render();
        })
        .catch(function() {
          // Si falla la consulta a Supabase, seguimos igual (sin bloqueo global)
          pLoading = false;
          pActive = code;
          render();
        });
    } else {
      pLoading = false;
      pActive = code;
      render();
    }
  }).catch(function(e) {
    pLoading = false;
    pActive = null;
    render();
    alert(e.name === 'AbortError' ? 'Tiempo agotado al consultar la moto. Verifica conexión.' : 'Error al consultar la moto: ' + e.message);
  });
}

/* ============================================================
   pReg / pRegNA — Registra fecha en columna de BD_Tramites
   ============================================================ */
function pReg(sid) {
  var now = new Date();
  var fechaISO = now.toISOString();
  var fechaSinAmbig = fIso(now);

  pMotos[pActive].steps[sid] = fechaISO;
  sv(SK_P, pMotos);

  var step = TRAM_STEPS.find(function(s) { return s.id === sid; });

  if (step && step.bd === 'tram' && step.col && pCfg.tramW) {
    apiTramEscribirFecha(pActive, step.col, fechaSinAmbig).then(function() {
      pMotos[pActive].remote[sid] = fechaSinAmbig;
      sv(SK_P, pMotos);
      toast('✓ ' + step.t + ' — guardado en BD_Tramites');
    }).catch(function() {
      toast('✓ ' + step.t + ' — guardado local (sincronizar después)', 1);
    });
  } else if (step && step.bd === 'cont' && step.col && pCfg.contW) {
    apiContEscribirFecha(pActive, fechaSinAmbig).then(function() {
      pMotos[pActive].remote[sid] = fechaSinAmbig;
      sv(SK_P, pMotos);
      toast('✓ ' + step.t + ' — guardado en BD_Contabilidad');
    }).catch(function() {
      toast('✓ ' + step.t + ' — guardado local (sincronizar después)', 1);
    });
  } else {
    toast('✓ ' + step.t);
  }
  render();
}

function pRegNA(sid) {
  pMotos[pActive].steps[sid] = 'NA';
  sv(SK_P, pMotos);

  var step = TRAM_STEPS.find(function(s) { return s.id === sid; });

  if (step && step.bd === 'tram' && step.col && pCfg.tramW) {
    apiTramEscribirFecha(pActive, step.col, 'NA').then(function() {
      toast('✓ ' + step.t + ' — N/A guardado en BD_Tramites');
    }).catch(function() {
      toast('✓ ' + step.t + ' — N/A guardado local', 1);
    });
  } else if (step && step.bd === 'cont' && step.col && pCfg.contW) {
    apiContEscribirFecha(pActive, 'NA').then(function() {
      toast('✓ ' + step.t + ' — N/A guardado en BD_Contabilidad');
    }).catch(function() {
      toast('✓ ' + step.t + ' — N/A guardado local', 1);
    });
  } else {
    toast('✓ ' + step.t + ' — No aplica');
  }
  render();
}

/* ============================================================
   pToggle / pConfirmAlist — Alistamientos
   ============================================================ */
function pToggle(opt) {
  var idx = pAlistSel.indexOf(opt);
  if (idx >= 0) pAlistSel.splice(idx, 1);
  else pAlistSel.push(opt);
  render();
}

function pConfirmAlist() {
  if (!pAlistSel.length) return;
  var now = new Date();
  var total = pAlistSel.length;
  pMotos[pActive].steps.s02 = now.toISOString();
  pMotos[pActive].alist = pAlistSel.slice();
  sv(SK_P, pMotos);

  if (typeof supabaseReady === 'function' && supabaseReady() && typeof apiRegAlistCrear === 'function') {
    apiRegAlistCrear(pActive, pAlistSel)
      .then(function() {
        toast('✓ ' + total + ' alistamiento' + (total !== 1 ? 's' : '') + ' programado' + (total !== 1 ? 's' : '') + ' en Supabase');
      })
      .catch(function(e) {
        toast('Error al programar en Supabase: ' + (e.message || 'desconocido'), 1);
      });
  } else {
    toast('✓ ' + total + ' actividades programadas (solo local)');
  }
  pAlistSel = [];
  render();
}

/* ============================================================
   pRegPlaca — Programa instalación de placa
   ============================================================ */
function pRegPlaca() {
  var now = new Date();
  pMotos[pActive].steps['placa_programada'] = now.toISOString();
  sv(SK_P, pMotos);

  if (typeof supabaseReady === 'function' && supabaseReady() && typeof apiRegAlistCrear === 'function') {
    apiRegAlistCrear(pActive, ['Instalación Placa'])
      .then(function() {
        toast('✓ Placa programada en Supabase');
      })
      .catch(function(e) {
        toast('Error al programar placa: ' + (e.message || 'desconocido'), 1);
      });
  } else {
    toast('✓ Placa programada (solo local)');
  }
  render();
}

/* ============================================================
   pCheckStep — Marca step como ejecutado
   ============================================================
   MIGRACIÓN JUN 2026: usa step.actNum directo (sin TRAM_ACT_NUM_MAP)
   y envía a Supabase (supabaseReady) en lugar de SharePoint.
   ============================================================ */
function pCheckStep(dayNum, stepIdx) {
  var md = pMotos[pActive];
  if (!md.checks) md.checks = {};
  var key = dayNum + '_' + stepIdx;
  if (md.checks[key]) return;
  var day = DAYS.find(function(d) { return d.day === dayNum; });
  if (!day) return;
  var step = day.steps[stepIdx];
  if (!step) return;

  // ── BLOQUEO GLOBAL: si el step tiene actNum, verificar que todas las
  // actividades anteriores del catálogo (por orden) estén registradas ──
  if (step.actNum && typeof ACTIVIDADES_TRAM !== 'undefined') {
    var actActual = ACTIVIDADES_TRAM.find(function(a) { return a.num === String(step.actNum); });
    if (actActual) {
      var ordenActual = actActual.orden;

      // Construir set de actNums ya ejecutados (según checks locales)
      var ejecutados = {};
      DAYS.forEach(function(d) {
        d.steps.forEach(function(s, si) {
          if (s.actNum && md.checks[d.day + '_' + si]) {
            ejecutados[s.actNum] = true;
          }
        });
      });

      // Buscar la primera actividad anterior (por orden) NO ejecutada
      var pendiente = null;
      for (var i = 0; i < ACTIVIDADES_TRAM.length; i++) {
        var a = ACTIVIDADES_TRAM[i];
        if (a.orden < ordenActual && !ejecutados[parseInt(a.num, 10)]) {
          pendiente = a;
          break;
        }
      }

      if (pendiente) {
        toast('⚠️ Esperando "' + pendiente.titulo + '" (' + pendiente.responsable + ')', 1);
        return;
      }
    }
  }

  // ── Bloqueo LOCAL (dentro del área del usuario, comportamiento previo) ──
  var areaSteps = pUserArea ? day.steps.filter(function(s) { return s.c === pUserArea; }) : day.steps;
  for (var i = 0; i < areaSteps.length; i++) {
    var oi = day.steps.indexOf(areaSteps[i]);
    var pk = dayNum + '_' + oi;
    if (oi === stepIdx) break;
    if (!md.checks[pk]) { toast('Completa el paso anterior primero', 1); return; }
  }

  md.checks[key] = new Date().toISOString();
  sv(SK_P, pMotos);
  render();

  // Enviar a Supabase (registro_actividades)
  var actNum = step.actNum || null;
  if (actNum && typeof supabaseReady === 'function' && supabaseReady()) {
    apiAvanceEscribir({
      codigo_barras: pActive,
      actividad_num: actNum
    }).catch(function() {
      // Falla silenciosa
    });
  }
}

/* ============================================================
   Helpers UI
   ============================================================ */
function pToggleDay(d) {
  pOpenDays[d] = !pOpenDays[d];
  render();
}

function pToggleAll() {
  var days = DAYS.map(function(d) { return d.day; });
  var allOpen = days.every(function(d) { return pOpenDays[d]; });
  days.forEach(function(d) { pOpenDays[d] = !allOpen; });
  render();
}
