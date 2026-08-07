const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { estado, cliente_id } = req.query;

  const totales = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN total_cobrado ELSE 0 END), 0) as por_cobrar,
      COALESCE(SUM(CASE WHEN estado = 'completado' THEN total_cobrado ELSE 0 END), 0) as cobrado,
      COALESCE(SUM(CASE WHEN estado = 'atrasado' THEN total_cobrado ELSE 0 END), 0) as atrasado,
      COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes_count,
      COUNT(CASE WHEN estado = 'completado' THEN 1 END) as cobrados_count,
      COUNT(CASE WHEN estado = 'atrasado' THEN 1 END) as atrasados_count
    FROM pagos_consolidados
  `).get();

  let query = `SELECT pc.*, c.nombre as cliente_nombre, c.cedula_ruc, c.telefono
               FROM pagos_consolidados pc JOIN clientes c ON pc.cliente_id = c.id WHERE 1=1`;
  const params = [];

  if (estado) { query += ' AND pc.estado = ?'; params.push(estado); }
  if (cliente_id) { query += ' AND pc.cliente_id = ?'; params.push(cliente_id); }
  query += ' ORDER BY pc.fecha_pago DESC';

  const cobros = db.prepare(query).all(...params);

  res.json({ resumen: totales, cobros });
});

router.put('/:id/cobrar', (req, res) => {
  const pago = db.prepare('SELECT * FROM pagos_consolidados WHERE id = ?').get(req.params.id);
  if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
  if (pago.estado === 'completado') return res.status(400).json({ error: 'Este pago ya fue cobrado' });

  const { fecha_cobro, tipo_pago, imagen_pago, monto_cobrado } = req.body;

  if (!fecha_cobro || !tipo_pago) {
    return res.status(400).json({ error: 'Fecha y tipo de pago son requeridos' });
  }
  if (!['transferencia', 'efectivo'].includes(tipo_pago)) {
    return res.status(400).json({ error: 'Tipo de pago inválido' });
  }

  db.prepare(`
    UPDATE pagos_consolidados SET
      estado = 'completado',
      fecha_cobro = ?,
      tipo_pago = ?,
      imagen_pago = ?,
      actualizado_en = datetime('now')
    WHERE id = ?
  `).run(fecha_cobro, tipo_pago, imagen_pago || null, req.params.id);

  const actualizado = db.prepare('SELECT * FROM pagos_consolidados WHERE id = ?').get(req.params.id);
  res.json({ mensaje: 'Cobro registrado correctamente', cobro: actualizado });
});

module.exports = router;
