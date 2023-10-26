const axios = require('axios');
const Users = require('../models/Users');
const OffersModels = require('../models/Offers');
const { getAmzDate, generateFRC, generateRandomHexToken } = require('../helpers/fish');
const { verifyJWT } = require('../helpers/jwt');
const { offerResponse } = require('../helpers/offerResponse');
const { notificationSEND } = require('../helpers/send');
const now = require("performance-now");

let globalUser = null;
let allServices = null;
let intervalId = null;
let accessToken = null;

const allHeaders = {
  AmazonApiRequest: {
    'x-amzn-identity-auth-domain': 'api.amazon.com',
    'User-Agent': 'AmazonWebView/Amazon Flex/0.0/iOS/15.2/iPhone',
  },
  FlexCapacityRequest: {
    Accept: 'application/json',
    'x-amz-access-token': null,
    Authorization:
      'RABBIT3-HMAC-SHA256 SignedHeaders=x-amz-access-token;x-amz-date, Signature=82e65bd06035d5bba38c733ac9c48559c52c7574fb7fa1d37178e83c712483c0',
    'X-Amz-Date': null,
    'Accept-Encoding': 'gzip, deflate, br',
    'x-flex-instance-id': 'BEEBE19A-FF23-47C5-B1D2-21507C831580',
    'Accept-Language': 'en-US',
    'Content-Type': 'application/json',
    'User-Agent': 'iOS/16.1 (iPhone Darwin) Model/iPhone Platform/iPhone14,2 RabbitiOS/2.112.2',
    Connection: 'keep-alive',
    Cookie:
      'session-id=147-7403990-6925948; session-id-time=2082787201l; ' +
      'session-token=1mGSyTQU1jEQgpSB8uEn6FFHZ1iBcFpe9V7LTPGa3GV3sWf4bgscBoRKGmZb3TQICu7PSK5q23y3o4zYYhP' +
      '/BNB5kHAfMvWcqFPv/0AV7dI7desGjE78ZIh+N9Jv0KV8c3H/Xyh0OOhftvJQ5eASleRuTG5+TQIZxJRMJRp84H5Z+YI' +
      '+IhWErPdxUVu8ztJiHaxn05esQRqnP83ZPxwNhA4uwaxrT2Xm; ' +
      'at-main="Atza|IwEBIB4i78dwxnHVELVFRFxlWdNNXzFreM2pXeOHsic9Xo54CXhW0m5juyNgKyCL6KT_9bHrQP7VUAIkxw' +
      '-nT2JH12KlOuYp6nbdv-y6cDbV5kjPhvFntPyvBEYcl405QleSzBtH_HUkMtXcxeFYygt8l-KlUA8-JfEKHGD14' +
      '-oluobSCd2UdlfRNROpfRJkICzo5NSijF6hXG4Ta3wjX56bkE9X014ZnVpeD5uSi8pGrLhBB85o4PKh55ELQh0fwuGIJyBcyWSpGPZb5' +
      'uVODSsXQXogw7HCFEoRnZYSvR_t7GF5hm_78TluPKUoYzvw4EVfJzU"; ' +
      'sess-at-main="jONjae0aLTmT+yqJV5QC+PC1yiAdolAm4zRrUlcnufM="; ' +
      'ubid-main=131-1001797-1551209; ' +
      'x-main="ur180BSwQksvu@cBWH@IQejqHw6ZYkMDKkwbdOwJvEeVZWlh15tnxZdleqfq9qO0"',
  },
};

const APP_NAME = "com.amazon.rabbit";
const APP_VERSION = "303338310";
const DEVICE_NAME = "Le X522";
const MANUFACTURER = "LeMobile";
const OS_VERSION = "LeEco/Le2_NA/le_s2_na:6.0.1/IFXNAOP5801910272S/61:user/release-keys";

async function getFlexAccessToken() {
  const refreshToken = globalUser.refreshToken || null;
  const data = {
    "app_name": APP_NAME,
    "app_version": APP_VERSION,
    "source_token_type": "refresh_token",
    "source_token": refreshToken,
    "requested_token_type": "access_token"
  };

  const headers = {
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; Pixel 2 Build/OPM1.171019.021)",
    "x-amzn-identity-auth-domain": "api.amazon.com",
  };

  const response = await axios.post("https://api.amazon.com/auth/token", data, {
    headers,
  });
  return response.data.access_token;
}

async function getAllServiceAreas(req, res) {
  let requestHeaders = allHeaders["FlexCapacityRequest"];

  try {
    const token = req.headers['x-token'];
    const userData = await verifyJWT(token);

    globalUser = await Users.findById(userData.uid );
    if(!globalUser.refreshToken) {
      return res.status(500).json({ error: 'Error getting service areas: refreshToken not found' });
    }

    const accessToken = await getFlexAccessToken();
   
    if(!accessToken) {
      return res.status(500).json({ error: 'Error getting service areas: accessToken not found' });
    }

    requestHeaders["X-Amz-Date"] = getAmzDate();
    requestHeaders["x-amz-access-token"] = accessToken;

    let response = await axios.get("https://flex-capacity-na.amazon.com/getOfferFiltersOptions", {
      headers: requestHeaders,
    });

    res.json(response.data.serviceAreaPoolList);
  }catch (error) {
    res.status(500).json({ error: 'Error getting service areas' });
  }
}

