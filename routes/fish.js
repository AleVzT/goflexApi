/* 
    Rutas de Flex / fish
    host + /api/fish
*/

const { Router } = require('express');
const router = Router();
const { getAllServiceAreas, getAllOffers, processOffer } = require('../controllers/fish');

router.get('/', (req, res) => {
  res.send('fish routes!');
});

router.get('/getAllServiceAreas', getAllServiceAreas);
router.get('/getAllOffers', getAllOffers);
router.post('/processOffer', processOffer);

module.exports = router;
