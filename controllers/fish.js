const axios = require('axios');
const Users = require('../models/Users');
const { getAmzDate, generateFRC, generateRandomHexToken } = require('../helpers/fish');
const { verifyJWT } = require('../helpers/jwt');
const { offerResponse } = require('../helpers/offerResponse');
const { notificationSEND } = require('../helpers/send');

let globalUser = null;
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

    const accessToken = await getFlexAccessToken(); /* se genera un nuevo accessToken con el refresh token  */
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

async function getAllOffers(req, res) { /* se consultan todas las ofertas disponibles */
  let requestHeaders = allHeaders["FlexCapacityRequest"];
  try {
    const token = req.headers['x-token'];
    const userData = await verifyJWT(token);

    globalUser = await Users.findById(userData.uid );
    if(!globalUser.refreshToken) {
      return res.status(500).json({ error: 'Error getting job offers: refreshToken not found' });
    }

    const accessToken = await getFlexAccessToken(); /* se genera un nuevo accessToken con el refresh token  */
    if(!accessToken) {
      return res.status(500).json({ error: 'Error getting job offers: accessToken not found' });
    }
    requestHeaders["x-amz-access-token"] = accessToken;

    const offersRequestBody = {
      "apiVersion": "V2",
      "filters": {
        "serviceAreaFilter": [],
        "timeFilter": {
          "startTime": "00:00",
          "endTime": "23:59",
        },
      },
      "serviceAreaIds": await getEligibleServiceAreas() /* se consultan los id de todos los servicios */
    }
  
    let response = await axios.post("https://flex-capacity-na.amazon.com/GetOffersForProviderPost", offersRequestBody, {
      headers: requestHeaders,
    });

    res.json(response.data.offerList);
  }catch (error) {
    res.status(500).json({ error: 'Error obtaining job offers, getAllOffers!' });
  }
}

async function processOffer(req, res) {
  const {
    minBlockRate, /* Minimo rate block - si baseOn === 'BLOCK' = minHourPrice */ 
    minPayRatePerHour, /* minimo rate per hour - si baseOn === 'HOURS' = minHourPrice */
    arrivalBuffer, /* Delay */
    desiredWareHouses, /* los almacenes - depositos */
    maxHoursBlock, /* Max hours load  - maxHoursBlock*/
    startDate,
    startRunningAt,    /* startRunning hora para iniciar a buscar */
    fromTime,   /* From time. Iniciar a trabajar */
  } = req.body;
  // const horaCompletaEjecucion = `${startDate} ${startRunningAt}`; se usaria en el FE

  const token = req.headers['x-token'];

  try {
    const userData = await verifyJWT(token);

    globalUser = await Users.findById(userData.uid );
    if(!globalUser.refreshToken) {
      return res.status(500).json({ error: 'Error getting job offers: refreshToken not found' });
    }

    const offersRequestBody = {
      "apiVersion": "V2",
      "filters": {
        "serviceAreaFilter": [],
        "timeFilter": {
          "startTime": fromTime,
          "endTime": "23:59",
        },
      },
      "serviceAreaIds": desiredWareHouses.length > 0 ? desiredWareHouses : await getEligibleServiceAreas()
    };

    let selectedOffer = null;
    const offersList = await getOffers(offersRequestBody);

    for (const offerResponseObject of offersList) {
      const offer = new offerResponse(offerResponseObject);

      if (minBlockRate && offer.blockRate < minBlockRate) {
        continue;
      }
    
      if (minPayRatePerHour && offer.ratePerHour < minPayRatePerHour) {
        continue;
      }
    
      if (maxHoursBlock && offer.blockDuration > maxHoursBlock) {
        continue;
      }
    
      if (arrivalBuffer) {
        const currentTime = new Date().getTime();
        const deltaTime = ((offer.startTime * 1000) - currentTime) / (1000 * 60);
        if (deltaTime < arrivalBuffer) {
          continue;
        }
      }
      selectedOffer = offer;
      break;
    }
    if(selectedOffer) {
      const respAcceptOffer = await acceptOffer(selectedOffer);
      res.json({ ok: true, data: respAcceptOffer.data });
    } else {
      res.json({ ok: false, msj: 'No offers available' });
    }
  } catch(error) {
    res.status(500).json({
      ok: false,
      msg: 'Please talk to administrator, processOffer'
    });
  }
}

async function acceptOffer(offer, res, req) {
  let requestHeaders = allHeaders["FlexCapacityRequest"];
  requestHeaders["X-Amz-Date"] = getAmzDate();
  const data = { offerId: offer.id};

  try {
    const accessToken = await getFlexAccessToken();
    requestHeaders["x-amz-access-token"] = accessToken;
    
    let response = await axios.post("https://flex-capacity-na.amazon.com/AcceptOffer", data, { headers: requestHeaders });
    
    const user = await Users.findById(userId);
    const bodySMS = {
      numberTo: user.telefono, 
      blockId: offer.id
    } 
    await notificationSEND(bodySMS);
    return response;
  } catch(error) {
    res.status(500).json({
      ok: false,
      msg: 'Please talk to administrator, acceptOffer'
    });
  }
}

async function getOffers(offersRequestBody) {
  let requestHeaders = allHeaders["FlexCapacityRequest"];
  try {
    const accessToken = await getFlexAccessToken();
    requestHeaders["x-amz-access-token"] = accessToken;
  
    let response = await axios.post("https://flex-capacity-na.amazon.com/GetOffersForProviderPost", offersRequestBody, {
      headers: requestHeaders,
    });

    return response.data.offerList;
  }catch (error) {
    res.status(500).json({ error: 'Error obtaining job offers' });
  }
}

async function getEligibleServiceAreas(req, res) {
  let requestHeaders = allHeaders["FlexCapacityRequest"];
  try {
    const accessToken = await getFlexAccessToken(); 
    requestHeaders["X-Amz-Date"] = getAmzDate();
    requestHeaders["x-amz-access-token"] = accessToken;
  
    let response = await axios.get("https://flex-capacity-na.amazon.com/getOfferFiltersOptions", {
      headers: requestHeaders,
    });
  
    return response.data.serviceAreaPoolList.map(areas => areas.serviceAreaId);
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

module.exports = {
  getAllServiceAreas,
  getAllOffers,
  processOffer,
  registerAccount,
}