import { useState, useEffect } from 'react';
import api from '../api/client';

const defaultVencimiento = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [form, setForm] = useState({ cliente_id: '', concepto: '', proveedor: '', monto_original: '', fecha_vencimiento: defaultVencimiento() });
  const [pagoForm, setPagoForm] = useState({ cliente_id: '', facturas_ids: [], periodo: '', cargo_gestion: 150 });

  const getComisionPct = (monto) => {
    if (monto >= 35000) return 3.5;
    if (monto >= 20000) return 4.0;
    if (monto >= 10000) return 4.5;
    return 5.0;
  };

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (filtroEstado) params.append('estado', filtroEstado);
    api.get(`/facturas?${params.toString()}`).then(res => setFacturas(res.data)).catch(() => {});
  };

  useEffect(() => { load(); api.get('/clientes?activo=1').then(res => setClientes(res.data)); }, []);

  useEffect(() => { load(); }, [search, filtroEstado]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/facturas', { ...form, monto_original: parseFloat(form.monto_original) });
      setShowModal(false);
      setForm({ cliente_id: '', concepto: '', proveedor: '', monto_original: '', fecha_vencimiento: defaultVencimiento() });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handlePago = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pagos', {
        ...pagoForm,
        cargo_gestion: parseFloat(pagoForm.cargo_gestion)
      });
      setShowPagoModal(false);
      setPagoForm({ cliente_id: '', facturas_ids: [], periodo: '', cargo_gestion: 150 });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al procesar pago'); }
  };

  const toggleFacturaPago = (id) => {
    setPagoForm(prev => ({
      ...prev,
      facturas_ids: prev.facturas_ids.includes(id)
        ? prev.facturas_ids.filter(f => f !== id)
        : [...prev.facturas_ids, id]
    }));
  };

  const formatMoney = (n) => `RD$${(n || 0).toLocaleString('es-DO')}`;
  const facturasPendientes = facturas.filter(f => f.cliente_id === (pagoForm.cliente_id ? Number(pagoForm.cliente_id) : null) || !pagoForm.cliente_id);

  const totalPago = facturas.filter(f => pagoForm.facturas_ids.includes(f.id)).reduce((s, f) => s + f.monto_original, 0);

  return (
    <div>
      <div className="flex-between">
        <div className="search-bar" style={{ flex: 1, marginRight: '1rem', marginBottom: 0 }}>
          <input className="form-control" placeholder="Buscar factura..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-control" style={{ width: '180px' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_prorroga">En Prórroga</option>
            <option value="pagada">Pagada</option>
            <option value="refinanciada">Refinanciada</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-success" onClick={() => setShowPagoModal(true)}>+ Registrar Pago</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nueva Factura</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        {facturas.length === 0 ? <div className="empty-state">No hay facturas</div> : (
          <table>
            <thead>
              <tr><th>Cliente</th><th>Concepto</th><th>Proveedor</th><th>Monto</th><th>Vencimiento</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{f.cliente_nombre}</td>
                  <td>{f.concepto}</td>
                  <td>{f.proveedor}</td>
                  <td>{formatMoney(f.monto_original)}</td>
                  <td>{new Date(f.fecha_vencimiento).toLocaleDateString('es-DO')}</td>
                  <td>
                    <span className={`badge ${(() => {
                      const st = f.estado_calculado || f.estado;
                      return st === 'pagada' ? 'badge-success' : st === 'vencida' ? 'badge-danger' : st === 'refinanciada' ? 'badge-info' : st === 'en_prorroga' ? 'badge-warning' : 'badge-gray';
                    })()}`}>
                      {(() => {
                        const st = f.estado_calculado || f.estado;
                        if (st === 'en_prorroga') return 'En Prórroga';
                        return st.charAt(0).toUpperCase() + st.slice(1);
                      })()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nueva Factura</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Cliente</label>
                <select className="form-control" value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.cedula_ruc})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Concepto</label>
                  <select className="form-control" value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} required>
                    <option value="">Seleccionar concepto...</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Agua">Agua</option>
                    <option value="Internet">Internet</option>
                    <option value="Cable">Cable</option>
                    <option value="Streaming / Suscripciones">Streaming / Suscripciones</option>
                    <option value="Celular Postpago">Celular Postpago</option>
                    <option value="Seguros">Seguros</option>
                    <option value="Prestamos">Préstamos</option>
                    <option value="Colegios">Colegios</option>
                    <option value="Condominio">Condominio</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <select className="form-control" value={form.proveedor} onChange={e => setForm({...form, proveedor: e.target.value})} required>
                    <option value="">Seleccionar proveedor...</option>
                    <option value="EDEEste">EDEEste</option>
                    <option value="EDENorte">EDENorte</option>
                    <option value="EDESur">EDESur</option>
                    <option value="CEPM">CEPM</option>
                    <option value="CAASD">CAASD</option>
                    <option value="INAPA">INAPA</option>
                    <option value="CORAASAN">CORAASAN</option>
                    <option value="Claro">Claro</option>
                    <option value="Altice">Altice</option>
                    <option value="Wind Telecom">Wind Telecom</option>
                    <option value="Netflix">Netflix</option>
                    <option value="Spotify">Spotify</option>
                    <option value="Disney+">Disney+</option>
                    <option value="Amazon Prime">Amazon Prime</option>
                    <option value="YouTube Premium">YouTube Premium</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Monto (RD$)</label>
                  <input className="form-control" type="number" value={form.monto_original} onChange={e => setForm({...form, monto_original: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Fecha de Vencimiento (+30 días por defecto)</label>
                  <input className="form-control" type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Factura</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPagoModal && (
        <div className="modal-overlay" onClick={() => setShowPagoModal(false)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <h3>Registrar Pago Consolidado</h3>
            <form onSubmit={handlePago}>
              <div className="form-group">
                <label>Cliente</label>
                <select className="form-control" value={pagoForm.cliente_id} onChange={e => setPagoForm({...pagoForm, cliente_id: e.target.value, facturas_ids: []})} required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.cedula_ruc})</option>)}
                </select>
              </div>

              {pagoForm.cliente_id && (
                <>
                  <div className="form-group">
                    <label>Seleccionar Facturas Pendientes</label>
                    {facturas.filter(f => f.cliente_id === Number(pagoForm.cliente_id) && f.estado === 'pendiente').length === 0 ? (
                      <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>No hay facturas pendientes para este cliente</p>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                        {facturas.filter(f => f.cliente_id === Number(pagoForm.cliente_id) && f.estado === 'pendiente').map(f => (
                          <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={pagoForm.facturas_ids.includes(f.id)} onChange={() => toggleFacturaPago(f.id)} />
                            <span style={{ flex: 1 }}>{f.concepto} - {f.proveedor}</span>
                            <span style={{ fontWeight: 600 }}>{formatMoney(f.monto_original)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Período</label>
                      <input className="form-control" type="month" value={pagoForm.periodo} onChange={e => setPagoForm({...pagoForm, periodo: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Comisión Servicio (%)</label>
                      <input className="form-control" type="number" value={totalPago > 0 ? getComisionPct(totalPago) : ''} step="0.1" disabled readOnly />
                      <small className="muted">Automática según monto consolidado</small>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cargo Gestión (RD$)</label>
                      <input className="form-control" type="number" value={pagoForm.cargo_gestion} onChange={e => setPagoForm({...pagoForm, cargo_gestion: e.target.value})} />
                    </div>
                  </div>

                  {totalPago > 0 && (
                    <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius)', marginTop: '0.5rem' }}>
                      <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>Total facturas:</span><span style={{ fontWeight: 600 }}>{formatMoney(totalPago)}</span>
                      </p>
                      <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>Comisión ({getComisionPct(totalPago)}%):</span><span>{formatMoney(totalPago * getComisionPct(totalPago) / 100)}</span>
                      </p>
                      <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>Cargo gestión:</span><span>{formatMoney(parseFloat(pagoForm.cargo_gestion || 150))}</span>
                      </p>
                      <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--gray-300)' }} />
                      <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem' }}>
                        <span>Total a cobrar:</span><span style={{ color: 'var(--success)' }}>{formatMoney(totalPago + totalPago * getComisionPct(totalPago) / 100 + parseFloat(pagoForm.cargo_gestion || 150))}</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPagoModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success" disabled={pagoForm.facturas_ids.length === 0}>Procesar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