async function saveOffersDB(offer, userData, status) {
  const offersModel = new OffersModels({
    id: offer.id,
    expirationDate: offer.expirationDate,
    startTime: offer.startTime,
    location: offer.location,
    blockRate: offer.blockRate,
    endTime: offer.endTime,
    hidden: offer.hidden,
    ratePerHour: offer.ratePerHour,
    weekday: offer.weekday,
    blockDuration: offer.blockDuration,
    userId: userData.uid,
    status,
  });
  await offersModel.save();
}

async function processOffer(req, res) {
  const {
    minBlockRate,
    minPayRatePerHour,
    arrivalBuffer,
    desiredWareHouses,
    maxHoursBlock,
    startDate,
    startRunningAt,
    fromTime,
  } = req.body;

  const token = req.headers['x-token'];

  if (intervalId) {
    return res.status(500).json({ msj: '¡GoFlex is now running!' });
  }

  const userData = await verifyJWT(token);
  globalUser = await Users.findById(userData.uid);

  await OffersModels.deleteMany({ userId: userData.uid });

  if (!globalUser.refreshToken) {
    return res.status(500).json({ error: 'Error getting job offers: refreshToken not found' });
  }

  accessToken = await getFlexAccessToken();

  const dataRes = await getEligibleServiceAreas();

  const offersRequestBody = {
    apiVersion: 'V2',
    filters: {
      serviceAreaFilter: desiredWareHouses || [],
      timeFilter: {
        startTime: fromTime,
        endTime: '23:59',
      },
    },
    serviceAreaIds: dataRes,
  };

  const selectedOfferIds = new Set();

  // Evento para procesar ofertas
  const processOffersEvent = async () => {
    const currentTime = new Date().getTime();
    const start = now();
    const offersList = await getOffers(offersRequestBody);

    for (const offerResponseObject of offersList) {
      const offer = new offerResponse(offerResponseObject);

      if (selectedOfferIds.has(offer.id)) {
        continue;
      }

      selectedOfferIds.add(offer.id);

      let status = 'refused';
      if(desiredWareHouses.length !== 0 && !desiredWareHouses.includes(offer.location)){
        await saveOffersDB(offer, userData, status);
        continue;
      }

      if (minBlockRate && offer.blockRate < minBlockRate) {
        await saveOffersDB(offer, userData, status);
        continue;
      }

      if (startDate &&  new Date(offer.startTime) < new Date(startDate)) {
        await saveOffersDB(offer, userData, status);
        continue;
      }

      if (minPayRatePerHour && offer.ratePerHour < minPayRatePerHour) {
        await saveOffersDB(offer, userData, status);
        continue;
      }

      if (maxHoursBlock && offer.blockDuration > maxHoursBlock) {
        await saveOffersDB(offer, userData, status);
        continue;
      }
      if (arrivalBuffer) {
        const deltaTime = ((offer.startTime * 1000) - currentTime) / (1000 * 60);
        if (deltaTime < arrivalBuffer) {
          await saveOffersDB(offer, userData, status);
          continue;
        }
      }

      const end = now();
      const duration = end - start;
      console.log(`El bloque de código tomó ${duration} milisegundos en ejecutarse.`);

      const seAceptoOferta = await acceptOffer(offer);
      if (seAceptoOferta) {
        status = 'accepted';
      }
      selectedOfferIds.add(offer.id);

      // Guardar todas las ofertas, incluso las rechazadas
      await saveOffersDB(offer, userData, status);
    }
  };


  // Establecer intervalo de procesamiento
  intervalId = setInterval(processOffersEvent, 1250);
  processOffersEvent(); // Procesar inmediatamente

  res.json({ msj: '¡GoFlex started!' });
}

async function stopProcess(req, res) {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    res.json({msj: '¡Stopped GoFlex!'});
  } else {
    res.status(500).json({msj: '¡GoFlex is not running!'});
  }
};

async function acceptOffer(offer, res, req) {
  let requestHeaders = allHeaders["FlexCapacityRequest"];
  requestHeaders["X-Amz-Date"] = getAmzDate();
  const data = { offerId: offer.id};
  try {
    requestHeaders["x-amz-access-token"] = accessToken;
    await axios.post("https://flex-capacity-na.amazon.com/AcceptOffer", data, { headers: requestHeaders });

/*     const bodySMS = {
      user: globalUser,
      allServices,
      offer
    };
    await notificationSEND(bodySMS); */

    return true;
  } catch (error) {
    console.error('Error en la solicitud acceptOffer', error.response.data);
    return false;
  }

}

