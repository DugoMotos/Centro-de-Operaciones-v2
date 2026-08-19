-- ============================================================
-- 2026-08-19 · Arranque del proceso + Logística registrable
-- ============================================================
-- CÓMO CORRERLO
--   Supabase → SQL Editor → pegar todo → Run.
--   Va dentro de una transacción: o pasa completo, o no pasa nada.
--
-- POR QUÉ NO LO CORRIÓ EL APLICATIVO
--   La anon key tiene SELECT y UPDATE sobre catalogo_actividades,
--   pero NO INSERT (lo bloquean las RLS Policies, correctamente).
--
-- REGLA RESPETADA
--   Ningún actividad_num existente cambia. Las 6 nuevas toman
--   42-47, que son los siguientes libres (el máximo era 41 y no
--   había huecos). Todo el reordenamiento va por la columna `orden`.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Las 6 actividades nuevas (42-47)
-- ------------------------------------------------------------
-- Ya existían como pasos visibles en el procedimiento (js/data.js),
-- pero sin actividad_num: se veían y no se registraban. Esto las
-- vuelve registrables.
--
-- Las otras 2 del pedido original NO se crean porque ya existen:
--   "Adjuntar improntas..."  -> actividad_num 1  (6 registros)
--   "Facturar motocicleta"   -> actividad_num 12 (5 registros)

INSERT INTO catalogo_actividades
  (actividad_num, nombre, responsable, tipo, activa, orden)
VALUES
  (42, 'Recibir factura de compra',          'Contabilidad', 'manual', true,  10),
  (43, 'Imprimir factura de compra',         'Contabilidad', 'manual', true,  20),
  (44, 'Entregar facturas a trámites',       'Contabilidad', 'manual', true,  30),
  (45, 'Entregar manifiestos a trámites',    'Logística',    'manual', true,  40),
  (46, 'Obtener improntas de motos nuevas',  'Logística',    'manual', true,  50),
  (47, 'Entregar improntas a trámites',      'Logística',    'manual', true,  60);


-- ------------------------------------------------------------
-- 2. Unificación de nombres
-- ------------------------------------------------------------
-- actividad_num NO cambia: solo la etiqueta. El histórico queda intacto.

-- La 1 tenía tres nombres distintos entre Supabase, data.js y el pedido.
-- Se unifica al que ya estaba en la BD (el más corto y el que tiene
-- el histórico), y js/data.js se alinea a este.
UPDATE catalogo_actividades
   SET nombre = 'Adjuntar improntas al manifiesto'
 WHERE actividad_num = 1;

-- La 13 es la que el aplicativo muestra como "Registrar fecha de
-- facturación + recobros". Se alinea el catálogo a esa etiqueta.
-- Sigue siendo tipo 'automatica': la llena un flow, no un clic.
UPDATE catalogo_actividades
   SET nombre = 'Registrar fecha de facturación + recobros'
 WHERE actividad_num = 13;


-- ------------------------------------------------------------
-- 3. Reordenamiento completo, espaciado de 10 en 10
-- ------------------------------------------------------------
-- Secuencia pedida:
--   10- 30  Contabilidad — factura de compra
--   40- 60  Logística
--   70      Adjuntar improntas al manifiesto (Trámites)
--   80+     el resto del flujo, corrido, en su secuencia relativa actual
--
-- El espaciado de 10 deja lugar a inserciones intermedias futuras sin
-- tener que reordenar todo otra vez. De paso limpia las irregularidades
-- que habían quedado (85, 87, 305).

UPDATE catalogo_actividades AS c
   SET orden = v.nuevo
  FROM (VALUES
    -- Arranque · Contabilidad
    (42, 10), (43, 20), (44, 30),
    -- Arranque · Logística  (en paralelo, no dependen de Contabilidad)
    (45, 40), (46, 50), (47, 60),
    -- Habilitación de Trámites
    (1,  70),
    -- Resto del flujo
    (2,  80), (3,  90), (4, 100), (5, 110), (6, 120), (7, 130), (8, 140),
    (40,150), (41,160), (9, 170), (10,180),
    (11,190),   -- Solicitar factura de venta
    (12,200),   -- Facturar motocicleta                 <- inmediatamente después
    (13,210),   -- Registrar fecha de facturación + recobros  <- y esta
    (14,220), (15,230), (16,240), (17,250), (18,260), (19,270), (20,280),
    (21,290), (22,300), (23,310), (24,320), (25,330), (26,340), (27,350),
    (29,360), (30,370), (28,380), (31,390), (32,400), (33,410), (34,420),
    (35,430), (36,440), (37,450), (38,460), (39,470)
  ) AS v(num, nuevo)
 WHERE c.actividad_num = v.num;


-- ------------------------------------------------------------
-- 4. Backfill del histórico  (opción 1)
-- ------------------------------------------------------------
-- Sin esto, las 6 motos en curso quedarían con las 6 actividades
-- nuevas sin ejecutar: el avance en Negocios les bajaría de golpe
-- y el bloqueo por dependencias las frenaría.
--
-- IMPORTANTE — la fecha:
--   NO se usa now(). Estas actividades ocurrieron en la vida real
--   antes de que existiera el registro. Si les pusiéramos la fecha
--   de hoy, la columna "Últ. actualización" mostraría las 6 motos
--   como recién movidas, que es falso.
--   Se les pone la fecha del PRIMER registro de cada moto, que es
--   la aproximación honesta más cercana.

INSERT INTO registro_actividades
  (codigo_barras, actividad_num, estado, fecha_registro, created_at, comentario)
SELECT
  m.codigo_barras,
  n.actividad_num,
  'Ejecutada',
  m.primera_fecha,
  m.primera_fecha,
  'Backfill 2026-08-19: actividad incorporada al catálogo con posterioridad'
FROM (
  SELECT codigo_barras, MIN(created_at) AS primera_fecha
    FROM registro_actividades
   GROUP BY codigo_barras
) AS m
CROSS JOIN (VALUES (42),(43),(44),(45),(46),(47)) AS n(actividad_num)
ON CONFLICT DO NOTHING;   -- respeta el UNIQUE (codigo_barras, actividad_num)

COMMIT;


-- ============================================================
-- VERIFICACIÓN (correr después, fuera de la transacción)
-- ============================================================

-- Debe devolver 47 filas, orden de 10 a 470, sin repetidos
-- SELECT orden, actividad_num, nombre, responsable, tipo
--   FROM catalogo_actividades ORDER BY orden;

-- Debe devolver 3 responsables: Contabilidad 5, Logística 5, Trámites 37
-- SELECT responsable, COUNT(*) FROM catalogo_actividades GROUP BY responsable;

-- Debe devolver 36 filas nuevas (6 motos x 6 actividades)
-- SELECT codigo_barras, COUNT(*) FROM registro_actividades
--  WHERE actividad_num BETWEEN 42 AND 47 GROUP BY codigo_barras;

-- Nadie debe tener fecha de backfill en el futuro ni en hoy
-- SELECT codigo_barras, actividad_num, fecha_registro
--   FROM registro_actividades WHERE actividad_num BETWEEN 42 AND 47
--  ORDER BY codigo_barras;


-- ============================================================
-- REVERSIÓN, si hiciera falta
-- ============================================================
-- BEGIN;
--   DELETE FROM registro_actividades WHERE actividad_num BETWEEN 42 AND 47;
--   DELETE FROM catalogo_actividades WHERE actividad_num BETWEEN 42 AND 47;
--   -- y restaurar `orden` desde scratchpad/BACKUP-catalogo.json
-- COMMIT;
