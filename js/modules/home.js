/* ============================================================
   HOME.JS — Pantalla de inicio del aplicativo
   ============================================================
   Funciones expuestas:
   - renderHome(): genera el HTML del dashboard de inicio
   - homeSync(): carga datos frescos para el home

   Estado: variables home* en state.js
   Consume datos ya cargados por otros módulos:
   - negMotos, negAvances (Negocios)
   - planData (Plan)
   ============================================================ */

/* ============================================================
   Helpers internos
   ============================================================ */
function homeSaludo() {
  var h = new Date().getHours();
  if (h < 12) return { icon: '☀', text: 'Buenos días' };
  if (h < 19) return { icon: '🌤', text: 'Buenas tardes' };
  return { icon: '🌙', text: 'Buenas noches' };
}

function homeFmtHoraCorta(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  } catch (e) { return ''; }
}

function homeInitials(nombre) {
  if (!nombre) return '?';
  var partes = nombre.trim().split(' ');
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function homeAvatarColor(nombre) {
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
   renderHome — HTML principal
   ============================================================ */
function renderHome() {
  var saludo = homeSaludo();
  var nombreUsuario = 'Juan Esteban'; // TODO: sacar de sesión cuando exista login

  // ─── Cálculo de KPIs desde datos existentes ──────────────
  var motosActivas = negMotos ? negMotos.length : null;
  var alistPendientesHoy = null;
  var alistEjecutadosHoy = null;

  if (planData && Array.isArray(planData)) {
    var hoyStr = new Date().toISOString().substring(0, 10);
    var actividadesHoy = planData.filter(function(r) {
      var f = r.fecha || '';
      if (f.indexOf('/') >= 0) {
        var p = f.split('/');
        f = p[2] + '-' + p[1] + '-' + p[0];
      } else {
        // Serial de Excel o ISO
        try {
          var d = new Date(f);
          if (!isNaN(d.getTime())) f = d.toISOString().substring(0, 10);
        } catch (e) {}
      }
      return f === hoyStr;
    });
    alistPendientesHoy = actividadesHoy.filter(function(r) {
      var e = (r.estado || '').toLowerCase();
      return e !== 'ejecutada' && e !== 'ejecutado';
    }).length;
    alistEjecutadosHoy = actividadesHoy.length - alistPendientesHoy;
  }

  // Días promedio (sobre motos activas)
  var diasPromedio = null;
  if (negMotos && negMotos.length) {
    var total = 0, count = 0;
    negMotos.forEach(function(m) {
      var d = negDiasDesde(m.fecha_venta || m.FechaVenta || m.fechaVenta);
      if (d > 0) { total += d; count++; }
    });
    if (count) diasPromedio = Math.round(total / count);
  }

  // ─── Alertas: motos con muchos días ──────────────────────
  var alertas = [];
  if (negMotos && negAvances) {
    var scopeActs = negGetScopeActs();
    negMotos.forEach(function(m) {
      var code = m.codigo_barras || m.Title || '';
      if (!code) return;
      var dias = negDiasDesde(m.fecha_venta || m.FechaVenta);
      if (dias < 30) return; // solo motos de más de 30 días

      // Buscar actividad en curso
      var ejecutadas = (negAvances || []).filter(function(r) {
        return (r.codigo_barras || r.Title || '') === code &&
               (r.estado || '').toLowerCase() === 'ejecutada';
      });
      var ejecutadasSet = {};
      ejecutadas.forEach(function(r) {
        var n = String(r.actividad_num || '');
        if (n && n.indexOf('.') < 0) ejecutadasSet[parseInt(n, 10)] = true;
      });
      var enCurso = negFirstPending(ejecutadasSet);

      alertas.push({
        code: code,
        dias: dias,
        desc: enCurso ? enCurso.titulo : 'Sin actividad en curso',
        area: enCurso ? enCurso.responsable : '—'
      });
    });
    alertas.sort(function(a, b) { return b.dias - a.dias; });
    alertas = alertas.slice(0, 5);
  }

  // ─── Actividad reciente ──────────────────────────────────
  var actividadReciente = [];
  if (negAvances && Array.isArray(negAvances)) {
    var recientes = negAvances.slice().filter(function(r) {
      return r.created_at && (r.estado || '').toLowerCase() === 'ejecutada';
    });
    recientes.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    recientes = recientes.slice(0, 5);
    recientes.forEach(function(r) {
      var actNum = parseInt(r.actividad_num, 10);
      var actInfo = (ACTIVIDADES_TRAM || []).find(function(a) { return parseInt(a.num, 10) === actNum; });
      actividadReciente.push({
        code: r.codigo_barras || r.Title || '',
        quien: r.ejecuto || r.responsable || 'Alguien',
        que: actInfo ? actInfo.titulo : 'una actividad',
        cuando: homeFmtHoraCorta(r.created_at)
      });
    });
  }

  // ─── HTML ────────────────────────────────────────────────
  var h = '';

  // Saludo
  h += '<div class="home-hello">' + saludo.icon + ' ' + saludo.text + '</div>';
  h += '<div class="home-title">' + saludo.text + ', ' + nombreUsuario + '</div>';
  h += '<div class="home-sub">';
  var hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
  h += hoy.charAt(0).toUpperCase() + hoy.slice(1);
  if (alistPendientesHoy !== null) {
    h += ' · Hoy hay <strong style="color:#eae9e5">' + (alistPendientesHoy + (alistEjecutadosHoy || 0)) + '</strong> actividades programadas';
  }
  if (alertas.length) {
    h += ' y <strong style="color:#F5C572">' + alertas.length + '</strong> motos requieren atención';
  }
  h += '</div>';

  // ─── KPIs ────────────────────────────────────────────────
  h += '<div class="home-kpis">';
  h += '<div class="home-kpi">' +
    '<div class="home-kpi-label">Motos activas</div>' +
    '<div class="home-kpi-value">' + (motosActivas !== null ? motosActivas : '—') + '</div>' +
    '<div class="home-kpi-sub">' +
    (motosActivas !== null ? '<span>En curso</span>' : '<span style="color:#6a6a6a">Sin datos cargados</span>') +
    '</div></div>';

  h += '<div class="home-kpi">' +
    '<div class="home-kpi-label">Días promedio</div>' +
    '<div class="home-kpi-value">' + (diasPromedio !== null ? diasPromedio : '—') + '</div>' +
    '<div class="home-kpi-sub">' +
    (diasPromedio !== null ? '<span>En proceso</span>' : '<span style="color:#6a6a6a">Sin datos</span>') +
    '</div></div>';

  var entregasMes = negAvances ? negAvances.filter(function(r) {
    var actNum = parseInt(r.actividad_num, 10);
    return actNum === 29 && (r.estado || '').toLowerCase() === 'ejecutada';
  }).length : null;
  h += '<div class="home-kpi">' +
    '<div class="home-kpi-label">Entregas del mes</div>' +
    '<div class="home-kpi-value">' + (entregasMes !== null ? entregasMes : '—') + '</div>' +
    '<div class="home-kpi-sub">' +
    (entregasMes !== null ? '<span>Cerradas</span>' : '<span style="color:#6a6a6a">Sin datos</span>') +
    '</div></div>';

  h += '<div class="home-kpi">' +
    '<div class="home-kpi-label">Alistamientos hoy</div>' +
    '<div class="home-kpi-value">' + (alistPendientesHoy !== null ? (alistPendientesHoy + (alistEjecutadosHoy || 0)) : '—') + '</div>' +
    '<div class="home-kpi-sub">';
  if (alistPendientesHoy !== null) {
    h += '<span style="color:#6EDA92">✓ ' + (alistEjecutadosHoy || 0) + ' ejecutados</span>';
    h += '<span> · ' + alistPendientesHoy + ' pendientes</span>';
  } else {
    h += '<span style="color:#6a6a6a">Sin datos</span>';
  }
  h += '</div></div>';
  h += '</div>';

  // ─── Accesos rápidos ─────────────────────────────────────
  h += '<div class="home-section-label">Accesos rápidos</div>';
  h += '<div class="home-quick-grid">';
  h += '<div class="home-quick" onclick="setMain(\'proc\')">' +
    '<div class="home-quick-icon new">＋</div>' +
    '<div><div class="home-quick-label">Nuevo negocio</div>' +
    '<div class="home-quick-hint">Registrar venta</div></div>' +
    '</div>';
  h += '<div class="home-quick" onclick="setMain(\'alist\')">' +
    '<div class="home-quick-icon search">🔍</div>' +
    '<div><div class="home-quick-label">Buscar moto</div>' +
    '<div class="home-quick-hint">Por chasis</div></div>' +
    '</div>';
  h += '<div class="home-quick" onclick="setMain(\'alist\')">' +
    '<div class="home-quick-icon register">✓</div>' +
    '<div><div class="home-quick-label">Registrar alistamiento</div>' +
    '<div class="home-quick-hint">Servicio técnico</div></div>' +
    '</div>';
  h += '<div class="home-quick" onclick="setMain(\'plan\')">' +
    '<div class="home-quick-icon print">🖨</div>' +
    '<div><div class="home-quick-label">Ver planilla del día</div>' +
    '<div class="home-quick-hint">Plan de trabajo</div></div>' +
    '</div>';
  h += '</div>';

  // ─── Grid inferior: Alertas + Actividad ─────────────────
  h += '<div class="home-lower">';

  // Panel Alertas
  h += '<div class="home-panel">';
  h += '<div class="home-panel-head">';
  h += '<div class="home-panel-title"><span style="color:#F5C572">⚠</span> Necesitan atención';
  h += '<span class="home-panel-count">' + alertas.length + '</span>';
  h += '</div>';
  h += '<a class="home-panel-link" onclick="setMain(\'negocios\')">Ver todas →</a>';
  h += '</div>';
  if (alertas.length) {
    alertas.forEach(function(a) {
      var isCritical = a.dias >= 60;
      h += '<div class="home-alert" onclick="setMain(\'negocios\')">';
      h += '<div class="home-alert-dot' + (isCritical ? ' critical' : '') + '"></div>';
      h += '<div class="home-alert-code">' + esc(a.code) + '</div>';
      h += '<div class="home-alert-desc">' + esc(a.desc) + '</div>';
      h += '<div class="home-alert-days' + (isCritical ? ' critical' : '') + '">' + a.dias + 'd</div>';
      h += '</div>';
    });
  } else {
    h += '<div class="home-empty">' +
      (negMotos ? '✓ Sin motos que requieran atención' : 'Cargá negocios para ver alertas') +
      '</div>';
  }
  h += '</div>';

  // Panel Actividad reciente
  h += '<div class="home-panel">';
  h += '<div class="home-panel-head">';
  h += '<div class="home-panel-title"><span style="color:#B7BEEF">⏱</span> Actividad reciente</div>';
  h += '<a class="home-panel-link" onclick="setMain(\'negocios\')">Ver todo →</a>';
  h += '</div>';
  if (actividadReciente.length) {
    actividadReciente.forEach(function(a) {
      h += '<div class="home-activity">';
      h += '<div class="home-activity-avatar" style="background:' + homeAvatarColor(a.quien) + '">' + esc(homeInitials(a.quien)) + '</div>';
      h += '<div class="home-activity-desc">';
      h += '<strong>' + esc(a.quien) + '</strong> completó "' + esc(a.que) + '" en <span class="home-activity-code">' + esc(a.code) + '</span>';
      h += '</div>';
      h += '<div class="home-activity-time">' + a.cuando + '</div>';
      h += '</div>';
    });
  } else {
    h += '<div class="home-empty">' +
      (negAvances ? 'Sin actividad reciente registrada' : 'Cargá negocios para ver actividad') +
      '</div>';
  }
  h += '</div>';

  h += '</div>';

  // Si no hay datos cargados, mostrar botón para cargar
  if (!negMotos) {
    h += '<div style="margin-top:24px;padding:16px;background:rgba(94,106,210,0.08);border:0.5px solid rgba(94,106,210,0.3);border-radius:8px;text-align:center">';
    h += '<div style="font-size:12px;color:#B7BEEF;margin-bottom:10px">Cargá los datos de negocios para ver los indicadores en vivo</div>';
    h += '<button class="btn btn-p" style="max-width:220px;margin:0 auto" onclick="setMain(\'negocios\');setTimeout(negSync,300)">Cargar negocios ahora</button>';
    h += '</div>';
  }

  return h;
}
