require('dotenv').config();

async function notificationSEND({user, offer }) {
  const accountSid = process.env.ACCOUNTSID;
  const authToken = process.env.AUTHTOKEN_SMS;
  const client = require('twilio')(accountSid, authToken);

  const startTime = new Date(offer.startTime);

  // Obtiene el año, mes y día
  const year = startTime.getFullYear();
  const month = (startTime.getMonth() + 1).toString().padStart(2, '0'); // Suma 1 al mes ya que los meses comienzan desde 0
  const day = startTime.getDate().toString().padStart(2, '0');

  const fechaFormateada = `${month}/${day}/${year}`;

  await client.messages
    .create({
        body:  `${user.email}  Warehouse - ${fechaFormateada} - duration ${offer.blockDuration}h - $${offer.blockRate}`,
        from:  process.env.NUMBER_SMS,
        to: user.telefono
    })
    .then(message => console.log(`Mensaje enviado con SID: ${message.sid}`));
}


module.exports = {
  notificationSEND
}
