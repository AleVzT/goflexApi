/* 
    Rutas de Usuarios / Auth
    host + /api/auth
*/

const { Router } = require('express');
const { check } = require('express-validator');
const router = Router();

const { loginUser, revalidarToken, checkToken } = require('../controllers/auth');
const { fieldsValidators } = require('../middlewares/fields-validators');
const { validateJWT } = require('../middlewares/validate-jwt');

router.post(
    '/login',
    [ 
        check('email', 'El email es obligatorio').isEmail(),
        check('password', 'El password debe de ser de 6 caracteres').isLength({ min: 6 }),
        fieldsValidators
    ],
    loginUser
);

router.get('/check-token', validateJWT, checkToken);


router.get('/renew', validateJWT, revalidarToken );


module.exports = router;
