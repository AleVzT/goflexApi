require('dotenv').config();

async function notificationSEND({user, allServices, offer }) {
  const accountSid = process.env.ACCOUNTSID;
  const authToken = process.env.AUTHTOKEN_SMS;
  const client = require('twilio')(accountSid, authToken);

  const startTime = new Date(offer.startTime);

  // Obtiene el año, mes y día
  const year = startTime.getFullYear();
  const month = (startTime.getMonth() + 1).toString().padStart(2, '0'); // Suma 1 al mes ya que los meses comienzan desde 0
  const day = startTime.getDate().toString().padStart(2, '0');
  const horas = startTime.getHours().toString().padStart(2, '0');
  const minutos = startTime.getMinutes().toString().padStart(2, '0');

  const fechaFormateada = `${month}/${day}/${year}`;
  const horaFormateada = `${horas}:${minutos}`;

  const serviceAreaName = await getServiceAreaName(offer.location, allServices);

  await client.messages
    .create({
        body: `GoFLex: Grabbed BLOCK
        Warehouse: ${serviceAreaName}
        Start date: ${fechaFormateada}
        Start time: ${horaFormateada}
        Duration: ${offer.blockDuration}hrs - ${offer.blockRate}$`,
        from:  process.env.NUMBER_SMS,
        to: user.telefono
    })
    .then(message => console.log('Mensaje enviado con SID', message));
}

function getServiceAreaName(serviceAreaId, allServices) {
  const targetServiceArea = allServices.find(area => area.serviceAreaId === serviceAreaId);

  if (targetServiceArea) {
    const serviceAreaNameParts = targetServiceArea.serviceAreaName.split('-');
    return serviceAreaNameParts[0];
  }

  return null; // Retorna null si no se encuentra el serviceAreaId
}


module.exports = {
  notificationSEND
}
