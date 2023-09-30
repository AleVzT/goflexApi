const { response } = require('express');
const bcrypt = require('bcryptjs');
const Users = require('../models/Users');
const { generateJWT } = require('../helpers/jwt');

const loginUser = async(req, res = response) => {

  const { email, password } = req.body;

  try {
    email = email.toLowerCase();
    const usuario = await Users.findOne({ email });
    if ( !usuario ) {
      return res.status(400).json({
        ok: false,
        msg: 'email and/or password are not correct!'
      });
    }
    
    const passwordValid = bcrypt.compareSync(password, usuario.password );
    if ( !passwordValid ) {
      return res.status(400).json({
        ok: false,
        msg: 'email and/or password are not correct!'
      });
    }

    if (!usuario.active) {
      return res.status(401).json({
        ok: false,
        msg: 'User is not active. Please contact the administrator.',
      });
    }

    // Generar JWT
    const token = await generateJWT( usuario.id, usuario.fullname, usuario.type );

    res.json({
      user: {
        _id: usuario.id,
        email: usuario.email,
        fullname: usuario.fullname,
        active: usuario.active,
        type: usuario.type,
      },
      token
    });

  } catch(error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: 'Please talk to administrator, login failed'
    });
  }
}

const revalidarToken = async (req, res = response ) => {
  const { uid, fullname, type } = req;

  const token = await generateJWT( uid, fullname, type );
  res.json({
    ok: true,
    uid, fullname, type,
    token
  })
}

const checkToken = async (req, res = response ) => {
  const { uid, token } = req;

  const user = await Users.findById(uid);

  res.json({ token, user })
}



module.exports = {
  loginUser,
  revalidarToken,
  checkToken,
}
