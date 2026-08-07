import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function ClienteDetalle() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`/clientes/${id}`),
      api.get(`/facturas?cliente_id=${id}`),
      api.get(`/pagos?cliente_id=${id}`)
    ]).then(([c, f, p]) => {
      setCliente(c.data);
      setFacturas(f.data);
      setPagos(p.data);
    }).catch(() => {});
  }, [id]);

  if (!cliente) return <div className="empty-state">Cargando...</div>;

  const formatMoney = (n) => `RD$${(n || 0).toLocaleString('es-DO')}`;

  return (
    <div>
      <Link to="/clientes" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem' }}>&larr; Volver a clientes</Link>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="flex-between">
          <div>
            <h3>{cliente.nombre}</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {cliente.tipo_persona === 'fisica' ? 'Persona Física' : 'Persona Jurídica'} &middot; {cliente.cedula_ruc}
            </p>
          </div>
          <span className={`badge ${cliente.activo ? 'badge-success' : 'badge-gray'}`}>
            {cliente.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="grid-3" style={{ marginTop: '1rem' }}>
          <div><strong>Email:</strong> {cliente.email}</div>
          <div><strong>Teléfono:</strong> {cliente.telefono}</div>
          <div><strong>Ingreso Mensual:</strong> {formatMoney(cliente.ingreso_mensual)}</div>
          {cliente.direccion && <div><strong>Dirección:</strong> {cliente.direccion}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Facturas</h3></div>
        {facturas.length === 0 ? <div className="empty-state">Sin facturas registradas</div> : (
          <table>
            <thead>
              <tr><th>Concepto</th><th>Proveedor</th><th>Monto</th><th>Vencimiento</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
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

      <div className="card">
        <div className="card-header"><h3>Historial de Pagos Consolidados</h3></div>
        {pagos.length === 0 ? <div className="empty-state">Sin pagos registrados</div> : (
          <table>
            <thead>
              <tr><th>Período</th><th>Monto Facturas</th><th>Comisiones</th><th>Total Cobrado</th><th>Fecha</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id}>
                  <td>{p.periodo}</td>
                  <td>{formatMoney(p.monto_total)}</td>
                  <td>{formatMoney(p.comision_servicio + p.cargo_gestion)}</td>
                  <td style={{ fontWeight: 600 }}>{formatMoney(p.total_cobrado)}</td>
                  <td>{new Date(p.fecha_pago).toLocaleDateString('es-DO')}</td>
                  <td>
                    <span className={`badge ${p.estado === 'completado' ? 'badge-success' : p.estado === 'atrasado' ? 'badge-danger' : 'badge-warning'}`}>
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
