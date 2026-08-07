import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/client';

export default function Reportes() {
  const [estadoResultados, setEstadoResultados] = useState(null);
  const [configGastos, setConfigGastos] = useState([]);
  const [editandoGastos, setEditandoGastos] = useState(false);
  const [gastosForm, setGastosForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [capitalGanancias, setCapitalGanancias] = useState(null);

  const [proyParams, setProyParams] = useState({
    clientes: '', ticket_promedio: '', tasa_morosidad: '',
    cargo_gestion: 150, interes_pct: 5
  });
  const [proyResult, setProyResult] = useState(null);

  useEffect(() => {
    api.get('/reportes/estado-resultados').then(res => setEstadoResultados(res.data)).catch(() => {});
    api.get('/reportes/capital-ganancias').then(res => setCapitalGanancias(res.data)).catch(() => {});
    cargarConfig();
  }, []);

  const cargarConfig = () => {
    api.get('/config/gastos').then(res => {
      setConfigGastos(res.data);
      const form = {};
      res.data.forEach(g => { form[g.concepto] = String(g.valor); });
      setGastosForm(form);
    }).catch(() => {});
  };

  const guardarGastos = async () => {
    setGuardando(true);
    try {
      const items = Object.entries(gastosForm).map(([concepto, valor]) => ({
        concepto, valor: parseFloat(valor) || 0
      }));
      const res = await api.put('/config/gastos', { items });
      setConfigGastos(res.data);
      const form = {};
      res.data.forEach(g => { form[g.concepto] = String(g.valor); });
      setGastosForm(form);
      setEditandoGastos(false);
      api.get('/reportes/estado-resultados').then(r => setEstadoResultados(r.data));
    } catch (err) {
      alert('Error al guardar: ' + (err.response?.data?.error || err.message));
    } finally {
      setGuardando(false);
    }
  };

  const calcularProyeccion = async () => {
    if (!proyParams.clientes || !proyParams.ticket_promedio) return;
    const params = new URLSearchParams();
    Object.entries(proyParams).forEach(([k, v]) => { if (v) params.append(k, v); });
    try {
      const res = await api.get(`/reportes/proyecciones?${params.toString()}`);
      setProyResult(res.data);
    } catch (err) {
      alert('Error al calcular proyección');
    }
  };

  const limpiarProyeccion = () => {
    setProyParams({ clientes: '', ticket_promedio: '', tasa_morosidad: '', cargo_gestion: 150, interes_pct: 5 });
    setProyResult(null);
  };

  const formatMoney = (n) => `RD$${(n || 0).toLocaleString('es-DO')}`;
  const ticketPorcentaje = (m) => {
    if (m >= 35000) return 3.5;
    if (m >= 20000) return 4.0;
    if (m >= 10000) return 4.5;
    return 5.0;
  };

  return (
    <div>
      {estadoResultados && (
        <div className="card">
          <div className="card-header"><h3>Estado de Resultados</h3></div>
          <div className="grid-2">
            <div>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-600)' }}>Ingresos</h4>
              <table>
                <tbody>
                  <tr><td>Comisión por Servicio</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.ingresos.comision_servicio)}</td></tr>
                  <tr><td>Cargo de Gestión</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.ingresos.cargo_gestion)}</td></tr>
                  <tr><td>Interés Refinanciamiento</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.ingresos.interes_refinanciamiento)}</td></tr>
                  <tr style={{ borderTop: '2px solid var(--gray-300)' }}>
                    <td style={{ fontWeight: 700 }}>Total Ingresos</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatMoney(estadoResultados.ingresos.total_ingresos)}</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                GMV: {formatMoney(estadoResultados.gmv)} &middot; Clientes activos: {estadoResultados.clientes_activos}
              </p>
            </div>
            <div>
              <div className="flex-between">
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-600)' }}>Gastos Operativos</h4>
                <button className="btn btn-sm btn-ghost" onClick={() => setEditandoGastos(!editandoGastos)}>
                  {editandoGastos ? 'Cancelar' : 'Editar'}
                </button>
              </div>
              {editandoGastos ? (
                <div>
                  {configGastos.map(g => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0' }}>
                      <label style={{ fontSize: '0.8rem', flex: 1 }}>{g.etiqueta}</label>
                      <input className="form-control" type="number" step="any"
                        style={{ width: '120px' }}
                        value={gastosForm[g.concepto] ?? ''}
                        onChange={e => setGastosForm({...gastosForm, [g.concepto]: e.target.value})} />
                    </div>
                  ))}
                  <button className="btn btn-sm btn-primary" style={{ marginTop: '0.5rem' }}
                    onClick={guardarGastos} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              ) : (
                <table>
                  <tbody>
                    <tr><td>Costo de Capital ({(configGastos.find(g => g.concepto === 'costo_capital_pct')?.valor || 1.5)}%)</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.gastos_operativos.costo_capital)}</td></tr>
                    <tr><td>Verificación de Riesgo</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.gastos_operativos.verificacion_riesgo)}</td></tr>
                    <tr><td>Software/Mensajería</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.gastos_operativos.software_mensajeria)}</td></tr>
                    <tr><td>Provisión de Impago ({(configGastos.find(g => g.concepto === 'provision_impago_pct')?.valor || 2)}%)</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.gastos_operativos.provision_impago)}</td></tr>
                    <tr><td>Marketing y Ventas</td><td style={{ textAlign: 'right' }}>{formatMoney(estadoResultados.gastos_operativos.marketing_ventas)}</td></tr>
                    <tr style={{ borderTop: '2px solid var(--gray-300)' }}>
                      <td style={{ fontWeight: 700 }}>Total Gastos</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{formatMoney(estadoResultados.total_gastos)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Utilidad Meta</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: estadoResultados.utilidad_neta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatMoney(estadoResultados.utilidad_neta)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
              Margen Neto: {estadoResultados.margen_neto}%
            </div>
          </div>
        </div>
      )}

      {capitalGanancias && (
        <div className="card">
          <div className="card-header"><h3>Capital Invertido vs Ganancias</h3></div>
          <div className="grid-3">
            <div className="stat-card">
              <span className="label">Capital Invertido (Facturas Pagadas)</span>
              <span className="value">{formatMoney(capitalGanancias.capital_invertido)}</span>
              <span className="sub">{capitalGanancias.total_operaciones} operaciones</span>
            </div>
            <div className="stat-card success">
              <span className="label">Ganancias Generadas</span>
              <span className="value">{formatMoney(capitalGanancias.ganancias)}</span>
            </div>
            <div className="stat-card primary">
              <span className="label">ROI (Retorno sobre Inversión)</span>
              <span className="value">{capitalGanancias.roi}%</span>
            </div>
          </div>
          <div className="grid-2">
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--gray-600)' }}>Detalle de Ganancias</h4>
              <table>
                <tbody>
                  <tr><td>Comisión por Servicio</td><td style={{ textAlign: 'right' }}>{formatMoney(capitalGanancias.detalle.comision_servicio)}</td></tr>
                  <tr><td>Cargo de Gestión</td><td style={{ textAlign: 'right' }}>{formatMoney(capitalGanancias.detalle.cargo_gestion)}</td></tr>
                  <tr><td>Interés Refinanciamiento</td><td style={{ textAlign: 'right' }}>{formatMoney(capitalGanancias.detalle.interes_refinanciamiento)}</td></tr>
                  <tr style={{ borderTop: '2px solid var(--gray-300)' }}>
                    <td style={{ fontWeight: 700 }}>Total Ganancias</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatMoney(capitalGanancias.ganancias)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--gray-600)' }}>Evolución Mensual</h4>
              <div className="chart-container" style={{ height: '200px' }}>
                {capitalGanancias.historial?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...capitalGanancias.historial].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(v) => `RD$${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="capital_invertido" name="Capital Invertido" fill="var(--primary)" radius={[4,4,0,0]} />
                      <Bar dataKey="ganancias" name="Ganancias" fill="var(--success)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state">Sin datos históricos</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Proyecciones Financieras</h3>
          <button className="btn btn-sm btn-ghost" onClick={limpiarProyeccion}>Limpiar</button>
        </div>
        <div className="grid-2">
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--gray-600)' }}>Parámetros</h4>
            <div className="form-row">
              <div className="form-group">
                <label>N° Clientes</label>
                <input className="form-control" type="number" value={proyParams.clientes}
                  onChange={e => setProyParams({...proyParams, clientes: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Ticket Promedio (RD$)</label>
                <input className="form-control" type="number" value={proyParams.ticket_promedio}
                  onChange={e => setProyParams({...proyParams, ticket_promedio: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tasa de Morosidad (%)</label>
                <input className="form-control" type="number" step="0.01" value={proyParams.tasa_morosidad}
                  onChange={e => setProyParams({...proyParams, tasa_morosidad: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Comisión Servicio (%)</label>
                <input className="form-control" type="number" step="0.1" value={proyParams.comision_pct}
                  onChange={e => setProyParams({...proyParams, comision_pct: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cargo Gestión (RD$)</label>
                <input className="form-control" type="number" value={proyParams.cargo_gestion}
                  onChange={e => setProyParams({...proyParams, cargo_gestion: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Comisión Servicio (%)</label>
                <input className="form-control" type="number" step="0.1"
                  value={ticketPorcentaje(Number(proyParams.ticket_promedio) || 0)} disabled />
                <small style={{ color: 'var(--gray-500)', fontSize: '0.7rem' }}>Automática según ticket promedio</small>
              </div>
            </div>
            <div className="form-group">
              <label>Interés Refinanciamiento (%)</label>
              <input className="form-control" type="number" step="0.1" value={proyParams.interes_pct}
                onChange={e => setProyParams({...proyParams, interes_pct: e.target.value})} />
            </div>
            <button className="btn btn-primary" onClick={calcularProyeccion}>Calcular Proyección</button>
          </div>

          <div>
            {proyResult ? (
              <>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--gray-600)' }}>Resultado</h4>
                <div className="grid-3" style={{ marginBottom: '1rem' }}>
                  <div className="stat-card primary"><span className="label">GMV</span><span className="value">{formatMoney(proyResult.parametros.clientes * proyResult.parametros.ticket_promedio)}</span></div>
                  <div className="stat-card success"><span className="label">Utilidad Neta</span><span className="value">{formatMoney(proyResult.utilidad_neta)}</span></div>
                  <div className="stat-card"><span className="label" style={{ color: 'var(--secondary)' }}>Margen Neto</span><span className="value" style={{ color: 'var(--secondary)' }}>{proyResult.margen_neto}%</span></div>
                </div>
                <table>
                  <thead>
                    <tr><th colSpan="2">Ingresos</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Comisión Servicio</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.ingresos.comision_servicio)}</td></tr>
                    <tr><td>Cargo Gestión</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.ingresos.cargo_gestion)}</td></tr>
                    <tr><td>Interés Refinanciamiento</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.ingresos.interes_refinanciamiento)}</td></tr>
                  </tbody>
                  <thead>
                    <tr><th colSpan="2">Gastos</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Costo Capital</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.gastos.costo_capital)}</td></tr>
                    <tr><td>Verificación Riesgo</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.gastos.verificacion_riesgo)}</td></tr>
                    <tr><td>Software/Mensajería</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.gastos.software_mensajeria)}</td></tr>
                    <tr><td>Provisión Impago</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.gastos.provision_impago)}</td></tr>
                    <tr><td>Marketing</td><td style={{ textAlign: 'right' }}>{formatMoney(proyResult.gastos.marketing_ventas)}</td></tr>
                  </tbody>
                </table>
              </>
            ) : (
              <div className="empty-state">Ingresa los parámetros y haz clic en "Calcular Proyección"</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
