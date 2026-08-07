import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import ClienteDetalle from './pages/ClienteDetalle';
import Facturas from './pages/Facturas';
import Cobros from './pages/Cobros';
import Refinanciamientos from './pages/Refinanciamientos';
import Reportes from './pages/Reportes';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const auth = useAuth();

  return (
    <Routes>
      <Route path="/login" element={localStorage.getItem('token') ? <Navigate to="/" replace /> : <Login login={auth.login} />} />
      <Route path="/" element={<ProtectedRoute><Layout usuario={auth.usuario} logout={auth.logout} /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalle />} />
        <Route path="facturas" element={<Facturas />} />
        <Route path="cobros" element={<Cobros />} />
        <Route path="refinanciamientos" element={<Refinanciamientos />} />
        <Route path="reportes" element={<Reportes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
