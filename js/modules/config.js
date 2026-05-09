/* ============================================================
   CONFIG.JS (modules) — Módulo Configuración
   ============================================================
   Funciones expuestas:
   - renderConfig(): genera el HTML de configuración
   - cfgCheckPin(): valida el PIN administrador

   Estado: cfgAdmin, cfgPinInput, urlOverrides, adminPin
   ============================================================ */

function renderConfig() {
  if (!cfgAdmin) {
    if (!adminPin) {
      return '<div style="text-align:center;padding:30px 20px">' +
        '<div style="font-size:36px;margin-bottom:12px">🔧</div>' +
        '<div style="font-size:14px;font-weight:700;margin-bottom:4px">Configuración administrador</div>' +
        '<div style="font-size:11px;color:var(--tm);margin-bottom:16px">Creá tu PIN de administrador</div>' +
        '<input type="password" inputmode="numeric" maxlength="6" class="inp" style="max-width:180px;margin:0 auto 12px;display:block;letter-spacing:8px" id="cfgPinIn" placeholder="••••" value="' + cfgPinInput + '" oninput="cfgPinInput=this.value" onkeydown="if(event.key===\'Enter\')cfgCheckPin()">' +
        '<button class="btn btn-p" style="max-width:180px;margin:0 auto" onclick="cfgCheckPin()">Crear PIN</button></div>';
    }
    return '<div style="text-align:center;padding:30px 20px">' +
      '<div style="font-size:36px;margin-bottom:12px">🔒</div>' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:4px">Configuración administrador</div>' +
      '<div style="font-size:11px;color:var(--tm);margin-bottom:16px">Solo el administrador puede modificar la configuración</div>' +
      '<input type="password" inputmode="numeric" maxlength="6" class="inp" style="max-width:180px;margin:0 auto 12px;display:block;letter-spacing:8px" id="cfgPinIn" placeholder="••••" value="' + cfgPinInput + '" oninput="cfgPinInput=this.value" onkeydown="if(event.key===\'Enter\')cfgCheckPin()">' +
      '<button class="btn btn-p" style="max-width:180px;margin:0 auto" onclick="cfgCheckPin()">Ingresar</button></div>';
  }

  var h = '<div class="eyebrow">SISTEMA</div><h1 class="h1">Configuración</h1>' +
    '<div class="sub-title">Conexiones de Power Automate por módulo</div>';
  h += '<div class="flex fxc fxb" style="margin-bottom:18px"><div></div>' +
    '<button style="font-size:10px;color:var(--rd);background:rgba(226,75,74,0.08);border:0.5px solid var(--rd);border-radius:5px;padding:5px 10px;cursor:pointer" onclick="cfgAdmin=false;cfgPinInput=\'\';render()">🔒 Cerrar sesión</button></div>';

  var sections = [
    {
      title: '📋 Procedimiento — BD Trámites',
      desc: 'Consulta y escritura de fechas en BD_Tramites.xlsx',
      items: [
        { key: 'tramC', label: 'Consulta', desc: 'Busca por código de barras → trae datos de la moto' },
        { key: 'tramW', label: 'Escritura', desc: 'Registra fechas en columnas de BD_Tramites' }
      ]
    },
    {
      title: '📋 Procedimiento — Lista SharePoint Registro_Actividades',
      desc: 'Lectura y escritura de actividades ejecutadas',
      items: [
        { key: 'tramAvance', label: 'Consulta', desc: 'Lee todas las actividades registradas en la lista' },
        { key: 'tramEscrAct', label: 'Escritura', desc: 'Registra una actividad ejecutada en la lista' },
        { key: 'tramLista', label: 'Lista motos', desc: 'Lee todas las motos de BD_Tramites' }
      ]
    },
    {
      title: '📋 Procedimiento — Plan de alistamientos',
      desc: 'Programación de actividades desde el procedimiento',
      items: [
        { key: 'planW', label: 'Escritura', desc: 'Crea filas en BD_Plan' }
      ]
    },
    {
      title: '⚙ Servicio Técnico',
      desc: 'Consulta y registro de ejecución de actividades',
      items: [
        { key: 'alistC', label: 'Consulta', desc: 'Busca por chasis → trae actividades programadas' },
        { key: 'alistW', label: 'Escritura', desc: 'Actualiza estado y responsable de la actividad' }
      ]
    },
    {
      title: '📊 Plan',
      desc: 'Vista completa de la tabla BD_Plan',
      items: [
        { key: 'planC', label: 'Consulta', desc: 'Trae todas las filas de BD_Plan' }
      ]
    },
    {
      title: '🏍 Inventario',
      desc: 'Escritura en BD_Inventario_Dugomotos',
      items: [
        { key: 'invEscrPlaca', label: 'Escr. placa', desc: 'Escribe placa en BD_Inventario' }
      ]
    },
    {
      title: '📋 Procedimiento — BD Caja (pendiente)',
      desc: 'Registro de pedidos de venta',
      items: [
        { key: 'cajaC', label: 'Consulta', desc: 'Pendiente de crear' },
        { key: 'cajaW', label: 'Escritura', desc: 'Pendiente de crear' }
      ]
    },
    {
      title: '📋 Procedimiento — BD Contabilidad (pendiente)',
      desc: 'Facturación y recobros',
      items: [
        { key: 'contC', label: 'Consulta', desc: 'Pendiente de crear' },
        { key: 'contW', label: 'Escritura', desc: 'Pendiente de crear' }
      ]
    }
  ];

  sections.forEach(function(sec) {
    h += '<div style="margin-bottom:16px;padding:12px;background:var(--sf);border-radius:8px;border:.5px solid var(--bd)">';
    h += '<div style="font-size:12px;font-weight:700;margin-bottom:2px">' + sec.title + '</div>';
    h += '<div style="font-size:10px;color:var(--tm);margin-bottom:8px">' + sec.desc + '</div>';
    sec.items.forEach(function(item) {
      var cur = getUrl(item.key);
      var hasUrl = !!cur;
      h += '<div style="margin-bottom:8px">';
      h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
        '<div style="width:6px;height:6px;border-radius:50%;background:' + (hasUrl ? 'var(--gn)' : 'var(--rd)') + '"></div>' +
        '<span style="font-size:10px;font-weight:700">' + (item.label === 'Consulta' ? '🔍' : '✏️') + ' ' + item.label + '</span>' +
        '<span style="font-size:9px;color:var(--tm)">' + item.desc + '</span></div>';
      h += '<input class="inp inp-sm" style="font-family:var(--fm);font-size:9px" value="' + (urlOverrides[item.key] || '') + '" placeholder="' + (hasUrl ? '✓ URL por defecto configurada' : 'URL pendiente...') + '" oninput="urlOverrides.' + item.key + '=this.value">';
      h += '</div>';
    });
    h += '</div>';
  });

  h += '<button class="btn btn-p" style="margin-bottom:8px" onclick="sv(SK_OVR,urlOverrides);toast(\'✓ URLs guardadas\')">Guardar cambios</button>';
  h += '<div style="font-size:9px;color:var(--tm);padding:8px;background:var(--sf);border-radius:6px;margin-bottom:12px">Los campos vacíos usan las URLs por defecto incrustadas en el app. Solo necesitás llenar un campo si querés reemplazar una URL.</div>';

  h += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)">' +
    '<div style="font-size:12px;font-weight:700;margin-bottom:8px">Cambiar PIN</div>' +
    '<input type="password" inputmode="numeric" maxlength="6" class="inp" style="max-width:180px;letter-spacing:8px;margin-bottom:8px" id="cfgNewPin" placeholder="Nuevo PIN">' +
    '<button class="btn btn-o" onclick="var v=document.getElementById(\'cfgNewPin\').value.trim();if(!v||v.length<4){toast(\'Mínimo 4 dígitos\',1);return}adminPin=v;sv(SK_PIN,adminPin);toast(\'✓ PIN actualizado\')">Actualizar PIN</button></div>';

  h += '<div style="margin-top:16px;padding:12px;background:var(--rdl);border-radius:8px;border:1px solid var(--rd)">' +
    '<div style="font-size:11px;font-weight:700;color:var(--rdd);margin-bottom:6px">⚠️ Modo pruebas (temporal)</div>' +
    '<div style="font-size:10px;color:var(--rdd);margin-bottom:8px">Reinicia TODA la memoria local del app.</div>' +
    '<button class="btn btn-d" onclick="if(confirm(\'¿REINICIAR TODO?\')){localStorage.removeItem(SK_A);localStorage.removeItem(SK_P);localStorage.removeItem(SK_OVR);localStorage.removeItem(SK_PIN);toast(\'Reiniciado\');setTimeout(function(){location.reload()},500)}">Reiniciar TODO</button></div>';

  return h;
}

function cfgCheckPin() {
  var v = cfgPinInput.trim();
  if (!v || v.length < 4) { toast('PIN mínimo 4 dígitos', 1); return; }
  if (!adminPin) {
    adminPin = v;
    sv(SK_PIN, adminPin);
    cfgAdmin = true;
    cfgPinInput = '';
    toast('✓ PIN creado');
    render();
    return;
  }
  if (v === adminPin) {
    cfgAdmin = true;
    cfgPinInput = '';
    toast('✓ Acceso concedido');
    render();
  } else {
    toast('PIN incorrecto', 1);
    cfgPinInput = '';
    render();
  }
}
