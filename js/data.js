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
    desc: 'Llegada de motos, inspección visual, novedades, manifiestos e improntas',
    steps: [
      { c: 'log', t: 'Recibir motos en concesionario', d: 'Las motocicletas llegan físicamente. Logística las recibe y ubica en zona de recepción.', act: 'Recibir transportador → Verificar cantidad vs. guía de despacho', pre: 'Motos despachadas por la marca (Día 2)', tp: 'exec' },
      { c: 'log', t: 'Inspección visual de motocicletas', d: 'Inspección detallada de cada moto siguiendo el procedimiento de inspección establecido.', act: 'Seguir procedimiento → Inspeccionar cada moto → Documentar estado', doc: 'Procedimiento de inspección', pre: 'Motos recibidas en zona de recepción', tp: 'val' },
      { c: 'log', t: 'Consignar novedades', d: 'Registrar cualquier novedad encontrada durante la inspección en el archivo de garantías.', act: 'Archivo Garantías → Registrar novedades por moto', doc: 'Garantías recepción / Excel', pre: 'Inspección visual completada', tp: 'reg' },
      { c: 'log', t: 'Informar novedades en DataPro', d: 'Reportar las novedades por el enlace de DataPro para gestionar garantías con la marca.', act: 'DataPro → Enlace novedades → Reportar', pre: 'Novedades registradas en archivo', tp: 'exec' },
      { c: 'inv', t: 'Seguimiento a novedades', d: 'Desde inventario, monitorear el estado de las novedades y hacer seguimiento hasta resolución.', act: 'Revisar archivo Garantías → Dar seguimiento → Actualizar estado', doc: 'Garantías recepción / Excel', pre: 'Novedades reportadas en DataPro por logística', tp: 'exec' },
      { c: 'log', t: 'Entregar manifiestos a trámites', d: 'Entregar los documentos de manifiesto de cada moto (con certificado de gases) al área de trámites.', act: 'Organizar manifiestos por moto → Entregar a trámites', doc: 'Carpeta de manifiestos', pre: 'Motos recibidas e inspeccionadas', tp: 'exec' },
      { c: 'log', t: 'Obtener improntas de motos nuevas', d: 'Tomar las improntas de cada moto nueva de manera inmediata. Es requisito del tránsito para solicitar documentos.', act: 'Tomar improntas de cada moto nueva', pre: 'Motos recibidas en concesionario', tp: 'exec' },
      { c: 'log', t: 'Entregar improntas a trámites', d: 'Entregar las improntas obtenidas para que trámites las adjunte en los manifiestos.', act: 'Entregar improntas organizadas por moto a trámites', pre: 'Improntas tomadas de todas las motos', tp: 'exec' },
      { c: 'tra', t: 'Adjuntar improntas en manifiesto', d: 'Pegar las improntas de cada moto en su respectivo manifiesto. Requisito obligatorio del tránsito.', act: 'Pegar impronta en manifiesto correspondiente → Verificar', pre: 'Manifiestos e improntas recibidos de logística', tp: 'exec', actNum: 1 },
      { c: 'inv', t: 'Recepción de motos en DataPro', d: 'Descargar las motos de la bodega virtual del fabricante a la del concesionario. Solo aplica para Hero.', act: 'DataPro → Recepción → Descargar motos a bodega concesionario', pre: 'Motos recibidas e inspeccionadas', tp: 'exec' },
      { c: 'inv', t: 'Ingresar fecha de llegada', d: 'Registrar la fecha de llegada real de cada motocicleta en el inventario.', act: 'BD Inventario → Columna fecha llegada → Registrar', doc: 'BD Inventario / Excel', pre: 'Recepción completada en DataPro', tp: 'reg' }
    ]
  },
  {
    day: 4,
    title: 'Venta y trámites',
    desc: 'Pedido de venta, revisión de ítems, alistamientos, facturación, SOAT y matrícula',
    steps: [
      { c: 'ven', t: 'Realizar pedido de venta', d: 'El asesor comercial genera el pedido de venta una vez el cliente confirma la compra.', act: 'Asesor → Generar pedido de venta en sistema', pre: 'Moto disponible en inventario', tp: 'exec' },
      { c: 'ven', t: 'Cotización en DataPro', d: 'Cada asesor ingresa la cotización correspondiente en DataPro.', act: 'DataPro → Ingresar cotización por asesor', pre: 'Pedido de venta realizado', tp: 'exec' },
      { c: 'ven', t: 'Ingresar pedido de venta en Caja', d: 'El área de Caja registra el pedido de venta en su archivo de control.', act: 'FV Caja → Registrar pedido de venta', doc: 'FV Caja / Excel', pre: 'Cotización ingresada en DataPro', tp: 'reg' },
      { c: 'ven', t: 'Generar orden de caja', d: 'Crear la orden de caja formal para el pedido de venta.', act: 'Sistema de caja → Generar orden', pre: 'Pedido registrado en Caja', tp: 'exec' },
      { c: 'ven', t: 'Ingresar entidad financiera', d: 'Registrar la entidad financiera del cliente. Generar alerta para entidades que requieren aprobación antes de iniciar trámites.', act: 'Registrar entidad → Verificar si requiere aprobación → Esperar respuesta', pre: 'Orden de caja generada', gate: 1, gl: 'Entidades que requieren aprobación previa para matricular', tp: 'val' },
      { c: 'tra', t: 'Verificar ítems del pedido', d: 'Revisión completa: código de barras, número de chasis, cotización en DataPro, prenda, inscripción al RUNT, entidad financiera, alistamientos y obsequios.', act: 'Verificar todos los ítems del pedido', pre: 'Entidad financiera registrada y aprobación obtenida si aplica', gate: 1, gl: 'Todos los ítems deben estar OK para continuar', tp: 'val', actNum: 2 },
      { c: 'tra', t: 'Programar alistamientos', d: 'Programar las actividades: alistamiento general, marcación, instalación de defensas e instalación de GPS.', act: 'Plan alistamientos → Programar actividades por moto', doc: 'Plan de alistamientos / Excel', pre: 'Todos los ítems verificados OK', tp: 'reg', actNum: 3 },
      { c: 'tra', t: 'Asignar manifiesto', d: 'Asignar el manifiesto correspondiente. Debe tener las improntas ya pegadas.', act: 'Verificar improntas en manifiesto → Asignar a la moto → Registrar fecha', doc: 'FV Trámites / Excel', pre: 'Alistamientos programados', tp: 'reg', actNum: 4 },
      { c: 'tra', t: 'Solicitar preasignación de placa', d: 'Enviar solicitud al tránsito por el grupo de WhatsApp.', act: 'WhatsApp grupo tránsito → Solicitar preasignación de placa', pre: 'Manifiesto asignado', tp: 'exec', actNum: 6 },
      { c: 'tra', t: 'Confirmar placa', d: 'Registrar la fecha de preasignación y la placa confirmada por moto.', act: 'Registrar fecha preasignación → Confirmar placa → Registrar', doc: 'FV Trámites / Excel', pre: 'Solicitud enviada al tránsito', tp: 'reg', actNum: 8 },
      { c: 'tra', t: 'Validar cotización DataPro', d: 'Verificar si la motocicleta requiere cotización en DataPro. Solo aplica para motos Hero. Si no aplica, registrar NA.', act: 'Consultar si aplica → Si aplica: verificar y registrar fecha → Si no aplica: registrar NA', pre: 'Placa confirmada', tp: 'val', actNum: 40 },
      { c: 'inv', t: 'Ingresar placa en inventario', d: 'Registrar la placa asignada a cada moto en la base de datos.', act: 'BD Inventario → Columna placa → Ingresar por moto', doc: 'BD Inventario / Excel', pre: 'Placa confirmada por trámites', tp: 'reg' },
      { c: 'tra', t: 'Plan de marca', d: 'Registrar el plan de marca por ítem, apoyos aplicables y método de recobro.', act: 'Revisar plan de marca → Registrar por ítem → Definir método recobro', pre: 'Placa ingresada en inventario', tp: 'exec', actNum: 10 },
      { c: 'tra', t: 'Solicitar factura de venta', d: 'Solicitar a contabilidad. Horarios de entrega: 12pm y 4pm.', act: 'Preparar paquete → Entregar a contabilidad antes de 12pm o 4pm', pre: 'Plan de marca registrado', gate: 1, gl: 'Debe facturarse el mismo día para solicitar SOAT', tp: 'exec', actNum: 11 },
      { c: 'con', t: 'Facturar motocicleta', d: 'Contabilidad genera la factura de venta de la motocicleta.', act: 'Recibir paquete de trámites → Generar factura de venta', pre: 'Solicitud de factura recibida de trámites', tp: 'exec', actNum: 12 },
      { c: 'con', t: 'Registrar fecha facturación + recobros', d: 'Registrar fecha de facturación. En comentarios incluir los recobros del plan de marca.', act: 'Registrar fecha → Incluir recobros en comentarios → Actualizar archivo', doc: 'FV Contabilidad / Excel + Recobros plan marca / Excel', pre: 'Motocicleta facturada', tp: 'reg' },
      { c: 'tra', t: 'Verificar plan de marca en factura', d: 'Verificar que los comentarios del plan de marca en la factura estén correctos y completos.', act: 'Abrir factura → Verificar comentarios plan de marca → Confirmar OK', pre: 'Factura emitida con recobros por contabilidad', tp: 'val', actNum: 15 },
      { c: 'tra', t: 'Solicitar SOAT', d: 'Solicitar por WhatsApp con el tránsito. El SOAT debe activarse a las 12 de la noche.', act: 'WhatsApp tránsito → Solicitar SOAT → Mover a carpeta proceso SOAT', doc: 'Carpeta proceso de SOAT', pre: 'Plan de marca verificado en factura', tp: 'exec', actNum: 16 },
      { c: 'tra', t: 'Organizar paquete de venta', d: 'Reunir todos los documentos necesarios para matricular la motocicleta. Organizar en orden específico.', act: '1. Copia cédula → 2. Factura → 3. Empadronamiento → 4. Contrato mandato → 5. Formulario tránsito', pre: 'SOAT solicitado', tp: 'exec', actNum: 18 },
      { c: 'tra', t: 'Entregar paquetes para matricular', d: 'Entregar al tránsito separados: con impuestos y sin impuestos. Antes de las 6pm.', act: 'Separar paquetes con/sin impuestos → Entregar antes de 6pm', doc: 'Carpeta proceso de matrícula', pre: 'Paquete de venta organizado', gate: 1, gl: 'Entrega obligatoria antes de las 6pm', tp: 'exec', actNum: 19 }
    ]
  },
  {
    day: 5,
    title: 'SOAT, matrícula y alistamiento',
    desc: 'Verificación de SOAT y matrícula, activación de garantía, alistamientos e instalación de placa',
    steps: [
      { c: 'tra', t: 'Verificar activación SOAT', d: 'Confirmar que el SOAT se activó correctamente a las 12 de la noche del día anterior.', act: 'Verificar activación SOAT → Confirmar OK → Registrar fecha', doc: 'FV Trámites / Excel', pre: 'SOAT solicitado el día anterior', gate: 1, gl: 'SOAT debe estar activo (se activa a las 12am)', tp: 'val', actNum: 21 },
      { c: 'tra', t: 'Imprimir SOAT', d: 'Imprimir el documento del SOAT para incluirlo en el paquete de venta.', act: 'Imprimir SOAT', pre: 'SOAT verificado y activo', tp: 'exec', actNum: 23 },
      { c: 'tra', t: 'Incluir SOAT en paquete de venta', d: 'Agregar el SOAT impreso al paquete de documentos.', act: 'Incluir SOAT en carpeta de la moto', doc: 'Carpeta SOAT OK – proceso matrícula', pre: 'SOAT impreso', tp: 'exec', actNum: 24 },
      { c: 'tra', t: 'Informar cliente SOAT OK [1]', d: 'Primer comunicado al cliente informando que el SOAT está activo.', act: 'Usar plantilla comunicado [1] → Enviar al cliente', doc: 'Plantilla de comunicados al cliente', pre: 'SOAT incluido en paquete', tp: 'com', actNum: 25 },
      { c: 'tra', t: 'Verificar matrícula en RUNT', d: 'Revisar en la página del RUNT que la matrícula esté activa.', act: 'Página RUNT → Verificar matrícula → Confirmar activación', doc: 'FV Trámites / Excel', pre: 'Paquetes entregados al tránsito el día anterior antes de 6pm', gate: 1, gl: 'Matrícula activa en RUNT', tp: 'val', actNum: 26 },
      { c: 'log', t: 'Coordinar alistamientos', d: 'Coordinar con el equipo la ejecución de las actividades programadas.', act: 'Revisar plan → Coordinar equipo → Ejecutar actividades', pre: 'Alistamientos programados por trámites (Día 4)', tp: 'exec' },
      { c: 'log', t: 'Registrar avance alistamientos', d: 'Registrar el progreso de cada actividad en el aplicativo de alistamiento.', act: 'Abrir aplicativo → Registrar avance por actividad', doc: 'Aplicativo de alistamiento / HTML', pre: 'Actividades en ejecución', tp: 'reg' },
      { c: 'tra', t: 'Revisar avance alistamientos', d: 'Monitorear desde trámites el avance de las actividades de alistamiento.', act: 'Plan alistamientos → Verificar avance → Seguimiento', doc: 'Plan de alistamientos / Excel', pre: 'Avance registrado por logística en aplicativo', tp: 'val', actNum: 29 },
      { c: 'tra', t: 'Recibir matrícula y placa', d: 'Recibir del tránsito la matrícula y placa de las motos matriculadas.', act: 'Recibir del tránsito → Verificar matrícula y placa por moto', pre: 'Matrícula activa en RUNT', tp: 'exec', actNum: 30 },
      { c: 'tra', t: 'Activar garantía', d: 'Hero: directamente en DataPro. SYM: solicitar documentos a MotoWorking.', act: 'Hero: DataPro → Activar garantía / SYM: Solicitar a MotoWorking', pre: 'Matrícula y placa recibidas físicamente', tp: 'exec', actNum: 28 },
      { c: 'tra', t: 'Programar instalación de placa', d: 'Agregar la actividad de instalación de placa al plan de alistamientos.', act: 'Confirmar programación → Se registra "Placa" en Plan de alistamientos', pre: 'Matrícula y placa recibidas', tp: 'placa', actNum: 32 },
      { c: 'tra', t: 'Informar cliente matrícula OK [2]', d: 'Segundo comunicado al cliente informando que la matrícula está lista.', act: 'Usar plantilla comunicado [2] → Enviar al cliente', doc: 'Plantilla de comunicados al cliente', pre: 'Instalación de placa programada', tp: 'com', actNum: 33 },
      { c: 'log', t: 'Coordinar instalación de placa', d: 'Coordinar con el equipo logístico la instalación física de la placa.', act: 'Asignar técnico → Instalar placa → Verificar', pre: 'Instalación programada por trámites', tp: 'exec' },
      { c: 'log', t: 'Registrar instalación de placa', d: 'Registrar la instalación completada en el aplicativo.', act: 'Aplicativo → Registrar instalación placa completada', doc: 'Aplicativo de alistamiento / HTML', pre: 'Placa instalada en la motocicleta', tp: 'reg' }
    ]
  },
  {
    day: 6,
    title: 'Entrega',
    desc: 'Verificación final de alistamientos, programación y entrega de la motocicleta al cliente',
    steps: [
      { c: 'tra', t: 'Verificar alistamientos completos', d: 'Verificación final: todas las actividades al 100%.', act: 'Plan alistamientos → Verificar 100% completado', doc: 'Plan de alistamientos / Excel', pre: 'Todas las actividades registradas como completadas por logística', gate: 1, gl: 'Todas las actividades de alistamiento completadas al 100%', tp: 'val', actNum: 34 },
      { c: 'tra', t: 'Informar asesores de crédito', d: 'Notificar a los asesores de crédito que la motocicleta está lista para entrega.', act: 'Comunicar a asesores → Moto lista para entrega', pre: 'Alistamientos verificados al 100%', tp: 'exec', actNum: 35 },
      { c: 'tra', t: 'Programar entrega', d: 'Coordinar la fecha y hora de entrega con los asesores de crédito.', act: 'Concertar con asesores/financieras → Programar fecha y hora', doc: 'Carpeta de listas para entrega', pre: 'Asesores de crédito informados', tp: 'exec', actNum: 36 },
      { c: 'tra', t: 'Informar cliente moto OK [3]', d: 'Tercer y último comunicado al cliente informando que su motocicleta está lista para entrega.', act: 'Usar plantilla comunicado [3] → Enviar al cliente', doc: 'Plantilla de comunicados al cliente', pre: 'Entrega programada con fecha y hora definidas', tp: 'com', actNum: 37 },
      { c: 'log', t: 'Confirmar entrega', d: 'Ejecutar la entrega física de la motocicleta al cliente.', act: 'Preparar moto → Entregar documentos → Entrega al cliente', pre: 'Cliente informado y entrega programada por trámites', tp: 'exec' },
      { c: 'log', t: 'Registrar fecha de entrega', d: 'Registrar la fecha de entrega efectiva de la motocicleta.', act: 'FV Servicio técnico → Registrar fecha entrega', doc: 'FV Servicio técnico / Excel', pre: 'Motocicleta entregada al cliente', tp: 'reg' }
    ]
  },
  {
    day: 7,
    title: 'Exhibición',
    desc: 'Reposición de motocicletas en sala de exhibición',
    steps: [
      { c: 'inv', t: 'Revisar inventario de exhibición', d: 'Verificar qué motocicletas hacen falta en la sala.', act: 'Recorrer sala → Identificar espacios vacíos → Consultar inventario bodega', tp: 'exec' },
      { c: 'inv', t: 'Coordinar traslado desde bodega', d: 'Definir qué motocicletas se trasladarán desde la bodega a la sala.', act: 'Seleccionar motos → Coordinar con logística', pre: 'Espacios vacíos identificados en sala', tp: 'exec' },
      { c: 'log', t: 'Trasladar moto para exhibición', d: 'Ejecutar el traslado físico de la motocicleta desde la bodega hasta la sala.', act: 'Retirar de bodega → Trasladar → Ubicar en sala de exhibición', pre: 'Traslado coordinado con inventario', tp: 'exec' }
    ]
  }
];

