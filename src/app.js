// 1. Configuración de variables de entorno
const dotenv = require('dotenv');
// Cargamos el .env si existe, pero no matamos la app si no está (en Azure no habrá archivo .env)
dotenv.config();

// 2. Importación de dependencias
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');

// 3. Inicialización y conexión a Base de Datos
const app = express();
connectDB();

// 4. Middlewares (Configuraciones de comportamiento)
app.use(cors());
app.use(morgan('dev'));

// Configuración de límites para peticiones grandes (necesario para imágenes/QR en Base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 5. Rutas
app.use('/api/asistentes', require('./routes/router'));

// Ruta de prueba para verificar que el backend está vivo en Azure
app.get('/', (req, res) => {
    res.send('Servidor 5G funcionando correctamente en Azure');
});

// 6. Configuración del Puerto para Azure
// Azure usa process.env.PORT, localmente usará el 8080
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor listo y escuchando por el puerto ${PORT}`);
});