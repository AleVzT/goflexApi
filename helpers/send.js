require('dotenv').config();

async function notificationSEND({numberTo, blockId }) {
  const accountSid = process.env.ACCOUNTSID;
  const authToken = process.env.AUTHTOKEN_SMS;
  const client = require('twilio')(accountSid, authToken);

  const response = await client.messages
    .create({
        body:  `Se a tomado un bloque ${blockId}`,
        from: '+18448444102',
        to: numberTo
    })
    .then(message => console.log(`Mensaje enviado con SID: ${message.sid}`))
    .catch(error => console.error(`Error al enviar el mensaje: ${error}`));
}


module.exports = {
  notificationSEND
}
