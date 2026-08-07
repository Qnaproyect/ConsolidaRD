import { Outlet, Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/clientes', label: 'Clientes', icon: '👥' },
  { path: '/facturas', label: 'Facturas', icon: '📄' },
  { path: '/cobros', label: 'Cobros', icon: '💰' },
  { path: '/refinanciamientos', label: 'Refinanciamientos', icon: '🔄' },
  { path: '/reportes', label: 'Reportes', icon: '📈' },
  { path: '/disashop', label: 'Disashop', icon: '💳', external: true },
];

export default function Layout({ usuario, logout }) {
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Consolida RD</h1>
          <p>Portal Administrativo</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item =>
            item.external ? (
              <a key={item.path} href="https://www.disashop.com/do/" target="_blank" rel="noopener noreferrer">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          )}
        </nav>
      </aside>
      <main className="main-content">
        <header className="header">
          <h2>{navItems.find(n =>
            location.pathname === n.path ||
            (n.path !== '/' && location.pathname.startsWith(n.path))
          )?.label || 'Dashboard'}</h2>
          <div className="header-right">
            <span className="header-user">{usuario?.nombre || 'Usuario'}</span>
            <button className="btn-logout" onClick={logout}>Cerrar sesión</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