async function getOffers(offersRequestBody) {
  try {
    let requestHeaders = allHeaders["FlexCapacityRequest"];
    requestHeaders["x-amz-access-token"] = accessToken;

    let response = await axios.post("https://flex-capacity-na.amazon.com/GetOffersForProviderPost", offersRequestBody, {
      headers: requestHeaders,
      timeout: 1000,
    });

    return response.data.offerList;
  } catch (error) {
    console.error('Error en la solicitud getOffers');
    return []; // Retorna un array vacío en caso de error
  }
}

async function getAllServiceAreasWithGetOffer(req, res) {
  let requestHeaders = allHeaders["FlexCapacityRequest"];
  try {
    requestHeaders["X-Amz-Date"] = getAmzDate();
    requestHeaders["x-amz-access-token"] = accessToken;

    let response = await axios.get("https://flex-capacity-na.amazon.com/getOfferFiltersOptions", {
      headers: requestHeaders,
    });

    return response.data.serviceAreaPoolList;
  }catch (error) {
    res.status(500).json({ error: 'Error obtaining eligible service area' });
  }
}

async function getEligibleServiceAreas(req, res) {
  let requestHeaders = allHeaders["FlexCapacityRequest"];
  try {
    requestHeaders["X-Amz-Date"] = getAmzDate();
    requestHeaders["x-amz-access-token"] = accessToken

    let response = await axios.get("https://flex-capacity-na.amazon.com/eligibleServiceAreas", {
      headers: requestHeaders,
    });

    return response.data.serviceAreaIds;
  }catch (error) {
    res.status(500).json({ error: 'Error obtaining eligible service area' });
  }
}

async function registerAccount(reg_access_token, device_id, res, req) {
  try {
    const amazon_reg_data = {
      auth_data: {
        access_token: reg_access_token,
      },
      cookies: {
        domain: '.amazon.com',
        website_cookies: [],
      },
      device_metadata: {
        android_id: '52aee8aecab31ee3',
        device_os_family: 'android',
        device_serial: device_id,
        device_type: 'A1MPSLFC7L5AFK',
        mac_address: await generateRandomHexToken(64).toUpperCase(),
        manufacturer: MANUFACTURER,
        model: DEVICE_NAME,
        os_version: '30',
        product: DEVICE_NAME
      },
      registration_data: {
        app_name: APP_NAME,
        app_version: APP_VERSION,
        device_model: DEVICE_NAME,
        device_serial: device_id,
        device_type: 'A1MPSLFC7L5AFK',
        domain: 'Device',
        os_version: OS_VERSION,
        software_version: '130050002',
      },
      requested_extensions: ['device_info', 'customer_info'],
      requested_token_type: ['bearer', 'mac_dms', 'store_authentication_cookie', 'website_cookies'],
      user_context_map: {
        frc: await generateFRC(device_id),
      },
    }

    const headers = {
      "Content-Type": "application/json",
      "Accept-Charset": "utf-8",
      "x-amzn-identity-auth-domain": "api.amazon.com",
      Connection: "keep-alive",
      Accept: "*/*",
      "Accept-Language": "en-US"
    }

    let response = await axios.post("https://api.amazon.com/auth/register", amazon_reg_data, {
      headers,
    } );

    const tokens = response.data.response.success.tokens.bearer;
    return tokens.refresh_token;
  } catch(error) {
    res.status(500).json({ error: 'Error registering account' });
  }
}

async function getSMSSEND() { /* PARA HACER PRUEBAS */
  const bodySMS = {
    user: {
      email: 'unaprueba@gmail.com',
      telefono: '+14707033710'
    },
    allServices:[
      {
          "serviceAreaId": "539ce8be-13d9-4c33-8224-cd0031c1b83f",
          "serviceAreaName": "Norcross GA (VGA1) - Sub Same-Day"
      },
      {
          "serviceAreaId": "8b6632cb-4ae2-4993-97d0-72d8340fe1be",
          "serviceAreaName": "Lithia Springs GA (VGA2) - Sub Same-Day"
      },
    ],
    offer : {
      location: '8b6632cb-4ae2-4993-97d0-72d8340fe1be',
      startTime: 'Sun Oct 01 2023 07:30:00 GMT-0300 (hora estándar de Argentina)',
      blockDuration: '2.5',
      blockRate: 50,
    }
  };
  await notificationSEND(bodySMS);
}

async function getOffersList(req, res) {
  const token = req.headers['x-token'];

  try {
    const userData = await verifyJWT(token);

    const oferList = await OffersModels.find({ userId: userData.uid });

    res.json(oferList);
  }catch (error) {
    res.status(500).json({ error: 'Error registering account' });
  }
}

module.exports = {
  getAllServiceAreas,
  processOffer,
  registerAccount,
  getSMSSEND,
  stopProcess,
  getOffersList,
}
