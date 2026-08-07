const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const totalClientes = db.prepare('SELECT COUNT(*) as total FROM clientes WHERE activo = 1').get();
  const totalFacturasPendientes = db.prepare("SELECT COUNT(*) as total FROM facturas WHERE estado = 'pendiente'").get();
  const ingresosMes = db.prepare(`
    SELECT COALESCE(SUM(total_cobrado), 0) as total
    FROM pagos_consolidados
    WHERE strftime('%Y-%m', fecha_pago) = strftime('%Y-%m', 'now')
  `).get();

  const ingresosDetalle = db.prepare(`
    SELECT
      COALESCE(SUM(comision_servicio), 0) as comision_servicio,
      COALESCE(SUM(cargo_gestion), 0) as cargo_gestion,
      COALESCE(SUM(interes_refinanciamiento), 0) as interes_refinanciamiento,
      COALESCE(SUM(monto_total), 0) as monto_total,
      COALESCE(SUM(total_cobrado), 0) as total_cobrado
    FROM pagos_consolidados
    WHERE strftime('%Y-%m', fecha_pago) = strftime('%Y-%m', 'now')
  `).get();

  const refinanciamientosActivos = db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(total_a_pagar), 0) as monto FROM refinanciamientos WHERE estado = 'activo'").get();

  const morosidad = db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(total_cobrado), 0) as monto FROM pagos_consolidados WHERE estado = 'atrasado'").get();

  const clientesRecientes = db.prepare('SELECT id, nombre, cedula_ruc, creado_en FROM clientes WHERE activo = 1 ORDER BY creado_en DESC LIMIT 5').all();

  const ingresosUltimos6 = db.prepare(`
    SELECT strftime('%Y-%m', fecha_pago) as mes,
           SUM(total_cobrado) as total
    FROM pagos_consolidados
    WHERE fecha_pago >= date('now', '-6 months')
    GROUP BY mes ORDER BY mes
  `).all();

  const facturasProximas = db.prepare(`
    SELECT f.id, f.concepto, f.proveedor, f.monto_original, f.fecha_vencimiento, f.fecha_prorroga,
           c.nombre as cliente_nombre, c.cedula_ruc
    FROM facturas f JOIN clientes c ON f.cliente_id = c.id
    WHERE f.estado = 'pendiente'
      AND date(f.fecha_vencimiento) BETWEEN date('now', '-7 days') AND date('now', '+30 days')
    ORDER BY f.fecha_vencimiento ASC
  `).all().map(f => {
    const hoy = new Date();
    const vence = new Date(f.fecha_vencimiento + 'T23:59:59');
    const diffDias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
    const prorroga = new Date((f.fecha_prorroga || new Date(vence.getTime() + 7*24*60*60*1000).toISOString().split('T')[0]) + 'T23:59:59');
    const diffProrroga = Math.ceil((prorroga - hoy) / (1000 * 60 * 60 * 24));
    return { ...f, dias_para_vencer: diffDias, dias_prorroga_restantes: diffProrroga };
  });

  res.json({
    totalClientes: totalClientes.total,
    totalFacturasPendientes: totalFacturasPendientes.total,
    ingresosMes: ingresosMes.total,
    ingresosDetalle,
    refinanciamientosActivos,
    morosidad,
    clientesRecientes,
    ingresosUltimos6,
    facturasProximas
  });
});

module.exports = router;
