const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { estado, cliente_id } = req.query;
  let query = `SELECT r.*, c.nombre as cliente_nombre, c.cedula_ruc, pc.periodo
               FROM refinanciamientos r
               JOIN clientes c ON r.cliente_id = c.id
               JOIN pagos_consolidados pc ON r.pago_consolidado_id = pc.id
               WHERE 1=1`;
  const params = [];
  if (estado) { query += ' AND r.estado = ?'; params.push(estado); }
  if (cliente_id) { query += ' AND r.cliente_id = ?'; params.push(cliente_id); }
  query += ' ORDER BY r.fecha_acuerdo DESC';

  const refinanciamientos = db.prepare(query).all(...params);
  const result = refinanciamientos.map(r => {
    const cuotas = db.prepare('SELECT * FROM pagos_refinanciamiento WHERE refinanciamiento_id = ? ORDER BY numero_cuota').all(r.id);
    return { ...r, cuotas };
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const r = db.prepare(`
    SELECT r.*, c.nombre as cliente_nombre, c.cedula_ruc, pc.periodo
    FROM refinanciamientos r
    JOIN clientes c ON r.cliente_id = c.id
    JOIN pagos_consolidados pc ON r.pago_consolidado_id = pc.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!r) return res.status(404).json({ error: 'Refinanciamiento no encontrado' });
  const cuotas = db.prepare('SELECT * FROM pagos_refinanciamiento WHERE refinanciamiento_id = ? ORDER BY numero_cuota').all(req.params.id);
  res.json({ ...r, cuotas });
});

router.post('/', (req, res) => {
  const { pago_consolidado_id, cliente_id, monto_adeudado, interes_pct, cuotas } = req.body;

  if (!pago_consolidado_id || !cliente_id || !monto_adeudado || !cuotas) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const pctInteres = (interes_pct ?? 5) / 100;
  const interes = Math.round(monto_adeudado * pctInteres * 100) / 100;
  const total_a_pagar = monto_adeudado + interes;
  const monto_cuota = Math.round((total_a_pagar / cuotas) * 100) / 100;
  const ultima_cuota = total_a_pagar - (monto_cuota * (cuotas - 1));

  const insertRefi = db.prepare(`
    INSERT INTO refinanciamientos (pago_consolidado_id, cliente_id, monto_adeudado, interes, total_a_pagar, cuotas)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertCuota = db.prepare(`
    INSERT INTO pagos_refinanciamiento (refinanciamiento_id, numero_cuota, monto) VALUES (?, ?, ?)
  `);

  try {
    db.exec('BEGIN');

    const result = insertRefi.run(pago_consolidado_id, cliente_id, monto_adeudado, interes, total_a_pagar, cuotas);
    const refiId = Number(result.lastInsertRowid);

    for (let i = 0; i < cuotas; i++) {
      const monto = i === cuotas - 1 ? Math.round(ultima_cuota * 100) / 100 : monto_cuota;
      insertCuota.run(refiId, i + 1, monto);
    }

    db.prepare("UPDATE pagos_consolidados SET estado = 'pendiente' WHERE id = ?").run(pago_consolidado_id);
    db.exec('COMMIT');

    const refinanciamiento = db.prepare('SELECT * FROM refinanciamientos WHERE id = ?').get(refiId);
    const cuotasList = db.prepare('SELECT * FROM pagos_refinanciamiento WHERE refinanciamiento_id = ? ORDER BY numero_cuota').all(refiId);
    res.status(201).json({ ...refinanciamiento, cuotas: cuotasList });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Error al crear refinanciamiento' });
  }
});

router.put('/:id/cuota/:numero', (req, res) => {
  const refi = db.prepare('SELECT * FROM refinanciamientos WHERE id = ?').get(req.params.id);
  if (!refi) return res.status(404).json({ error: 'Refinanciamiento no encontrado' });

  const cuota = db.prepare(
    'SELECT * FROM pagos_refinanciamiento WHERE refinanciamiento_id = ? AND numero_cuota = ?'
  ).get(req.params.id, req.params.numero);

  if (!cuota) return res.status(404).json({ error: 'Cuota no encontrada' });

  db.prepare("UPDATE pagos_refinanciamiento SET fecha_pago = datetime('now') WHERE id = ?").run(cuota.id);

  const cuotasPendientes = db.prepare(
    "SELECT COUNT(*) as count FROM pagos_refinanciamiento WHERE refinanciamiento_id = ? AND fecha_pago IS NULL"
  ).get(req.params.id);

  if (cuotasPendientes.count === 0) {
    db.prepare("UPDATE refinanciamientos SET estado = 'pagado' WHERE id = ?").run(req.params.id);
  }

  res.json({ mensaje: 'Cuota registrada como pagada' });
});

module.exports = router;
