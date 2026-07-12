/* ============================================================
   DATA.JS — Catálogos y constantes del negocio
   ============================================================
   Datos estáticos que describen el procedimiento, las áreas,
   los responsables, las actividades. NO incluye estado mutable.
   ============================================================ */

/* ============================================================
   PREFIJOS DE CHASIS
   ============================================================ */
var PREFIXES = {
  H: 'Hunk',
  P: 'Xpulse',
  E: 'Eco',
  X: 'Xoom',
  A: 'ADXTG',
  C: 'Crox',
  T: 'NH Trazer',
  I: 'Ignitor'
};

/* ============================================================
   COLORES POR PROCESO DE ALISTAMIENTO
   ============================================================ */
var ACT_C = {
  alistamiento: '#34D399',
  marcacion: '#60A5FA',
  defensas: '#FB923C',
  placa: '#A78BFA',
  gps: '#22D3EE'
};

/* Helper: normaliza nombre de proceso a clave de ACT_C */
function actK(p) {
  return ({
    alistamiento: 'alistamiento',
    'marcación': 'marcacion',
    defensas: 'defensas',
    'instalación placa': 'placa',
    'instalación gps': 'gps'
  })[(p || '').toLowerCase()] || 'alistamiento';
}

/* ============================================================
   RESPONSABLES POR PROCESO Y MARCA
   ============================================================ */
var RESP_R = {
  'Alistamiento|HERO': ['Servicio Técnico'],
  'Alistamiento|SYM': ['Moto Working', 'Servicio Técnico'],
  'Marcación|HERO': ['Samuel Vásquez', 'Servicio Técnico', 'Gregorio Brito'],
  'Marcación|SYM': ['Samuel Vásquez', 'Servicio Técnico', 'Gregorio Brito'],
  'Defensas|HERO': ['Moto Working'],
  'Defensas|SYM': ['Moto Working'],
  'Instalación placa|HERO': ['Gregorio Brito'],
  'Instalación placa|SYM': ['Gregorio Brito'],
  'Instalación GPS|HERO': ['Externo GPS'],
  'Instalación GPS|SYM': ['Externo GPS']
};

var ALL_R = [
  'Samuel Vásquez',
  'Servicio Técnico',
  'Gregorio Brito',
  'Moto Working',
  'Externo GPS',
  'Externo Marcación',
  'Eder'
];

/* ============================================================
   ÁREAS DEL NEGOCIO
   ============================================================ */
var AREAS = {
  inv: { s: '#1D9E75', f: '#E1F5EE', l: 'Inventario' },
  con: { s: '#378ADD', f: '#E6F1FB', l: 'Contabilidad' },
  log: { s: '#D85A30', f: '#FAECE7', l: 'Logística' },
  tra: { s: '#E24B4A', f: '#FCEBEB', l: 'Trámites' },
  ven: { s: '#7F77DD', f: '#EEEDFE', l: 'Ventas / Caja' }
};

/* ============================================================
   PROCEDIMIENTO POR DÍAS
   ============================================================
   MIGRACIÓN JUN 2026: se agregó `actNum` a los steps que se
   registran en Supabase catalogo_actividades. Los steps sin
   `actNum` son solo informativos (no van a la BD).
   ============================================================ */
var DAYS = [
  {
    day: 1,
    title: 'Pedido',
    desc: 'Verificación de inventario, propuesta y creación de pedido en plataforma',
    steps: [
      { c: 'inv', t: 'Verificar inventario', d: 'Revisar el inventario actual aplicando las políticas de abastecimiento y clasificación ABC para identificar referencias con stock reducido o en cero.', act: 'Consultar tabla de inventario → Filtrar por políticas ABC', doc: 'BD Inventario / Excel', tp: 'exec' },
      { c: 'inv', t: 'Generar propuesta de pedido', d: 'Consolidar las referencias necesarias en una propuesta formal indicando cantidades y referencias.', act: 'Elaborar propuesta con referencias y cantidades', doc: 'BD Inventario / Excel', pre: 'Inventario revisado con faltantes identificados', tp: 'exec' },
      { c: 'inv', t: 'Solicitar aprobación de pedido', d: 'Enviar la propuesta a Gerencia para revisión y aprobación por cantidades y referencias.', act: 'Enviar propuesta a Gerencia → Esperar visto bueno', pre: 'Propuesta de pedido elaborada', gate: 1, gl: 'Gerencia debe aprobar antes de continuar', tp: 'val' },
      { c: 'inv', t: 'Crear pedido en DataPro', d: 'Con la aprobación obtenida, ingresar a DataPro para crear formalmente el pedido. Hero: carrito de compras. SYM: solicitar por WhatsApp al subdistribuidor.', act: 'DataPro → Crear pedido → Agregar referencias al carrito', pre: 'Aprobación de Gerencia obtenida', tp: 'exec' },
      { c: 'inv', t: 'Ingresar motos + fecha de pedido', d: 'Registrar las nuevas motocicletas en la base de datos de inventario incluyendo la fecha del pedido.', act: 'BD Inventario → Ingresar nuevas motos → Fecha de pedido', doc: 'BD Inventario / Excel', pre: 'Pedido creado en DataPro', tp: 'reg' }
    ]
  },
  {
    day: 2,
    title: 'Facturación',
    desc: 'Recepción de facturas de compra, registro de chasis y estimación de llegada',
    steps: [
      { c: 'con', t: 'Recibir factura de compra', d: 'Las marcas envían las facturas de compra por correo electrónico. Contabilidad las recibe y verifica.', act: 'Revisar correo → Descargar facturas de compra', pre: 'Pedido en etapa de facturación (Día 1)', tp: 'exec' },
      { c: 'con', t: 'Imprimir factura de compra', d: 'Imprimir las facturas recibidas y separarlas por motocicleta para distribución.', act: 'Imprimir facturas → Separar por moto', pre: 'Facturas recibidas por correo', tp: 'exec' },
      { c: 'con', t: 'Entregar facturas a trámites', d: 'Entregar las facturas impresas al área de trámites en la carpeta designada de facturas próximas en llegar.', act: 'Ubicar en carpeta de facturas → Entregar a trámites', doc: 'Carpeta de facturas / próximas en llegar', pre: 'Facturas impresas y separadas', tp: 'exec' },
      { c: 'inv', t: 'Ingresar # chasis al inventario', d: 'Cuando el pedido pasa a facturación, la marca comparte los números de chasis. Registrar cada chasis en la base de datos.', act: 'BD Inventario → Columna chasis → Ingresar número por moto', doc: 'BD Inventario / Excel', pre: 'Marca compartió números de chasis', tp: 'reg' },
      { c: 'inv', t: 'Ingresar fecha de facturación', d: 'Registrar la fecha de facturación de cada motocicleta en el inventario.', act: 'BD Inventario → Columna fecha facturación → Registrar', doc: 'BD Inventario / Excel', pre: 'Chasis registrados', tp: 'reg' },
      { c: 'inv', t: 'Estimar tiempo de llegada', d: 'Con base en la experiencia y tiempos del distribuidor, estimar cuándo llegarán las motocicletas.', act: 'Consultar historial → Estimar fecha → Registrar', doc: 'Archivo de llegada de motos', pre: 'Fecha de facturación registrada', tp: 'reg' }
    ]
  },
  {
    day: 3,
    title: 'Recepción',
    desc:
