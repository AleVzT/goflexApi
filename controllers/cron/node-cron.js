const mongoose = require('mongoose');
const cron = require('node-cron');
const Users = require('../../models/Users');

// Define el cron job para que se ejecute todos los martes a las 00:00 horas (hora del servidor)
cron.schedule('0 0 * * 4', async () => {
  try {
    // Actualiza la propiedad 'active' a 'false' en todos los documentos de la colección 'Usuario'
    await Users.updateMany({}, { active: false });
    console.log('Cron job ejecutado con éxito: Se cambió "active" a "false" en todos los usuarios');
  } catch (error) {
    console.error('Error en el cron job:', error);
  }
});
