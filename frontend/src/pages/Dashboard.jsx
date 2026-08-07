import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cobrosResumen, setCobrosResumen] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data)).catch(() => {});
    api.get('/cobros').then(res => setCobrosResumen(res.data.resumen)).catch(() => {});
  }, []);

  if (!data) return <div className="empty-state">Cargando dashboard...</div>;

  const formatMoney = (n) => `RD$${(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div>
      <div className="grid-4">
        <div className="stat-card primary">
          <span className="label">Clientes Activos</span>
          <span className="value">{data.totalClientes}</span>
        </div>
        <div className="stat-card warning">
          <span className="label">Facturas Pendientes</span>
          <span className="value">{data.totalFacturasPendientes}</span>
        </div>
        <div className="stat-card success">
          <span className="label">Ingresos del Mes</span>
          <span className="value">{formatMoney(data.ingresosMes)}</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <span className="label">Por Cobrar a Clientes</span>
          <span className="value" style={{ color: 'var(--secondary)' }}>{formatMoney(cobrosResumen?.por_cobrar)}</span>
          <span className="sub">{cobrosResumen?.pendientes_count || 0} pendientes · {cobrosResumen?.atrasados_count || 0} atrasados</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Ingresos del Mes</h3></div>
          <table>
            <tbody>
              <tr><td>Monto Total Facturado</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(data.ingresosDetalle?.monto_total)}</td></tr>
              <tr><td>Comisión por Servicio</td><td style={{ textAlign: 'right' }}>{formatMoney(data.ingresosDetalle?.comision_servicio)}</td></tr>
              <tr><td>Cargo Fijo de Gestión</td><td style={{ textAlign: 'right' }}>{formatMoney(data.ingresosDetalle?.cargo_gestion)}</td></tr>
              <tr><td>Interés Refinanciamiento</td><td style={{ textAlign: 'right' }}>{formatMoney(data.ingresosDetalle?.interes_refinanciamiento)}</td></tr>
              <tr style={{ borderTop: '2px solid var(--gray-300)' }}>
                <td style={{ fontWeight: 700 }}>Total Cobrado</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatMoney(data.ingresosDetalle?.total_cobrado)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header"><h3>Refinanciamientos Activos</h3></div>
          <table>
            <tbody>
              <tr><td>Cantidad de Refinanciamientos</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{data.refinanciamientosActivos?.total || 0}</td></tr>
              <tr><td>Monto Total por Cobrar</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(data.refinanciamientosActivos?.monto)}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: '1rem' }}>
            <Link to="/refinanciamientos" className="btn btn-sm btn-ghost">Ver refinanciamientos</Link>
          </div>
        </div>
      </div>

      {data.ingresosUltimos6?.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Ingresos Últimos 6 Meses</h3></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ingresosUltimos6.map(i => ({ mes: i.mes, Ingresos: i.total }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => `RD$${v.toLocaleString()}`} />
                <Bar dataKey="Ingresos" fill="var(--primary)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Facturas Próximas a Vencer (7 días)</h3>
          <Link to="/facturas" className="btn btn-sm btn-ghost">Ver todas</Link>
        </div>
        {data.facturasProximas?.length > 0 ? (
          <table>
            <thead>
              <tr><th>Cliente</th><th>Concepto</th><th>Proveedor</th><th>Monto</th><th>Vencimiento</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {data.facturasProximas.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{f.cliente_nombre}</td>
                  <td>{f.concepto}</td>
                  <td>{f.proveedor}</td>
                  <td>{formatMoney(f.monto_original)}</td>
                  <td style={{ fontWeight: 600 }}>{new Date(f.fecha_vencimiento).toLocaleDateString('es-DO')}</td>
                  <td>
                    {f.dias_para_vencer > 0 ? (
                      <span className="badge badge-info">Vence en {f.dias_para_vencer} días</span>
                    ) : f.dias_prorroga_restantes > 0 ? (
                      <span className="badge badge-warning">Prórroga ({f.dias_prorroga_restantes} días restantes)</span>
                    ) : (
                      <span className="badge badge-danger">Vencida</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No hay facturas pendientes con vencimiento en los próximos 30 días</div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Clientes Recientes</h3>
          <Link to="/clientes" className="btn btn-sm btn-ghost">Ver todos</Link>
        </div>
        {data.clientesRecientes?.length > 0 ? (
          <table>
            <thead>
              <tr><th>Nombre</th><th>Cédula/RUC</th><th>Registro</th></tr>
            </thead>
            <tbody>
              {data.clientesRecientes.map(c => (
                <tr key={c.id}>
                  <td><Link to={`/clientes/${c.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{c.nombre}</Link></td>
                  <td>{c.cedula_ruc}</td>
                  <td>{new Date(c.creado_en).toLocaleDateString('es-DO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No hay clientes registrados aún</div>
        )}
      </div>
    </div>
  );
}
