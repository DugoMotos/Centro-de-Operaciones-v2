/* ============================================================
   DATA.JS — Datos estáticos y constantes del aplicativo
   ============================================================
   Contiene:
   - AREAS: definición de áreas de trabajo
   - DAYS: definición del procedimiento por días y pasos
   - TRAM_STEPS: pasos legacy de Trámites (compat con módulo Servicio Técnico)
   - ACTIVIDADES_TRAM: catálogo local de actividades manuales
                       (sincronizado con Supabase catalogo_actividades)
   - TOTAL_TRAM: cantidad de actividades manuales activas (para % avance)

   ============================================================
   MIGRACIÓN A CATÁLOGO SUPABASE (junio 2026):
   - Los steps de DAYS de tipo 'reg' tienen ahora una propiedad actNum
     que apunta directamente al catalogo_actividades.actividad_num de Supabase.
   - Se eliminó TRAM_ACT_NUM_MAP: la fuente única del mapeo es el actNum
     inline en cada step de DAYS.
   - ACTIVIDADES_TRAM tiene un campo `orden` que permite reordenar sin
     cambiar `num` (identificador estable).
   - IMPORTANTE: si agregás actividades en Supabase, actualizá también
     ACTIVIDADES_TRAM y los actNum de DAYS.
   ============================================================ */

/* ============================================================
   ÁREAS
   ============================================================ */
var AREAS = [
  { key: 'ven', label: 'Ventas',         icon: '🛒' },
  { key: 'con', label: 'Contabilidad',   icon: '💰' },
  { key: 'tra', label: 'Trámites',       icon: '📋' },
  { key: 'log', label: 'Logística',      icon: '🚚' },
  { key: 'inv', label: 'Inventario',     icon: '📦' }
];

/* ============================================================
   DAYS — Procedimiento del proceso de venta (día por día)
   ============================================================
   Cada día tiene un array de steps. Cada step:
   - t: título mostrado al usuario
   - c: área responsable (tra, con, log, inv, ven)
   - tp: tipo: 'reg' (registrable checkbox), 'nota', 'gate', 'toggle', etc.
   - actNum (NUEVO): apunta a Supabase catalogo_actividades.actividad_num
                     Si el step tiene actNum, al marcarlo se registra en la BD.
                     Si NO tiene actNum, es solo informativo local.
   - naOption, gate, y otras props: propiedades adicionales opcionales
   ============================================================ */
