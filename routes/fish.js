/* 
    Rutas de Flex / fish
    host + /api/fish
*/

const { Router } = require('express');
const router = Router();
const { getAllServiceAreas, processOffer, stopProcess, getOffersList } = require('../controllers/fish');

router.get('/', (req, res) => {
  res.send('fish routes!');
});

router.get('/getAllServiceAreas', getAllServiceAreas);
router.post('/processOffer', processOffer);
router.get('/stopProcess', stopProcess);
router.get('/getOffersList', getOffersList);

module.exports = router;
