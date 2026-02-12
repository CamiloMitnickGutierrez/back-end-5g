
import dotenv from 'dotenv';
import router from './routes/router.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/database.js';


// Cargamos el .env si existe, (en Azure no habrá archivo .env)
dotenv.config();

// 3. Inicialización y conexión a Base de Datos
const app = express();
connectDB();

// 4. Middlewares (Configuraciones de comportamiento)
// Definimos los orígenes permitidos explícitamente
const allowedOrigins = [
  'https://www.registrate5g.tech',
  'https://registrate5g.tech',
  'https://sea-lion-app-qbfid.ondigitalocean.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(morgan('dev'));


// Configuración de límites para peticiones grandes (necesario para imágenes/QR en Base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 5. Rutas

app.use('/api/asistentes', router);

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