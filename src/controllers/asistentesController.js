const Asistente = require('../models/Asistentes');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const { BlobServiceClient } = require('@azure/storage-blob');

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

/**
 * Sube un QR code a Azure Blob Storage y retorna la URL pública
 * @param {string} base64Data - El QR en formato base64 (sin el prefijo data:image/png;base64,)
 * @param {string} email - Email del asistente (usado para generar nombre único)
 * @returns {Promise<string>} - URL pública del QR en Azure
 */
async function subirQRaAzure(base64Data, email) {
    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        
        if (!connectionString) {
            throw new Error('❌ AZURE_STORAGE_CONNECTION_STRING no está configurado');
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        
        // Nombre del contenedor
        const containerName = 'qr-eventos';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        // Crear contenedor si no existe (con acceso público a blobs)
        await containerClient.createIfNotExists({
            access: 'blob' // Permite acceso público a los archivos
        });
        
        // Nombre único para el archivo
        const timestamp = Date.now();
        const emailSafe = email.replace(/[@.]/g, '-');
        const blobName = `qr-${emailSafe}-${timestamp}.png`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Convertir base64 a buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Subir a Azure con headers apropiados
        await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { 
                blobContentType: 'image/png',
                blobCacheControl: 'public, max-age=31536000' // Cache por 1 año
            }
        });
        
        console.log(`✅ QR subido exitosamente: ${blockBlobClient.url}`);
        return blockBlobClient.url;
        
    } catch (error) {
        console.error('❌ Error subiendo QR a Azure:', error.message);
        throw error;
    }
}

exports.enviarTicketEmail = async (req, res) => {
    const { email, nombre, qrUrl } = req.body;

    try {
        if (!process.env.RESEND_API_KEY) {
            console.error("❌ ERROR: RESEND_API_KEY no está definida");
            return res.status(500).json({ 
                success: false, 
                message: "Error de configuración de correo" 
            });
        }

        if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
            console.error("❌ ERROR: AZURE_STORAGE_CONNECTION_STRING no está definida");
            return res.status(500).json({ 
                success: false, 
                message: "Error de configuración de almacenamiento" 
            });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        // Limpiar el base64
        const base64Data = qrUrl.replace(/^data:image\/\w+;base64,/, "");
        
        // ⭐ SUBIR EL QR A AZURE Y OBTENER URL PÚBLICA
        const qrPublicUrl = await subirQRaAzure(base64Data, email);

        const { data, error } = await resend.emails.send({
            from: 'Evento 5G <asistencias@registrate5g.tech>',
            to: [email],
            subject: `¡Aquí tienes tu entrada, ${nombre}!`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; padding: 40px 20px; text-align: center; color: #333; max-width: 600px; margin: 20px auto; border-radius: 10px;">
                        
                        <h1 style="font-size: 28px; color: #1a1a1a; margin-bottom: 10px;">¡Hola, ${nombre}!</h1>
                        <h2 style="font-size: 20px; color: #555; font-weight: normal; margin-bottom: 10px;">Bienvenido(a) al evento 5G</h2>
                        <p style="font-size: 16px; color: #666; margin-bottom: 30px; line-height: 1.5;">
                            Presenta este código QR cada día al ingresar al evento en la<br>
                            <strong>Iglesia Misión Cristiana Tiempos De Gloria</strong>
                        </p>

                        <div style="background-color: #f9f9f9; padding: 25px; border-radius: 15px; display: inline-block; border: 2px solid #007bff; margin: 20px 0;">
                            <!-- ⭐ URL PÚBLICA de Azure - Funciona en Gmail y Outlook -->
                            <img src="${qrPublicUrl}" 
                                 alt="Código QR de acceso" 
                                 width="250" 
                                 height="250" 
                                 style="display: block; border: none; margin: 0 auto;" />
                            <p style="color: #007bff; font-size: 14px; margin-top: 15px; margin-bottom: 0; font-weight: bold;">
                                Tu código QR de acceso
                            </p>
                        </div>

                        <div style="margin-top: 30px;">
                            <a href="${qrPublicUrl}" 
                               download="mi-ticket-5g.png"
                               style="background-color: #007bff; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                                📥 Descargar QR
                            </a>
                        </div>

                        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #007bff; text-align: left;">
                            <p style="color: #333; font-size: 14px; margin: 0; line-height: 1.6;">
                                <strong>💡 Importante:</strong><br>
                                • Guarda este correo para tener tu QR siempre disponible<br>
                                • También puedes descargar la imagen y guardarla en tu galería<br>
                                • Presenta el QR al ingresar al evento cada día
                            </p>
                        </div>

                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            ¿Problemas para visualizar? <a href="${qrPublicUrl}" target="_blank" style="color: #007bff;">Haz clic aquí</a>
                        </p>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            console.error("❌ Error de Resend:", JSON.stringify(error, null, 2));
            return res.status(400).json({ success: false, error });
        }

        console.log("✅ Correo enviado exitosamente a:", email);
        console.log("✅ QR URL:", qrPublicUrl);
        
        res.status(200).json({ 
            success: true, 
            message: "Correo enviado correctamente",
            qrUrl: qrPublicUrl // Para debug/logs
        });

    } catch (error) {
        console.error("❌ Error interno:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Error interno al procesar el envío",
            error: error.message 
        });
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