/* ============================================================
   PASOS DE TRÁMITES (registro de fechas)
   ============================================================ */
var TRAM_STEPS = [
  { id: 's01', t: 'Verificar ítems del pedido', tp: 'val', gate: 1, gl: 'Código barras, chasis, cotización, prenda, RUNT, financiera, alistamientos — todos OK' },
  { id: 's02', t: 'Programar alistamientos', tp: 'alist', bd: 'plan' },
  { id: 's03', t: 'Asignación de manifiesto', bd: 'tram', col: 'manifiesto', tp: 'reg' },
  { id: 's04a', t: 'Solicitar preasignación de placa', bd: 'tram', col: 'asig_placa', tp: 'reg' },
  { id: 's05', t: 'Validar cotización DataPro', bd: 'tram', col: 'cot_datapro', tp: 'reg', naOption: 1 },
  { id: 's06', t: 'Solicitud de SOAT', bd: 'tram', col: 'solic_soat', tp: 'reg' },
  { id: 's07', t: 'Confirmación SOAT', bd: 'tram', col: 'soat_ok', tp: 'reg' },
  { id: 's08', t: 'Entregar paquetes para matricular', bd: 'tram', col: 'matricula', tp: 'reg' },
  { id: 's09', t: 'Verificar matrícula en RUNT', bd: 'tram', col: 'mat_ok', tp: 'reg' },
  { id: 's10', t: 'Recepción de placa y matrícula', bd: 'tram', col: 'rec_placa', tp: 'reg' },
  { id: 's11', t: 'Activar garantía', bd: 'tram', col: 'garantia', tp: 'reg' }
];

