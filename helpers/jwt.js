const jwt = require('jsonwebtoken');

const generateJWT = (uid, fullname, type) => {

    return new Promise( (resolve, reject) => {
        const payload = { uid, fullname, type };
        jwt.sign( payload, process.env.SECRECT_JWT_SEED, {
            expiresIn: '24h'
        }, ( err, token ) => {
            if (err) {
                console.log(err);
                reject('No se pudo generar el token');
            }
            resolve( token );
        });
    });
}

const verifyJWT = (token) => {

    return new Promise( (resolve, reject) => {
        jwt.verify(token, process.env.SECRECT_JWT_SEED, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Token inválido' });
            } else {
                resolve(decoded); 
            }
        });
    });
}

module.exports = {
    generateJWT,
    verifyJWT
}

