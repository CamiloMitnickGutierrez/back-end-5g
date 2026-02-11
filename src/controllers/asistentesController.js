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

        // Limpiamos el base64
        const base64Data = qrUrl.replace(/^data:image\/\w+;base64,/, "");
        
        // ⭐ DEBUGGING: Verificar que el base64 esté limpio
        console.log(" Base64 limpio (primeros 50 chars):", base64Data.substring(0, 50));

        const { data, error } = await resend.emails.send({
            from: 'Evento 5G <asistencias@registrate5g.tech>',
            to: [email],
            subject: `¡Aquí tienes tu entrada, ${nombre}!`,
            attachments: [
                {
                    filename: 'qr-ticket.png',  //  Sin guiones bajos
                    content: base64Data,
                    //  NO uses 'encoding' ni 'content_type' - Resend lo detecta automáticamente
                },
            ],
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; padding: 40px 20px; text-align: center; color: #333;">
                    <div style="max-width: 500px; margin: auto;">
                        
                        <h1 style="font-size: 31px; color: #1a1a1a; margin-bottom: 10px;">Hola, ${nombre}! Bienvenido(a)</h1>
                        <h2 style="font-size: 25px; color: #1a1a1a; margin-bottom: 10px;">¡Aquí tienes tu entrada para el evento 5G!</h2>
                        <p style="font-size: 20px; color: #666; margin-bottom: 30px;">Presenta este código QR cada día al ingresar al evento.</p>

                        <div style="background-color: #f9f9f9; padding: 25px; border-radius: 15px; display: inline-block; border: 1px solid #eeeeee;">
                            <!--  El CID DEBE ser "cid:" + el filename exacto -->
                            <img src="cid:qr-ticket.png" 
                                 alt="Código QR" 
                                 width="220" 
                                 height="220" 
                                 style="display: block; border: none; margin: 0 auto;" />
                            <p style="color: #007bff; font-size: 13px; margin-top: 15px; font-weight: bold;">
                                Tu código QR de acceso
                            </p>
                        </div>

                        <p style="color: #999; font-size: 12px; margin-top: 40px;">
                            El código QR también está adjunto en este correo para que lo descargues.
                        </p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error(" Error detallado de Resend:", JSON.stringify(error, null, 2));
            return res.status(400).json({ success: false, error });
        }

        console.log(" Correo enviado exitosamente:", data);
        res.status(200).json({ success: true, message: "Correo enviado correctamente", data });

    } catch (error) {
        console.error(" Error interno en enviarTicketEmail:", error.message);
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