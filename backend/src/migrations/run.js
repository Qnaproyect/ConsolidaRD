const bcrypt = require('bcryptjs');
const db = require('../config/database');

console.log('Ejecutando migraciones...');

db.exec(`
  PRAGMA foreign_keys = OFF;

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'admin',
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_persona TEXT NOT NULL DEFAULT 'fisica' CHECK(tipo_persona IN ('fisica','juridica')),
    nombre TEXT NOT NULL,
    cedula_ruc TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT,
    ingreso_mensual REAL DEFAULT 0,
    score_crediticio INTEGER DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    concepto TEXT NOT NULL,
    proveedor TEXT NOT NULL,
    monto_original REAL NOT NULL,
    fecha_vencimiento TEXT NOT NULL,
    fecha_prorroga TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','pagada','refinanciada','vencida')),
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS pagos_consolidados_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    monto_total REAL NOT NULL,
    comision_servicio REAL NOT NULL,
    cargo_gestion REAL NOT NULL,
    interes_refinanciamiento REAL DEFAULT 0,
    total_cobrado REAL NOT NULL,
    fecha_pago TEXT DEFAULT (datetime('now')),
    periodo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('completado','pendiente','atrasado')),
    fecha_cobro TEXT,
    tipo_pago TEXT,
    imagen_pago TEXT,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );
  INSERT INTO pagos_consolidados_new (id, cliente_id, monto_total, comision_servicio, cargo_gestion, interes_refinanciamiento, total_cobrado, fecha_pago, periodo, estado, fecha_cobro, tipo_pago, imagen_pago, creado_en, actualizado_en)
    SELECT id, cliente_id, monto_total, comision_servicio, cargo_gestion, interes_refinanciamiento, total_cobrado, fecha_pago, periodo, estado, fecha_cobro, tipo_pago, imagen_pago, creado_en, actualizado_en FROM pagos_consolidados;
  DROP TABLE IF EXISTS pagos_consolidados;
  ALTER TABLE pagos_consolidados_new RENAME TO pagos_consolidados;

  CREATE TABLE IF NOT EXISTS pago_detalles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pago_consolidado_id INTEGER NOT NULL,
    factura_id INTEGER NOT NULL,
    monto_pagado REAL NOT NULL,
    FOREIGN KEY (pago_consolidado_id) REFERENCES pagos_consolidados(id),
    FOREIGN KEY (factura_id) REFERENCES facturas(id)
  );

  CREATE TABLE IF NOT EXISTS refinanciamientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pago_consolidado_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    monto_adeudado REAL NOT NULL,
    interes REAL NOT NULL,
    total_a_pagar REAL NOT NULL,
    cuotas INTEGER NOT NULL DEFAULT 1,
    fecha_acuerdo TEXT DEFAULT (datetime('now')),
    estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo','pagado','incumplido')),
    FOREIGN KEY (pago_consolidado_id) REFERENCES pagos_consolidados(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS pagos_refinanciamiento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    refinanciamiento_id INTEGER NOT NULL,
    numero_cuota INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha_pago TEXT,
    FOREIGN KEY (refinanciamiento_id) REFERENCES refinanciamientos(id)
  );

  CREATE TABLE IF NOT EXISTS config_gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto TEXT UNIQUE NOT NULL,
    etiqueta TEXT NOT NULL,
    valor REAL NOT NULL DEFAULT 0,
    es_porcentaje INTEGER NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO config_gastos (concepto, etiqueta, valor, es_porcentaje) VALUES
    ('costo_capital_pct', 'Costo de Capital (%)', 1.5, 1),
    ('verificacion_riesgo', 'Verificación de Riesgo (RD$)', 50, 0),
    ('software_mensajeria', 'Software/Mensajería (RD$)', 3000, 0),
    ('provision_impago_pct', 'Provisión de Impago (%)', 2, 1),
    ('marketing_ventas', 'Marketing y Ventas (RD$)', 5000, 0);

  PRAGMA foreign_keys = ON;
`);

const admin = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@consolidard.com');
if (!admin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)')
    .run('Admin Consolida RD', 'admin@consolidard.com', hash, 'admin');
  console.log('Usuario admin creado: admin@consolidard.com / admin123');
} else {
  console.log('Usuario admin ya existe');
}

console.log('Migraciones ejecutadas correctamente.');
process.exit(0);
