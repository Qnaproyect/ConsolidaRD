import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Refinanciamientos() {
  const [refis, setRefis] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ pago_consolidado_id: '', cliente_id: '', monto_adeudado: '', interes_pct: 5, cuotas: 3 });
  const [pagosSinPagar, setPagosSinPagar] = useState([]);

  const load = () => {
    api.get('/refinanciamientos').then(res => setRefis(res.data)).catch(() => {});
  };

  useEffect(() => { load(); api.get('/clientes?activo=1').then(res => setClientes(res.data)); }, []);

  const openModal = async (clienteId) => {
    setForm({ pago_consolidado_id: '', cliente_id: clienteId || '', monto_adeudado: '', interes_pct: 5, cuotas: 3 });
    if (clienteId) {
      const res = await api.get(`/pagos?cliente_id=${clienteId}&estado=pendiente`);
      setPagosSinPagar(res.data);
    } else {
      setPagosSinPagar([]);
    }
    setShowModal(true);
  };

  const handleClienteChange = async (clienteId) => {
    setForm({ ...form, cliente_id: clienteId, pago_consolidado_id: '' });
    if (clienteId) {
      const res = await api.get(`/pagos?cliente_id=${clienteId}&estado=pendiente`);
      setPagosSinPagar(res.data);
    } else {
      setPagosSinPagar([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/refinanciamientos', {
        ...form,
        monto_adeudado: parseFloat(form.monto_adeudado),
        interes_pct: parseFloat(form.interes_pct),
        cuotas: parseInt(form.cuotas)
      });
      setShowModal(false);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al crear refinanciamiento'); }
  };

  const pagarCuota = async (refiId, numero) => {
    try {
      await api.put(`/refinanciamientos/${refiId}/cuota/${numero}`);
      load();
    } catch (err) { alert('Error al registrar pago de cuota'); }
  };

  const formatMoney = (n) => `RD$${(n || 0).toLocaleString('es-DO')}`;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Gestión de Refinanciamientos</h3>
        <button className="btn btn-primary" onClick={() => openModal('')}>+ Nuevo Refinanciamiento</button>
      </div>

      {refis.length === 0 ? (
        <div className="card"><div className="empty-state">No hay refinanciamientos registrados</div></div>
      ) : (
        refis.map(refi => (
          <div className="card" key={refi.id}>
            <div className="flex-between">
              <div>
                <strong>{refi.cliente_nombre}</strong>
                <span style={{ color: 'var(--gray-500)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>{refi.cedula_ruc}</span>
                <span className={`badge ${refi.estado === 'activo' ? 'badge-warning' : refi.estado === 'pagado' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: '0.75rem' }}>
                  {refi.estado.charAt(0).toUpperCase() + refi.estado.slice(1)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{formatMoney(refi.total_a_pagar)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total a pagar</div>
              </div>
            </div>
            <div className="grid-3" style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
              <div><strong>Periodo original:</strong> {refi.periodo}</div>
              <div><strong>Monto adeudado:</strong> {formatMoney(refi.monto_adeudado)}</div>
              <div><strong>Interés ({refi.interes_pct || (refi.interes / refi.monto_adeudado * 100).toFixed(1)}%):</strong> {formatMoney(refi.interes)}</div>
              <div><strong>Cuotas:</strong> {refi.cuotas}</div>
              <div><strong>Cuotas pagadas:</strong> {refi.cuotas?.filter(c => c.fecha_pago).length || 0} / {refi.cuotas?.length || 0}</div>
              <div><strong>Monto por cuota:</strong> {formatMoney((refi.total_a_pagar / refi.cuotas))}</div>
            </div>
            {refi.cuotas?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <table>
                  <thead>
                    <tr><th>Cuota</th><th>Monto</th><th>Estado</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {refi.cuotas.map(c => (
                      <tr key={c.id}>
                        <td>Cuota {c.numero_cuota} de {refi.cuotas}</td>
                        <td>{formatMoney(c.monto)}</td>
                        <td>
                          {c.fecha_pago
                            ? <span className="badge badge-success">Pagada {new Date(c.fecha_pago).toLocaleDateString('es-DO')}</span>
                            : <span className="badge badge-warning">Pendiente</span>}
                        </td>
                        <td>
                          {!c.fecha_pago && refi.estado === 'activo' && (
                            <button className="btn btn-sm btn-success" onClick={() => pagarCuota(refi.id, c.numero_cuota)}>Registrar Pago</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nuevo Refinanciamiento</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Cliente</label>
                <select className="form-control" value={form.cliente_id} onChange={e => handleClienteChange(e.target.value)} required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {form.cliente_id && (
                <div className="form-group">
                  <label>Pago Pendiente a Refinanciar</label>
                  <select className="form-control" value={form.pago_consolidado_id} onChange={e => {
                    const pago = pagosSinPagar.find(p => p.id === Number(e.target.value));
                    setForm({...form, pago_consolidado_id: e.target.value, monto_adeudado: pago ? pago.total_cobrado : '' });
                  }} required>
                    <option value="">Seleccionar pago...</option>
                    {pagosSinPagar.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.periodo} - {formatMoney(p.total_cobrado)} ({p.cliente_nombre})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Monto Adeudado (RD$)</label>
                  <input className="form-control" type="number" value={form.monto_adeudado}
                    onChange={e => setForm({...form, monto_adeudado: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Tasa de Interés (%)</label>
                  <input className="form-control" type="number" step="0.1" value={form.interes_pct}
                    onChange={e => setForm({...form, interes_pct: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Número de Cuotas</label>
                <select className="form-control" value={form.cuotas} onChange={e => setForm({...form, cuotas: e.target.value})}>
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} cuota{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Refinanciamiento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
