const mongoose = require('mongoose')

const connectDB = async () => {

    try {

        const conexion = await mongoose.connect(process.env.MONGO_URI)

        console.log(`Mongo db conectada : ${conexion.connection.host}`)
        
    } catch (error) {

        console.error(`Error en la conexion de la db ${error.message}`)

        process.exit(1)
        
    }
    
}

module.exports = connectDB