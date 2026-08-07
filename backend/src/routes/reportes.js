const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/estado-resultados', (req, res) => {
  const { desde, hasta } = req.query;
  let fechaFilter = '';
  const params = [];
  if (desde && hasta) {
    fechaFilter = 'WHERE fecha_pago >= ? AND fecha_pago <= ?';
    params.push(desde, hasta);
  } else {
    fechaFilter = "WHERE strftime('%Y-%m', fecha_pago) = strftime('%Y-%m', 'now')";
  }

  const ingresos = db.prepare(`
    SELECT
      COALESCE(SUM(comision_servicio), 0) as comision_servicio,
      COALESCE(SUM(cargo_gestion), 0) as cargo_gestion,
      COALESCE(SUM(interes_refinanciamiento), 0) as interes_refinanciamiento,
      COALESCE(SUM(total_cobrado), 0) as total_ingresos
    FROM pagos_consolidados ${fechaFilter}
  `).get(...params);

  const totalClientes = db.prepare('SELECT COUNT(*) as total FROM clientes WHERE activo = 1').get().total;
  const gmv = db.prepare(`SELECT COALESCE(SUM(monto_total), 0) as total FROM pagos_consolidados ${fechaFilter}`).get(...params);

  const configGastos = db.prepare('SELECT concepto, valor, es_porcentaje FROM config_gastos').all();
  const cfg = Object.fromEntries(configGastos.map(g => [g.concepto, g]));

  const gastos_operativos = {
    costo_capital: Math.round(gmv.total * (cfg.costo_capital_pct?.valor ?? 1.5) / 100 * 100) / 100,
    verificacion_riesgo: Math.round(totalClientes * (cfg.verificacion_riesgo?.valor ?? 50) * 100) / 100,
    software_mensajeria: cfg.software_mensajeria?.valor ?? 3000,
    provision_impago: Math.round(gmv.total * (cfg.provision_impago_pct?.valor ?? 2) / 100 * 100) / 100,
    marketing_ventas: cfg.marketing_ventas?.valor ?? 5000,
  };
  const total_gastos = Object.values(gastos_operativos).reduce((a, b) => a + b, 0);
  const utilidad_neta = ingresos.total_ingresos - total_gastos;
  const margen_neto = ingresos.total_ingresos > 0 ? Math.round((utilidad_neta / ingresos.total_ingresos) * 10000) / 100 : 0;

  res.json({
    periodo: { desde: desde || 'inicio del mes', hasta: hasta || 'fin del mes' },
    ingresos,
    gmv: gmv.total,
    gastos_operativos,
    total_gastos,
    utilidad_neta,
    margen_neto,
    clientes_activos: totalClientes
  });
});

function getComisionPct(montoTotal) {
  if (montoTotal >= 35000) return 3.5;
  if (montoTotal >= 20000) return 4.0;
  if (montoTotal >= 10000) return 4.5;
  return 5.0;
}

router.get('/proyecciones', (req, res) => {
  const {
    clientes, ticket_promedio, tasa_morosidad,
    cargo_gestion, interes_pct
  } = req.query;

  const numClientes = parseInt(clientes) || 0;
  const ticket = parseInt(ticket_promedio) || 0;
  const tasaMora = parseFloat(tasa_morosidad) || 0;
  const pctCom = getComisionPct(ticket);
  const cargo = parseFloat(cargo_gestion) || 150;
  const pctInteres = parseFloat(interes_pct) || 5;

  const gmv = numClientes * ticket;
  const clientesMora = Math.round(numClientes * tasaMora);

  const ingresos = numClientes > 0 ? {
    comision_servicio: Math.round(numClientes * ticket * pctCom / 100),
    cargo_gestion: Math.round(numClientes * cargo),
    interes_refinanciamiento: Math.round(clientesMora * ticket * pctInteres / 100),
    total_ingresos: 0
  } : { comision_servicio: 0, cargo_gestion: 0, interes_refinanciamiento: 0, total_ingresos: 0 };
  ingresos.total_ingresos = ingresos.comision_servicio + ingresos.cargo_gestion + ingresos.interes_refinanciamiento;

  const configGastos = db.prepare('SELECT concepto, valor, es_porcentaje FROM config_gastos').all();
  const cfg = Object.fromEntries(configGastos.map(g => [g.concepto, g]));

  const gastos = {
    costo_capital: Math.round(gmv * (cfg.costo_capital_pct?.valor ?? 1.5) / 100),
    verificacion_riesgo: Math.round(numClientes * (cfg.verificacion_riesgo?.valor ?? 50)),
    software_mensajeria: cfg.software_mensajeria?.valor ?? 3000,
    provision_impago: Math.round(gmv * (cfg.provision_impago_pct?.valor ?? 2) / 100),
    marketing_ventas: cfg.marketing_ventas?.valor ?? 5000,
    total_gastos: 0
  };
  gastos.total_gastos = Object.values(gastos).reduce((a, b) => a + b, 0);

  const utilidad_neta = ingresos.total_ingresos - gastos.total_gastos;
  const margen_neto = ingresos.total_ingresos > 0 ? Math.round((utilidad_neta / ingresos.total_ingresos) * 10000) / 100 : 0;

  res.json({
    parametros: { clientes: numClientes, ticket_promedio: ticket, tasa_morosidad: tasaMora, comision_pct: pctCom, cargo_gestion: cargo, interes_pct: pctInteres },
    ingresos,
    gastos,
    utilidad_neta,
    margen_neto
  });
});

router.get('/capital-ganancias', (req, res) => {
  const { desde, hasta } = req.query;
  let fechaFilter = '';
  const params = [];
  if (desde && hasta) {
    fechaFilter = 'WHERE fecha_pago >= ? AND fecha_pago <= ?';
    params.push(desde, hasta);
  }

  const totales = db.prepare(`
    SELECT
      COALESCE(SUM(monto_total), 0) as capital_invertido,
      COALESCE(SUM(comision_servicio), 0) as comision_servicio,
      COALESCE(SUM(cargo_gestion), 0) as cargo_gestion,
      COALESCE(SUM(interes_refinanciamiento), 0) as interes_refinanciamiento
    FROM pagos_consolidados ${fechaFilter}
  `).get(...params);

  const ganancias = totales.comision_servicio + totales.cargo_gestion + totales.interes_refinanciamiento;
  const roi = totales.capital_invertido > 0
    ? Math.round((ganancias / totales.capital_invertido) * 10000) / 100
    : 0;

  const historial = db.prepare(`
    SELECT strftime('%Y-%m', fecha_pago) as mes,
           COALESCE(SUM(monto_total), 0) as capital_invertido,
           COALESCE(SUM(comision_servicio + cargo_gestion + interes_refinanciamiento), 0) as ganancias
    FROM pagos_consolidados
    WHERE fecha_pago IS NOT NULL
    GROUP BY mes ORDER BY mes DESC LIMIT 12
  `).all();

  const total_operaciones = db.prepare(`SELECT COUNT(*) as total FROM pagos_consolidados ${fechaFilter}`).get(...params);

  res.json({
    capital_invertido: totales.capital_invertido,
    ganancias,
    roi,
    detalle: totales,
    total_operaciones: total_operaciones.total,
    historial
  });
});

module.exports = router;
