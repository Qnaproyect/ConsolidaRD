import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Cobros() {
  const [data, setData] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [cobrandoId, setCobrandoId] = useState(null);
  const [cobrandoTotal, setCobrandoTotal] = useState(0);
  const [form, setForm] = useState({ fecha_cobro: '', tipo_pago: 'efectivo', imagen_pago: '', monto_cobrado: '' });
  const [procesando, setProcesando] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    const params = filtro ? `?estado=${filtro}` : '';
    api.get(`/cobros${params}`).then(res => setData(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [filtro]);

  const abrirModal = (pago) => {
    setCobrandoId(pago.id);
    setCobrandoTotal(pago.total_cobrado);
    setForm({
      fecha_cobro: new Date().toISOString().split('T')[0],
      tipo_pago: 'efectivo',
      imagen_pago: '',
      monto_cobrado: String(pago.total_cobrado)
    });
    setShowModal(true);
  };

  const convertirImagenABase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fecha_cobro) return alert('La fecha es requerida');
    if (!form.monto_cobrado || parseFloat(form.monto_cobrado) <= 0) return alert('El monto es requerido');

    setProcesando(true);
    try {
      await api.put(`/cobros/${cobrandoId}/cobrar`, {
        fecha_cobro: form.fecha_cobro,
        tipo_pago: form.tipo_pago,
        imagen_pago: form.imagen_pago || null
      });
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al procesar cobro');
    } finally {
      setProcesando(false);
    }
  };

  const formatMoney = (n) => `RD$${(n || 0).toLocaleString('es-DO')}`;

  if (!data) return <div className="empty-state">Cargando...</div>;

  return (
    <div>
      <div className="grid-3">
        <div className="stat-card warning">
          <span className="label">Por Cobrar</span>
          <span className="value">{formatMoney(data.resumen.por_cobrar)}</span>
          <span className="sub">{data.resumen.pendientes_count} pendientes</span>
        </div>
        <div className="stat-card success">
          <span className="label">Cobrado</span>
          <span className="value">{formatMoney(data.resumen.cobrado)}</span>
          <span className="sub">{data.resumen.cobrados_count} cobrados</span>
        </div>
        <div className="stat-card danger">
          <span className="label">Atrasado</span>
          <span className="value">{formatMoney(data.resumen.atrasado)}</span>
          <span className="sub">{data.resumen.atrasados_count} atrasados</span>
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Cobros a Clientes</h3>
          <select className="form-control" style={{ width: '180px' }} value={filtro}
            onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="completado">Cobrados</option>
            <option value="atrasado">Atrasados</option>
          </select>
        </div>

        {data.cobros.length === 0 ? (
          <div className="empty-state">No hay cobros registrados</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Período</th>
                <th>Capital (Facturas)</th>
                <th>Comisiones</th>
                <th>Total a Cobrar</th>
                <th>Registro</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.cobros.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/clientes/${p.cliente_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {p.cliente_nombre}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{p.cedula_ruc}</div>
                  </td>
                  <td>{p.periodo}</td>
                  <td>{formatMoney(p.monto_total)}</td>
                  <td>{formatMoney(p.comision_servicio + p.cargo_gestion)}</td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(p.total_cobrado)}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(p.fecha_pago).toLocaleDateString('es-DO')}</td>
                  <td>
                    <span className={`badge ${p.estado === 'completado' ? 'badge-success' : p.estado === 'atrasado' ? 'badge-danger' : 'badge-warning'}`}>
                      {p.estado === 'completado' ? 'Cobrado' : p.estado === 'atrasado' ? 'Atrasado' : 'Pendiente'}
                    </span>
                    {p.tipo_pago && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                        {p.tipo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                        {p.fecha_cobro && ` · ${new Date(p.fecha_cobro).toLocaleDateString('es-DO')}`}
                      </div>
                    )}
                  </td>
                  <td>
                    {p.estado !== 'completado' ? (
                      <button className="btn btn-sm btn-success" onClick={() => abrirModal(p)}>
                        Cobrar
                      </button>
                    ) : p.imagen_pago ? (
                      <button className="btn btn-sm btn-ghost" onClick={() => window.open(p.imagen_pago)}>
                        Ver comprobante
                      </button>
                    ) : null}
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
            <h3>Registrar Cobro</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Total a cobrar: <strong style={{ color: 'var(--success)' }}>{formatMoney(cobrandoTotal)}</strong>
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Fecha del Cobro</label>
                <input className="form-control" type="date" value={form.fecha_cobro}
                  onChange={e => setForm({...form, fecha_cobro: e.target.value})} required />
              </div>

              <div className="form-group">
                <label>Tipo de Pago</label>
                <select className="form-control" value={form.tipo_pago}
                  onChange={e => setForm({...form, tipo_pago: e.target.value, imagen_pago: ''})}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>

              {form.tipo_pago === 'transferencia' && (
                <div className="form-group">
                  <label>Subir imagen del comprobante de pago</label>
                  <input className="form-control" type="file" accept="image/*" ref={fileInputRef}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const b64 = await convertirImagenABase64(file);
                        setForm({...form, imagen_pago: b64});
                      }
                    }} />
                  {form.imagen_pago && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img src={form.imagen_pago} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: 'var(--radius)' }} />
                    </div>
                  )}
                </div>
              )}

              {form.tipo_pago === 'efectivo' && (
                <div className="form-group">
                  <label>Monto Recibido (RD$)</label>
                  <input className="form-control" type="number" value={form.monto_cobrado}
                    onChange={e => setForm({...form, monto_cobrado: e.target.value})} required />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success" disabled={procesando}>
                  {procesando ? 'Procesando...' : 'Procesar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
