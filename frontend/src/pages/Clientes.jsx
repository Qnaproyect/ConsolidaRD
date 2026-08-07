import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(null);
  const [notifModal, setNotifModal] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ tipo_persona: 'fisica', nombre: '', cedula_ruc: '', email: '', telefono: '', direccion: '', ingreso_mensual: '' });

  const load = () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/clientes${params}`).then(res => setClientes(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [search]);

  const openModal = (cliente) => {
    if (cliente) {
      setEditando(cliente);
      setForm({ tipo_persona: cliente.tipo_persona, nombre: cliente.nombre, cedula_ruc: cliente.cedula_ruc, email: cliente.email, telefono: cliente.telefono, direccion: cliente.direccion || '', ingreso_mensual: String(cliente.ingreso_mensual || '') });
    } else {
      setEditando(null);
      setForm({ tipo_persona: 'fisica', nombre: '', cedula_ruc: '', email: '', telefono: '', direccion: '', ingreso_mensual: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/clientes/${editando.id}`, form);
      } else {
        await api.post('/clientes', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar cliente');
    }
  };

  const desactivar = async (id) => {
    if (!confirm('¿Desactivar este cliente?')) return;
    await api.delete(`/clientes/${id}`);
    load();
  };

  useEffect(() => {
    const cerrar = () => setDropdownAbierto(null);
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, []);

  const abrirNotificacion = (cliente, tipo) => {
    setDropdownAbierto(null);
    setNotifModal({ cliente, tipo });
    setEnviado(false);
  };

  const enviarNotificacion = () => {
    setEnviado(true);
  };

  return (
    <div>
      <div className="flex-between">
        <div className="search-bar" style={{ flex: 1, marginRight: '1rem', marginBottom: 0 }}>
          <input className="form-control" placeholder="Buscar por nombre, cédula o email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => openModal(null)}>+ Nuevo Cliente</button>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        {clientes.length === 0 ? (
          <div className="empty-state">No se encontraron clientes</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Cédula/RUC</th><th>Email</th><th>Teléfono</th><th>Tipo</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id}>
                  <td><Link to={`/clientes/${c.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>{c.nombre}</Link></td>
                  <td>{c.cedula_ruc}</td>
                  <td>{c.email}</td>
                  <td>{c.telefono}</td>
                  <td>{c.tipo_persona === 'fisica' ? 'Física' : 'Jurídica'}</td>
                  <td><span className={`badge ${c.activo ? 'badge-success' : 'badge-gray'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => openModal(c)}>Editar</button>
                    {c.activo ? <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)', marginLeft: '0.25rem' }} onClick={() => desactivar(c.id)}>Desactivar</button> : null}
                    <div style={{ position: 'relative', display: 'inline-block', marginLeft: '0.25rem' }}>
                      <button className="btn btn-sm btn-primary"
                        onClick={e => { e.stopPropagation(); setDropdownAbierto(dropdownAbierto === c.id ? null : c.id); }}>
                        Notificar ▾
                      </button>
                      {dropdownAbierto === c.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 50,
                          background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                          minWidth: '200px', padding: '0.25rem', marginTop: '0.25rem'
                        }}>
                          <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: '4px' }}
                            onClick={e => { e.stopPropagation(); abrirNotificacion(c, 'solvencia'); }}>
                            ✓ Informar Solvencia
                          </button>
                          <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: '4px', color: 'var(--primary)' }}
                            onClick={e => { e.stopPropagation(); abrirNotificacion(c, 'factura'); }}>
                            📄 Enviar Factura Final
                          </button>
                        </div>
                      )}
                    </div>
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
            <h3>{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tipo de Persona</label>
                <select className="form-control" value={form.tipo_persona}
                  onChange={e => setForm({...form, tipo_persona: e.target.value})}>
                  <option value="fisica">Persona Física</option>
                  <option value="juridica">Persona Jurídica</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nombre o Razón Social</label>
                <input className="form-control" value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cédula / RUC</label>
                  <input className="form-control" value={form.cedula_ruc}
                    onChange={e => setForm({...form, cedula_ruc: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input className="form-control" value={form.telefono}
                    onChange={e => setForm({...form, telefono: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-control" type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input className="form-control" value={form.direccion}
                  onChange={e => setForm({...form, direccion: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Ingreso Mensual (RD$)</label>
                <input className="form-control" type="number" value={form.ingreso_mensual}
                  onChange={e => setForm({...form, ingreso_mensual: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editando ? 'Guardar Cambios' : 'Crear Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notifModal && (
        <div className="modal-overlay" onClick={() => setNotifModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{notifModal.tipo === 'solvencia' ? 'Notificar Solvencia' : 'Enviar Factura Final'}</h3>
            {!enviado ? (
              <>
                <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 600 }}>{notifModal.cliente.nombre}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Cédula/RUC: {notifModal.cliente.cedula_ruc}</p>
                  <p style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>📧</span> {notifModal.cliente.email}
                  </p>
                  <p style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>💬</span> WhatsApp: {notifModal.cliente.telefono}
                  </p>
                </div>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {notifModal.tipo === 'solvencia'
                    ? 'Se notificará al cliente que se encuentra solvente con sus pagos.'
                    : 'Se enviará la factura final consolidada al cliente.'}
                </p>
                <div style={{ background: 'var(--gray-50)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Canales de envío</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-info">📧 Email</span>
                    <span className="badge badge-success">💬 WhatsApp</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
                  El cliente recibirá la notificación por ambos canales para mayor alcance.
                </p>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => setNotifModal(null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={enviarNotificacion}>
                    Enviar por Email + WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                <p style={{ fontWeight: '600', fontSize: '1rem' }}>
                  Notificación enviada correctamente a {notifModal.cliente.nombre}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
                  <span className="badge badge-info">📧 {notifModal.cliente.email}</span>
                  <span className="badge badge-success">💬 WhatsApp ({notifModal.cliente.telefono})</span>
                </div>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setNotifModal(null)}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
