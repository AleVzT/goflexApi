const axios = require('axios');
const crypto = require('crypto');
const zlib = require('zlib');

function getAmzDate() {
  const currentDate = new Date();
  const year = currentDate.getUTCFullYear();
  const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getUTCDate()).padStart(2, "0");
  const hour = String(currentDate.getUTCHours()).padStart(2, "0");
  const minute = String(currentDate.getUTCMinutes()).padStart(2, "0");
  const second = String(currentDate.getUTCSeconds()).padStart(2, "0");
  
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function parseQueryString(queryString) {
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params.entries()) {
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(value);
  }
  return result;
}

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

async function generateFRC(device_id) {
  const APP_NAME = "com.amazon.rabbit";
  const APP_VERSION = "303338310";
  const DEVICE_NAME = "Le X522";
  const OS_VERSION = "LeEco/Le2_NA/le_s2_na:6.0.1/IFXNAOP5801910272S/61:user/release-keys";
  const dataIpAddress = await axios.get('https://api.ipify.org');

  const cookies = JSON.stringify({
    ApplicationName: APP_NAME,
    ApplicationVersion: APP_VERSION,
    DeviceLanguage: 'en',
    DeviceName: DEVICE_NAME,
    DeviceOSVersion: OS_VERSION,
    IpAddress: dataIpAddress.data,
    ScreenHeightPixels: '1920',
    ScreenWidthPixels: '1280',
    TimeZone: '00:00',
  });

  const compressed = zlib.deflateSync(cookies);
  const key = crypto.pbkdf2Sync(device_id, 'AES/CBC/PKCS7Padding', 1, 32, 'sha1');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let ciphertext = cipher.update(compressed, 'binary', 'base64');
  ciphertext += cipher.final('base64');

  const hmacKey = crypto.pbkdf2Sync(device_id, 'HmacSHA256', 1, 32, 'sha1');
  const hmac = crypto.createHmac('sha256', hmacKey).update(Buffer.concat([iv, Buffer.from(ciphertext)]));

  const finalBuffer = Buffer.concat([Buffer.from([0]), hmac.digest().slice(0, 8), iv, Buffer.from(ciphertext)]);

  return finalBuffer.toString('base64');
}

function generateRandomHexToken(length) {
  const characters = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}


module.exports = {
  getAmzDate,
  parseQueryString,
  generateRandomString,
  generateFRC,
  generateRandomHexToken,
}