/* Opciones de actividades de alistamiento programables */
var ALIST_OPTS = [
  { l: 'Alistamiento', v: 'Alistamiento' },
  { l: 'Marcación', v: 'Marcación' },
  { l: 'Instalación de defensas', v: 'Defensas' },
  { l: 'Instalación de GPS', v: 'GPS' }
];

/* ============================================================
   CATÁLOGO DE ACTIVIDADES DE TRÁMITES
   ============================================================
   Sincronizado con Supabase catalogo_actividades (manuales activas).
   Campo `orden` permite reordenar sin cambiar `num` (identidad estable).
   ============================================================ */
var ACTIVIDADES_TRAM = [
  { num: '1',  orden: 10,  titulo: 'Adjuntar improntas al manifiesto',       responsable: 'Trámites' },
  { num: '2',  orden: 20,  titulo: 'Revisar ítems del pedido',               responsable: 'Trámites' },
  { num: '3',  orden: 30,  titulo: 'Programar alistamientos',                responsable: 'Trámites' },
  { num: '4',  orden: 40,  titulo: 'Asignar manifiesto',                     responsable: 'Trámites' },
  { num: '6',  orden: 60,  titulo: 'Solicitar preasignación de placa',       responsable: 'Trámites' },
  { num: '8',  orden: 80,  titulo: 'Confirmar placa',                        responsable: 'Trámites' },
  { num: '40', orden: 85,  titulo: 'Validar cotización DataPro',             responsable: 'Trámites' },
  { num: '10', orden: 100, titulo: 'Consignar plan de marca',                responsable: 'Trámites' },
  { num: '11', orden: 110, titulo: 'Solicitar factura de venta',             responsable: 'Trámites' },
  { num: '12', orden: 120, titulo: 'Facturar motocicleta',                   responsable: 'Contabilidad' },
  { num: '15', orden: 150, titulo: 'Revisar plan de marca en factura',       responsable: 'Trámites' },
  { num: '16', orden: 160, titulo: 'Solicitar SOAT',                         responsable: 'Trámites' },
  { num: '18', orden: 180, titulo: 'Organizar paquete para matricular',      responsable: 'Trámites' },
  { num: '19', orden: 190, titulo: 'Entregar paquetes al tránsito',          responsable: 'Trámites' },
  { num: '21', orden: 210, titulo: 'Verificar activación de SOAT',           responsable: 'Trámites' },
  { num: '23', orden: 230, titulo: 'Imprimir SOAT',                          responsable: 'Trámites' },
  { num: '24', orden: 240, titulo: 'Incluir SOAT en el paquete',             responsable: 'Trámites' },
  { num: '25', orden: 250, titulo: '[1] Informar cliente SOAT OK',           responsable: 'Trámites' },
  { num: '26', orden: 260, titulo: 'Verificar matrícula en RUNT',            responsable: 'Trámites' },
  { num: '28', orden: 280, titulo: 'Activar garantía',                       responsable: 'Trámites' },
  { num: '29', orden: 290, titulo: 'Revisar avance de alistamientos',        responsable: 'Trámites' },
  { num: '30', orden: 300, titulo: 'Recibir matrícula y placa',              responsable: 'Trámites' },
  { num: '32', orden: 320, titulo: 'Programar instalación de placa',         responsable: 'Trámites' },
  { num: '33', orden: 330, titulo: '[2] Informar cliente matrícula OK',      responsable: 'Trámites' },
  { num: '34', orden: 340, titulo: 'Revisar avance final de alistamientos',  responsable: 'Trámites' },
  { num: '35', orden: 350, titulo: 'Informar asesores de crédito',           responsable: 'Trámites' },
  { num: '36', orden: 360, titulo: 'Programar entrega',                      responsable: 'Trámites' },
  { num: '37', orden: 370, titulo: '[3] Informar cliente moto OK',           responsable: 'Trámites' },
  { num: '38', orden: 380, titulo: 'Confirmar entrega',                      responsable: 'Trámites' }
];

/* Total de actividades principales (sin las sub .1) */
var TOTAL_TRAM = ACTIVIDADES_TRAM.filter(function(a) {
  return a.num.indexOf('.') < 0;
}).length;
