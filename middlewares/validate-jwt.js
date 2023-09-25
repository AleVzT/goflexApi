const { response } = require('express');
const jwt = require('jsonwebtoken');

const validateJWT = ( req, res = response, next ) => {

    // x-token headers
    const token  = req.header('x-token');
    
    if ( !token ) {
        return res.status(401).json({
            ok: false,
            msg: "No hay token en la petición"
        });
    }

    try {

        const { uid, fullname, type } =jwt.verify(
            token,
            process.env.SECRECT_JWT_SEED
        );

        req.uid = uid;
        req.fullname = fullname;
        req.type = type;
        req.token = token;

    } catch (error) {
        return res.status(401).json({
            ok: false,
            msg: "Token no válido"
        });
    }

    next();
}

module.exports = { validateJWT }
