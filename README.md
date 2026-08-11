# Consolida RD

Portal administrativo para la consolidación de pagos de servicios (República Dominicana). Gestión de clientes, facturas, cobros, refinanciamientos y reportes financieros.

## Requisitos

- **Node.js 22.5 o superior** → https://nodejs.org (versión LTS)
- Windows 10/11 (para los scripts `.bat`)

## Instalación (primera vez, en cada PC)

```bat
git clone https://github.com/Qnaproyect/ConsolidaRD.git
cd ConsolidaRD
```

Haz doble clic en **`instalar.bat`**:

1. Verifica que Node.js esté instalado (y que la versión sea compatible).
2. Instala las dependencias del backend y del frontend automáticamente.
3. Crea la base de datos local (`backend/database.sqlite`).
4. Listo.

> Alternativa manual: `cd backend && npm install` y `cd frontend && npm install`, luego `cd backend && node src/migrations/run.js`.

## Uso diario

Haz doble clic en **`iniciar.bat`**:

| Servicio | Dirección |
|---|---|
| Portal | http://localhost:5173 |
| API | http://localhost:3001 |

**Credenciales por defecto:** `admin@consolidard.com` / `admin123`

Cierra la ventana del script para detener ambos servicios.

## Túnel público (opcional)

Para exponer el portal a Internet (acceso desde cualquier lugar sin instalar nada):

```bat
iniciar_tunel.bat
```

Genera una URL pública tipo `https://xxx.trycloudflare.com`. **Nota:** la URL cambia cada vez que se ejecuta. El túnel requiere que `iniciar.bat` esté corriendo (Vite y API activos).

## Estructura

```
consolida-rd/
├── backend/          # API Node.js + SQLite (node:sqlite)
│   └── src/
│       ├── config/   # Conexión a la BD
│       ├── migrations/ # Esquema y datos iniciales
│       └── routes/   # Endpoints por módulo
├── frontend/         # React + Vite (SPA)
│   └── src/
│       ├── components/
│       ├── pages/
│       └── styles/
├── instalar.bat      # Instalación automática
├── iniciar.bat       # Arranca API + frontend
└── iniciar_tunel.bat # Túnel Cloudflare opcional
```

## Notas

- La base de datos es **local a cada PC** (no se sincroniza por Git). Cada instalación crea su propia BD con las credenciales por defecto.
- Archivos como `database.sqlite`, `.env` y `node_modules` están excluidos de Git por seguridad.