var DAYS = [
  // ────────────────────────────────────────────────────
  // DÍA 1
  // ────────────────────────────────────────────────────
  {
    day: 1,
    title: 'Prospecto y decisión',
    steps: [
      { t: 'Registrar información en Excel CRM',      c: 'ven', tp: 'reg' },
      { t: 'Prospectar cliente para venta',           c: 'ven', tp: 'reg' },
      { t: 'Registrar cotización motocicleta',        c: 'ven', tp: 'reg' },
      { t: 'Confirmar decisión de compra',            c: 'ven', tp: 'reg' },
      { t: 'Verificar disponibilidad de inventario',  c: 'con', tp: 'reg' },
      { t: 'Generar documentos legales',              c: 'con', tp: 'reg' }
    ]
  },

  // ────────────────────────────────────────────────────
  // DÍA 2
  // ────────────────────────────────────────────────────
  {
    day: 2,
    title: 'Documentación y pago',
    steps: [
      { t: 'Solicitar documentos del cliente',        c: 'ven', tp: 'reg' },
      { t: 'Verificar formas de pago',                c: 'ven', tp: 'reg' },
      { t: 'Confirmar recepción de pago',             c: 'con', tp: 'reg' },
      { t: 'Validar documentos legales',              c: 'con', tp: 'reg' }
    ]
  },

  // ────────────────────────────────────────────────────
  // DÍA 3 — Inicio del proceso operativo (Trámites)
  // ────────────────────────────────────────────────────
  {
    day: 3,
    title: 'Inicio de trámites',
    steps: [
      { t: 'Adjuntar improntas en manifiesto',        c: 'tra', tp: 'reg', actNum: 1 }
    ]
  },

  // ────────────────────────────────────────────────────
  // DÍA 4 — Documentación y placa
  // ────────────────────────────────────────────────────
  {
    day: 4,
    title: 'Documentación de matrícula',
    steps: [
      { t: 'Verificar ítems del pedido',              c: 'tra', tp: 'reg', actNum: 2 },
      { t: 'Programar alistamientos',                 c: 'tra', tp: 'reg', actNum: 3 },
      { t: 'Asignar manifiesto',                      c: 'tra', tp: 'reg', actNum: 4 },
      { t: 'Solicitar preasignación de placa',        c: 'tra', tp: 'reg', actNum: 6 },
      { t: 'Confirmar placa',                         c: 'tra', tp: 'reg', actNum: 8 },
      { t: 'Validar cotización DataPro',              c: 'tra', tp: 'reg', actNum: 40, naOption: 1 },
      { t: 'Plan de marca',                           c: 'tra', tp: 'reg', actNum: 10 },
      { t: 'Solicitar factura de venta',              c: 'tra', tp: 'reg', actNum: 11 },
      { t: 'Facturar motocicleta',                    c: 'con', tp: 'reg', actNum: 12 },
      { t: 'Verificar plan de marca en factura',      c: 'tra', tp: 'reg', actNum: 15 },
      { t: 'Solicitar SOAT',                          c: 'tra', tp: 'reg', actNum: 16 },
      { t: 'Organizar paquete de venta',              c: 'tra', tp: 'reg', actNum: 18 },
      { t: 'Entregar paquetes para matricular',       c: 'log', tp: 'reg', actNum: 19 }
    ]
  },

  // ────────────────────────────────────────────────────
  // DÍA 5 — Matrícula y comunicaciones
  // ────────────────────────────────────────────────────
  {
    day: 5,
    title: 'Matrícula y SOAT',
    steps: [
      { t: 'Verificar activación SOAT',               c: 'tra', tp: 'reg', actNum: 21 },
      { t: 'Imprimir SOAT',                           c: 'tra', tp: 'reg', actNum: 23 },
      { t: 'Incluir SOAT en paquete de venta',        c: 'tra', tp: 'reg', actNum: 24 },
      { t: 'Informar cliente SOAT OK [1]',            c: 'tra', tp: 'reg', actNum: 25 },
      { t: 'Verificar matrícula en RUNT',             c: 'tra', tp: 'reg', actNum: 26 },
      { t: 'Revisar avance alistamientos',            c: 'tra', tp: 'reg', actNum: 29 },
      { t: 'Recibir matrícula y placa',               c: 'tra', tp: 'reg', actNum: 30 },
      { t: 'Activar garantía',                        c: 'tra', tp: 'reg', actNum: 28 },
      { t: 'Programar instalación de placa',          c: 'tra', tp: 'reg', actNum: 32 },
      { t: 'Informar cliente matrícula OK [2]',       c: 'tra', tp: 'reg', actNum: 33 }
    ]
  },

  // ────────────────────────────────────────────────────
  // DÍA 6 — Cierre y entrega
  // ────────────────────────────────────────────────────
  {
    day: 6,
    title: 'Entrega al cliente',
    steps: [
      { t: 'Verificar alistamientos completos',       c: 'tra', tp: 'reg', actNum: 34, gate: 1 },
      { t: 'Informar asesores de crédito',            c: 'tra', tp: 'reg', actNum: 35 },
      { t: 'Programar entrega',                       c: 'tra', tp: 'reg', actNum: 36 },
      { t: 'Informar cliente moto OK [3]',            c: 'tra', tp: 'reg', actNum: 37 }
    ]
  }
];

/* ============================================================
   TRAM_STEPS — legacy para el módulo Servicio Técnico
   ============================================================
   Se mantiene por compatibilidad. Si en el futuro Servicio Técnico
   también consume Supabase, se refactoriza a usar actNum.
   ============================================================ */
var TRAM_STEPS = [
  { t: 'Adjuntar improntas en manifiesto' },
  { t: 'Verificar ítems del pedido' },
  { t: 'Programar alistamientos' },
  { t: 'Asignar manifiesto' },
  { t: 'Solicitar preasignación de placa' },
  { t: 'Confirmar placa' },
  { t: 'Validar cotización DataPro' },
  { t: 'Plan de marca' },
  { t: 'Solicitar factura de venta' },
  { t: 'Verificar plan de marca en factura' },
  { t: 'Solicitar SOAT' },
  { t: 'Organizar paquete de venta' },
  { t: 'Entregar paquetes para matricular' },
  { t: 'Verificar activación SOAT' },
  { t: 'Imprimir SOAT' },
  { t: 'Incluir SOAT en paquete de venta' },
  { t: 'Informar cliente SOAT OK [1]' },
  { t: 'Verificar matrícula en RUNT' },
  { t: 'Revisar avance alistamientos' },
  { t: 'Recibir matrícula y placa' },
  { t: 'Activar garantía' },
  { t: 'Programar instalación de placa' },
  { t: 'Informar cliente matrícula OK [2]' },
  { t: 'Verificar alistamientos completos' },
  { t: 'Informar asesores de crédito' },
  { t: 'Programar entrega' },
  { t: 'Informar cliente moto OK [3]' }
];

