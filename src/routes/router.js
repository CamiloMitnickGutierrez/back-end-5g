const express = require('express');
const router = express.Router();
const asistentesController = require('../controllers/asistentesController');

// Ruta que se dispara al enviar el formulario
router.post('/registrar', asistentesController.registrarAsistente);

// Ruta que se dispara al darle al botón del modal
router.post('/enviar-email', asistentesController.enviarTicketEmail);


router.put('/validar/:id', asistentesController.validarAsistente);

// 4. Obtener el conteo de personas que han entrado HOY
router.get('/conteo', asistentesController.obtenerConteo);

module.exports = router;