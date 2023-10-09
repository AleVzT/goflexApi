const { Schema, model, default: mongoose } = require('mongoose');

// Definición del esquema del objeto
const OfferSchema = Schema ({
  id: {
    type: String,
    required: true
  },
  expirationDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  blockRate: {
    type: Number,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  hidden: {
    type: Boolean,
    required: true
  },
  ratePerHour: {
    type: Number,
    required: true
  },
  weekday: {
    type: Number,
    required: true
  },
  blockDuration: {
    type: Number,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Tipo para almacenar un ID de usuario
    ref: 'User', // Hace referencia al modelo de usuario
    required: true
  },
  status: {
    type: String,
    required: true
  },
  // Otros campos de tu objeto aquí
});

module.exports = model('Offers', OfferSchema);