/* ============================================================
   ACTIVIDADES_TRAM — Catálogo local de actividades manuales
   ============================================================
   Sincronizado con Supabase catalogo_actividades WHERE tipo='manual' AND activa=true
   Ordenado por el campo `orden` (mismo criterio que Supabase).

   Estructura:
   - num: identificador ESTABLE (nunca cambia). PK en Supabase.
   - orden: posición visual (se puede cambiar libremente).
   - titulo: nombre canónico de la actividad.
   - responsable: área responsable.

   FASE FUTURA: reemplazar por carga dinámica con apiCatalogoConsultar()
   ============================================================ */
var ACTIVIDADES_TRAM = [
  { num: 1,  orden: 10,  titulo: 'Adjuntar improntas al manifiesto',       responsable: 'Trámites' },
  { num: 2,  orden: 20,  titulo: 'Revisar ítems del pedido',               responsable: 'Trámites' },
  { num: 3,  orden: 30,  titulo: 'Programar alistamientos',                responsable: 'Trámites' },
  { num: 4,  orden: 40,  titulo: 'Asignar manifiesto',                     responsable: 'Trámites' },
  { num: 6,  orden: 60,  titulo: 'Solicitar preasignación de placa',       responsable: 'Trámites' },
  { num: 8,  orden: 80,  titulo: 'Confirmar placa',                        responsable: 'Trámites' },
  { num: 40, orden: 85,  titulo: 'Validar cotización DataPro',             responsable: 'Trámites' },
  { num: 10, orden: 100, titulo: 'Consignar plan de marca',                responsable: 'Trámites' },
  { num: 11, orden: 110, titulo: 'Solicitar factura de venta',             responsable: 'Trámites' },
  { num: 12, orden: 120, titulo: 'Facturar motocicleta',                   responsable: 'Contabilidad' },
  { num: 15, orden: 150, titulo: 'Revisar plan de marca en factura',       responsable: 'Trámites' },
  { num: 16, orden: 160, titulo: 'Solicitar SOAT',                         responsable: 'Trámites' },
  { num: 18, orden: 180, titulo: 'Organizar paquete para matricular',      responsable: 'Trámites' },
  { num: 19, orden: 190, titulo: 'Entregar paquetes al tránsito',          responsable: 'Logística' },
  { num: 21, orden: 210, titulo: 'Verificar activación de SOAT',           responsable: 'Trámites' },
  { num: 23, orden: 230, titulo: 'Imprimir SOAT',                          responsable: 'Trámites' },
  { num: 24, orden: 240, titulo: 'Incluir SOAT en el paquete',             responsable: 'Trámites' },
  { num: 25, orden: 250, titulo: '[1] Informar cliente SOAT OK',           responsable: 'Trámites' },
  { num: 26, orden: 260, titulo: 'Verificar matrícula en RUNT',            responsable: 'Trámites' },
  { num: 28, orden: 280, titulo: 'Activar garantía',                       responsable: 'Trámites' },
  { num: 29, orden: 290, titulo: 'Revisar avance de alistamientos',        responsable: 'Trámites' },
  { num: 30, orden: 300, titulo: 'Recibir matrícula y placa',              responsable: 'Trámites' },
  { num: 32, orden: 320, titulo: 'Programar instalación de placa',         responsable: 'Trámites' },
  { num: 33, orden: 330, titulo: '[2] Informar cliente matrícula OK',      responsable: 'Trámites' },
  { num: 34, orden: 340, titulo: 'Revisar avance final de alistamientos',  responsable: 'Trámites' },
  { num: 35, orden: 350, titulo: 'Informar asesores de crédito',           responsable: 'Trámites' },
  { num: 36, orden: 360, titulo: 'Programar entrega',                      responsable: 'Trámites' },
  { num: 37, orden: 370, titulo: '[3] Informar cliente moto OK',           responsable: 'Trámites' },
  { num: 38, orden: 380, titulo: 'Confirmar entrega',                      responsable: 'Trámites' }
];

/* Total de actividades manuales para el cálculo de % avance.
   Es dinámico: refleja el largo actual de ACTIVIDADES_TRAM. */
var TOTAL_TRAM = ACTIVIDADES_TRAM.length;

/* ============================================================
   Helper: obtener título por actNum desde ACTIVIDADES_TRAM
   ============================================================
   Uso desde módulos:
     var titulo = getTituloActividad(25);  // → '[1] Informar cliente SOAT OK'
   ============================================================ */
function getTituloActividad(actNum) {
  var found = ACTIVIDADES_TRAM.find(function(a) { return a.num === actNum; });
  return found ? found.titulo : '';
}
