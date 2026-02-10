const mongoose = require('mongoose')


const AsistenteSchema = new mongoose.Schema({

    nombre:{
        type:String,
        required:true,
        trim:true,
    },
    primerApellido:{
        type:String,
        required:true,
        trim:true
    },
    segundoApellido:{
        type:String,
        trim:true
    },
    telefono:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    ciudad:{
        type:String,
        required:true,
        trim:true
    },
    municipio:{
        type:String,
        required:true,
        trim:true
    },
    barrio:{
        type:String,
        required:true,
        trim:true
    },
    invitadoPor:{
        type:String,
        trim:true
    },
    primeraVez:{
        type:String,
        enum:['si','no'],
        required:true
    },

    qrCode:{
        type:String
    },
   asistencias:[{
    fecha:{
        type:String
    },
    horaExacta:{
        type:Date,
        default:Date.now
    }
   }],
    fechaRegistro:{
        type:Date,
        default:Date.now
    }
})

module.exports = mongoose.model('Asistentes',AsistenteSchema)