/* 
    Rutas de Usuarios / User
    host + /api/user
*/

const { Router } = require('express');
const router = Router();

const { getAllUsers, getUserById, createUser, deleteUser, editUser } = require('../controllers/users');
const { validateJWT } = require('../middlewares/validate-jwt');
const { check } = require('express-validator');
const { fieldsValidators } = require('../middlewares/fields-validators');

// router.use( validateJWT );

router.get('/', getAllUsers );

router.get('/:id', getUserById );

router.post(
    '/',
    [
        check('fullname', 'El nombre es opbligatorio').not().isEmpty(),
        check('email', 'La fecha de inicio es obligatoria').not().isEmpty(),
        check('password', 'active es obligatorio').not().isEmpty(),
        check('type', 'La company es obligatorio').not().isEmpty(),
        check('telefono', 'Las tools debe ser un array').not().isEmpty(),
        check('active', 'Las disciplines debe ser un array').not().isEmpty(),
        fieldsValidators,
    ],
    createUser
);

router.patch('/:id',  editUser);

router.delete('/:id', deleteUser);

module.exports = router;
