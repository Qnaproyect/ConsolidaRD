const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { activo, search } = req.query;
  let query = 'SELECT * FROM clientes WHERE 1=1';
  const params = [];

  if (activo !== undefined) {
    query += ' AND activo = ?';
    params.push(Number(activo));
  }
  if (search) {
    query += ' AND (nombre LIKE ? OR cedula_ruc LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY creado_en DESC';

  const clientes = db.prepare(query).all(...params);
  res.json(clientes);
});

router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(cliente);
});

router.post('/', (req, res) => {
  const { tipo_persona, nombre, cedula_ruc, email, telefono, direccion, ingreso_mensual } = req.body;
  if (!nombre || !cedula_ruc || !email || !telefono) {
    return res.status(400).json({ error: 'Nombre, cédula/RUC, email y teléfono son requeridos' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO clientes (tipo_persona, nombre, cedula_ruc, email, telefono, direccion, ingreso_mensual)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tipo_persona || 'fisica', nombre, cedula_ruc, email, telefono, direccion || '', ingreso_mensual || 0);
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(cliente);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'La cédula/RUC ya existe' });
    }
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/:id', (req, res) => {
  const { nombre, cedula_ruc, email, telefono, direccion, ingreso_mensual, score_crediticio, activo } = req.body;
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  db.prepare(`
    UPDATE clientes SET nombre=?, cedula_ruc=?, email=?, telefono=?, direccion=?,
    ingreso_mensual=?, score_crediticio=?, activo=?, actualizado_en=datetime('now')
    WHERE id=?
  `).run(
    nombre || cliente.nombre,
    cedula_ruc || cliente.cedula_ruc,
    email || cliente.email,
    telefono || cliente.telefono,
    direccion ?? cliente.direccion,
    ingreso_mensual ?? cliente.ingreso_mensual,
    score_crediticio ?? cliente.score_crediticio,
    activo !== undefined ? Number(activo) : cliente.activo,
    req.params.id
  );
  const actualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  res.json(actualizado);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('UPDATE clientes SET activo = 0, actualizado_en = datetime(\'now\') WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ mensaje: 'Cliente desactivado correctamente' });
});

module.exports = router;
