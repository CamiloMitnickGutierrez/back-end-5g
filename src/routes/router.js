import express from 'express';
import * as asistentesController from '../controllers/asistentesController.js';

const router = express.Router();

// Ruta que se dispara al enviar el formulario
router.post('/registrar', asistentesController.registrarAsistente);

// Ruta que se dispara al darle al botón del modal
router.post('/enviar-email', asistentesController.enviarTicketEmail);


router.put('/validar/:id', asistentesController.validarAsistente);

// 4. Obtener el conteo de personas que han entrado HOY
router.get('/conteo', asistentesController.obtenerConteo);

export default router;