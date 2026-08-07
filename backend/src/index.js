require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const facturasRoutes = require('./routes/facturas');
const pagosRoutes = require('./routes/pagos');
const refinanciamientosRoutes = require('./routes/refinanciamientos');
const dashboardRoutes = require('./routes/dashboard');
const reportesRoutes = require('./routes/reportes');
const configRoutes = require('./routes/config');
const cobrosRoutes = require('./routes/cobros');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/refinanciamientos', refinanciamientosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/cobros', cobrosRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Consolida RD API corriendo en puerto ${PORT}`);
});
