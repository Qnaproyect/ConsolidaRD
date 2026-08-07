const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/gastos', (req, res) => {
  const gastos = db.prepare('SELECT * FROM config_gastos ORDER BY id').all();
  res.json(gastos);
});

router.put('/gastos', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Se requiere un array de items' });
  }

  const update = db.prepare('UPDATE config_gastos SET valor = ? WHERE concepto = ?');

  try {
    db.exec('BEGIN');
    for (const item of items) {
      const result = update.run(Number(item.valor), item.concepto);
      if (result.changes === 0) {
        throw new Error(`Concepto "${item.concepto}" no encontrado`);
      }
    }
    db.exec('COMMIT');
    const gastos = db.prepare('SELECT * FROM config_gastos ORDER BY id').all();
    res.json(gastos);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Error al guardar configuración' });
  }
});

module.exports = router;
