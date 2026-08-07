const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

function getComisionPct(montoTotal) {
  if (montoTotal >= 35000) return 3.5;
  if (montoTotal >= 20000) return 4.0;
  if (montoTotal >= 10000) return 4.5;
  return 5.0;
}

router.get('/', (req, res) => {
  const { cliente_id, estado, periodo, desde, hasta } = req.query;
  let query = `SELECT pc.*, c.nombre as cliente_nombre, c.cedula_ruc
               FROM pagos_consolidados pc JOIN clientes c ON pc.cliente_id = c.id WHERE 1=1`;
  const params = [];

  if (cliente_id) { query += ' AND pc.cliente_id = ?'; params.push(cliente_id); }
  if (estado) { query += ' AND pc.estado = ?'; params.push(estado); }
  if (periodo) { query += ' AND pc.periodo = ?'; params.push(periodo); }
  if (desde) { query += ' AND pc.fecha_pago >= ?'; params.push(desde); }
  if (hasta) { query += ' AND pc.fecha_pago <= ?'; params.push(hasta); }
  query += ' ORDER BY pc.fecha_pago DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const pago = db.prepare(`
    SELECT pc.*, c.nombre as cliente_nombre, c.cedula_ruc
    FROM pagos_consolidados pc JOIN clientes c ON pc.cliente_id = c.id
    WHERE pc.id = ?
  `).get(req.params.id);
  if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });

  const detalles = db.prepare(`
    SELECT pd.*, f.concepto, f.proveedor, f.monto_original
    FROM pago_detalles pd JOIN facturas f ON pd.factura_id = f.id
    WHERE pd.pago_consolidado_id = ?
  `).all(req.params.id);

  res.json({ ...pago, detalles });
});

router.post('/', (req, res) => {
  const { cliente_id, facturas_ids, periodo, cargo_gestion, interes_refinanciamiento } = req.body;

  if (!cliente_id || !facturas_ids || !facturas_ids.length || !periodo) {
    return res.status(400).json({ error: 'Cliente, facturas y período requeridos' });
  }

  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ? AND activo = 1').get(cliente_id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado o inactivo' });

  const facturas = db.prepare(
    `SELECT * FROM facturas WHERE id IN (${facturas_ids.map(() => '?').join(',')}) AND cliente_id = ? AND estado = 'pendiente'`
  ).all(...facturas_ids, cliente_id);

  if (facturas.length !== facturas_ids.length) {
    return res.status(400).json({ error: 'Alguna(s) factura(s) no existe(n) o ya fue(ron) pagada(s)' });
  }

  const monto_total = facturas.reduce((s, f) => s + f.monto_original, 0);
  const pctServicio = getComisionPct(monto_total) / 100;
  const comision_servicio = Math.round(monto_total * pctServicio * 100) / 100;
  const cargo = cargo_gestion ?? 150;
  const interes = interes_refinanciamiento ?? 0;
  const total_cobrado = monto_total + comision_servicio + cargo + interes;

  try {
    db.exec('BEGIN');

    const result = db.prepare(`
      INSERT INTO pagos_consolidados (cliente_id, monto_total, comision_servicio, cargo_gestion,
      interes_refinanciamiento, total_cobrado, periodo, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')
    `).run(cliente_id, monto_total, comision_servicio, cargo, interes, total_cobrado, periodo);
    const pagoId = Number(result.lastInsertRowid);

    const insertDetalle = db.prepare(`
      INSERT INTO pago_detalles (pago_consolidado_id, factura_id, monto_pagado) VALUES (?, ?, ?)
    `);
    const updateFactura = db.prepare("UPDATE facturas SET estado = 'pagada', actualizado_en = datetime('now') WHERE id = ?");

    for (const f of facturas) {
      insertDetalle.run(pagoId, f.id, f.monto_original);
      updateFactura.run(f.id);
    }

    db.exec('COMMIT');

    const pago = db.prepare(`
      SELECT pc.*, c.nombre as cliente_nombre, c.cedula_ruc
      FROM pagos_consolidados pc JOIN clientes c ON pc.cliente_id = c.id WHERE pc.id = ?
    `).get(pagoId);

    res.status(201).json(pago);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
});

router.put('/:id/estado', (req, res) => {
  const { estado } = req.body;
  if (!['completado', 'pendiente', 'atrasado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const result = db.prepare("UPDATE pagos_consolidados SET estado = ? WHERE id = ?").run(estado, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pago no encontrado' });
  res.json({ mensaje: 'Estado actualizado' });
});

module.exports = router;
