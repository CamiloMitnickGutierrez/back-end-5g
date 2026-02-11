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
        if (!process.env.RESEND_API_KEY) {
            console.error(" ERROR: La variable RESEND_API_KEY no está definida en Azure.");
            return res.status(500).json({ success: false, message: "Error de configuración de correo en el servidor." });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        // 1. Limpiamos el base64 para el adjunto (quitamos el prefijo data:image/png;base64,)
        const base64Data = qrUrl.replace(/^data:image\/\w+;base64,/, "");

        const { data, error } = await resend.emails.send({
            from: 'Evento 5G <asistencias@registrate5g.tech>',
            to: [email],
            subject: `¡Aquí tienes tu entrada, ${nombre}!`,
            // 2. Adjuntamos la imagen con un CID para que Outlook no la bloquee
            attachments: [
                {
                    filename: 'ticket-qr.png',
                    content: base64Data,
                    cid: 'qr_ticket_cid', // ID único para referenciar en el HTML
                },
            ],
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; padding: 40px 20px; text-align: center; color: #333;">
                    <div style="max-width: 500px; margin: auto;">
                        
                        <h1 style="font-size: 31px; color: #1a1a1a; margin-bottom: 10px;">Hola , ${nombre}! ,Bienvenido(a) </h1>
                        <h2 style="font-size: 25px; color: #1a1a1a; margin-bottom: 10px;">¡Aquí tienes tu entrada, para el evento 5G Que se realizara en la Iglesia Mision Cristiana Tiempos De Gloria</h2>
                        <p style="font-size: 20px; color: #666; margin-bottom: 30px;">Presenta este código QR cada día al ingresar al evento.</p>

                        <div style="background-color: #f9f9f9; padding: 25px; border-radius: 15px; display: inline-block; border: 1px solid #eeeeee;">
                            <a href="${qrUrl}" target="_blank" style="text-decoration: none;">
                                <img src="cid:qr_ticket_cid" 
                                     alt="Código QR" 
                                     width="220" 
                                     height="220" 
                                     style="display: block; border: none; cursor: zoom-in;" />
                            </a>
                            <p style="color: #007bff; font-size: 13px; margin-top: 15px; font-weight: bold; font-family: sans-serif;">
                                Toca la imagen para ampliar
                            </p>
                        </div>

                        <div style="margin-top: 35px;">
                            <a href="${qrUrl}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                                Ver QR en pantalla completa
                            </a>
                        </div>

                        <p style="color: #999; font-size: 12px; margin-top: 40px;">
                            Sugerencia: Guarda esta imagen en tu galería para un acceso más rápido.
                        </p>
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