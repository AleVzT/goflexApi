/* 
    Rutas de Flex / fish
    host + /api/fish
*/

const { Router } = require('express');
const router = Router();
const { getAllServiceAreas, processOffer, getSMSSEND } = require('../controllers/fish');

router.get('/', (req, res) => {
  res.send('fish routes!');
});

router.get('/getAllServiceAreas', getAllServiceAreas);
router.get('/getSMSSEND', getSMSSEND);
router.post('/processOffer', processOffer);

module.exports = router;
