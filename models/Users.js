const { Schema, model } = require('mongoose');

const UsuarioSchema = Schema ({
  fullname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  comment: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  telefono: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: false
  },
  active: {
    type: Boolean,
    required: true
  },
  isServiceActive: {
    type: Boolean,
    default: false
  }
})

module.exports = model('Users', UsuarioSchema);
