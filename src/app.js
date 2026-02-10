//aca importo dotenv para poder usar archivos .env
const dotenv = require('dotenv')

// aca capturo el .env
const variablesEntorno = dotenv.config()

// validamos que si este el .env
if (variablesEntorno.error){
    
    console.error("No se encontro archivo .env")

    process.exit(1)
}

//Importo las dependencias que usare

// express es la libreria que usaremos para el corazon de nustro back-end
const express = require('express')

// cors para poder consumir y permitir peticiones entre dominios
const cors = require('cors')

//morgan para ver en consola las peticiones que me hagan 
const morgan = require('morgan')

//aca traigo la configuracion de la base de datos que usare , usare mongo atlas de archivos locales

const connectDB = require('./config/database')

//inicializacion y conexion

const app = express()
connectDB()

//aplicamos middlewares configuraciones de comportamiento
app.use(cors())

app.use(morgan('dev'))

app.use(express.json())
app.use(express.json({ limit: '10mb' })); // Para que acepte el Base64 del QR

app.use('/api/asistentes', require('./routes/router'))

const PORT = process.env.PORT || 4000

app.listen(PORT, () =>{

    console.log(`Servidor listo y escuchando por el puerto ${PORT}`)
})


