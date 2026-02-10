const Asistente = require('../models/Asistentes'); 
const QRCode = require('qrcode');
const { Resend } = require('resend');

//  NOTA: Se eliminó la instancia global de Resend para evitar el error "Missing API key" al iniciar el servidor en Azure.

exports.registrarAsistente = async (req, res) => {
    try {
        const nuevoAsistente = new Asistente(req.body);
        const qrGenerado = await QRCode.toDataURL(nuevoAsistente._id.toString());
        
        nuevoAsistente.qrCode = qrGenerado;
        await nuevoAsistente.save();

        res.status(201).json({ 
            success: true, 
            qrUrl: qrGenerado,
            nombre: nuevoAsistente.nombre,
            email: nuevoAsistente.email
        });
    } catch (error) {
        console.error("Error en registro:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.enviarTicketEmail = async (req, res) => {
    const { email, nombre, qrUrl } = req.body;

    try {
        //  Inicialización protegida: solo ocurre cuando se llama a la función
        if (!process.env.RESEND_API_KEY) {
            console.error(" ERROR: La variable RESEND_API_KEY no está definida en Azure.");
            return res.status(500).json({ success: false, message: "Error de configuración de correo en el servidor." });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        
        // Limpiamos el base64 del QR
        const base64Content = qrUrl.split(',')[1];

        const { data, error } = await resend.emails.send({
            from: 'Evento Confirmado <onboarding@resend.dev>',
            to: [email],
            subject: `¡Aquí tienes tu entrada, ${nombre}!`,
            attachments: [
                {
                    filename: 'Ticket-QR.png',
                    content: base64Content,
                },
            ],
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="max-width: 400px; margin: auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        <div style="background: #90caf9; padding: 20px; text-align: center;">
                            <h2 style="margin: 0; color: #0a0a0a;">TICKET DE ACCESO</h2>
                        </div>
                        <div style="padding: 30px; text-align: center;">
                            <p style="font-size: 18px; color: #333;">Hola <strong>${nombre}</strong>,</p>
                            <p style="color: #666;">Presenta este código en la entrada del evento (Días 1, 2 o 3).</p>
                            
                            <img src="${qrUrl}" alt="QR Code" style="width: 200px; height: 200px; margin: 20px 0; border: 5px solid #f0f0f0; border-radius: 10px;" />
                            
                            <p style="font-size: 12px; color: #999;">También hemos adjuntado el código como imagen a este correo.</p>
                        </div>
                        <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #aaa;">
                            © 2026 Evento Staff Control
                        </div>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error("Error detallado de Resend:", error);
            return res.status(400).json({ success: false, error });
        }

        res.status(200).json({ success: true, message: "Correo enviado correctamente" });
        
    } catch (error) {
        console.error("Error interno en enviarTicketEmail:", error.message);
        res.status(500).json({ success: false, message: "Error interno al procesar el envío" });
    }
};

const getFechaLocal = () => {
    const d = new Date();
    return d.toLocaleDateString('en-CA'); // Retorna YYYY-MM-DD
};

exports.validarAsistente = async (req, res) => {
    const { id } = req.params;
    const fechaHoy = getFechaLocal();

    try {
        const asistente = await Asistente.findById(id);

        if (!asistente) {
            return res.status(404).json({ message: "Error: El código QR no es válido o no existe." });
        }

        const yaAsistioHoy = asistente.asistencias.some(asist => asist.fecha === fechaHoy);

        if (yaAsistioHoy) {
            const registroPrevio = asistente.asistencias.find(asist => asist.fecha === fechaHoy);
            const hora = new Date(registroPrevio.horaExacta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return res.status(400).json({ 
                message: `${asistente.nombre} ya ingresó hoy a las ${hora}.` 
            });
        }

        const nuevaAsistencia = {
            fecha: fechaHoy,
            horaExacta: new Date()
        };

        asistente.asistencias.push(nuevaAsistencia);
        await asistente.save();

        const conteoHoy = await Asistente.countDocuments({ "asistencias.fecha": fechaHoy });

        res.status(200).json({ 
            message: `¡Bienvenido/a ${asistente.nombre}! (Día: ${fechaHoy})`,
            total: conteoHoy
        });

    } catch (error) {
        console.error("Error en validación:", error);
        res.status(500).json({ message: "Error interno al procesar el código." });
    }
};

exports.obtenerConteo = async (req, res) => {
    try {
        const fechaHoy = getFechaLocal();
        const total = await Asistente.countDocuments({ "asistencias.fecha": fechaHoy });
        res.json({ total });
    } catch (error) {
        res.status(500).json({ total: 0 });
    }
};