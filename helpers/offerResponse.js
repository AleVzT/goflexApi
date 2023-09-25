class offerResponse {
  constructor(offerResponseObject) {
    this.id = offerResponseObject.offerId;
    this.expirationDate = new Date(offerResponseObject.expirationDate * 1000);
    this.startTime = new Date(offerResponseObject.startTime * 1000);
    this.location = offerResponseObject.serviceAreaId;
    this.blockRate = parseFloat(offerResponseObject.rateInfo.priceAmount);
    this.endTime = new Date(offerResponseObject.endTime * 1000);
    this.hidden = offerResponseObject.hidden;
    this.ratePerHour = this.blockRate / ((this.endTime - this.startTime) / 3600000);
    this.weekday = this.expirationDate.getDay();
    this.blockDuration = (this.endTime - this.startTime) / 3600000;
  }

  toString() {
    const blockDuration = (this.endTime - this.startTime) / 3600000;

    let body = 'Location: ' + this.location + '\n';
    body += 'Date: ' + (this.startTime.getMonth() + 1) + '/' + this.startTime.getDate() + '\n'; // +1 en getMonth() para obtener el mes correcto
    body += 'Pay: ' + this.blockRate + '\n';
    body += 'Pay rate per hour: ' + this.ratePerHour + '\n';
    body += 'Block Duration: ' + blockDuration + (blockDuration === 1 ? ' hour\n' : ' hours\n');

    const formatTime = (time) => (time < 10 ? '0' : '') + time;
    body += 'Start time: ' + formatTime(this.startTime.getHours()) + formatTime(this.startTime.getMinutes()) + '\n';
    body += 'End time: ' + formatTime(this.endTime.getHours()) + formatTime(this.endTime.getMinutes()) + '\n';

    return body;
  }
}

module.exports = {
  offerResponse
}
