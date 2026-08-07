const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

function addCalculatedFields(factura) {
  if (!factura) return factura;
  const hoy = new Date();
  const vence = new Date(factura.fecha_vencimiento + 'T23:59:59');
  const diffTime = vence - hoy;
  const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  factura.dias_para_vencer = diffDias;

  let fechaProrroga = factura.fecha_prorroga;
  if (!fechaProrroga) {
    const p = new Date(vence);
    p.setDate(p.getDate() + 7);
    fechaProrroga = p.toISOString().split('T')[0];
    factura.fecha_prorroga = fechaProrroga;
  }
  const prorroga = new Date(fechaProrroga + 'T23:59:59');
  const diffProrroga = Math.ceil((prorroga - hoy) / (1000 * 60 * 60 * 24));
  factura.dias_prorroga_restantes = diffProrroga;

  if (factura.estado === 'pendiente') {
    if (diffDias < 0 && diffProrroga > 0) {
      factura.estado_calculado = 'en_prorroga';
    } else if (diffProrroga <= 0) {
      factura.estado_calculado = 'vencida';
    } else {
      factura.estado_calculado = 'pendiente';
    }
  } else {
    factura.estado_calculado = factura.estado;
  }
  return factura;
}

router.get('/', (req, res) => {
  const { cliente_id, estado, search } = req.query;
  let query = `SELECT f.*, c.nombre as cliente_nombre, c.cedula_ruc
               FROM facturas f JOIN clientes c ON f.cliente_id = c.id WHERE 1=1`;
  const params = [];

  if (cliente_id) { query += ' AND f.cliente_id = ?'; params.push(cliente_id); }
  if (estado) {
    if (estado === 'en_prorroga') {
      query += " AND f.estado = 'pendiente'";
    } else if (estado === 'vigente') {
      query += " AND f.estado = 'pendiente'";
    } else {
      query += ' AND f.estado = ?';
      params.push(estado);
    }
  }
  if (search) {
    query += ' AND (f.concepto LIKE ? OR f.proveedor LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }
  query += ' ORDER BY f.fecha_vencimiento DESC';

  const facturas = db.prepare(query).all(...params).map(addCalculatedFields);
  res.json(facturas);
});

router.get('/:id', (req, res) => {
  const factura = db.prepare(`
    SELECT f.*, c.nombre as cliente_nombre, c.cedula_ruc
    FROM facturas f JOIN clientes c ON f.cliente_id = c.id WHERE f.id = ?
  `).get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(addCalculatedFields(factura));
});

router.post('/', (req, res) => {
  const { cliente_id, concepto, proveedor, monto_original, fecha_vencimiento } = req.body;
  if (!cliente_id || !concepto || !proveedor || !monto_original) {
    return res.status(400).json({ error: 'Cliente, concepto, proveedor y monto son requeridos' });
  }

  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(cliente_id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  const hoy = new Date();
  const vence = fecha_vencimiento || new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prorroga = new Date(new Date(vence).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO facturas (cliente_id, concepto, proveedor, monto_original, fecha_vencimiento, fecha_prorroga)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(cliente_id, concepto, proveedor, monto_original, vence, prorroga);

  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(addCalculatedFields(factura));
});

router.put('/:id', (req, res) => {
  const { concepto, proveedor, monto_original, fecha_vencimiento, estado } = req.body;
  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const nuevoVence = fecha_vencimiento || factura.fecha_vencimiento;
  const nuevoProrroga = fecha_vencimiento
    ? new Date(new Date(fecha_vencimiento).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : factura.fecha_prorroga;

  db.prepare(`
    UPDATE facturas SET concepto=?, proveedor=?, monto_original=?, fecha_vencimiento=?,
    fecha_prorroga=?, estado=?, actualizado_en=datetime('now') WHERE id=?
  `).run(
    concepto || factura.concepto,
    proveedor || factura.proveedor,
    monto_original ?? factura.monto_original,
    nuevoVence,
    nuevoProrroga,
    estado || factura.estado,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  res.json(addCalculatedFields(updated));
});

router.delete('/:id', (req, res) => {
  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  if (factura.estado !== 'pendiente') {
    return res.status(400).json({ error: 'Solo se pueden eliminar facturas pendientes' });
  }
  db.prepare('DELETE FROM facturas WHERE id = ?').run(req.params.id);
  res.json({ mensaje: 'Factura eliminada correctamente' });
});

module.exports = router;
